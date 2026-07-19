# Admin-Bereich Tiefenanalyse — Befunde (Phase 0)

> **Datum:** 2026-07-19
> **Status:** Diagnose abgeschlossen — kein Produktivcode geschrieben
> **Geprüfte Kette:** DB-Modell → Repository/Query → API-Endpunkt → Auth → DSGVO → Schnittstellen-Vertrag → Frontend-Fetch → UI-Rendering

---

## 1. Bug A — Kundendaten werden im Admin-Bereich nicht angezeigt

### 1.1 Datenbank

**Befund: Bestätigt — Datensätze existieren.**

Das `Customer`-Modell (`backend/app/domains/booking/models.py`, Z. 24–41) speichert:
- `name`, `email` (unique, indexed), `phone`, `last_active_at`, `anonymized_at`, `hashed_password`, `email_verified_at`

Kritische Flags:
- `anonymized_at`: Nicht-NULL = anonymisiert. Die Query in `get_customers()` filtert korrekt mit `WHERE anonymized_at IS NULL` (Z. 43 in `booking/service.py`).
- Es gibt **kein** `deleted_at`, `is_active` oder anderes Soft-Delete-Flag auf `Customer`.

> **Hypothese "leere DB":** Widerlegt. Kunden werden über den Public-Buchungsflow (`PublicAppointmentCreate`) angelegt und in der `customers`-Tabelle persistiert.

### 1.2 Repository/Query-Layer

**Befund: Bestätigt — Query funktioniert, aber Suchlogik ist zu restriktiv.**

`BookingService.get_customers()` in `booking/service.py` Z. 38–53:

```python
statement = select(Customer).where(Customer.anonymized_at == None)
if search:
    q = search.lower()
    statement = statement.where(
        or_(
            func.lower(Customer.name).like(f"{q}%"),
            Customer.phone.like(f"{search}%"),
        )
    )
```

**Problem:** Reine Präfix-Suche (`f"{q}%"`). Suche nach Nachname „Mustermann" findet „Max Mustermann" nicht. Aber: **ohne Suchbegriff** liefert die Query alle nicht-anonymisierten Kunden.

### 1.3 API-Endpunkt

**Befund: Bestätigt — Endpunkte existieren und liefern Daten.**

In `booking/router.py` Z. 89–94:
```python
@router.get("/customers", response_model=List[CustomerRead])
async def list_customers(
    search: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    return await BookingService.get_customers(session, search)
```

Route wird in `main.py` Z. 39–40 gemountet:
```python
app.include_router(booking_router, prefix="/api/v1")
```

Der `booking_router` hat `dependencies=[Depends(get_current_admin)]` (Z. 21), d.h. Auth ist korrekt.

**Response-Schema:** `CustomerRead` in `booking/schemas.py` Z. 20–24 liefert `id`, `name`, `email`, `phone`, `last_active_at`, `anonymized_at`. Kein Feldnamen-Mismatch — das Frontend nutzt identische `snake_case`-Felder in `lib/types.ts` Z. 84–93.

### 1.4 Auth/Rollen

**Befund: Bestätigt — Auth funktioniert korrekt.**

`get_current_admin` in `auth/dependencies.py` Z. 9–31 prüft Session-Cookie → validiert Token → lädt `AdminAccount`. Bei fehlendem Cookie: HTTP 401. Die Middleware im Frontend (`middleware.ts` Z. 4–18) prüft Cookie-Existenz und leitet bei fehlendem Cookie nach `/konto/login` um.

> **Hypothese "403 wird als leerer Zustand geschluckt":** Nicht anwendbar für die Kundenliste, weil **es keine Kundenseite gibt** (siehe 1.7).

### 1.5 DSGVO-Layer

**Befund: Bestätigt — keine ungewollte Anonymisierung.**

`retention.py` Z. 39–42 anonymisiert nur Kunden mit `last_active_at < Cutoff` UND `anonymized_at IS NULL`. Standard-Cutoff ist 24 Monate. Für neue Kunden greift das nicht. Die Query in `get_customers()` filtert anonymisierte Kunden korrekt aus.

### 1.6 Schnittstellen-Vertrag

**Befund: Bestätigt — kein Mismatch.**

Frontend `Customer` in `types.ts` Z. 84–93 und Backend `CustomerRead` in `booking/schemas.py` Z. 20–24 verwenden identische Feldnamen in `snake_case`. Kein Pagination-Wrapper — das Backend liefert ein flaches Array `Customer[]`.

