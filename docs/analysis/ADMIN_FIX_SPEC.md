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
| M18 | **P0** | Security/DSGVO: PII in Klartext-Logs (SQL-Echo + eigene Log-Aufrufe) | ~1h | Niedrig |
| M19 | **P1** | Security/DSGVO: Log-Rotation + IP-Kürzung im Zugriffslog | ~2-3h | Niedrig — umgesetzt, wartet auf Deploy-Freigabe |
| M20 | **P1** | Security: Rate-Limits laufen gegen interne Frontend-IP statt Besucher-IP (`FORWARDED_ALLOW_IPS`) | ~3-4h | Mittel — Konfigurationsfehler kann Schutz aufheben oder Header-Spoofing öffnen |

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

### M18: PII in Klartext-Logs — SQL-Echo + eigene Log-Aufrufe (P0)

**Hochstufung auf P0 (2026-07-20):** Ursprünglich als P1 erfasst, auf Wunsch des Auftraggebers auf P0 angehoben. Begründung: Personenbezogene Daten landen im Klartext in den Docker-Logs. Diese Logs werden von `delete_customer` und vom Retention-Job (M13) **nicht erfasst** — das ist ein zweiter, unkontrollierter Speicherort für genau die Daten, die durch M10/M13 löschbar gemacht wurden. Ein DSGVO-Löschkonzept, das einen parallelen Log-Kanal ignoriert, ist unvollständig.

**Befund 1 — SQL-Echo:** `backend/app/core/database.py` Zeile 9 setzte `echo=True` hartkodiert auf der SQLAlchemy-Engine, ohne Umgebungsvariable — identisch in jeder Umgebung, auch Produktion. Jede SQL-Query inkl. gebundener Parameter (Name, E-Mail, Telefon, `guest_name`, `guest_phone`, `notes`) landete im Docker-Log.

**Befund 2 — eigene Log-Aufrufe mit PII:** Bei der Durchsicht aller `logger.*`-Aufrufe im Backend (`grep -rn "logger\.(info|warning|error|debug)" backend/app`) wurden drei weitere Stellen gefunden, die Klardaten in die Log-Message einbetten:
- `backend/app/domains/customer_account/service.py` (Verifikations-E-Mail-Fehlschlag) — loggte `customer.email`.
- `backend/app/domains/customer_account/service.py` (Passwort-Reset-E-Mail-Fehlschlag) — loggte `customer.email`.
- `backend/app/domains/notifications/service.py` (`send_account_email`) — loggte `to_email`.

Geprüft und **unauffällig** (nur IDs/Zeitstempel, keine PII): `notifications/service.py::_send_and_log`/`send_confirmation`/`send_reminder` (nutzen `appointment_id`), `booking/service.py` AUDIT-Log (nutzt `appointment.id`, `starts_at`, `team_member_id`), `maintenance/router.py` (nutzt keine Kundendaten). Der uvicorn Access-Log wurde bewusst nicht verändert — er protokolliert HTTP-Metadaten (Methode, Pfad, Status), keine Kunden-Payload.

**Umgesetzte Lösung (implementiert, noch nicht deployed):**
- `Settings` (`backend/app/core/config.py`) um `SQL_ECHO: bool = False` erweitert; `database.py` liest `settings.SQL_ECHO` statt der hartkodierten Konstante `True`.
- Die drei o.g. Log-Aufrufe geben statt der E-Mail-Adresse die `customer.id` aus bzw. verzichten ganz auf den Empfänger (wo keine ID vorliegt).
- `.env.example` (Repo-Root) um `SQL_ECHO=False` (mit Kommentar) sowie das zuvor fehlende Pflichtfeld `RETENTION_CRON_SECRET` ergänzt; `RETENTION_CUSTOMER_MONTHS` dort von veraltet `24` auf `12` korrigiert (Abgleich mit M13-Entscheidung und Code-Default).
- Coolify-Produktions-Env setzt `SQL_ECHO` nicht bzw. explizit `False`; lokale `.env` kann `SQL_ECHO=True` für Debugging setzen.

**Offen — Alt-Logs bereinigen:** Der Code-Fix verhindert nur *neue* Log-Einträge. Bereits geschriebene Docker-Logs auf dem Produktionsserver enthalten weiterhin Klartext-PII (SQL-Echo lief seit Produktivstart). Diese müssen nach dem Deploy manuell auf dem Server geleert werden (siehe Anleitung in CLAUDE.md/GEMINI.md, Abschnitt Deployment).

### Akzeptanzkriterien
**AK-M18.1:** Gegeben `SQL_ECHO` ist nicht gesetzt oder `False` / Wenn das Backend eine Query ausführt / Dann erscheint keine SQL-Query mit Parametern im Log.
**AK-M18.2:** Gegeben `SQL_ECHO=True` ist lokal gesetzt / Wenn das Backend eine Query ausführt / Dann erscheint die Query wie bisher im Log (Debugging weiterhin möglich).
**AK-M18.3:** Gegeben eine Verifikations-, Reset- oder Konto-E-Mail schlägt fehl / Wenn der Fehler geloggt wird / Dann enthält die Log-Zeile keine E-Mail-Adresse.

### Aufwandsschätzung
~1 Stunde. Risiko: Niedrig — reine Konfigurations- und Logging-Änderung, keine Migration.

---

### M19: Log-Rotation + IP-Kürzung im Zugriffslog (P1)

