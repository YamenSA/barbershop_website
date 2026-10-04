# TIMEZONE_HOTFIX_SPEC — Zeitzonen-Hotfix (B-1), Version 3 (Stufe 1 umgesetzt)

Stand: Code + Tests umgesetzt auf `hotfix/timezone` (Basis `main` @ `88daa6b`, M18–M20 live) · **nichts auf `main`, nichts gepusht** · Ergebnisse siehe §9.
Legende: **✔** im Code gelesen · **▶** von mir ausgeführt (Ausgabe gezeigt) · **⚠** noch nicht bewiesen, braucht Daten/Test.

## 0. Was sich gegenüber Version 1 geändert hat

| | Version 1 | Version 2 |
|---|---|---|
| Wahrheit | offen („Mail vs. Website“) | **Mail-Zeit = Wandzeit Europe/Berlin = Wahrheit** (Azzam bestätigt: Kunden kamen nach der Mail) |
| Variante „gewählte Zeit = Wahrheit, keine Migration“ | Alternative | **verworfen** |
| Migration | 1 Tabelle `tz_migration_log` optional | **Pflicht:** `tz_migration_log` (Tabelle, Zeile, Spalte, alt, neu, Klasse), Dry-Run, idempotent, Downgrade **aus dem Log** |
| Klassifikation | Entscheidungsbaum mit Heuristiken | **Beweisführung** aus den drei Erzeugungsstellen im Code + Restmenge, die nur ein Mensch entscheiden kann (Absicherung in §2.4) |
| FullCalendar | `local` lassen | **Berlin explizit** (Plugin `@fullcalendar/luxon3` + `luxon`) |
| Stornofrist, B-2 | offen | 24 **echte** Stunden; B-2 separater Mini-Fix (entschieden) |

### 0.1 Deine Hypothese — geprüft, ohne Widerspruch
Ich habe die Erzeugung der Slots mit den echten Modulen ausgeführt (▶, In-Memory-DB, Salonzeit wie in Migration 004/010: 09:00–18:00, Mitarbeiter arbeitet 09–18, Dienstag **13.10.2026**, Leistung 30 min):

```
Salonzeit laut salon_hours: 09:00-18:00 | Slots: 35
  erster   API starts_at=2026-10-13T09:00:00+00:00  Website/Admin (Berlin)=11:00  Mail='13.10.2026 um 09:00 Uhr'
  letzter  API starts_at=2026-10-13T17:30:00+00:00  Website/Admin (Berlin)=19:30  Mail='13.10.2026 um 17:30 Uhr'
```
Das ist exakt deine Beobachtung (11:00 → Admin 11:00–11:30 → Mail 09:00; 19:30 → Admin 19:30–20:00 → Mail 17:30). „Berlin“ steht für das, was ein Browser in Berlin (Website **und** FullCalendar `local`) aus dem UTC-Wert macht. **Mechanismus (✔):** `availability.py` kombiniert die Wandzeit aus `salon_hours`/`working_intervals` mit `tzinfo=UTC`; die Mail formatiert den UTC-Wert direkt (`strftime`); Website und Admin formatieren im Browser in Ortszeit. Belegt für die Wandzeit-Uhrzeit ist die Mail, weil sie den gespeicherten Wert unverändert zeigt.

### 0.1a Produktionsdaten (Queries a–e, vom Betreiber geliefert)
22 Termine, **alle** `origin=online` mit Bestätigungs-Log; keine `walk_in`, keine ohne Log; keine „online, Log, geändert, bestätigt“-Restmenge. 13 bestätigt (11 vergangen, 2 zukünftig), 9 storniert (4 vergangen, 5 zukünftig) — deren `updated_at` ist nur durch die Stornierung neuer. Alle Online-Termine beginnen in den UTC-Stunden 9–17. `salon_hours` Mo–Sa 09:00–18:00, So zu; `working_exceptions`, `day_overrides`, `salon_closures` = 0. Überlappungen = 0, Konto-Umbuchungen = 0. **Folge:** alle 22 Zeilen sind W, R-Klasse und Restmenge sind leer, der PII-Export entfällt. Die Abbruch-Regel bei nicht klassifizierbaren Zeilen bleibt in der Migration (Absicherung für den Zeitraum bis zum Livegang). Für die stornierten Zeilen wurde die Regel **W-B2** ergänzt („`updated_at` nach Statuswechsel“), gestützt auf die Betreiberaussage, dass Online-Termine im Admin nie verschoben wurden.

### 0.2 Zwei Hinweise zum Datum
1. Dein Test ist vom **13.10.2026**, das Live-Ziel „Sonntag **11.10.2026**“ liegt davor. **Sonntag 18.10.2026 ist damit der realistische Termin** (25.10. = Winterzeit ist die harte Grenze; ein 25.10.-Deploy wäre selbst am Umstellungstag). Mein System zeigt als Datum den 29.09.2026 — ich kann nicht wissen, welches Datum bei dir gilt; bitte bestätigen (Frage 2).
2. Bis zum Livegang entstehen weiter W-Zeilen (jede öffentliche Buchung). Das ist gewollt und wird von der Migration erfasst; nur der Zustand „Website zeigt +2 h“ bleibt bis dahin (Frage 9: Sofortmaßnahme).

---

## 1. Codepfade — Zeitkonvention heute → Zielzustand

**W** = Wandzeit als UTC gespeichert/erwartet · **R** = echtes UTC · **neutral** = keine Zone im Spiel · Zielzustand überall **R** in der DB, **Europe/Berlin** in Logik und Anzeige.

### 1.1 Schreiben (Zeitpunkte)

| Pfad | Datei · Funktion | Heute | Ziel |
|---|---|---|---|
| Slot-Erzeugung | `booking/availability.py · get_available_slots` (4× `datetime.combine(…, tzinfo=UTC)`) ✔▶ | **W** | `combine_local(date, time)` → R |
| Öffentliche Buchung | `booking/service.py · create_public_appointment` (Zeile ~645) ✔ | übernimmt Slotwert → **W** | R (Slot ist dann R) |
| Admin-Termin anlegen | `service.py · create_appointment` (Zeile ~137) ← `AppointmentForm.tsx` `new Date(x).toISOString()` ✔ | **R** (nur für Browser in Berlin korrekt) | R; Frontend sendet **naiven Berlin-String**, Backend lokalisiert |
| Admin verschieben | `patch_appointment` ← `AppointmentModal.tsx` ✔ | **R** | R (wie oben) |
| Konto-Umbuchung | `service.py · reschedule_appointment` (Zeile ~447) ← `konto/termine/page.tsx` ✔ | **R** | R (naiv → Berlin) |
| Kalender-Klick | `admin/calendar/page.tsx · handleSelect` ✔ | lokale Getter | `arg.startStr` (Berlin) |
| `working_exceptions` (Sperrzeiten pro Mitarbeiter) | `stammdaten/service.py · create_working_exception`, **kein Frontend-UI** ✔ | client-geliefert, **unbestimmt** (vermutlich 0 Zeilen ⚠) | R; Zeilen (falls vorhanden) per Entscheidung |
| `day_overrides` `custom_start/end_time`, `salon_hours`, `working_intervals`, `working_hours` | Admin-Seiten ✔ | reine **Wandzeit** (`time`) — vom Motor als Wanduhr gelesen | **unverändert** |
| `salon_closures.date`, `day_overrides.date`, `promotions.starts_on/ends_on` | ✔ | reine **Daten** (Promotions rechnen bereits in Berlin, `marketing/service.py`) | unverändert |
| Audit-/Token-Zeitstempel (`created_at`, `updated_at`, `last_active_at`, `anonymized_at`, `email_verified_at`, Token `expires_at/used_at`, `notification_logs.created_at`, `day_overrides.created_at`) | `core/base.py`, Modelle ✔ | **R** (`datetime.now(timezone.utc)`) | unverändert. Randnotiz: `admin_accounts.created_at/updated_at` nutzen `datetime.now` (naiv, Serverzone) ✔ — im Container UTC, latent (P3, nicht Teil des Hotfix) |