### 1.7 Frontend-Fetch — ⚠️ ROOT CAUSE

**Befund: BESTÄTIGT — Es gibt keine Admin-Kundenseite.**

Suche nach „Kunden" in `frontend/src/app/admin/`: **Null Treffer.** Die Navigation in `admin/layout.tsx` Z. 17–25 listet:
- Dashboard, Kalender, Dienstleistungen, Team, Öffnungszeiten, Arbeitsplan, Salon-Profil

**Kein Eintrag „Kunden".** Es gibt **keine Datei** `admin/customers/page.tsx` oder ähnlich.

Der `searchCustomers()`-Aufruf in `lib/api.ts` Z. 199–200 wird **ausschließlich** in `components/admin/AppointmentForm.tsx` zum Suchen eines bestehenden Kunden bei der Walk-in-Terminerstellung verwendet — nicht zur Anzeige einer Kundenliste.

Im Dashboard (`admin/page.tsx`) werden Kunden nur inline als `a.guest_name ?? a.customer_name ?? '—'` in der Terminliste gezeigt (Z. 59). Es gibt keinen dedizierten Kundendaten-Bereich.

### 1.8 Deployment/Proxy

**Befund: Nicht die Ursache für Bug A.**

Die Proxy-Kette (Next.js Rewrite `/api/:path*` → `BACKEND_INTERNAL_URL`, `next.config.ts` Z. 22–28) funktioniert für alle anderen Admin-Seiten. Die `NEXT_PUBLIC_API_URL` ist in `.env.example` als `/api/v1` definiert — ein relativer Pfad, der zur Buildzeit eingebacken wird. Solange die Produktion den gleichen Wert nutzt (und der Rewrite greift), ist das korrekt.

### 1.9 Fehlerbehandlung im UI

**Befund: BESTÄTIGT — eigenständiger P0-Befund.**

Weil die Kundenseite fehlt, ist die Frage nach Unterscheidung „Ladefehler/keine Berechtigung/keine Daten" nicht anwendbar. Aber: Das Dashboard unterscheidet nicht zwischen „Termine laden fehlgeschlagen" und „keine Termine" — bei einem Fehler wird `error` gesetzt, aber die Karten mit den leeren Listen werden nie gerendert (nur `data && (...)` in Z. 42).

### 1.10 Zusammenfassung Bug A

| # | Befund | Status | Beleg |
|---|---|---|---|
| A1 | **Keine Admin-Kundenseite vorhanden** | ✅ Bestätigt (ROOT CAUSE) | `admin/layout.tsx` Z. 17–25: kein „Kunden"-Link; kein `admin/customers/` Verzeichnis |
| A2 | Kundensuche nur als Präfix-Suche | ✅ Bestätigt (P1) | `booking/service.py` Z. 46: `f"{q}%"` statt `f"%{q}%"` |
| A3 | Dashboard zeigt Kundennamen nur inline | ✅ Bestätigt (P1) | `admin/page.tsx` Z. 59: nur `customer_name` |
| A4 | `AppointmentSummary` fehlen Kontaktdaten | ✅ Bestätigt (P1) | `booking/schemas.py` Z. 68–79: kein `customer_email`, `customer_phone` |

---

## 2. Bug B — Arbeitsplan-Seite funktioniert nicht

### 2.1 Datenmodell

**Befund: Bestätigt — Modell ist grundsätzlich tragfähig.**

`WorkingHours` in `stammdaten/models.py` Z. 86–94:
```python
class WorkingHours(UUIDModel, table=True):
    team_member_id: UUID = Field(foreign_key="team_members.id", nullable=False)
    day_of_week: int = Field(nullable=False)  # 0-6
    start_time: dt.time = Field(nullable=False)
    end_time: dt.time = Field(nullable=False)
```

Pro Mitarbeiter, pro Wochentag, mit Start- und Endzeit. **Keine Pausen modelliert.** Kein Unique-Constraint auf `(team_member_id, day_of_week)` — theoretisch sind Doppeleinträge möglich.

Ergänzend: `DayOverride` (Z. 120–135) für tagesgenaue Ausnahmen (Urlaub/Sonderzeiten) und `WorkingException` (Z. 97–105) für zeitraumbasierte Ausnahmen.

**Bewertung:** Für die fachliche Anforderung „Montag 9–18 Uhr für Mitarbeiter X" ist das Schema ausreichend. Fehlend: Pausen, Unique-Constraint.

### 2.2 Speicherpfad — ⚠️ ROOT CAUSE #1

