# Admin-Bereich Fix-Spezifikation (Phase 1)

> **Datum:** 2026-07-19
> **Basis:** `docs/analysis/ADMIN_ANALYSE.md`
> **Status:** Wartet auf Freigabe — kein Produktivcode vor Genehmigung

---

## Maßnahmen-Übersicht

| ID | Priorität | Maßnahme | Aufwand | Risiko |
|---|---|---|---|---|
| M1 | **P0** | Admin-Kundenseite erstellen | ~4h | Niedrig |
| M2 | **P0** | Arbeitsplan: Speicher-Mechanismus reparieren | ~3h | Mittel |
| M3 | **P0** | Arbeitsplan: UI von Grund auf neu bauen | ~5h | Mittel |
| M4 | **P1** | Kundensuche auf Teilstring-Suche erweitern | ~0,5h | Niedrig |
| M5 | **P1** | Dashboard um Kunden-Kontaktdaten erweitern | ~1h | Niedrig |
| M6 | **P1** | Backend: WorkingHours-Validierung + Unique-Constraint | ~2h | Mittel (Migration) |
| M7 | **P2** | Admin-Token-System durchgängig einsetzen | ~3h | Niedrig |
| M8 | **P1** | Dienstleistungen-Seite: SSR-Fehler besser anzeigen | ~1h | Niedrig |
| M9 | **P1** | Promotions: Falsche Dark-Theme Badges im Admin-Bereich beheben | ~0,5h | Niedrig |
| M10 | **P0** | DSGVO: PII in `appointments` (Gastdaten/Notes) wird bei Anonymisierung nicht gelöscht | ~2h | Mittel |
| M11 | **P1** | DSGVO: Fehlender Datenexport (Art. 15) für Admins | ~3h | Mittel |
| M12 | **P1** | Security/Audit: Fehlendes `anonymized_by` und Audit-Log bei Löschungen | ~2h | Mittel |
| M13 | **P0** | DSGVO: Fehlende Löschfrist für reine Gastbuchungen (ohne Kundenkonto) | ~3h | Mittel |
| M14 | **P1** | Admin-Tabellen: Horizontaler Overflow verdeckt Aktionen bei <700px | ~1h | Niedrig |
| M15 | **P1** | Admin-Kalender: Fehlende Kontaktdaten (Telefon) im Termin-Modal | ~1h | Niedrig |
| M16 | **P1** | Admin-Kalender: Leeres Datum-Feld beim Bearbeiten unschön | ~0,5h | Niedrig |
| M17 | **P1** | Admin-Kalender: Inkonsistente Akzentfarbe (Violett vs. Malachite) | ~1h | Niedrig |

---

## M1 — Admin-Kundenseite erstellen (P0)

### Problem
Verweis: `ADMIN_ANALYSE.md` §1.7 (Befund A1). Es gibt keine Admin-Kundenseite. Der Admin kann Kundendaten weder einsehen, suchen noch verwalten.

### Lösungsvorschlag

**Neue Dateien:**
- `frontend/src/app/admin/customers/page.tsx` — Client-Component
- Neuer Nav-Eintrag in `frontend/src/app/admin/layout.tsx`
- Neue API-Funktionen in `frontend/src/lib/api.ts`

**Neuer Backend-Endpunkt (optional, für Pagination):**
- `GET /api/v1/customers` — existiert bereits, aber ohne Pagination. Für die erste Version reicht die bestehende API. Pagination als Folge-Ticket.

**Funktionalität:**
- Tabelle mit Name, E-Mail, Telefon, Letzter Aktivität
- Suchfeld (Echtzeit-Filter über bestehenden `search`-Parameter)
- Detail-Ansicht mit Terminhistorie (Klick auf Zeile → API `GET /customers/{id}` + `GET /appointments?customer_id=...` — letzterer existiert noch nicht, muss im Backend ergänzt werden oder die Termine werden clientseitig über das Kalender-API gefiltert)
- DSGVO-konform: „Kundendaten löschen" = Anonymisierung über bestehenden `DELETE /customers/{id}`

**Betroffene Dateien:**
1. `frontend/src/app/admin/layout.tsx` — Nav-Link + Icon „customers"
2. `frontend/src/app/admin/customers/page.tsx` — Neue Seite
3. `frontend/src/lib/api.ts` — `getCustomers()` Funktion (ohne Suchpflicht)
4. `frontend/src/lib/types.ts` — ggf. `CustomerListItem`-Typ