### 1.2 Lesen / Rechnen

| Pfad | Datei · Funktion | Heute | Ziel |
|---|---|---|---|
| Vorlaufzeit / Horizont | `availability.get_public_slots`, `create_public_appointment`, `reschedule_appointment` | `now(UTC)+2 h` gegen **W** → im Sommer 0 h, im Winter 1 h Vorlauf | Instant-Rechnung auf R → exakt 2 h |
| Stornofrist | `_build_cancellation_view`, `cancel_by_token`, `cancel_own_appointment`, `list_customer_appointments`, `reschedule_appointment` | `starts_at − 24 h` gegen W → 22 h/23 h vor echtem Termin | 24 **echte** Stunden, Instant-Arithmetik auf R (Entscheidung steht) |
| Reminder-Fenster | `notifications/reminders.py · run_reminder_job` | W-Termine 1–2 h zu spät | Instant auf R |
| Schedule-Check (Admin) | `service.py · _check_working_schedule` (`starts_at.replace(tzinfo=None).time()` = UTC-Uhrzeit gegen Wanduhr-Fenster) ✔ | für R-Termine falsch | `to_salon(dt).time()` |
| Doppelbuchungs-Constraint | Migration 005/007 `EXCLUDE … tstzrange` | rohe Instants; W/R-Mix überlappt real unbemerkt | nach Migration einheitlich R |
| „Egal“-Zuordnung | `resolve_any_member` (Instants) | Mix | R |
| Tagesfenster | `service.py · list_appointments`, `admin_router.py · get_dashboard`/`daily_plan_pdf`, `stammdaten/service.py · create_salon_closure` | `[00:00Z, 24:00Z)` | `salon_day_bounds(date)` (Berlin-Mitternacht, 23/25 h an DST-Tagen) |
| „heute“ | `admin_router.get_dashboard` (`now(UTC).date()`), Frontend `today()` (`toISOString`) | UTC-Datum | `salon_today()` |
| PDF-Uhrzeit | `daily_plan_pdf` (`starts_at.strftime` = UTC) | nur W richtig | `to_salon()` |
| Mail-Formatierung | `notifications/templates.py · _fmt` (Bestätigung, Erinnerung, Umbuchung) | UTC-Uhr: W richtig (=Wanduhr), R **2 h/1 h zu früh** | `to_salon()` |
| Retention | `maintenance/service.py` | relative Fristen | neutral |

### 1.3 Frontend — vollständige Liste (per `grep` ✔)

| Datei | Stelle | Problem |
|---|---|---|
| `public/booking/SlotPicker.tsx` | `formatTime`, `formatDay`, `toLocalDateString` (`toISOString().slice(0,10)`), `weekdayMonday0`, `addDays`, `new Date()` | Browserzone; UTC-Datum; Tagesstrip nicht zonen-unabhängig |
| `public/booking/Confirmation.tsx`, `CancelCard.tsx` (2×) | `toLocaleString('de-DE')` | Browserzone |
| `(account)/konto/termine/page.tsx` | Anzeige + `new Date(newDate).toISOString()` | Browserzone |
| `admin/page.tsx` | `today()`, `fmtTime` | UTC-Datum, Browserzone |
| `admin/customers/page.tsx` | 2× | Browserzone |
| `admin/calendar/page.tsx` | FullCalendar `timeZone` (Standard `local`), `handleSelect` (lokale Getter), `handleDatesSet` (`startStr.slice`) | Browserzone |
| `admin/AppointmentForm.tsx`, `AppointmentModal.tsx` | `new Date(x).toISOString()`, `localDt()` (lokale Getter), `fmt` | Browserzone |
| `admin/DailyPlanExport.tsx` | `new Date().toISOString().slice(0,10)` | UTC-Datum |
| Reine Datumsstrings: `admin/promotions`, `admin/schedule` (`ovr.date`), `public/PromotionsSection`, `BeforeAfterGallery`, `ReviewsSnapshot` | `new Date('YYYY-MM-DD').toLocaleDateString` | Datum als UTC-Mitternacht geparst; für Besucher westlich von UTC ein Tag zu früh |

---

## 2. Klassifikation W / R — beweisbar statt vermutet

### 2.1 Beweislage aus dem Code (✔, vollständig)
Es gibt **genau drei** Stellen, die `Appointment(...)` erzeugen (`grep` über `backend/app` und `backend/scripts`, keine weiteren; keine Seeds/Skripte):

| Stelle | `origin` | Token | Bestätigungs-Log (`notification_logs.kind='confirmation'`) | Zeit-Konvention |
|---|---|---|---|---|
| (A) Admin `create_appointment` | Default `walk_in` (`AppointmentCreate` hat kein `origin`) | nein | nein | **R** (UI: `toISOString`) |
| (B) Öffentlich `create_public_appointment` | `online` | ja | **ja** (`send_confirmation` wird nur vom öffentlichen Router gestartet) | **W** |
| (C) Konto-Umbuchung `reschedule_appointment` | Kopie des Vorgängers | ja | nein (Mail über `send_account_email` ohne Log) | **R** (`toISOString`), Vorgänger wird im selben Commit `cancelled` |

Nach der Erzeugung ändert nur **`patch_appointment`** die Zeit (Admin-Modal, schreibt **R**); `update_appointment_status` ändert nur den Status. Jede UPDATE-Anweisung setzt `updated_at` neu (`onupdate` ✔), unterscheidet aber nicht, **was** geändert wurde.

### 2.2 Regelwerk (jede Zeile bekommt genau eine Regel-ID, im Log gespeichert)

| Regel | Bedingung | Klasse | Beweis |
|---|---|---|---|
| **R-A** | `origin='walk_in'` | **R** | Nur (A) und (C) erzeugen `walk_in`; beide schreiben R |
| **W-B** | `origin='online'` ∧ Bestätigungs-Log vorhanden ∧ `updated_at − created_at ≤ 5 s` | **W** | Nur (B) erzeugt online+Log; kein UPDATE danach ⇒ Zeit unverändert |
| **R-C** | `origin='online'` ∧ kein Bestätigungs-Log ∧ es gibt einen `cancelled`-Vorgänger desselben `customer_id` mit `updated_at` innerhalb 5 s von `created_at` dieser Zeile | **R** | genau das Muster von (C) |
| **U-\*** | `origin='online'` ∧ Bestätigungs-Log ∧ `updated_at − created_at > 5 s` (nachträglich geändert) | **REVIEW** | Zeit kann per Admin-Patch auf R gesetzt worden sein **oder** nur Notiz/Mitarbeiter/Status geändert |
| **X-\*** | `origin='online'` ∧ kein Log ∧ kein (C)-Vorgänger | **REVIEW** | (B) mit fehlendem Log oder unbekannter Weg |

**Nachweis-Hilfe für REVIEW (ändert die Klasse nie automatisch, nur den Vorschlag im Dry-Run):** Eine **W-Zeile kann nur innerhalb der Salon-/Arbeitszeit-Fenster liegen** (Slots werden dort erzeugt). Liegt die UTC-Uhrzeit eines REVIEW-Termins **außerhalb** von `[open, close − Dauer]` des Wochentags → Vorschlag **R** („kann nicht W sein“); liegt sie darin → **kein** Vorschlag (im Sommer sind R-Zeilen ab 11:00 Berlin, im Winter ab 10:00 ununterscheidbar von W). Dieser Beweis nutzt die **heutigen** `salon_hours`; ändert sich die Regel dadurch, wird das im Dry-Run markiert (`via_window`).