**Befund: BESTÄTIGT — Speichern schlägt bei nicht-existierenden Einträgen fehl.**

Backend-Endpunkt in `stammdaten/router.py` Z. 167–174:
```python
@router.put("/team-members/{member_id}/working-hours/{day_of_week}")
```

Service-Methode in `stammdaten/service.py` Z. 234–259:
```python
async def update_working_hours(session, member_id, day_of_week, hours_in):
    # Suche existierenden Eintrag
    hours = result.scalar_one_or_none()
    if not hours:
        # NEU ANLEGEN mit hours_in.start_time, hours_in.end_time
        hours = WorkingHours(team_member_id=member_id, ...)
    else:
        # UPDATE mit exclude_unset
        update_data = hours_in.model_dump(exclude_unset=True)
```

**Problem:** Das Schema `WorkingHoursUpdate` in `stammdaten/schemas.py` Z. 131–133 erlaubt `Optional[time] = None`:
```python
class WorkingHoursUpdate(BaseModel):
    start_time: Optional[time] = None
    end_time: Optional[time] = None
```

Wenn das Frontend `start_time: None` schickt (z.B. weil der Mitarbeiter an dem Tag nicht arbeitet), versucht die Service-Methode entweder:
- **Neuen Eintrag** mit `start_time=None` → **IntegrityError**, weil das DB-Modell `nullable=False` hat
- **Bestehenden Eintrag** zu updaten mit `None` → derselbe Fehler

Es gibt **keine Lösch-Route** für einzelne Working-Hours-Einträge und keine „freier Tag"-Logik im regulären Wochenplan.

### 2.3 Frontend-Formular — ⚠️ ROOT CAUSE #2

**Befund: BESTÄTIGT — unkontrollierte Inputs + onBlur = fragil + stillloses Versagen.**

`admin/schedule/page.tsx` Z. 149–163:
```jsx
<input
  type="time"
  className="border rounded px-2 py-1"
  defaultValue={hours?.start_time || '09:00'}
  onBlur={(e) => handleUpdateWorkingHours(
    day.id,
    e.target.value,
    hours?.end_time || '17:00'
  )}
/>
```

**Probleme:**
1. **`defaultValue` statt `value`** = unkontrollierte Inputs. React verwaltet den State nicht — bei Re-Renders (z.B. nach `loadMemberData`) werden die Inputs NICHT aktualisiert. Der Nutzer sieht veraltete Werte.
2. **`onBlur`-Auto-Speichern** ohne visuelles Feedback. Der Nutzer weiß nicht, ob gespeichert wird, gespeichert wurde, oder ob ein Fehler aufgetreten ist.
3. **Fallback auf `'09:00'`/`'17:00'`** wenn `hours` nicht existiert: Wenn der Nutzer nur die Endzeit ändert, wird die Startzeit mit dem Fallback `'09:00'` gesendet — auch wenn der Mitarbeiter an diesem Tag gar nicht arbeitet.
4. **Fehlerbehandlung: `alert(e)`** in Z. 75 — dabei ist `e` ein `ApiError`-Objekt, das als `[object Object]` angezeigt wird.

### 2.4 Zeitformat & Zeitzone

**Befund: Bestätigt — keine Inkonsistenz auf dieser Ebene.**

Backend-Modell verwendet Python `datetime.time` (naiv, ohne Zeitzone). Schema erwartet `time`-Typ (Pydantic). Frontend sendet `HH:MM`-Strings aus `<input type="time">`. Pydantic parst diese korrekt. Kein Zeitzonen-Problem, da Arbeitszeiten als lokale Zeiten (implizit `Europe/Berlin`) behandelt werden.

### 2.5 Validierung

**Befund: BESTÄTIGT — fehlend.**

- **Ende vor Beginn:** Keine Validierung im Schema, Service oder Frontend.
- **Überschneidungen:** Keine Prüfung ob ein Mitarbeiter für denselben Tag bereits einen Eintrag hat (kein Unique-Constraint).
- **Pause außerhalb Arbeitszeit:** Pausen nicht modelliert.
- **Mitternachtsübergang:** Nicht geprüft (unwahrscheinlich, aber nicht abgesichert).

### 2.6 Feedback

**Befund: BESTÄTIGT — fehlendes Feedback.**