**Status:** Umgesetzt und getestet am 2026-07-20, **wartet auf Deploy-Freigabe.**
Folgemaßnahme zum Rechtstexte-Abgleich (`docs/analysis/RECHTSTEXTE_ABGLEICH.md`,
Kategorie 3): Die Datenschutzerklärung behauptete „IP-Adresse (anonymisiert bzw. nach
kurzer Zeit gelöscht)" — das stimmte nicht mit dem Code überein. Verlauf: (1) Text
zunächst auf „vollständig, ohne automatische Löschung" korrigiert (Sofortfix), (2) M19
technisch umgesetzt, (3) Text ein zweites Mal auf „gekürzt … Logs rotieren automatisch"
angepasst — Text und System stimmen jetzt überein, beides im selben Commit/Deploy.

**Zwei Prüfungen vor der Umsetzung (Befund-Charakter, nicht nur Bestätigung):**

1. **Läuft uvicorn mit `proxy-headers` hinter Traefik, und greift der Filter auch dort?**
   Ja, `proxy_headers=True` ist uvicorns Default (`uvicorn/config.py:219`), aktiv ohne
   explizites Flag. Aber: `forwarded_allow_ips` steht auf uvicorns Default `"127.0.0.1"`
   (`uvicorn/config.py:356`) — nirgends im Repo überschrieben (kein `FORWARDED_ALLOW_IPS`,
   kein `--forwarded-allow-ips`-Flag in `backend/entrypoint.sh`). `ProxyHeadersMiddleware`
   übernimmt `X-Forwarded-For` nur, wenn der **direkte TCP-Peer** in `trusted_hosts` steht
   (`uvicorn/middleware/proxy_headers.py`: `if client_host in self.trusted_hosts`). Der
   Backend-Container hat laut `docker-compose.yml` **keinen** direkten Traefik-Zugang —
   nur `frontend` hängt am externen `coolify`-Netz mit Traefik-Label (Commit `64359fb`);
   der Backend-Host-Port wurde später aus DSGVO-Gründen sogar explizit entfernt
   (Commit `68391bb`: „Backend und DB waren … ausschließlich intern erreichbar nötig,
   exponierten aber Host-Ports direkt an Traefik/TLS vorbei"). Der Backend-Container wird
   also ausschließlich vom `frontend`-Container über das interne Compose-Netz erreicht —
   dessen interne Docker-IP ist nicht `127.0.0.1` und damit nicht in `trusted_hosts`.
   **Folge:** `scope["client"]` bleibt der rohe TCP-Peer, unabhängig davon, was in
   `X-Forwarded-For` steht — uvicorn loggt aktuell die **interne IP des
   Frontend-Containers**, nicht die reale Besucher-IP. Der M19-Filter greift korrekt auf
   das, was tatsächlich im Log-Record steht (per End-to-End-Test mit echtem uvicorn-Server
   verifiziert, s. Akzeptanzkriterien) — kürzt im aktuellen Deployment also technisch eine
   interne Infrastruktur-IP, nicht direkt eine reale Nutzer-IP. Das senkt das reale Risiko
   zusätzlich, ist aber auch als eigener Befund festzuhalten: Das Backend-Zugriffslog
   eignet sich in der aktuellen Topologie nicht zur Unterscheidung einzelner Besucher
   (z. B. für Abuse-Erkennung) — falls das gewollt ist, müsste `FORWARDED_ALLOW_IPS` auf
   die interne Frontend-Container-Adresse gesetzt werden (nicht Teil dieser Maßnahme).

2. **Werden Client-IPs sonst noch irgendwo geloggt?** Backend-seitig geprüft und
   **kein weiterer Fund**: `app/core/exceptions.py` loggt nichts (keine `logger`-Aufrufe);
   `app/core/limiter.py` (slowapi, `key_func=get_remote_address`) hält die IP nur
   in-memory für die Rate-Limit-Zählung, slowapis eigener Logger protokolliert laut
   Quellcode nur Storage-/Fehlerzustände, nie die Client-IP selbst; `auth/service.py`
   (`record_failed_attempt`/`compute_delay`, Login-Bruteforce-Bremse) hält die IP nur in
   einem In-Memory-`TTLCache` (600s TTL), schreibt sie in keinen Logger.
   **Traefik-eigenes Access-Log — geklärt (2026-07-20, Prüfung auf dem Server durch
   Azzam):** `docker logs coolify-proxy` enthält ausschließlich ACME-Fehlermeldungen,
   keine Zugriffszeilen und keine IP-Adressen — Traefik führt kein Access-Log. Damit
   gibt es **keinen zweiten Speicherort für ungekürzte Besucher-IPs**; §4 der
   Datenschutzerklärung ist vollständig und korrekt. Offene Frage 6 (unten) ist
   geschlossen.

   **Nebenbefund bei derselben Server-Prüfung (nur dokumentiert, kein Handlungsbedarf):**
   TLS-Zertifikat für `azzam-salon.de` gültig bis 14.10.2026 (ausgestellt 16.07.2026).
   Die ACME-Fehlermeldungen im Traefik-Log tragen den Token `*` und stammen mit hoher
   Wahrscheinlichkeit von externen Scannern, die `/.well-known/acme-challenge/`
   abklappern — kein Konfigurationsfehler. DNS korrekt: `azzam-salon.de` und
   `www.azzam-salon.de` zeigen beide auf den Server. **Merken: Zertifikatserneuerung
   Mitte September 2026 kontrollieren** (Coolify erneuert i.d.R. automatisch vor
   Ablauf, aber gegenprüfen).

**Befund:** uvicorn läuft mit Standard-Zugriffslog (volle Client-IP), gestartet ohne
zusätzliche Logging-Konfiguration (`backend/entrypoint.sh`: `exec uvicorn app.main:app
--host 0.0.0.0 --port 8000`, kein Custom-Formatter). Weder `docker-compose.yml` noch
`Dockerfile` (Backend oder Frontend) enthalten einen `logging`-Abschnitt — keine
Rotation, keine Größen-/Anzahlbegrenzung. Der Docker-Standardtreiber (`json-file`)
akkumuliert dadurch unbegrenzt.

**Erwartetes Verhalten:**
1. Docker-seitige Logs sind in Größe und Anzahl begrenzt (Rotation), für **beide**
   Services (`backend` und `frontend`), damit alte Log-Dateien nicht unbegrenzt
   wachsen bzw. liegen bleiben.
2. Die IP-Adresse wird **vor dem Schreiben ins Log** gekürzt, nicht erst nachträglich
   oder zeitlich begrenzt — das entfernt den Personenbezug direkt an der Quelle, statt
   ihn nur für eine begrenzte Zeit aufzubewahren. Etabliertes Verfahren (vgl. Praxis von
   z. B. Matomo/Google Analytics „IP-Anonymisierung"): IPv4 letztes Oktett auf `0`,
   IPv6 letzte 80 Bit auf `0`.
3. Ein automatisierter Test belegt, dass nach der Änderung keine vollständige IP mehr
   im Log-Output auftaucht (z. B. Regex-Prüfung auf eine Test-Log-Zeile).

**Umgesetzte Lösung:**
- **Docker-Logging-Optionen:** `docker-compose.yml` — je ein `logging`-Block
  (Treiber `json-file`, `max-size: "10m"`, `max-file: "3"`) für `backend` und
  `frontend`. Mit `docker compose config` validiert.
- **IP-Kürzung:** Neue Datei `backend/app/core/logging.py` —
  `TruncateClientIPFilter` (ein `logging.Filter`) hängt sich an den
  `uvicorn.access`-Logger und schreibt `record.args` um, bevor der Formatter die
  Zeile rendert (IPv4 → `/24`-Netzadresse = letztes Oktett `0`, IPv6 →
  `/48`-Netzadresse = letzte 80 Bit `0`, via `ipaddress`-Stdlib). Eingebunden in
  `backend/app/main.py:create_app()`. Betrifft nur das Zugriffslog — SQL-Echo (M18)
  und die Anwendungs-Logs bleiben unverändert (dort steht ohnehin keine IP).
  Reassemblierung von IPv6 nutzt Standard-Klammer-Notation (`[addr]:port`), da
  truncierte IPv6-Netzadressen oft auf `::` enden und ein naives `addr:port` sonst
  einen mehrdeutigen dreifachen Doppelpunkt erzeugt hätte (im eigenen Test
  aufgefallen und korrigiert).
- **Test:** `backend/tests/unit/test_logging.py`, 6 Tests — Kürzung isoliert
  (IPv4/IPv6), Filter-Verhalten auf `LogRecord`-Objekten, Regressionstest auf der
  **gerenderten** Log-Zeile. Zusätzlich end-to-end mit echtem laufendem
  uvicorn-Server verifiziert (echter Request, Log-Zeile zeigte `127.0.0.0:<port>`
  statt `127.0.0.1:<port>`).
- **Reihenfolge eingehalten:** Text zuerst auf Ist-Zustand korrigiert, dann M19
  umgesetzt und getestet, danach zweite Textanpassung auf „gekürzt … rotieren
  automatisch" — beides im selben Commit.

### Akzeptanzkriterien
**AK-M19.1:** ✅ Docker-Logging-Optionen gesetzt für `backend` und `frontend`,
`docker compose config` validiert.

**AK-M19.2:** ✅ IPv4 — Test + End-to-End-Lauf bestätigen: letztes Oktett auf `0`.

**AK-M19.3:** ✅ IPv6 — Test bestätigt: letzte 80 Bit auf `0`, Klammer-Notation bei
Reassemblierung.

**AK-M19.4:** ✅ Regressionstest (`test_full_ip_never_reaches_the_formatted_log_line`)
prüft die gerenderte Zeile, nicht nur Zwischenwerte.

### Aufwandsschätzung
~2–3 Stunden (Docker-Logging-Optionen ~0,5–1h; IP-Kürzungsfilter inkl. Test ~1,5–2h).
Risiko: Niedrig — kein DB-Zugriff, keine Migration; Fehlkonfiguration des Filters
würde im schlimmsten Fall das Zugriffslog unbrauchbar machen, nicht die Anwendung
selbst beeinträchtigen.

---

### M20: Rate-Limits laufen gegen interne Frontend-IP statt Besucher-IP (P1)

**Status:** Freigegeben und in Umsetzung (2026-07-20). Entscheidung zu Punkt 3
(voll vs. gekürzt) getroffen: **volle IP** (s. Punkt 3 unten). Bei der
M19-Umsetzung aufgefallener Sicherheitsbefund, kein Datenschutzthema: Weil
`forwarded_allow_ips` auf uvicorns Default `127.0.0.1` steht (s. M19, Prüfung 1) und
der Backend-Container ausschließlich vom `frontend`-Container aus erreicht wird,
verwirft `ProxyHeadersMiddleware` jeden `X-Forwarded-For`-Header. Alle
sicherheitsrelevanten Mechanismen, die aktuell `request.client.host` lesen, sehen
deshalb nicht die Besucher-IP, sondern die interne, für alle Besucher gleiche
Frontend-Container-IP.

#### 1. Beleg im Code — alle Stellen, die Client-IP für Sicherheitszwecke nutzen

**Globaler Rate-Limiter (slowapi):**
- `backend/app/core/limiter.py:4` — `Limiter(key_func=get_remote_address)`.
  `get_remote_address` (slowapi, `slowapi/util.py:20-25`) liest `request.client.host`
  — dieselbe, von `ProxyHeadersMiddleware` betroffene Adresse.
- Eingesetzt an 7 Endpunkten:
  - `backend/app/domains/auth/router.py:22` — Admin-Login (`RATE_LIMIT_LOGIN_PER_MINUTE`/min)
  - `backend/app/domains/customer_account/router.py:60` — Registrierung
  - `backend/app/domains/customer_account/router.py:79` — Kunden-Login
  - `backend/app/domains/customer_account/router.py:118` — Passwort-Vergessen
  - `backend/app/domains/customer_account/router.py:129` — Passwort-Reset
  - `backend/app/domains/booking/public_router.py:52` — Öffentliche Terminbuchung
  - `backend/app/domains/booking/public_router.py:73` — Stornierung per Token
  - `backend/app/domains/maintenance/router.py:32` — Retention-Cron (zusätzlich durch
    Secret-Token geschützt, daher geringeres Einzelrisiko)

**Zweiter, unabhängiger Mechanismus — Login-Bruteforce-Bremse (exponentielles Backoff):**
- `backend/app/domains/auth/service.py:12` — `failed_attempts_cache = TTLCache(maxsize=1000, ttl=600)`
- `backend/app/domains/auth/service.py:70-77` — `record_failed_attempt(ip)` / `compute_delay(ip)`
- Genutzt von **beiden** Login-Wegen, nicht nur Admin:
  - `backend/app/domains/auth/router.py:29` — `ip = request.client.host` (Admin-Login)
  - `backend/app/domains/customer_account/router.py:85` — `ip = request.client.host if request.client else "unknown"`, übergeben an `account_service.login(..., ip=ip)`, welches intern dieselben `compute_delay`/`record_failed_attempt`-Funktionen aus `auth/service.py` aufruft (Kunden-Login teilt sich den Cache mit dem Admin-Login).

**Konsequenz (wie vom Auftraggeber benannt):** Beide Mechanismen — slowapi UND die
Backoff-Bremse — schlüsseln aktuell effektiv nach einer für alle Besucher identischen
IP (der internen Frontend-Adresse). Damit teilen sich alle echten Kunden ein
gemeinsames Rate-Limit-/Backoff-Konto: Ein Angreifer mit vielen Login- oder
Buchungsversuchen sperrt faktisch alle echten Besucher aus (Denial-of-Service durch
Fremdverschulden), während die Bremse pro einzelnem Angreifer nicht mehr greift, weil
sein Kontingent mit dem aller anderen vermischt ist. Betroffen sind damit: Admin-Login,
Kunden-Login, Registrierung, Passwort-Reset, öffentliche Terminbuchung und
Stornierung per Token — nicht nur Login, wie ursprünglich vermutet.

#### 2. Lösungsvorschlag: `FORWARDED_ALLOW_IPS` korrekt setzen

`forwarded_allow_ips` wird von uvicorn direkt aus der Umgebungsvariable
`FORWARDED_ALLOW_IPS` gelesen (`uvicorn/config.py:356`) — kein Code-Change in unserer
Settings-Klasse nötig, nur eine Env-Var im Deployment.

**Korrektur (2026-07-20):** Die ursprünglich hier empfohlene Option — ein eigenes,
in `docker-compose.yml` fest auf `172.28.238.0/24` gepinntes Netz — wurde umgesetzt
und dann **wieder verworfen**, nachdem eine Prüfung auf dem Server ergab: Das
tatsächliche Docker-Netz existiert bereits, verwaltet von Coolify, mit Subnetz
**`10.0.2.0/24`** (Beleg: `docker network inspect fqn7wcg6j298388nl152nrty` →
`"Subnet": "10.0.2.0/24"`; Frontend-Container-IP in den Backend-Logs entsprechend
`10.0.2.5`). Docker kann das Subnetz eines bestehenden Netzes nicht nachträglich
ändern — das gepinnte `172.28.238.0/24` hätte den Deploy entweder scheitern lassen
oder Coolify hätte das Netz neu angelegt, was alle Container kurzzeitig von der
Verbindung trennt. Coolify verwaltet dieses Netz selbst; wir pinnen es **nicht**.
Das `networks`-Overrde in `docker-compose.yml` wurde vollständig entfernt.

Neu bewertete Optionen, jetzt mit dem tatsächlich beobachteten Subnetz:

- **a) `10.0.2.0/24` (exakt, das aktuell beobachtete Subnetz).** Präzise, aber
  bricht still, falls Coolify das Netz je neu anlegt (z. B. bei einem größeren
  Coolify-Update oder Host-Wechsel) — dann sind Rate-Limits wieder wirkungslos,
  ohne Fehlermeldung, exakt das ursprüngliche Problem in neuer Form.
- **b) `10.0.0.0/8` — empfohlen.** Deckt das beobachtete `10.0.2.0/24` ab und bleibt
  auch gültig, falls Coolify beim Neuanlegen ein anderes `10.x.x.0/24`-Subnetz
  vergibt (plausibel, da IPAM-Pools i. d. R. innerhalb desselben privaten Blocks
  bleiben). **Wichtige Klarstellung, warum das hier nicht riskanter ist als
  Option a):** Die Breite von `FORWARDED_ALLOW_IPS` entscheidet nicht, *wer das
  Backend erreichen kann* — das regelt ausschließlich die Docker-Netz-Mitgliedschaft
  (nur Container, die Coolify auf dasselbe Netz legt, können uvicorns Port
  überhaupt anfragen; verschiedene Docker-Netze sind standardmäßig voneinander
  isoliert). `FORWARDED_ALLOW_IPS` entscheidet nur, ob einem *bereits erreichenden*
  Peer der `X-Forwarded-For`-Header geglaubt wird. Selbst im Fehlerfall „Backend-Port
  wird versehentlich wieder freigegeben" (ist hier schon einmal passiert, Commit
  `68391bb`) hilft die engere Option a) kaum zusätzlich: Ein echter Angreifer aus
  dem Internet hätte eine öffentliche Absender-IP, keine private RFC-1918-Adresse
  wie `10.x.x.x` — sein gefälschter Header würde von `10.0.0.0/8` so wenig vertraut
  wie von `10.0.2.0/24`, weil sein *TCP-Peer* (seine echte IP) in beiden Fällen
  nicht im vertrauten Bereich liegt. `172.16.0.0/12` (die andere ursprünglich
  genannte Alternative) wäre dagegen falsch — das aktuell beobachtete `10.0.2.0/24`
  liegt gar nicht in diesem Bereich.