### 2.3 Was die Regeln **nicht** sicher entscheiden
- **U-\*** (Admin hat einen Online-Termin nachträglich angefasst) und **X-\***: nur ein Mensch weiß, ob die Zeit im Modal *echte* Berlin-Uhrzeit war. Vermutlich wenige Zeilen (⚠, Größenordnung liefert deine Query (a): `origin='online'`, `has_confirm_log`, `modified_later`, `future`).
- (A)-Termine, die **nicht** über die Admin-UI, sondern per direktem API-Aufruf mit anderem Zeitwert entstanden: im Repo gibt es keinen solchen Client (✔); ein manueller `curl` ist nicht auszuschließen (⚠, nicht beweisbar aus DB).

### 2.4 Absicherung (damit aus der Restmenge keine Vermutung wird)
1. **Keine stille Entscheidung:** Die Migration bricht ab, wenn ein **zukünftiger bestätigter** REVIEW-Termin keine Entscheidung in `backend/alembic/tz_decisions.json` (Termin-ID → `W`/`R`, Bearbeiter, Begründung) hat.
2. **Entscheidungsgrundlage:** Dry-Run-Liste mit `mail_vorher` (= UTC-Uhr des gespeicherten Werts = das, was die Bestätigungsmail sagte), Website-/Admin-Anzeige heute und Vorschlag; Azzam bestätigt pro Zeile die reale Uhrzeit (Kunden-Rückfrage oder Mail-Postfach). Kein Eintrag ohne Bestätigung.
3. **Vergangene/stornierte REVIEW-Zeilen** (kein operativer Einfluss): Default nach Regel `via_window`, sonst **W** (Begründung: reine Statusänderung ist die häufigste Ursache), im Log als `W?` mit Konfidenz `niedrig`; per Log jederzeit einzeln korrigierbar.
4. **Zusatz-Absicherung (optional, empfohlen):** PII-freier Export der Metadaten (`id, origin, status, starts_at, ends_at, created_at, updated_at, team_member_id, has_confirm_log`; **keine** Namen/E-Mail/Telefon/Notizen) statt Einzelabfragen — dann laufen Dry-Run und Klassifikation **lokal gegen echte Verteilungen**, ohne Kundendaten (Frage 1b).
5. **Zweite Sicherung nach der Migration:** Für jeden konvertierten **W-B**-Termin gilt `neu in Berlin = mail_vorher`; das prüft ein Nachlauf-Skript (Zählung „Abweichungen = 0“).

---

## 3. Sommer-/Winterzeit

- Umrechnung **je Zeile** über `zoneinfo.ZoneInfo("Europe/Berlin")` auf der Wandzeit-Komponente: `datetime(y,m,d,H,M, tzinfo=BERLIN).astimezone(UTC)`. Nie fester Offset, nie `AT TIME ZONE` mit Literal, nie Postgres-tzdata (die Migration rechnet in Python; eine Quelle der Wahrheit mit Laufzeit-Code und Dry-Run).
- Beispiele: `2026-10-13T09:00Z` (W) → `07:00Z` (−2 h); `2026-10-27T09:00Z` (W) → `08:00Z` (−1 h). **Umstellung 25.10.2026** (03:00 CEST → 02:00 CET): Sa 24.10. −2 h, Mo 26.10. −1 h. **28.03.2027** (02:00 → 03:00): Sa 27.03. −1 h, Mo 29.03. −2 h.
- **Grenzfälle** (nur Wandzeiten 02:00–02:59 an den Umstellungssonntagen 25.10.2026 [mehrdeutig] / 28.03.2027 [nicht existent]): Der Salon ist sonntags zu, erwartet 0 Zeilen. Regel `fold=0` (erste Auftretung); jede solche Zeile wird im Dry-Run als `DST_EDGE` markiert und braucht eine Entscheidung.
- **Bulk-Update über DST-Grenzen:** Zeilen verschiedener Tage bekommen verschiedene Verschiebungen (−2 h vs. −1 h); sie liegen mindestens einen Tag auseinander und können sich nicht gegenseitig überlappen. Das eigentliche Risiko ist ein anderes (§4.4).
- **Stornofrist (24 echte Stunden):** `deadline = starts_at_utc − 24 h` (Instant). An der Umstellung entspricht das 23 bzw. 25 Wanduhr-Stunden — dokumentiert und getestet (§6).

---

## 4. Migration 017 `timezone_wallclock_to_utc`

### 4.1 Betroffene Spalten (vollständig)
| Tabelle.Spalte | Behandlung |
|---|---|
| `appointments.starts_at`, `appointments.ends_at` | **konvertieren nach Klasse** (W → −Offset je Zeile; R unverändert); `ends_at` folgt derselben Klasse wie `starts_at` (Dauer bleibt) |
| `working_exceptions.starts_at`, `.ends_at` | wie oben, Klasse **nur per Entscheidung** (kein Erzeugungsweg im UI); erwartet 0 Zeilen — bei > 0 ohne Entscheidung: Abbruch |
| alle übrigen (`created_at`, `updated_at`, `*_at`, `expires_at`, …) | **R**, keine Änderung |
| `time`/`date`-Spalten | Wandzeit/Datum, keine Änderung (werden vom Code nach §5 korrekt lokalisiert) |
Ein Test (`test_all_timestamptz_columns_classified`) iteriert `SQLModel.metadata` und schlägt fehl, wenn eine `timestamptz`-Spalte nicht in dieser Liste (konvertiert / bewusst R) steht — verhindert „etwas vergessen“ auch für künftige Spalten.

### 4.2 `tz_migration_log`
`(id, migration_run, table_name, row_id, column_name, old_value timestamptz, new_value timestamptz, klass ['W'|'R'|'W?'|'R?'|'W-decision'|'R-decision'], rule ['R-A','W-B','R-C','U-…','X-…','window','decision'], confidence, migrated_at)`, **unique `(table_name, row_id, column_name)`** ⇒ Idempotenz: ein zweiter Lauf überspringt geloggte Zeilen und kann nie doppelt verschieben. Enthält **keine PII** (IDs + Zeiten). Löschung erst nach der Aufräumfrist (Frage 8).

### 4.3 Dry-Run-Modus
Selbstständiges Skript `backend/scripts/tz_dry_run.py` (nur SQLAlchemy/asyncpg/zoneinfo, importiert **keine** App-Module → per `docker cp` in den laufenden Prod-Container kopierbar, `SET TRANSACTION READ ONLY`). Gleiche Klassifikations-/Konvertierungsfunktionen wie die Migration (`app/core/tz_migration.py`, per Test auf Byte-Gleichheit der Ergebnisse geprüft). **Schreibt nichts**, gibt aus:
1. **Zählung** je Tabelle × Regel × Klasse × Vergangenheit/Zukunft, Versatzverteilung (−2 h/−1 h), DST-Edge-Zeilen, REVIEW-Zeilen **ohne Entscheidung**.
2. **Überlappungsprüfung nach Umrechnung** (pro Mitarbeiter, bestätigte Termine, neuer Bestand) — die Migration würde sonst am Constraint scheitern.
3. **Liste aller zukünftigen Termine** (nur IDs): `appointment_id, regel, klasse, status, alt_utc, neu_utc, angezeigt_vorher_berlin, mail_vorher, angezeigt_nachher_berlin, delta_min, flags`. Kontrolle: für W ist `mail_vorher == angezeigt_nachher_berlin`, für R ist `angezeigt_vorher == angezeigt_nachher`.
4. **Anonyme Stichprobe** (zufällig, z. B. 15 Zeilen): `(regel, wochentag, alt_lokal, neu_lokal)` **ohne IDs**, zum Posten/Prüfen.
Keine Namen, E-Mails, Telefonnummern, Notizen — auch nicht als Anzahl pro Kunde.