**Schema-Änderung:** Keine.

### Akzeptanzkriterien

**AK-M1.1:** Gegeben ein Admin ist eingeloggt / Wenn er in der Seitenleiste auf „Kunden" klickt / Dann öffnet sich die Kundenliste mit allen nicht-anonymisierten Kunden (Name, E-Mail, Telefon, letzte Aktivität).

**AK-M1.2:** Gegeben die Kundenliste ist geöffnet / Wenn der Admin „Muster" in das Suchfeld eingibt / Dann werden nur Kunden angezeigt, deren Name oder Telefonnummer „Muster" enthält.

**AK-M1.3:** Gegeben ein Kunde wird angezeigt / Wenn der Admin auf „Daten löschen" klickt und bestätigt / Dann wird der Kunde anonymisiert und verschwindet aus der Liste.

**AK-M1.4:** Gegeben die API liefert einen Fehler / Wenn die Kundenseite lädt / Dann wird eine verständliche Fehlermeldung angezeigt (nicht ein leerer Zustand).

### Aufwandsschätzung
~4 Stunden. Risiko: Niedrig — alle Backend-Endpunkte existieren.

---

## M2 — Arbeitsplan: Speicher-Mechanismus reparieren (P0)

### Problem
Verweis: `ADMIN_ANALYSE.md` §2.2 (Befund B1). Das Backend wirft einen `IntegrityError`, wenn `start_time=None` oder `end_time=None` an `update_working_hours` übergeben wird, weil das DB-Modell `nullable=False` erzwingt.

### Lösungsvorschlag

**Backend-Änderungen in `stammdaten/service.py`:**
1. `update_working_hours()` erhält eine Weiche: Wenn beide Zeiten `None` sind → existierenden Eintrag löschen (= „freier Tag").
2. Validierung: Wenn nur eine Zeit `None` ist → HTTP 422. Wenn `end_time <= start_time` → HTTP 422.

**Neuer Endpunkt (optional):**
- `DELETE /api/v1/team-members/{member_id}/working-hours/{day_of_week}` — explizites Löschen eines Arbeitszeit-Eintrags. Alternativ: Die PUT-Route behandelt `None`-Werte als Löschung.

**Betroffene Dateien:**
1. `backend/app/domains/stammdaten/service.py` — `update_working_hours()`
2. `backend/app/domains/stammdaten/schemas.py` — Validatoren auf `WorkingHoursUpdate`
3. `backend/app/domains/stammdaten/router.py` — ggf. DELETE-Route

**Schema-Änderung:** Keine DB-Migration nötig. Nur Pydantic-Schema-Validierung.

### Akzeptanzkriterien

**AK-M2.1:** Gegeben ein Mitarbeiter hat keine Arbeitszeit für Montag / Wenn der Admin Montag 09:00–18:00 eingibt und speichert / Dann wird ein neuer WorkingHours-Eintrag angelegt und die Verfügbarkeit aktualisiert.

**AK-M2.2:** Gegeben ein Mitarbeiter hat Arbeitszeit Montag 09:00–18:00 / Wenn der Admin die Zeiten auf leer setzt (freier Tag) / Dann wird der Eintrag gelöscht und der Mitarbeiter ist montags nicht buchbar.

**AK-M2.3:** Gegeben der Admin gibt 18:00–09:00 ein (Ende vor Beginn) / Wenn er speichert / Dann erscheint eine verständliche Fehlermeldung und die Zeiten werden nicht gespeichert.

### Aufwandsschätzung
~3 Stunden. Risiko: Mittel — ändert die Speicherlogik, muss mit dem Availability-Engine kompatibel sein.

---

## M3 — Arbeitsplan: UI komplett neu bauen (P0)

### Problem
Verweis: `ADMIN_ANALYSE.md` §2.3, §2.6, §2.8. Die aktuelle UI ist unbrauchbar: unkontrollierte Inputs, kein Feedback, kein expliziter Speichern-Trigger, keine DESIGN.md-Konformität.

### UI-Konzept

#### Alternative A: Wochenraster mit Zeile pro Tag (Empfehlung ✅)

**Aufbau:**
- Oben: Mitarbeiter-Dropdown (wie bisher)
- Mitte: Tabelle mit 7 Zeilen (Mo–So), je Zeile:
  - Checkbox „Arbeitet" (kontrolliert)
  - Startzeit-Input (kontrolliert, disabled wenn nicht aktiv)
  - Endzeit-Input (kontrolliert, disabled wenn nicht aktiv)
  - Status-Indikator: ✓ gespeichert / ● geändert / ✕ Fehler
- Unten: **Expliziter „Alle Änderungen speichern"-Button** mit Dirty-State-Erkennung
- Zusätzlich: „Zeiten auf alle Arbeitstage übertragen"-Bulk-Aktion (Kopiert die Werte des aktuellen Tags auf alle als „Arbeitet" markierten Tage)