- **c) `FORWARDED_ALLOW_IPS=*`.** Nicht empfohlen, unverändert zur vorherigen
  Bewertung — vertraut *jedem* Peer, der das Backend erreicht, nicht nur denen im
  aktuellen privaten Netz. Verschenkt die letzte Verteidigungslinie ohne Not, da b)
  denselben praktischen Schutz bei genauso geringem Restrisiko bietet.

**Empfehlung: Option b) `10.0.0.0/8`.** Umgesetzt. Robuster als a) gegen eine
Netz-Neuanlage, ohne den in c) aufgegebenen Header-Schutz.

**Wie `FORWARDED_ALLOW_IPS` jetzt gesetzt wird:** Nicht mehr in `docker-compose.yml`
hartkodiert (das Subnetz ist umgebungsabhängig und wird von Coolify verwaltet,
nicht von diesem Repo) — stattdessen wie `CORS_ORIGINS`/`COOKIE_SECURE` als
`${FORWARDED_ALLOW_IPS}` referenziert und von außen gesetzt: lokal über die
Root-`.env` (`127.0.0.1`), in Coolify über dessen Environment-Variablen-UI
(`10.0.0.0/8`, empfohlener Produktionswert).

#### 3. Entscheidungspunkt: volle oder gekürzte IP als Rate-Limit-Schlüssel?