### 4.4 Constraint `no_overlapping_confirmed_appointments` beim Bulk-Update
**Problem (▶ wird in Stufe 2 auf echtem Postgres nachgewiesen):** Der Constraint ist nicht deferrable und wird **je Zeile** geprüft. Eine gleichmäßige Verschiebung um −2 h kann **zwischenzeitlich** überlappen, obwohl der Endzustand sauber ist (Beispiel: Termin A 09:00–11:00, Termin B 11:00–11:30 am selben Tag; B wird zuerst auf 09:00–09:30 gesetzt und kollidiert mit dem noch unverschobenen A). Zusätzlich kann der **Endzustand** echte Überlappungen enthalten, die bisher durch den W/R-Mix verdeckt waren.
**Lösung (Migration 007 hat denselben Weg genommen):** Alles in **einer Transaktion** (PostgreSQL-DDL ist transaktional): `DROP CONSTRAINT` → Zeilen **in aufsteigender Startzeit je Mitarbeiter** aktualisieren (zusätzliche Absicherung) → `ADD CONSTRAINT … EXCLUDE` neu anlegen (validiert den **gesamten** Endzustand). Schlägt das fehl (echte Überlappung): **ROLLBACK, Bestand unverändert, Migration bricht mit Liste der kollidierenden Termin-IDs ab** — die Dry-Run-Überlappungsprüfung (§4.3.2) soll das vorher melden. `ACCESS EXCLUSIVE`-Sperre auf `appointments` nur für die Dauer (Sekunden bei dieser Datenmenge; `lock_timeout` gesetzt). Tests (PG, §6): adjacenter Fall geht **nur** mit Drop/Recreate durch; Endzustands-Überlappung → Abbruch + Bestand unverändert; Constraint danach vorhanden und wirksam.

### 4.5 Ablauf `upgrade()` / `downgrade()`
`upgrade`: Klassifizieren → Abbruch bei ungelösten REVIEW/DST_EDGE/Überlappung → `CREATE tz_migration_log` → Constraint droppen → Zeilen aktualisieren + loggen → Constraint neu anlegen.
`downgrade` (voll umkehrbar):
- Zeilen **im Log**: exakte Rückschreibung `old_value` (Vergleich per Checksumme gegen den Vorher-Stand).
- Zeilen **nicht im Log** (nach dem Livegang mit neuem Code entstanden, alle echtes UTC): dieselbe Klassifikation (§2.2) — **nur W-B** wird nach Wandzeit-als-UTC zurückgerechnet (`to_berlin(x)` als UTC-Uhr), alles andere bleibt (war im alten Code ohnehin R). Mehrdeutige (U-/X-) Nachzügler werden **nicht** angefasst und im Downgrade-Bericht aufgelistet.
- Danach Log-Tabelle droppen; Constraint wie in §4.4.
- **Idempotenz:** `upgrade` nach `downgrade` ergibt denselben Endzustand (Test); `tz_sweep.py` (gleiche Funktionen) klassifiziert/konvertiert Nachzügler (`created_at` nach Migrationsbeginn, kein Log-Eintrag) und ist im Normalfall ein No-Op.

---

## 5. Minimaler Code-Fix

**Nichts vom Redesign** (keine Mehrfachleistungen, keine neuen Fachtabellen; einzig neu: `tz_migration_log`).

### 5.1 Backend
- **`app/core/time.py`:** `SALON_TZ = ZoneInfo("Europe/Berlin")`; `salon_now()`, `salon_today()`, `to_salon(dt)`, `to_utc(dt, naive_is=SALON_TZ)`, `combine_local(date, time)` (aware, `fold=0`, Lücken vorwärts), `salon_day_bounds(date) → (start_utc, end_utc)`, `format_salon(dt, fmt)`.
- **Alle Pfade aus §1:** `availability.py` (Fenster über `combine_local`, Instants), `service.py` (`_check_working_schedule`, Raster-Prüfung auf Berliner Minuten, `list_appointments`-Tagesfenster), `admin_router.py` (Dashboard-„heute“, Tagesfenster, PDF-Uhrzeit), `stammdaten/service.py` (Schließtag-Konfliktfenster), `notifications/templates.py` (`_fmt` → `to_salon`).
- **API-Vertrag:** Ausgaben aller Zeitpunkte (Termine, Slots, Sperrzeiten, Abmeldeansicht, Konto-Termine) als ISO-8601 **mit Berliner Offset** (`+02:00`/`+01:00`) über einen Annotated-Serializer `SalonDatetime`; DB bleibt UTC. Eingaben: **aware = Instant, naiv = Berlin** (bisher naiv = UTC — betrifft nur Tests/Skripte, ✔ keine anderen Clients im Repo).
- `tzdata` explizit in `pyproject.toml` (heute nur implizit: Prod-Image läuft, weil `marketing/service.py` schon `ZoneInfo("Europe/Berlin")` beim Import lädt ✔; Windows/Dev braucht das Paket).
- `tz_migration.py`, Migration 017, `tz_dry_run.py`, `tz_sweep.py`, `tz_decisions.json`.
- **Nicht enthalten:** B-2 (separater Mini-Fix), `.ics` (siehe Frage 4), Redesign-Features.

### 5.2 Frontend
- `src/lib/time.ts` (Intl mit `timeZone: 'Europe/Berlin'`, kein `new Date(...).getHours()`): `formatSalonTime/Date/DateTime(iso)`, `salonToday()`, `addDaysISO(dateStr, n)` und `weekdayMonday0(dateStr)` reine Datums-Arithmetik über `Date.UTC`, `toBerlinInputValue(iso)` (Vorbelegung `datetime-local`), `formatDateOnly('YYYY-MM-DD')` (Format in UTC, damit reine Daten nie springen).
- Alle Stellen aus §1.3 umstellen. Admin-/Konto-Formulare senden **naive** `YYYY-MM-DDTHH:mm` (Berlin) — Backend lokalisiert; kein `toISOString()` mehr.
- **FullCalendar:** neue Abhängigkeiten `@fullcalendar/luxon3@6.1.20` + `luxon@^3` (+ `@types/luxon`, dev). Plugin einbinden, `timeZone="Europe/Berlin"`; `handleSelect`/`handleDatesSet` lesen `arg.startStr`/`endStr` (enthalten den Berliner Offset) statt lokaler Getter. Ohne Plugin würde FullCalendar benannte Zonen nicht auflösen (✔ `NamedTimeZoneImpl` in `@fullcalendar/core`); die Alternative „UTC-Marker“ wäre die W-Konvention im Frontend und ist ausgeschlossen. Der Kalender hat kein Drag&Drop (✔ nur `select`/`eventClick`), die Änderung betrifft also nur Anzeige, Auswahl und Bereichsabfrage.

---

## 6. Testplan

Ablauf: erst **rot gegen `main` @ `88daa6b`** (gezeigt), dann grün nach dem Fix. Alle DB-/Constraint-/Migrationstests laufen als `@pytest.mark.postgres` über `scripts/run_pg_tests.sh` (frischer Container, echter Postgres); reine Logik zusätzlich auf SQLite. Zeit wird über `core/time.salon_now()` gepatcht (kein neues Test-Paket).