**Begründung:** Spiegelt exakt das Muster der `hours/page.tsx` (Öffnungszeiten), das bereits funktioniert und vom Nutzer verstanden wird. Minimale Lernkurve. Die kontrollierte State-Verwaltung ist bewährt.

**Look-A-Token-Konformität:**
- Flächen: `--admin-surface` (Karten), `--admin-page` (Hintergrund)
- Text: `--admin-text` (primär), `--admin-text-muted` (sekundär)
- Akzent: `--admin-primary` (#15803D) für Buttons/aktive States, **weißes Label** auf Buttons
- Borders: `--admin-border` (Hairlines), `--admin-border-strong` (Hervorhebung)
- Schrift: System-Font-Stack (Admin nutzt nicht Barlow Condensed — das ist Public-Display)
- Keine Schatten auf ruhenden Karten (Konformität mit DESIGN.md §4)

#### Alternative B: Inline-Bearbeitung mit sofortigem Speichern

**Aufbau:** Wie die aktuelle Seite, aber mit kontrollierten Inputs und sofortigem API-Call bei Wertänderung (onChange statt onBlur). Toast-Benachrichtigungen für Erfolg/Fehler.

**Abwägung:** ❌ Produziert viele API-Calls (jeder Tastendruck). ❌ Race-Conditions bei schneller Eingabe. ❌ Nutzer muss auf jede Zeile einzeln warten. ❌ Kein Batch-Save möglich.

#### Alternative C: Modal-basierte Bearbeitung

**Aufbau:** Übersichtstabelle (read-only) mit „Bearbeiten"-Buttons pro Mitarbeiter. Klick öffnet Modal mit vollständigem Wochenplan. Speichern schließt das Modal.

**Abwägung:** ✓ Klare Trennung Anzeige/Bearbeitung. ❌ Mehr Klicks für einfache Änderungen. ❌ Überdimensioniert für 7 Zeilen.

#### Empfehlung: **Alternative A**

Bewährtes Muster (identisch zur Öffnungszeiten-Seite), minimale Komplexität, maximale Konsistenz.

**Zusätzliche UI-Elemente für die Ausnahmen-Sektion:**
- Die bestehende Ausnahmen-Verwaltung (Day Overrides) bleibt, wird aber visuell als eigene Karte unter dem Wochenplan positioniert.
- Datumsfilter für Ausnahmen: „Vergangene ausblenden" (Default: nur zukünftige)

### Betroffene Dateien
1. `frontend/src/app/admin/schedule/page.tsx` — Komplett-Rewrite

### Akzeptanzkriterien

**AK-M3.1:** Gegeben der Admin öffnet den Arbeitsplan / Wenn er den Mitarbeiter wechselt / Dann werden die Arbeitszeiten des neuen Mitarbeiters geladen und die Inputs zeigen die korrekten Werte (kontrolliert).

**AK-M3.2:** Gegeben der Admin ändert Montag von 09:00 auf 10:00 / Wenn er „Alle Änderungen speichern" klickt / Dann wird ein Ladeindikator gezeigt, die Änderung gespeichert, und ein Erfolgs-Feedback angezeigt.

**AK-M3.3:** Gegeben der Admin hat ungespeicherte Änderungen / Wenn er den Mitarbeiter wechseln will / Dann wird er gewarnt, dass Änderungen verloren gehen.

**AK-M3.4:** Gegeben eine Änderung schlägt fehl / Dann wird eine verständliche Fehlermeldung inline angezeigt (kein `alert()`), und die fehlerhaften Felder werden markiert.

**AK-M3.5:** Gegeben der Admin klickt „Zeiten auf alle Arbeitstage übertragen" / Dann werden die Zeiten der aktuellen Zeile auf alle als „Arbeitet" markierten Tage kopiert (nur im State, noch nicht gespeichert).

### Aufwandsschätzung
~5 Stunden. Risiko: Mittel — Komplett-Rewrite der Komponente.

---

## M4 — Kundensuche auf Teilstring-Suche erweitern (P1)

### Problem
Verweis: `ADMIN_ANALYSE.md` §1.2 (Befund A2). Suche nach Nachnamen findet Einträge mit Vor- und Nachnamen nicht.

### Lösungsvorschlag

**Datei:** `backend/app/domains/booking/service.py` Z. 46

**Änderung:**
```python
# Vorher:
func.lower(Customer.name).like(f"{q}%")
# Nachher:
func.lower(Customer.name).contains(q)
```

Oder für explizite Kontrolle:
```python
func.lower(Customer.name).like(f"%{q}%")
```

### Akzeptanzkriterien

**AK-M4.1:** Gegeben ein Kunde heißt „Max Mustermann" / Wenn der Admin nach „Muster" sucht / Dann erscheint „Max Mustermann" in den Ergebnissen.

### Aufwandsschätzung
~0,5 Stunden. Risiko: Niedrig.

---

## M5 — Dashboard: Kunden-Kontaktdaten anzeigen (P1)

### Problem
Verweis: `ADMIN_ANALYSE.md` §1.7 (Befund A4). `AppointmentSummary` liefert nur `customer_name`, nicht E-Mail oder Telefon.

### Lösungsvorschlag

**Datei:** `backend/app/domains/booking/schemas.py`

`AppointmentSummary` um `customer_email` und `customer_phone` erweitern (oder `AppointmentRead` verwenden). Das `selectinload(Appointment.customer)` ist bereits im Dashboard-Endpoint aktiv — die Daten werden geladen, nur nicht serialisiert.

### Akzeptanzkriterien

**AK-M5.1:** Gegeben ein Termin hat einen registrierten Kunden / Wenn das Dashboard den Termin anzeigt / Dann sind Name, Telefon und E-Mail sichtbar.

### Aufwandsschätzung
~1 Stunde. Risiko: Niedrig.

---

## M6 — Backend: WorkingHours-Validierung + Unique-Constraint (P1)

### Problem
Verweis: `ADMIN_ANALYSE.md` §2.5. Keine Validierung, kein Unique-Constraint auf `(team_member_id, day_of_week)`.

### Lösungsvorschlag

1. **Alembic-Migration:** `UNIQUE(team_member_id, day_of_week)` auf `working_hours`-Tabelle.
2. **Schema-Validierung:** `WorkingHoursUpdate` erhält `@model_validator` für `end_time > start_time`.
3. **Service-Validierung:** Prüfung auf Duplikate im `update_working_hours()`.

### Migrationsplan

```python
# Alembic Migration
def upgrade():
    op.create_unique_constraint(
        "uq_working_hours_member_day",
        "working_hours",
        ["team_member_id", "day_of_week"],
    )

def downgrade():
    op.drop_constraint("uq_working_hours_member_day", "working_hours")
```

**Rückwärtskompatibilität:** Vor der Migration müssen eventuelle Duplikate bereinigt werden (SQL: behalte den neuesten Eintrag pro `(team_member_id, day_of_week)`).

### Akzeptanzkriterien

**AK-M6.1:** Gegeben ein Mitarbeiter hat bereits Montag-Arbeitszeiten / Wenn ein zweiter Eintrag für Montag angelegt wird / Dann wird ein verständlicher Fehler zurückgegeben.

**AK-M6.2:** Gegeben der Admin gibt 18:00 als Start und 09:00 als Ende ein / Wenn er speichert / Dann wird ein Validierungsfehler angezeigt.

### Aufwandsschätzung
~2 Stunden. Risiko: Mittel — Migration muss auf Produktionsdaten getestet werden.

---

## M7 — Admin-Token-System durchgängig einsetzen (P2)

### Problem
Verweis: `ADMIN_ANALYSE.md` §2.8 und §4. Keine Admin-Seite nutzt die Admin-Tokens aus DESIGN.md §8.

### Lösungsvorschlag

Alle Admin-Seiten refaktorieren: Hardcoded Tailwind-Klassen (`text-gray-900`, `bg-white`, etc.) durch Admin-Token-Variablen ersetzen (`text-[var(--admin-text)]`, `bg-[var(--admin-surface)]`, etc.).

**Betroffene Dateien:** Alle `admin/*/page.tsx`, alle `components/admin/*.tsx`.

### Akzeptanzkriterien

**AK-M7.1:** Gegeben alle Admin-Seiten / Wenn die CSS-Variablen in `globals.css` geändert werden / Dann ändert sich das Erscheinungsbild aller Admin-Seiten konsistent.

### Aufwandsschätzung
~3 Stunden (überwiegend Suchen & Ersetzen). Risiko: Niedrig.

---

## M8 — Dienstleistungen-Seite: SSR-Fehler besser anzeigen (P1)

### Problem
Verweis: `ADMIN_ANALYSE.md` §3.3. Die Public-Dienstleistungsseite fängt API-Fehler mit `.catch(() => [])` ab und zeigt den generischen `EmptyState` — ohne Unterscheidung zwischen „Backend-Fehler" und „keine Dienstleistungen".

### Lösungsvorschlag

**Datei:** `frontend/src/app/(public)/dienstleistungen/page.tsx`

Statt `.catch(() => [])` den Fehler loggen und einen dedizierten Fehlerzustand rendern:
```tsx
const services = await getPublicServices().catch((err) => {
  console.error('Failed to load services:', err);
  return null;
});
// Dann: services === null → Fehler-UI; services.length === 0 → EmptyState
```

### Akzeptanzkriterien

**AK-M8.1:** Gegeben das Backend ist nicht erreichbar / Wenn die Dienstleistungsseite lädt / Dann wird eine hilfreiche Fehlermeldung angezeigt (nicht „Keine Dienstleistungen verfügbar").

### Aufwandsschätzung
~1 Stunde. Risiko: Niedrig.

---

## M9 — Promotions: Falsche Dark-Theme Badges im Admin-Bereich beheben (P1)

### Problem
Verweis: `DESIGN.md`. Auf der Promotions-Seite im Admin-Bereich (`frontend/src/app/admin/promotions/page.tsx`) werden für die Status "Versteckt" und "Abgelaufen" die Klassen `bg-white/5 text-ash` hartkodiert verwendet. Da der Admin-Bereich zwingend ein helles Theme (`.admin-shell`) verwendet, sind diese weißen Flächen auf hellem Hintergrund (fast) unsichtbar. Es handelt sich um ein Leak aus dem Dark-Theme.

### Lösungsvorschlag
Status-Badges in `promotions/page.tsx` auf semantische, helle Admin-Farben umstellen:
- Expired/Hidden: `bg-gray-100 text-[var(--admin-text-muted)]` (oder vergleichbare Admin-Tokens).

### Akzeptanzkriterien
**AK-M9.1:** Gegeben eine abgelaufene oder versteckte Promotion / Wenn sie im Admin-Bereich angezeigt wird / Dann ist der Status-Badge auf dem hellen Hintergrund gut lesbar (Kontrast ≥ 4.5:1).

### Aufwandsschätzung
~0,5 Stunden. Risiko: Niedrig.

---

## Umsetzungsreihenfolge

```
Phase 2a (P0 — nach Freigabe):
  M2 → M3 → M1
  (Backend-Fix vor UI-Rewrite; Kundenseite parallel möglich)

Phase 2b (P1 — nach Abnahme P0):
  M4 → M5 → M6 → M8

Phase 2c (P2 — nach Abnahme P1):
  M7
```

### M10: PII in Appointments (Gastdaten/Notes) nicht gelöscht (P0)
**Befund:** Bei der Anonymisierung in `delete_customer` (DSGVO Art. 17) werden nur die Felder in `customers` überschrieben. In `appointments` liegen jedoch Kopien als `guest_name` und `guest_phone` sowie evtl. Freitext-Informationen in `notes`.
**Erwartetes Verhalten:** Alle personenbezogenen Daten in verknüpften Tabellen müssen ebenfalls pseudonymisiert/geleert werden.
**Vorgeschlagene Lösung:** `delete_customer` Service so erweitern, dass in einem Rutsch alle mit der `customer_id` verknüpften `Appointment`-Sätze bereinigt werden (`guest_name=None`, `guest_phone=None`, `notes="[anonymisiert]"`).
**Architektur-Entscheidung zu `notes`:** Das Feld `notes` wird zwingend mitgeleert. Begründung: Freitext lässt sich nicht zuverlässig auf Personenbezug prüfen (Namen Dritter, Ortsangaben). Der Verlust von Betriebsnotizen ist geringer zu gewichten als das Risiko eines DSGVO-Verstoßes. Diese Notizen dürfen nicht nachträglich wieder "gerettet" werden.

### M11: DSGVO-Export (Art. 15) für Admins fehlt (P1)
**Befund:** Im Backend-Router existiert kein Endpunkt, mit dem ein Admin die Daten eines Kunden vollständig für eine Auskunft nach Art. 15 exportieren kann.
**Erwartetes Verhalten:** Eine Funktion (z. B. `GET /api/v1/customers/{id}/export`), die eine aggregierte JSON- oder CSV-Datei mit Profil, Historie und Logs ausgibt.

### M12: Fehlendes Audit-Log bei DSGVO-Löschung (P1)
**Befund:** Die Tabelle `customers` speichert das Löschdatum in `anonymized_at`, aber nicht die ID des auslösenden Admins. Es gibt kein übergreifendes Audit-Log.
**Erwartetes Verhalten:** Jede Löschung muss revisionssicher die anfordernde Person protokollieren (`anonymized_by`).

### M13: Retention-Logik für inaktive Kunden (Fokus: passwortlose Online-Bucher) (P0)

**1. Bestandsaufnahme**
Das System legt bei jeder öffentlichen Buchung im Hintergrund (ohne Kenntnis des Nutzers) einen `Customer`-Datensatz an (`hashed_password IS NULL`). Aktuell existiert in `backend/app/domains/booking/retention.py` ein Skript, das Kunden erst nach 24 Monaten anonymisiert – jedoch **wird dieses Skript nirgends automatisch aufgerufen** (weder via Cron noch als Startup-Task; es ist faktisch toter Code). Zudem ist es fehlerhaft, da es M10 (`delete_customer` inklusive Löschung der Gastdaten in `appointments`) umgeht. Es wird durch M13 komplett ersetzt und gelöscht.

**2. Aufbewahrungsfrist**
- Wir reduzieren die Aufbewahrungsfrist für **alle** Kunden (besonders relevant für die passwortlosen) auf **12 Monate Inaktivität** (`last_active_at`). Nach 12 Monaten ohne neue Buchung entfällt der Zweck der Datenspeicherung.

**3. Bereinigungs-Mechanismus (Coolify-Fokus)**
- Die bestehende Logik in `retention.py` wird refaktoriert: Sie muss zwingend die Funktion `BookingService.delete_customer` aufrufen, damit auch die assoziierten PII-Daten aus M10 in `appointments` gelöscht werden.
- *API-Route via Coolify-Cron:* Wir bauen einen Endpunkt (`POST /api/v1/maintenance/retention`), der über ein statisches Token (`RETENTION_CRON_SECRET`) gesichert ist und den Job auslöst. Coolify ruft diesen täglich via Cron auf.
- *Härtung:* Rate Limiting, Audit-Logging und ein Trockenlauf-Modus (`?dry_run=true`).

**4. Akzeptanzkriterien**
- **AK-M13.1:** Gegeben ein Kunde (mit oder ohne Passwort) war seit >12 Monaten inaktiv / Wenn der Retention-Cronjob läuft / Dann wird er via `delete_customer` anonymisiert (inkl. zugehöriger PII in `appointments`).
- **AK-M13.2:** Gegeben ein Walk-In-Termin (ohne `customer_id`) liegt >12 Monate in der Vergangenheit / Wenn der Retention-Cronjob läuft / Dann werden `guest_name` und `guest_phone` auf `NULL` gesetzt und `notes` geleert.
- **AK-M13.3:** Gegeben der Endpunkt wird mit `?dry_run=true` aufgerufen / Dann wird nichts verändert, aber die Anzahl der fälligen Kunden und Walk-Ins zurückgegeben.
- **AK-M13.4:** Gegeben ein falsches Secret / Dann wird der Request abgelehnt (HTTP 401/403).

### M14: Admin-Tabellen überlaufen horizontal bei schmalen Viewports (P1)
**Befund:** Bei schmalen Viewports (~700px) überlaufen die Admin-Tabellen (`/admin/customers`, `/admin/hours`, `/admin/services`, `/admin/team`) horizontal. Dies führt dazu, dass die rechte Aktionsspalte (insbesondere der "Löschen"-Button) abgeschnitten ist und ohne horizontales Scrollen nicht erreicht werden kann.
**Erwartetes Verhalten:** Tabellen sollten responsiv umbrechen, Cards auf Mobile nutzen oder Buttons dauerhaft sichtbar (sticky right) halten, damit kritische Aktionen bedienbar bleiben.

### M15: Fehlende Kontaktdaten im Termin-Modal (P1)
**Befund:** Beim Klick auf einen Termin im Admin-Kalender wird nur der Name des Kunden angezeigt. Für Rückrufe (Verspätungen etc.) fehlt die Telefonnummer. Die `AppointmentRead`-API liefert die Felder `customer_phone` und `guest_phone` bereits korrekt aus, sie werden im Frontend jedoch nicht gerendert. Ein Link zur Kundenhistorie fehlt ebenfalls.
**Erwartetes Verhalten:** Telefonnummer des Kunden/Gastes im Termin-Modal ergänzen. Ein Link zur `/admin/customers` oder Terminhistorie sollte für registrierte Kunden hinzugefügt werden.

### M16: Neues Datum & Uhrzeit im Termin-Modal unschön vorbelegt (P1)
**Befund:** Beim Bearbeiten eines Termins ist das Feld "Neues Datum & Uhrzeit" leer vorbelegt. Wenn es beim Speichern leer bleibt (z. B. um nur den Mitarbeiter zu ändern), sendet das Frontend keinen Wert, und das Backend (`AppointmentUpdate` `starts_at: Optional[datetime] = None`) ignoriert es korrekt. Es entsteht kein Datenfehler (also kein P0), aber es ist UX-technisch verwirrend ("unschön").
**Erwartetes Verhalten:** Das DateTime-Feld sollte sinnvollerweise mit dem aktuellen `starts_at`-Wert des Termins vorbelegt werden.

### M17: Inkonsistente Akzentfarbe (Violett) im Kalender (P1)
**Befund:** Gemäß `DESIGN.md` gilt das "Einzelakzent-Prinzip", wonach primäre Aktionen im Admin-Bereich das grüne "Malachite" (`var(--admin-primary)`) nutzen sollen. Im Termin-Modal (`AppointmentModal.tsx`) ist der Speichern-Button jedoch hartkodiert auf `bg-indigo-600` gesetzt, und die Kalender-Blöcke (FullCalendar) nutzen die Default-Farbe Blau/Violett (`#3788d8`).
**Erwartetes Verhalten:** Alle Violett/Indigo-Klassen aus dem Modal entfernen und durch Malachite ersetzen. FullCalendar-Events über die `eventColor`-Eigenschaft oder CSS-Variablen ebenfalls auf Malachite umstellen.

---

## Offene Fragen

1. **Pagination für Kundenliste?** Bei >100 Kunden wird die Liste unhandlich. Soll Pagination (Backend: `limit`/`offset`-Parameter) in M1 mitgebaut werden oder als separates Ticket?

2. **Pausen im Arbeitsplan?** Das aktuelle Modell kennt keine Pausen. Soll das in M3 berücksichtigt werden (z.B. Frühstückspause 12:00–12:30 als separater Slot), oder ist das ein eigenes Feature?

3. **Arbeitsplan: Toggle "Arbeitet" vs. Expliziter freier Tag?** Soll der Wochenplan eine Checkbox „Arbeitet an diesem Tag" haben (wie bei Öffnungszeiten), oder reicht es, wenn leere Zeiten als „frei" interpretiert werden?

4. **Dienstleistungen-Filter-Bug:** Können wir zur Verifizierung des Befunds auf die Produktionsdatenbank schauen (z.B. `SELECT target_group, is_active, COUNT(*) FROM services GROUP BY 1, 2`)? Das würde klären, ob es ein Daten- oder Code-Problem ist.

5. **Admin-Token-Refactoring (M7):** Soll M7 alle Admin-Seiten auf einmal umstellen oder seitenweise als Teil der jeweiligen Bug-Fixes?