- **Laden:** Einziger Ladezustand ist das initiale `Laden...` (Z. 116). Beim Wechsel des Mitarbeiters: kein Ladezustand.
- **Speichern:** Kein visuelles Feedback beim onBlur-Speichern. Kein Dirty-State-Indikator.
- **Erfolg:** Kein Erfolgsfeedback. `loadMemberData` wird aufgerufen, aber da die Inputs unkontrolliert sind, ändert sich nichts Sichtbares.
- **Fehler:** `alert(e)` — unbrauchbar.

### 2.7 Kopplung zum Buchungssystem

**Befund: Bestätigt — Arbeitszeiten fließen korrekt in die Verfügbarkeit.**

`booking/availability.py` liest `WorkingHours` + `DayOverride` + `WorkingException`, um verfügbare Slots zu berechnen. Wenn Arbeitszeiten nicht gespeichert werden können, fehlen dem Buchungssystem die Slots → **P0-Geschäftsrisiko**: Mitarbeiter ohne Arbeitszeiten sind nicht buchbar.

Die Team-Seite (`admin/team/page.tsx` Z. 36–50) erkennt sogar aktive Mitglieder ohne Arbeitszeiten (`missingHours`-State) und warnt — aber das behebt das Speicherproblem nicht.

### 2.8 UI/UX-Bewertung

| Aspekt | Befund |
|---|---|
| **Informationsarchitektur** | Flach: 1 Dropdown für Mitarbeiter, dann Wochenplan + Ausnahmen nebeneinander. Nicht sofort klar, welcher Mitarbeiter bearbeitet wird, wenn man nach unten scrollt. |
| **Klicks für "Mo 9–18 für Mitarbeiter X"** | 1 (Mitarbeiter wählen) + 2 (Start + Ende ändern, jeweils click + Blur). Akzeptabel, aber der Blur-Trigger ist unsichtbar. |
| **Ungespeicherte Änderungen** | Nicht erkennbar. Kein Dirty-State, kein „Speichern"-Button, keine visuelle Markierung. |
| **Mobile Nutzbarkeit** | Grid `md:grid-cols-2` bricht auf Mobile auf. Time-Inputs sind auf Mobile OK. Aber: die `onBlur`-Interaktion funktioniert auf Mobile schlecht (Blur feuert beim Scroll). |
| **DESIGN.md-Konformität** | ❌ Kein Admin-Token-System genutzt. Hardcoded `text-gray-600`, `bg-white`, `border`. Keine Admin-Tokens (`--admin-surface`, `--admin-text`, etc.) aus DESIGN.md §8. |
| **Konsistenz mit `hours/page.tsx`** | ❌ Die Öffnungszeiten-Seite nutzt kontrollierte Inputs, `useState`-State, explizite „Speichern"-Buttons pro Tag, und zeigt Fehler inline. Die Arbeitsplan-Seite nutzt keines davon. |

### 2.9 Zusammenfassung Bug B

| # | Befund | Status | Beleg |
|---|---|---|---|
| B1 | **Speichern schlägt bei neuen Einträgen mit `None`-Werten fehl** | ✅ Bestätigt (ROOT CAUSE) | `stammdaten/service.py` Z. 244–249 + `models.py` Z. 91–92: `nullable=False` |
| B2 | **Unkontrollierte Inputs + onBlur = unzuverlässiges Speichern** | ✅ Bestätigt (ROOT CAUSE) | `schedule/page.tsx` Z. 150–161: `defaultValue` + `onBlur` |
| B3 | Kein Dirty-State, kein expliziter Speichern-Button | ✅ Bestätigt (P1) | Vergleich mit `hours/page.tsx` |
| B4 | Fehlerbehandlung `alert(e)` = `[object Object]` | ✅ Bestätigt (P1) | `schedule/page.tsx` Z. 75 |
| B5 | Fehlende Validierung (Ende vor Beginn, Duplikate) | ✅ Bestätigt (P1) | Kein Validator in Schema oder Service |
| B6 | Kein Feedback-System (Laden, Speichern, Erfolg) | ✅ Bestätigt (P1) | Vergleich mit `hours/page.tsx` |
| B7 | Keine DESIGN.md-Token-Konformität | ✅ Bestätigt (P2) | Hardcoded Tailwind-Klassen statt Admin-Tokens |
| B8 | Fehlender Lösch-Mechanismus für „freier Tag" | ✅ Bestätigt (P1) | Kein DELETE-Endpoint für einzelne WorkingHours |

---

## 3. Querschnitt — Dienstleistungen-Filter

### 3.1 Symptom

> Kategoriefilter "Herren" zeigt leer, obwohl im Buchungsflow Leistungen vorhanden sind.