| # | Fall (Berlin-Wandzeit, Erwartung) | Heute |
|---|---|---|
| T1 | **Slots 09:00–17:30 real** (Di 13.10.2026, `salon_hours` 09–18, 30-min-Leistung): API liefert `07:00Z … 15:30Z` = `09:00+02:00 … 17:30+02:00` | rot: `09:00Z…17:30Z` |
| T2 | **Mail = Website = Admin:** Buchung um 11:00-Slot → Mail-Text, `POST`-Antwort, `GET /appointments` und `lib/time.ts`-Formatierung zeigen dieselbe Uhrzeit; Node-Test von `lib/time.ts` unter `TZ=Europe/Berlin`, `UTC`, `America/Los_Angeles` liefert **identische** Ausgabe | rot |
| T3 | **Sommer** 13.10.2026: 09:00 Berlin = `07:00Z` | rot |
| T4 | **Winter** 27.10.2026: 09:00 Berlin = `08:00Z` | rot |
| T5 | **25.10.2026 (Umstellung, Sonntag per Test geöffnet):** Slots 09:00–17:30 = `08:00Z–16:30Z` (CET); 24.10. (CEST) `07:00Z`; 26.10. `08:00Z`; Tagesfenster 25.10. = 25 h | rot |
| T6 | **29.03.2027 (Mo, erster Sommerzeit-Tag):** 09:00 = `07:00Z`; 28.03.2027 (So, Lücke 02–03) Slot-Erzeugung ohne Fehler/Doppel | rot |
| T7 | **Migration W→R** (PG): Zeilen 13.10./20.10. (−2 h) und 27.10. (−1 h), 24.10./26.10. je Seite der Umstellung; R-Zeilen (`walk_in`, R-C) unverändert; jede Änderung im Log; Klassen/Regeln wie erwartet | – |
| T8 | **Downgrade-Roundtrip:** upgrade → downgrade → Tabelle bitgenau gleich wie vorher (Checksumme `md5(string_agg(id‖starts_at‖ends_at))`); erneutes upgrade = gleicher Endzustand; zweiter Lauf/Sweep = 0 Änderungen (Idempotenz) | – |
| T9 | **Constraint beim Bulk-Update (PG):** adjacenter Fall 120 min + 30 min am selben Tag passiert nur mit Drop/Recreate (Nachweis: naives UPDATE **ohne** Drop scheitert); Endzustands-Überlappung → Abbruch + Bestand unverändert + Liste der IDs; Constraint danach vorhanden und wirksam | – |
| T10 | **REVIEW-Pfad:** ungelöster zukünftiger REVIEW/`DST_EDGE` → Migration bricht ab; mit Entscheidung durch; vergangene REVIEW → Default `W?` im Log | – |
| T11 | **Stornofrist 24 echte Stunden:** Termin Mo 26.10. 09:00 Berlin (`08:00Z`), „jetzt“ `07:59:59Z` am 25.10. → erlaubt, `08:00:00Z` → 410; Termin am Sonntag 25.10. 10:00 (`09:00Z`, per Test): Frist Sa 24.10. `09:00Z` (= 11:00 Berlin, 25 Wanduhr-Stunden) | rot (22 h/23 h) |
| T12 | **Vorlaufzeit 2 h:** „jetzt“ 13.10. 08:00 Berlin → frühester Slot 10:00 Berlin, im Winter identisch | rot (0 h/1 h) |
| T13 | **Reminder-Fenster:** Termin morgen 10:00 Berlin; Lauf genau bei −24 h/−30 min in echten Instants, Sommer/Winter/Umstellungswoche | rot |
| T14 | **Admin-Termin ↔ Online-Slot:** Admin legt 10:00 Berlin an → Online-Slot 10:00 fehlt; Online-Buchung 10:00 → Admin-Anlage 10:00 → 409 (PG-Constraint) | rot (Doppelbuchung möglich) |
| T15 | `_check_working_schedule`: Admin-Termin 10:00 im Intervall 09–17 akzeptiert, 17:30 abgelehnt | rot |
| T16 | Dashboard/PDF: „heute“ um 00:30 Berlin; PDF-Uhrzeit = Berlin | rot |
| T17 | Naiv = Berlin, aware = Instant (Eingabe-Vertrag) | – |
| T18 | Schema-Test: jede `timestamptz`-Spalte klassifiziert (§4.1) | – |
| T19 | **Frontend:** `lib/time.ts` (Node `--test`, TZ-Matrix, DST-Tage, `formatDateOnly`); optional Playwright mit `timezoneId: 'America/New_York'` gegen Slot-Auswahl/Admin-Kalender (Frage 6) | – |
| T20 | **.ics** — nur falls Frage 4 mit „ja“ beantwortet: Datei mit `DTSTART;TZID=Europe/Berlin`, `VTIMEZONE`, Roundtrip-Import (`icalendar`), Sommer/Winter | – |
Bestehende Tests (~70 Stellen in 15 Dateien konstruieren W-Werte, u. a. `test_availability`, `test_public_booking`, `test_public_cancellation`, `test_customer_account`, `test_notifications`, `test_retention`, `test_booking_integrity`) werden mit Hilfsfunktion `berlin(...)` auf ausdrückliche Zeitzonen umgestellt; jede geänderte Erwartung wird im PR begründet. Vor und nach dem Fix: kompletter `pytest`-Lauf, `run_pg_tests.sh`, `npm run build`, `npm run lint`, Node-Tests — Ausgaben gezeigt.

---

## 7. Lokale Probe, Deploy und Rollback

### 7.1 Lokale Probe (Docker Compose, keine Kundendaten)
Regel bleibt: **keine Produktionsdaten lokal**. „Prod-ähnlich“ heißt daher: (1) du führst auf dem Server `pg_dump --schema-only --no-owner --no-privileges` aus (nur Struktur), (2) ich lade es in einen frischen Compose-Postgres, `alembic stamp 016`, und vergleiche das Schema gegen eine frisch migrierte DB (Drift-Check), (3) ein Generator füllt **synthetische** Zeilen jeder Regel-Klasse inkl. DST-Tagen, Adjazenz-Falle, Überlappungs-Falle, REVIEW-/`DST_EDGE`-Fällen, `working_exceptions`, (4) ich zeige **Dry-Run-Ausgabe → Migration → Ergebnis → Downgrade → Checksummenvergleich**. Optional (Frage 1b) statt der Synthetik: PII-freier Metadaten-Export aus Produktion, damit die Verteilung echt ist.

### 7.2 Zeitplan
Live-Ziel **So 18.10.2026** (11.10. liegt vor dem Test vom 13.10.; **spätestens am 25.10. gilt Winterzeit** — danach würden wieder zwei Offsets im Bestand koexistieren, was die Migration zwar beherrscht, aber die Wochen mit falschen Terminen verlängert). Vorschlag: Stufe 2 Code/Tests bis ~14.10., Dry-Run Produktion + Abgleich mit Azzam bis ~16.10., Freeze 17.10., Livegang 18.10.

> **Maßgeblich für Stufe 2 ist `docs/deploy/TIMEZONE_HOTFIX_DEPLOY_CHECKLIST.md`** (Copy-Paste-Befehle für Backup, Restore-Übung, Dry-Run, Livegang-Probe, Rollback). Die folgenden Abschnitte 7.3/7.4 sind die ursprüngliche Planung.

### 7.3 Deploy (Migration und Code im **selben** Deploy — `entrypoint.sh` fährt `alembic upgrade head` beim Backend-Start)
1. **T−7 … T−2:** Dry-Run gegen Produktion (read-only): `docker cp tz_dry_run.py <backend>:/tmp/ && docker exec <backend> python /tmp/tz_dry_run.py > dry_run.txt` (Skript ist im Prod-Image noch nicht enthalten, deshalb `docker cp`; es ändert nichts). REVIEW-Liste mit Azzam abarbeiten → `tz_decisions.json`, Freigabe der Stichprobe.
2. **T−1:** Freeze; erneuter Dry-Run (Vergleich zur letzten Liste: nur neu entstandene W-Zeilen); alle Tests/Build grün gezeigt; du gibst frei.
3. **Sonntag:** **Backup** (`pg_dump -Fc`, zweite Kopie, Restore-Test **auf dem Server** in Scratch-DB) **und** Vorher-Checksumme `SELECT md5(string_agg(id::text||starts_at::text||ends_at::text, ',' ORDER BY id)) FROM appointments` (+ Zeilenzahlen) notieren; Reminder-/Retention-Aufgaben in Coolify pausieren.
4. Merge nach `main` (deine ausdrückliche Freigabe; Push = Deploy). Erwartung im Log: `Running upgrade 016 -> 017`, Log-Zählung je Regel = Dry-Run-Zählung.
5. **Kontrollen (lesend):** Log-Zählung = Dry-Run; für alle W-B: `neu_berlin = mail_vorher` (Skript, Abweichungen = 0); Constraint vorhanden; `alembic current` = 017; Nachzügler-Check `tz_sweep --check` = 0.
6. **Rauchtest mit echter Buchung:** Slots **09:00–17:30**; 2 Buchungen (Sommer-/Winterzeit-Datum, z. B. Di 20.10. und Di 27.10.); Mail = Website = Admin-Kalender; Admin-Anlage auf belegten Slot → Konflikt; Storno per Link; Testtermine per Admin löschen (DSGVO-Pfad); Reminder-/Retention-Aufgaben wieder aktivieren.
7. **Abbruchkriterien:** Migration bricht ab (Rollback der Transaktion, alter Stand) · Backend nicht healthy in 10 min · Log-Zählung ≠ Dry-Run · irgendeine Abweichung Mail/Website/Admin · Slots außerhalb 09:00–17:30 · Constraint fehlt/unwirksam.