Nach Umsetzung von Option b liest `request.client.host` die echte, weitergereichte
Besucher-IP. Offen ist, ob diese **voll** oder **vorab gekürzt** (wie in M19, aber
hier zusätzlich auf den Rate-Limit-*Schlüssel* angewandt — M19 selbst ändert nur den
Access-Log-Text, nicht `scope["client"]`, betrifft slowapi/Backoff also nicht
automatisch) als Schlüssel verwendet wird:

| | **Voll** | **Gekürzt (/24 IPv4, /48 IPv6)** |
|---|---|---|
| Zuordnungsgenauigkeit | Exakt pro Besucher | Mehrere Besucher im selben Adressblock teilen sich einen Zähler |
| Praktisches Risiko | Keins zusätzlich zum Bestehenden | Nutzer hinter Mobilfunk-CGNAT oder Firmen-NAT (oft Hunderte Geräte in einem /24) können sich gegenseitig aussperren — dasselbe Grundproblem wie heute, nur eine Stufe kleiner statt komplett gelöst |
| Datenschutz | IP wird **in-memory** gehalten (nicht geloggt — s. u.) | Etwas datensparsamer, aber der Unterschied ist gering, da ohnehin nicht geloggt/persistiert |
| Konsistenz mit M19 | M19 kürzt nur den Log-**Text**; der Schlüsselwert bliebe eine separate, unabhängige Verarbeitung | Würde bedeuten: derselbe Kürzungs-Helper (`backend/app/core/logging.truncate_ip`) wird zusätzlich hier wiederverwendet |