### 3.2 Analyse

Die Public-Dienstleistungsseite (`(public)/dienstleistungen/page.tsx`) nutzt `getPublicServices()` → `publicFetch('/services')` → Backend-Route `GET /api/v1/public/services`.

Backend-Query in `stammdaten/service.py` Z. 373–376:
```python
async def get_active_services_public(session):
    statement = select(Service).where(Service.is_active == True).order_by(Service.name)
```

Die Filterung nach `target_group` passiert **ausschließlich im Frontend** in `serviceGroups.tsx`:
```typescript
export function getAvailableGroups(services: PublicServiceRead[]) {
  return TARGET_GROUPS.map((group) => ({
    ...group,
    count: services.filter((s) => s.target_group === group.key).length,
  })).filter((group) => group.count > 0);
}
```

Die Gruppierung in `buildSections()` Z. 150–171 matcht Services nach **exaktem Namen** gegen die hardcodierte `SECTION_LAYOUT`. Wenn ein Service in der DB anders heißt als im Layout, landet er unter „Weitere Leistungen" — aber er wird NICHT versteckt.

**Befund:** Die Filterlogik selbst ist korrekt. Der Bug tritt auf, wenn:
1. Alle Services einer Zielgruppe im Backend `is_active=false` sind → der Button erscheint nicht (gewolltes Verhalten)
2. Die Zielgruppe als Enum-Wert nicht matcht (z.B. Groß-/Kleinschreibung) → unwahrscheinlich, da Backend und Frontend beide `'HERREN'` verwenden

> **Hypothese "gleiche Ursachenklasse wie Bug A":** **Widerlegt.** Bug A hat eine komplett andere Ursache (fehlende Seite). Der Dienstleistungen-Filter hat keine gemeinsame Codebasis mit dem Kundenproblem.

### 3.3 Mögliche Ursache des Dienstleistungen-Bugs

**Hypothese (nicht prüfbar ohne Produktions-Daten):** Wenn im Produktionssystem alle Herren-Services mit `is_active=false` markiert wurden (z.B. durch einen versehentlichen Bulk-Deactivate), zeigt der Filter „Herren" nicht an. Das wäre ein Daten-Problem, kein Code-Problem.

**Alternative:** Wenn die Public-API eine leere Liste zurückliefert (SSR-Fehler, Timeout, BACKEND_INTERNAL_URL falsch), zeigt die Seite den `EmptyState` — ohne Unterscheidung zwischen „keine Daten" und „API-Fehler". Das wäre ein Fehlerbehandlungs-Problem.

---

## 4. Gemeinsame Muster — Admin-Seiten Übersicht

| Seite | Fetch-Pattern | State-Mgmt | Fehlerbehandlung | DESIGN.md-Tokens |
|---|---|---|---|---|
| Dashboard | `apiFetch` direkt | `useState` | Error-State ✓ | ❌ hardcoded |
| Kalender | `getAppointments` via `api.ts` | `useState` + `useRef` | Delegiert an Modals | ❌ hardcoded |
| Dienstleistungen | `getServices` via `api.ts` | `useState` | Error-State ✓ | ❌ hardcoded |
| Team | `getTeamMembers` via `api.ts` | `useState` | Error-State ✓ | ❌ hardcoded |
| Öffnungszeiten | `getSalonHours` via `api.ts` | **Kontrolliert** ✓ | Error-State + Dialog ✓ | ❌ hardcoded |
| **Arbeitsplan** | `apiFetch` direkt | **Unkontrolliert** ❌ | `alert()` ❌ | ❌ hardcoded |
| Salon-Profil | `getAdminSalonProfile` via `api.ts` | `useState` | Error-State ✓ | ❌ hardcoded |
| **Kunden** | **Seite fehlt** | — | — | — |

**Gemeinsames Muster:** Alle Admin-Seiten nutzen `apiFetch` als gemeinsamen Client. Kein gemeinsamer Fehler im Client selbst — die Probleme sind seitenspezifisch.

**Durchgängiges P2-Problem:** Keine Admin-Seite nutzt die Admin-Tokens aus `DESIGN.md` §8 (`--admin-page`, `--admin-surface`, `--admin-text`, etc.). Alle verwenden hardcoded Tailwind-Klassen (`text-gray-900`, `bg-white`, `border-gray-300`). Das funktioniert zufällig, weil die `.admin-shell`-Klasse im Layout den Light-Mode pinnt, aber es ist fragil und nicht wartbar.