### 7.4 Rollback — Reihenfolge zwingend: **erst `alembic downgrade 016`, dann Code zurück**
1. Keinen Verkehr auf das Backend lassen: **Frontend stoppen**, Reminder-/Retention-Aufgaben pausieren.
2. Im **neuen** Backend-Container (enthält die 017-Datei): `docker exec <backend> python -m alembic downgrade 016`. Prüfen: Checksumme der vor dem Livegang vorhandenen Zeilen (Filter `created_at < Livegang`) **gleich** der notierten Vorher-Checksumme; Downgrade-Bericht der mehrdeutigen Nachzügler lesen.
3. **Danach** in Coolify die vorherige Version zurückdeployen (alter Code liest wieder W-Daten korrekt); Frontend starten; Aufgaben aktivieren.
4. Wäre der Code zuerst zurück, würde der alte Code die migrierten Zeilen falsch lesen (Slots verschoben, Überschneidungen möglich) — deshalb die feste Reihenfolge. Schlägt der Downgrade fehl, rollt seine Transaktion zurück (Stand 017 bleibt konsistent); Fallback: Backup-Restore (frische DB, Verbindung umstellen), Buchungen seit dem Backup aus Bestätigungsmails/Brevo nachtragen.
5. Nach Rollback: Ursache klären, Fix, Dry-Run wiederholen, neuer Sonntag.

---

## 8. Risiken und offene Fragen

### Risiken
1. **Restmenge nicht beweisbar (U-\*/X-\*, ggf. per API angelegte R-Zeilen):** nur durch Azzams Entscheidung sicher; Migration verweigert stilles Raten (§2.4).
2. **Verdeckte Doppelbuchungen** werden durch die Konvertierung sichtbar und stoppen die Migration → muss vorab per Dry-Run gefunden und manuell gelöst werden.
3. **Bis zum Livegang** entstehen weiter W-Zeilen und Kunden sehen falsche Uhrzeiten auf der Website/Bestätigungsseite (Mail stimmt) — Sofortmaßnahme in Frage 9.
4. **FullCalendar-Plugin** ist eine neue Abhängigkeit (luxon ~70 kB im Admin-Chunk); ohne sie ist „Berlin explizit“ nicht erreichbar.
5. **Testumbau** (~70 Stellen): falsch „reparierte“ Tests → jede Änderung begründet, Vorher/Nachher-Läufe gezeigt.
6. **Bereits versendete Mails** für R-Termine (Umbuchungs-Mail, Reminder für admin-angelegte Kundentermine) zeigten UTC (1–2 h zu früh) — nicht rückholbar; Liste über den Dry-Run.
7. **Downgrade nach längerer Laufzeit:** Nachzügler-Zeilen mit U-/X-Mustern werden nicht automatisch zurückgerechnet (Bericht); je später ein Rollback, desto mehr solche Zeilen.
8. **Anschlussarbeit B-2** (öffentliche Buchung prüft Öffnungszeiten/Feiertage/Arbeitszeit nicht serverseitig) bleibt bis zum Mini-Fix offen und ist direkt per API ausnutzbar.

### Offene Fragen (nach Priorität)
1. **(P0)** a) Bitte die Ausgaben der Queries (a)–(d) liefern (Anhang A; (a) ist die entscheidende: `origin × has_confirm_log × modified_later × status × future`). b) Darf ich stattdessen/zusätzlich einen **PII-freien Metadaten-Export** der `appointments` (IDs, Herkunft, Status, Zeiten, `created_at/updated_at`, Log-Flag; **keine** Namen/E-Mail/Telefon/Notizen) lokal nutzen? Das ersetzt die Synthetik durch echte Verteilungen.
2. **(P0)** Live-Datum **18.10.2026** (Reserve = keins mehr vor 25.10.; 11.10. liegt vor deinem Test vom 13.10.) — bestätigen. Welches Datum ist „heute“ bei dir? (Mein System zeigt 29.09.2026.)
3. **(P0)** Wie hat Azzam Online-Termine **verschoben**, die er im Kalender 2 h später gesehen hat — welche Uhrzeit hat er im Modal getippt (die reale oder die im Kalender angezeigte)? Davon hängt die Entscheidung der U-Zeilen ab.
4. **(P1)** Ist die **.ics**-Datei Teil des Hotfix? (Es gibt sie bisher nicht; ich schlage vor, sie im Redesign zu bauen und im Hotfix nur `core/time.py` so zu gestalten, dass sie danach korrekt möglich ist. T20 entfällt dann.)
5. **(P1)** Freigabe für die neue Abhängigkeit `@fullcalendar/luxon3` + `luxon` (+ `@types/luxon`).
6. **(P1)** Freigabe für Playwright als **Dev**-Abhängigkeit (Zeitzonen-Emulation `timezoneId`, kein Einfluss auf das Prod-Image) — sonst nur Node-Test für `lib/time.ts` mit `TZ`-Matrix.
7. **(P1)** Vergangene/stornierte REVIEW-Zeilen: Default `W?` (nach §2.4.3) akzeptabel?
8. **(P2)** Aufbewahrung `tz_migration_log`: nach 30 Tagen stabil löschen (eigene Aufräum-Migration)?
9. **(P1)** **Sofortmaßnahme** bis zum 18.10.: Ein reiner Frontend-Patch der **öffentlichen** Seiten (Slotzeiten/Bestätigung/Absageseite mit `timeZone: 'UTC'` formatieren) würde Kunden ab sofort die Mail-Uhrzeit zeigen, ohne DB-Änderung. Risiko: muss mit dem Hotfix **zurückgenommen** werden (sonst doppelte Korrektur); Aufwand klein. Gewünscht?
10. **(P2)** `tzdata` explizit in `pyproject.toml` aufnehmen (empfohlen) und `admin_accounts.created_at` (`datetime.now` naiv) nebenbei bereinigen (P3)?
11. **(P2)** Wer führt Dry-Run und Backup auf dem Server aus (`docker cp`-Weg, §7.3)? Ich liefere die exakten Befehle.

---

## Anhang A — Read-only Abfragen (nur Zahlen und Zeitmuster, keine Namen/E-Mails/Telefonnummern)