**Geprüft und belegt — „voll" wird nirgends geloggt:** slowapis Standard-Storage ist
`MemoryStorage` (kein `storage_uri` in `backend/app/core/limiter.py` gesetzt) — reiner
Zähler im Prozessspeicher, nicht auf Platte, nicht in einem Logger. Der
Backoff-`TTLCache` (`auth/service.py:12`) ebenso: In-Memory, TTL 600s, kein
`logger`-Aufruf in `record_failed_attempt`/`compute_delay`. Beide Werte verschwinden
beim Neustart des Containers bzw. nach Ablauf des jeweiligen Zeitfensters.

**Empfehlung: volle IP.** Begründung: Die gekürzte Variante löst das
Denial-of-Service-Problem nur unvollständig (CGNAT/Firmen-NAT-Kollisionen bleiben ein
reales Risiko, gerade bei Mobilfunknutzern), während der Datenschutz-Mehrwert der
Kürzung hier gering ist, da der Wert ohnehin nie geloggt oder persistiert wird, nur
kurzzeitig (Rate-Limit-Fenster bzw. 600s) im Arbeitsspeicher liegt und einem klar
umrissenen, legitimen Sicherheitszweck dient. **Entscheidung liegt bei Azzam.**

**Entschieden (2026-07-20): volle IP.** Begründung fürs Protokoll (Auftraggeber): Der
Wert wird nirgends geschrieben, lebt nur kurz im Speicher, und die gekürzte Variante
verkleinert das NAT-Kollisionsrisiko nur, statt es zu lösen. Der Kürzungsfilter aus
M19 bleibt für das **Log** unverändert wirksam — gekürzt im Log, voll im Speicher
(Rate-Limit-Zähler und Backoff-Cache). Kein Kürzungs-Wrapper für den
Rate-Limit-Schlüssel nötig; `limiter.py`/`auth/service.py` bleiben unverändert, sie
lesen nach der Umstellung automatisch die korrekte, echte IP.