```sql
-- (a) Größenordnung je Erzeugungsweg (entscheidet, wie viele REVIEW-Zeilen es gibt)
SELECT a.origin,
       EXISTS (SELECT 1 FROM notification_logs n WHERE n.appointment_id = a.id AND n.kind = 'confirmation') AS has_confirm_log,
       (a.updated_at - a.created_at > interval '5 seconds') AS modified_later,
       a.status, (a.starts_at >= now()) AS future, count(*)
FROM appointments a GROUP BY 1,2,3,4,5 ORDER BY 1,2,3,4,5;

-- (b) UTC-Stunde je Herkunft (W: nur 9..17; R aus der Admin-UI: früher als die Berliner Uhrzeit)
SELECT origin, extract(hour FROM starts_at AT TIME ZONE 'UTC') AS utc_hour, count(*)
FROM appointments GROUP BY 1,2 ORDER BY 1,2;

-- (c) Salon-/Arbeitszeiten und Sperrzeit-Tabellen (nur Zeiten bzw. Zähler)
SELECT day_of_week, is_open, open_time, close_time FROM salon_hours ORDER BY 1;
SELECT (SELECT count(*) FROM working_exceptions) AS working_exceptions,
       (SELECT count(*) FROM day_overrides)      AS day_overrides,
       (SELECT count(*) FROM salon_closures)     AS salon_closures;

-- (d) Überlappungen im heutigen Bestand (Constraint verlangt 0)
SELECT count(*) FROM appointments a JOIN appointments b
  ON a.team_member_id = b.team_member_id AND a.id < b.id
 AND a.status = 'confirmed' AND b.status = 'confirmed'
 AND tstzrange(a.starts_at, a.ends_at) && tstzrange(b.starts_at, b.ends_at);

-- (e) Rückführung "Umbuchung" (R-C): stornierte Vorgänger mit gleichzeitig erzeugtem Nachfolger
SELECT count(*) FROM appointments old JOIN appointments nw
  ON nw.customer_id = old.customer_id AND old.status = 'cancelled'
 AND abs(extract(epoch FROM (old.updated_at - nw.created_at))) <= 5 AND nw.id <> old.id
 AND NOT EXISTS (SELECT 1 FROM notification_logs n WHERE n.appointment_id = nw.id AND n.kind = 'confirmation');
```

---

## 9. Umsetzungsstand Stufe 1 (Code + Tests) — Belege

### 9.1 Was gebaut wurde (alles auf `hotfix/timezone`)
| Bereich | Inhalt |
|---|---|
| Backend | `app/core/time.py` (`SALON_TZ`, `combine_local`, `to_salon`, `to_utc`, `as_utc`, `salon_day_bounds`, `format_salon`), `app/core/schema_types.py` (`SalonDatetimeIn/Out`), Umstellung aller Pfade aus §1.2 (`availability.py`, `service.py`, `admin_router.py`, `stammdaten/service.py`, `notifications/templates.py`) und der Schemas (Berliner Offset in JSON, naive Eingabe = Berlin), `tzdata` in `pyproject.toml` |
| Migration | `alembic/versions/017_timezone_wallclock_to_utc.py`, `app/core/tz_migration.py` (Klassifikation/Umrechnung, stdlib-only), `alembic/tz_decisions.json` (leer), `scripts/tz_dry_run.py`, `scripts/tz_sweep.py`, Tabelle `tz_migration_log` |
| Frontend | `src/lib/time.ts`, alle Zeitstellen aus §1.3 umgestellt, FullCalendar `timeZone="Europe/Berlin"` über `@fullcalendar/luxon3` + `luxon`, `npm run test:time` |
| Doku | Abschnitt „Zeit & Zeitzonen“ in `CLAUDE.md` und `GEMINI.md` (identisch) |

### 9.2 Abweichungen von der Planung
1. **Testumbau kleiner als geschätzt:** Nur **4** bestehende Tests kodierten die alte Konvention (3 in `test_availability.py`, 1 in `test_public_cancellation.py`); die übrigen (~70 vermutete) arbeiten mit relativen Instants und blieben unverändert.
2. **Dry-Run „self-contained“ heißt jetzt: zwei Dateien** (`tz_migration.py` + `tz_dry_run.py`) per `docker cp` nebeneinander in den Container (eine Quelle der Wahrheit statt Duplikat); beide sind stdlib/SQLAlchemy-only.
3. **Playwright nicht ergänzt:** Zeitzonen-Unabhängigkeit des Frontends wird durch einen Node-Test mit `TZ`-Matrix (5 Zonen) belegt; das **Verhalten von FullCalendar im Browser ist nicht browser-verifiziert** — Sichtprüfung in der Livegang-Probe nötig.
4. **SQLite-Eigenheit (Testumgebung):** SQLite speichert aware Datetimes mit der Uhrzeit des Strings und verwirft den Offset; Tests, die die Admin-UI nachstellen, senden deshalb den echten UTC-Instant (`…+00:00`) wie `toISOString()`. PostgreSQL rechnet korrekt um.
5. **Verhaltensänderungen, die du kennen solltest:** Vorlaufzeit ist jetzt **echte 2 Stunden** (bisher im Sommer faktisch 0 h, im Winter 1 h); die Stornofrist ist jetzt **echte 24 Stunden** (bisher 22/23 h vor dem tatsächlichen Termin); Erinnerungen an bestehende Termine kommen nach der Migration zur richtigen Zeit.
6. **API-Vertrag:** naive Zeitangaben in Requests bedeuten jetzt Berlin-Wandzeit (bisher UTC). Betroffen sind nur Tests/Skripte; die Frontends senden naive Berlin-Strings (Admin, Konto) bzw. den vom Server gelieferten Slot-String.

### 9.3 Testläufe (Ausgaben im Bericht)
- Charakterisierungstests `test_timezone_hotfix.py` (24 Tests): gegen `main` @ `88daa6b` **20 rot, 4 grün** (grün = Regressionswächter, die auch alt stimmen), gegen `hotfix/timezone` **24 grün**.
- Gesamtsuite SQLite: **223 passed, 15 skipped** (Skips: 13 PG-Tests, 2 E2E mit eigenem Lauf); E2E (`RUN_E2E_TESTS=1`): 2 passed; PostgreSQL (`run_pg_tests.sh`): **13 passed**; Frontend: `npm run build` Exit 0, `npm run test:time` 7 passed, `tsc --noEmit` ohne Fehler, ESLint auf dem Stand von `main` (35 Fehler / 10 Warnungen vorher wie nachher, keine neuen).
- Probelauf auf synthetischen, produktionsförmigen Daten (22 Zeilen wie oben): Dry-Run → Migration → Kontrolle → Downgrade, Checksumme vorher = nachher.

### 9.4 Was noch fehlt (Stufe 2)
Dry-Run gegen **Produktion** (read-only, von dir ausgeführt), Abgleich mit Azzam, Freigabe, Livegang-Probe inkl. Sichtprüfung des FullCalendar und Backup/Restore-Übung, dann Merge nach deiner Freigabe (Ziel: Sonntag 18.10.2026). Offen bleibt B-2 (separater Mini-Fix) und die `.ics` (Redesign).

---

## 10. Später (bewusst nicht Teil dieses Hotfix)

- **BarberKasse (Flutter):** Laut Constitution/Spec 004 nicht an die API angebunden, in Produktion keine `walk_in`-Zeilen — kein Handlungsbedarf für den Hotfix. **Bei einer künftigen Anbindung:** Zeitangaben **immer mit Offset senden** (Dart: `dt.toUtc().toIso8601String()`, nie eine lokale `DateTime` ohne Offset), Antworten mit einem RFC-3339-Parser lesen (kein `substring`), „heute“/`from_date`/`to_date` als Berliner Kalendertag bilden, und die **Cookie-Authentifizierung klären** (Admin-Endpunkte prüfen nur das HttpOnly-Cookie `session`, `POST /auth/login` liefert kein Bearer-Token).
- **Vorlaufzeit:** bleibt beim Default `BOOKING_MIN_LEAD_HOURS=2` (nach dem Hotfix echte 2 Stunden). Keine Compose-Änderung; `BOOKING_*`/`CANCELLATION_*`/`REMINDER_*` werden bewusst nicht an den Container durchgereicht.

---

## 11. Unabhängiger Review (Subagent ohne Vorkontext) — Ergebnis und Entscheidungen

Keine kritischen Befunde. Entscheidungen zu den Befunden:

| Befund | Entscheidung |
|---|---|
| **H1** Sweep sieht Zeilen nicht, die der alte Container **nach** Migrationsbeginn committet (`migrated_at` = Transaktionsbeginn) | Keine `--cutoff`-Mechanik. Beleg: Coolify-Deploy-Log zeigt „Removing old containers“ **vor** „Starting new application“, der alte Container ist vor der Migration weg. In die Checkliste: Deploy-Log dieses Deploys kontrollieren (3.5), Nachzügler-SQL (3.6). Sweep-Docstring nennt die Grenze ausdrücklich. Kein zusätzlicher Test (er würde nur die Grenze festschreiben). |
| **M1** Downgrade setzt jede geloggte Zeile auf den Altwert zurück | **Umgesetzt:** Rückschreibung nur, wenn der aktuelle Wert noch dem geloggten neuen Wert entspricht; nachträglich bearbeitete Zeilen bleiben und werden im Downgrade gemeldet. Test auf Postgres (`test_downgrade_keeps_rows_that_were_edited_after_the_upgrade`; gegen die alte Logik nachweislich rot). |
| **M2** Verlorenes Bestätigungs-Log ⇒ Migration bricht ab (Neustart-Schleife) | Dry-Run direkt vor dem Merge (Checkliste 3.3); Abbruch ⇒ Version 016 + Coolify „vorherige Version“ (Checkliste 4). |
| **M3** (= B-2) Öffentliche Buchung/Umbuchung/Patch prüfen Öffnungszeiten nicht | Eigener Mini-Fix **nach** dem Hotfix. |
| **L1** Ganztags-Klick liefert ein Datum ohne Uhrzeit | **Umgesetzt:** `allDaySlot={false}` im Kalender. |
| L2 Verhaltensänderung Stornofrist/Vorlaufzeit | bekannt, dokumentiert (§9.2). |
| L4–L9 (Sweep-Vorgänger, Downgrade in der Doppelstunde, Log-Aufbewahrung, `AdminAccount` naive Zeit, Test schreibt Entscheidungsdatei, OpenAPI-Format) | nicht in diesem Hotfix. |
- **Sofortmaßnahme (Frontend-Zwischenpatch für die öffentlichen Seiten):** abgelehnt (Entscheidung 30.09.2026). Die Bestätigungsmails stimmen, Kunden kommen nach der Mail; es gibt keinen Zwischen-Deploy vor dem Livegang am 18.10.
- **Stand Stufe 2 (30.09.2026):** Schema-Abgleich Produktion ↔ 016 (bis auf die kosmetische Formulierung von `valid_override_type` identisch), Migration/Downgrade gegen das Produktionsschema und Dry-Run gegen die Produktion (22 Zeilen, alle W, keine Probleme, keine zukünftigen bestätigten Termine) abgeschlossen. Der Dry-Run wird am 15.10. und unmittelbar vor dem Merge wiederholt.

### Zeitplan (maßgeblich seit 03.10.2026 — ersetzt die älteren Termine in §0.2, §7.2 und Frage 2)

**Livegang Sonntag 11.10.2026, Reserve Sonntag 18.10.2026** (harte Grenze: Winterzeit ab 25.10.).

| Datum | Schritt | Checkliste |
|---|---|---|
| Sa 03.10. – So 04.10. | lokale Sichtprüfung des Kalenders (Sommer-/Winterzeit-Testdaten, Zeitzonen-Gegenprobe, Ganztags-Zeile weg) | 3.7 (vorgezogen) |
| So 04.10. – Mo 05.10. | Backup + Restore-Übung auf dem Server, in kleinen Schritten | 2, 3.2 |
| Do 08.10. | Dry-Run gegen Produktion wiederholen; Abgleich mit Azzam, sobald zukünftige bestätigte Termine existieren | 1b, 1c |
| Sa 10.10. | Freeze, grüne Läufe auf dem Merge-Stand, **Go/No-Go durch dich** | 2 |
| **So 11.10.** | Livegang: Aufgaben pausieren, Backup, Dry-Run direkt vor dem Merge, Merge nach deiner Freigabe, Deploy-Log, Kontrollen, Livegang-Probe | 3.1–3.8 |
| Mo 12.10. | 24 h Beobachtung abgeschlossen | 6 |
| ab Di 13.10. | Nachlauf-Liste (unten) |  |
| So 18.10. | **Reserve**-Termin, falls der 11.10. ausfällt | 3 |
| So 25.10. / Mo 26.10. | Umstellung auf Winterzeit / erster Werktag in Winterzeit: Stichprobe | 6 |

### Lokale Sichtprüfung des Kalenders — erledigt (03./04.10.2026)
Lokaler Stack (Docker-Postgres, Backend, Frontend-Produktionsbuild) mit synthetischen Daten über die echte API: 11 Online-Buchungen und 2 Walk-ins am 13.10. (Sommerzeit), 24.10. (letzter Sommerzeit-Tag), 26.10. (erster Winterzeit-Tag) und 27.10. (Winterzeit). Vom Betreiber im Browser geprüft und bestätigt:
- alle Termine stehen in der Zeile ihrer Uhrzeit (09:00, 10:00, 11:00, 14:00, 17:30 bzw. 09:00/12:30, 09:00/17:30, 09:00/10:00/11:00/16:00), Dauer korrekt; **keine Ganztags-Zeile**;
- Klick in eine leere Zelle 15:30 → Formular mit 13.10.2026 15:30 vorbelegt, gespeicherter Termin steht bei 15:30;
- **Zeitzonen-Gegenprobe** (Chrome DevTools → Sensors → Location „Tokyo“, +7 h zu Berlin): alle Uhrzeiten unverändert.
Hinweis für lokale Builds unter Git Bash: `MSYS_NO_PATHCONV=1` setzen, sonst wird `NEXT_PUBLIC_API_URL=/api/v1` beim Build in einen Windows-Pfad umgeschrieben („Failed to fetch“ im Browser). Betrifft nur lokale Builds, nicht Coolify.

### Nachlauf-Liste (nach dem Zeitzonen-Livegang vom 11.10.2026; bei Nutzung der Reserve alle Daten +7 Tage)

| Wann | Was | Branch |
|---|---|---|
| ab Di 13.10. | Doku-Stand M18–M20 auf „deployed“ setzen (`CLAUDE.md`, `GEMINI.md`, `docs/analysis/ADMIN_FIX_SPEC.md`) | `docs/m18-m20-status` |
| ab Di 13.10. | Retention-Task in Coolify auf `--execute`, einmaliger manueller Test bei 0 / 0 | – (Coolify) |
| ab Di 13.10. | **Spec-Kit-Update zurückholen:** benannter Stash `speckit-update (Yamen, 2026-10-03)` (12 getrackte Dateien: `.agents/skills/speckit-*/SKILL.md` ×9, `.specify/init-options.json`, `.specify/integration.json`, `.specify/integrations/speckit.manifest.json`) mit `git stash pop`, prüfen, committen. Dazu gehören die **ungetrackten** Neuzugänge, die im Arbeitsbaum liegen geblieben sind (`.agents/skills/speckit-converge/`, `.specify/.gitignore`, `.specify/integrations/codex.manifest.json`, `.specify/scripts/powershell/resolve-template.ps1`). Bis dahin **kein `git add -A`**. | `chore/speckit-update` |
| Branch ab Di 20.10., Deploy frühestens Di 27.10. (Vorgabe, bleibt unverändert) | Salon-Benachrichtigung bei neuer Buchung/Storno (Name im Mailtext, Schalter; `SALON_NOTIFICATION_EMAIL`; Thread-Versand; Mail-Deckelung) | `feature/salon-notifications` |
| nach 7 Tagen stabil | Backup löschen, Aufräum-Migration (`tz_migration_log` droppen) | eigener Branch |
| danach | B-2: öffentliche Buchung prüft Öffnungszeiten/Feiertage/Arbeitszeit serverseitig | eigener Mini-Fix |