#### 4. Wirkung auf M19 / §4 der Datenschutzerklärung

Der M19-Filter (`TruncateClientIPFilter`) hängt am `uvicorn.access`-Logger und kürzt,
was auch immer zum Zeitpunkt des Log-Schreibens in `scope["client"]` steht — er ist
unabhängig davon, wie dieser Wert zustande kam. **Er greift nach der Umstellung
unverändert weiter**, kürzt danach aber die tatsächliche, weitergereichte
Besucher-IP statt der bisherigen internen Frontend-IP. Die Aussage in §4 („IP-Adresse
gekürzt … Logs rotieren automatisch") bleibt damit **wörtlich weiterhin korrekt** —
sie hat nie behauptet, wessen IP dort steht, nur dass sie gekürzt wird. **Keine
Textänderung an §4 durch M20 nötig.**

Separat davon: M20 führt eine **neue, bisher nirgends erwähnte** Datenverarbeitung
ein — die Datenschutzerklärung beschreibt aktuell keine IP-basierte
Rate-Limitierung/Bruteforce-Bremse überhaupt (weder in-memory noch anderweitig). Das
ist keine Ungenauigkeit einer bestehenden Aussage, sondern eine Lücke, die bei der
nächsten Textüberarbeitung mitgedacht werden sollte — hier bewusst nicht
vorformuliert. Als offener Punkt in `docs/analysis/RECHTSTEXTE_ABGLEICH.md`
aufgenommen.

#### 5. `FORWARDED_ALLOW_IPS`: Fehlen abfangen — und falschen Wert erkennen

Zwei getrennte Probleme, zwei getrennte Mechanismen. Ein Pflichtfeld fängt nur ein
**Fehlen** ab; ein falscher, aber vorhandener Wert (z. B. nach einer Docker-Netz-Neuanlage
mit anderem Subnetz — genau das ist bei der Umsetzung dieser Maßnahme selbst passiert,
s. Punkt 2) rutscht daran vorbei, ohne dass irgendetwas sichtbar scheitert.

**5a. Fehlen abfangen — Pflichtfeld.** `FORWARDED_ALLOW_IPS` ist als **eigenes,
erforderliches Feld** in `Settings` (`backend/app/core/config.py`) aufgenommen —
obwohl uvicorn selbst den Wert unabhängig direkt aus der Umgebungsvariable liest
(`uvicorn/config.py:356`), nicht aus unserer `Settings`-Klasse. Diese zweite,
redundante Lesestelle dient ausschließlich als Stolperdraht: Fehlt die Variable,
wirft Pydantic beim Start eine `ValidationError` und das Backend startet **nicht** —
dasselbe, bereits etablierte Muster wie bei `RETENTION_CRON_SECRET`. Abgewogen gegen
eine reine Log-Warnung bei Fehlen: Ein Startfehler kann nicht ignoriert werden, eine
Log-Zeile schon — und nach M18 wissen wir, dass Log-Disziplin in diesem Projekt
bereits einmal gelitten hat (hartkodiertes SQL-Echo lief unbemerkt bis zur Prüfung).

**5b. Falschen Wert erkennen — Startup-Drift-Check.** Ein Pflichtfeld kann nicht
prüfen, ob ein *vorhandener* Wert noch zum *tatsächlichen* Docker-Netz passt — dafür
gibt es keine externe Quelle der Wahrheit, die sich zuverlässig zur Startzeit
abfragen ließe. Es gibt aber ein billiges, echtes Signal: Backend und der Peer, dem
`FORWARDED_ALLOW_IPS` vertrauen soll, hängen am **selben** Docker-Netz — die eigene
Adresse des Backend-Containers liegt also zwangsläufig im selben Subnetz. Liegt sie
**nicht** im konfigurierten Bereich, ist der Bereich zwangsläufig veraltet.

Umgesetzt: `backend/app/core/logging.py::warn_if_forwarded_allow_ips_mismatches_network()`
— ermittelt die eigene Container-Adresse (`socket.gethostbyname(socket.gethostname())`,
Standardmuster für Container-Selbsterkennung), prüft sie gegen `FORWARDED_ALLOW_IPS`
(CIDR- und Literal-Einträge, mehrere kommagetrennt, analog zu uvicorns eigenem
`_TrustedHosts`-Parsing), und schreibt bei Nichtübereinstimmung eine `logger.warning(...)`
mit beiden Werten. Kein Startabbruch — anders als beim fehlenden Wert lässt sich ein
„falscher" Wert nicht mit derselben Sicherheit von einem harmlosen Grenzfall
unterscheiden (z. B. lokale Entwicklung außerhalb Docker, wo die eigene
Hostname-Auflösung etwas anderes als erwartet liefert); das bleibt eine Warnung, die
ein Mensch liest, kein hartes Gate. `FORWARDED_ALLOW_IPS=*` und eine nicht auflösbare
eigene Adresse (z. B. lokal ohne Docker) werden bewusst übersprungen, nicht als
Fehler gewertet.

Manuell verifiziert (zusätzlich zu den automatisierten Tests): Mit
`FORWARDED_ALLOW_IPS=172.28.238.0/24` (dem verworfenen, falschen Wert) erscheint die
Warnung beim Start; mit einem Wert, der die eigene aufgelöste Adresse abdeckt,
erscheint keine.

**Zu dokumentieren:** `.env.example` (Repo-Root), `CLAUDE.md`, `GEMINI.md`
(Pflichtvariable, analog zum bestehenden `RETENTION_CRON_SECRET`-Hinweis) sowie der
Deployment-Abschnitt (Coolify-Setup-Checkliste, empfohlener Produktionswert
`10.0.0.0/8`).

### Akzeptanzkriterien

**AK-M20.1:** Gegeben zwei Requests kommen mit unterschiedlichen (nach Option b
vertrauenswürdig weitergereichten) Client-IPs an / Wenn beide denselben
rate-limitierten Endpunkt aufrufen / Dann führen sie zu getrennten
Rate-Limit-Zählern (slowapi).

**AK-M20.2:** Gegeben zwei Requests mit unterschiedlichen Client-IPs lösen beide
einen fehlgeschlagenen Login aus / Dann führen sie zu getrennten Einträgen im
Backoff-`TTLCache`, nicht zu einem gemeinsamen Zähler.

**AK-M20.3:** Gegeben ein Request kommt vom Backend-Zugriffslog aus gesehen an /
Wenn die Zeile geschrieben wird / Dann steht dort weiterhin keine vollständige IP
(M19 bleibt wirksam).

**AK-M20.4:** Gegeben ein `X-Forwarded-For`-Header wird von einem **nicht**
vertrauenswürdigen Absender gesendet (außerhalb des konfigurierten
`FORWARDED_ALLOW_IPS`-Bereichs) / Wenn der Request das Backend erreicht / Dann wird
der Header-Wert **nicht** übernommen — `scope["client"]` bleibt der tatsächliche
TCP-Peer.
**Verifikationspflicht, ausdrücklich festgehalten:** Dieses Kriterium MUSS über einen
echten End-to-End-Lauf (echter uvicorn-Prozess, echter HTTP-Request, echte
`ProxyHeadersMiddleware`) verifiziert werden — analog zum M19-Nachweis. Der
bestehende Testaufbau (`httpx.ASGITransport`, ruft die FastAPI-`app` direkt auf) geht
an `ProxyHeadersMiddleware` vorbei, weil diese ausschließlich beim echten
uvicorn-Start über `Config.load()` eingehängt wird — ein Test über `ASGITransport`
prüft damit nicht die Schicht, um die es hier geht, und zählt **nicht** als
Nachweis für dieses Kriterium (vgl. die in dieser Spec bereits verankerte Regel: ein
Test zählt erst als Nachweis, wenn er nachweislich ausgeführt wurde und die
tatsächlich betroffene Schicht durchläuft).

**AK-M20.5:** Gegeben ein Request kommt regulär über den `frontend`-Container /
Wenn die Umstellung aktiv ist / Dann funktioniert die normale Buchungs-/Login-Kette
weiterhin unverändert (Regressionsschutz — keine Endpunkte brechen durch die
Netz-/Env-Änderung).

**AK-M20.6:** Gegeben `FORWARDED_ALLOW_IPS` ist nicht gesetzt / Wenn das Backend
startet / Dann startet es **nicht** (sichtbarer Fehler), analog zu
`RETENTION_CRON_SECRET` — nicht ein stiller Rückfall auf „Rate-Limits laufen weiter
gegen die Container-IP".

**AK-M20.7:** Gegeben `FORWARDED_ALLOW_IPS` ist gesetzt, deckt aber nicht die eigene
Container-Adresse ab (Drift, z. B. nach einer Docker-Netz-Neuanlage mit anderem
Subnetz) / Wenn das Backend startet / Dann erscheint eine Log-Warnung mit dem
konfigurierten und dem tatsächlichen Wert — das Backend startet trotzdem (Warnung,
kein Gate). Gegenprobe: Deckt der Wert die eigene Adresse ab, erscheint keine
Warnung.

### Aufwandsschätzung
~3–4 Stunden veranschlagt, ~3,5h tatsächlich. Risiko war **Mittel** eingestuft
(sicherheitskritische Vertrauenskonfiguration: zu eng gefasst lässt das Problem
ungelöst, zu weit gefasst öffnet Header-Spoofing) — durch sorgfältige Wahl von
`FORWARDED_ALLOW_IPS` (gepinntes Subnetz statt `*`) und den echten
End-to-End-Nachweis (statt nur Unit-Test der Middleware-Logik) adressiert.

### Umsetzung (2026-07-20, zweimal — s. Korrektur in Punkt 2)

- **`docker-compose.yml`:** **Kein** Subnetz-Pinning (s. Korrektur, Punkt 2) — der
  `networks.default.ipam`-Block wurde vollständig entfernt, Coolify verwaltet das
  Netz selbst. `FORWARDED_ALLOW_IPS=${FORWARDED_ALLOW_IPS}` (wie `CORS_ORIGINS`/
  `COOKIE_SECURE` von außen gesetzt, nicht hartkodiert). Lokal: Root-`.env` und
  `backend/.env` auf `127.0.0.1`. Produktion: Coolify-Env auf `10.0.0.0/8` zu setzen
  (außerhalb dieses Repos, vom Auftraggeber). Mit `docker compose config` validiert.
- **`backend/app/core/config.py`:** `FORWARDED_ALLOW_IPS: str` als Pflichtfeld
  (Stolperdraht-Muster, s. Punkt 5a) — kein weiterer Code-Change nötig, da uvicorn
  den Wert selbst direkt aus der Umgebung liest; `limiter.py`/`auth/service.py`
  unverändert, sie lesen nach der Umstellung automatisch die echte IP (Entscheidung:
  volle IP, s. Punkt 3).
- **`backend/app/core/logging.py`:** neue Funktion
  `warn_if_forwarded_allow_ips_mismatches_network()` (Drift-Check, s. Punkt 5b),
  eingehängt in `app/main.py:create_app()`.
- **`.env.example`, Root-`.env`, `backend/.env`, CLAUDE.md, GEMINI.md:** dokumentiert,
  analog zu `RETENTION_CRON_SECRET`, inkl. der Korrektur und des empfohlenen
  Produktionswerts `10.0.0.0/8`.
- **Tests:**
  - `backend/tests/unit/test_config.py` — AK-M20.6 (Pflichtfeld, `ValidationError`
    bei fehlendem Wert).
  - `backend/tests/integration/test_rate_limiting_by_ip.py` — AK-M20.1 (slowapi,
    zwei `ASGITransport`-Clients mit unterschiedlichem `client=`-Tupel, ein
    ausgeschöpftes Kontingent blockiert nicht die andere IP) und AK-M20.2
    (Backoff-Cache, direkt auf `record_failed_attempt`/`compute_delay` getestet).
    Für diese beiden reicht `ASGITransport`, da sie nur prüfen, ob unterschiedliche
    `request.client.host`-Werte getrennt gezählt werden — unabhängig davon, wie
    dieser Wert zustande kommt.
  - `backend/tests/integration/test_forwarded_for_trust_boundary.py` — AK-M20.4,
    **wie gefordert über einen echten uvicorn-Subprozess**, nicht `ASGITransport`
    (`ProxyHeadersMiddleware` wird nur beim echten uvicorn-Start über
    `Config.load()` eingehängt, ein `ASGITransport`-Test würde diese Schicht
    komplett umgehen und wäre kein Nachweis). Zwei Fälle: gefälschter
    `X-Forwarded-For` von nicht-vertrauenswürdigem Absender wird verworfen
    (negativ) **und** von vertrauenswürdigem Absender übernommen (positiv —
    beweist, dass der negative Fall tatsächlich die Prüfung testet und nicht
    einen ohnehin wirkungslosen Header). Beide grün, verifiziert am gerenderten
    Access-Log-Output.
  - **Befund beim Testen:** Diese beiden E2E-Tests liefen isoliert in 5,8s grün,
    verlangsamten den **vollständigen** Suite-Lauf aber von ~53s auf ~774s
    (reproduziert). Ursache mit hoher Wahrscheinlichkeit eine
    Windows-spezifische Interaktion zwischen den gespawnten uvicorn-Subprozessen
    und den vielen bereits offenen Async-Event-Loops aus vorangegangenen Tests —
    kein Fehler im geprüften Verhalten selbst. Diese 13-fache Verlangsamung jedem
    Routine-`pytest`-Lauf aufzuerlegen stand in keinem Verhältnis zum Nutzen für
    zwei Tests. Datei daher standardmäßig übersprungen
    (`pytestmark = pytest.mark.skipif(...)`), explizit ausführbar mit
    `RUN_E2E_TESTS=1`. Frisch mit dieser Umgebungsvariable erneut verifiziert:
    grün. Opt-in bedeutet hier nicht ungeprüft — der Test lief nachweislich und
    war grün, nur nicht als Teil des Standardlaufs.
  - `backend/tests/unit/test_logging.py` (ergänzt) — AK-M20.7 (Drift-Check):
    keine Warnung, wenn die eigene Adresse im konfigurierten Bereich liegt (CIDR
    **und** Literal-Match); Warnung mit beiden Werten, wenn nicht;
    `FORWARDED_ALLOW_IPS=*` und nicht auflösbare eigene Adresse werden übersprungen,
    nie fälschlich als Warnung gemeldet. Zusätzlich manuell mit echtem Prozessstart
    gegengeprüft (s. Punkt 5b).
- **Volle Suite (Standardlauf, ohne `RUN_E2E_TESTS`):** 150 passed, 3 skipped,
  0 failed, ~54s.

---

## Offene Fragen

1. **Pagination für Kundenliste?** Bei >100 Kunden wird die Liste unhandlich. Soll Pagination (Backend: `limit`/`offset`-Parameter) in M1 mitgebaut werden oder als separates Ticket?

2. **Pausen im Arbeitsplan?** Das aktuelle Modell kennt keine Pausen. Soll das in M3 berücksichtigt werden (z.B. Frühstückspause 12:00–12:30 als separater Slot), oder ist das ein eigenes Feature?

3. **Arbeitsplan: Toggle "Arbeitet" vs. Expliziter freier Tag?** Soll der Wochenplan eine Checkbox „Arbeitet an diesem Tag" haben (wie bei Öffnungszeiten), oder reicht es, wenn leere Zeiten als „frei" interpretiert werden?

4. **Dienstleistungen-Filter-Bug:** Können wir zur Verifizierung des Befunds auf die Produktionsdatenbank schauen (z.B. `SELECT target_group, is_active, COUNT(*) FROM services GROUP BY 1, 2`)? Das würde klären, ob es ein Daten- oder Code-Problem ist.

5. **Admin-Token-Refactoring (M7):** Soll M7 alle Admin-Seiten auf einmal umstellen oder seitenweise als Teil der jeweiligen Bug-Fixes?

6. ~~**Traefik-Access-Log:**~~ **Geschlossen 2026-07-20.** Kein Access-Log vorhanden (`docker logs coolify-proxy` zeigt nur ACME-Fehlermeldungen ohne IP-Bezug) — kein zweiter Speicherort für Besucher-IPs. S. M19 oben.

7. **`FORWARDED_ALLOW_IPS` setzen?** — jetzt als **M20** spezifiziert (Sicherheitsbefund: Rate-Limits laufen aktuell gegen die interne Frontend-IP statt gegen die echte Besucher-IP, alle Besucher teilen sich ein Kontingent). S. M20 unten, insbesondere Entscheidungspunkt 3 (volle vs. gekürzte IP für den Rate-Limit-Schlüssel).
