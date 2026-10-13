# Deploy-Checkliste Zeitzonen-Hotfix (B-1) — Stufe 2

Ziel: **Sonntag 18.10.2026** (Salon geschlossen); keine Reserve; harte Grenze ist die Umstellung auf Winterzeit am 25.10. (Terminplan seit 13.10.2026). Ablauf mit allen Befehlen: `TIMEZONE_HOTFIX_LIVEGANG.md`.
Hintergrund und Begründungen: `TIMEZONE_HOTFIX_SPEC.md`. Die Migration `017` läuft **automatisch beim Backend-Start** (`entrypoint.sh` → `alembic upgrade head`), Code und Datenmigration gehen also in **einem** Deploy live.
Kein Merge und kein Push ohne deine ausdrückliche Freigabe (Push = Produktions-Deploy).

Vorab in jeder Server-Sitzung (Namen der Container setzen, Coolify hängt die App-UUID an):

```sh
APP=fqn7wcg6j298388nl152nrty

# Trefferzahl je Container zuerst ausgeben: jede muss 1 sein, sonst stoppen
docker ps --format '{{.Names}}' | grep "^backend-$APP"  | wc -l
docker ps --format '{{.Names}}' | grep "^frontend-$APP" | wc -l
docker ps --format '{{.Names}}' | grep "^db-$APP"       | wc -l

B=$(docker ps --format '{{.Names}}' | grep "^backend-$APP")
F=$(docker ps --format '{{.Names}}' | grep "^frontend-$APP")
DB=$(docker ps --format '{{.Names}}' | grep "^db-$APP")
echo "backend=$B frontend=$F db=$DB"      # je genau ein Name mit dem Präfix der App
PSQL="docker exec $DB psql -U postgres -d barbershop -At"     # DB-Name laut Compose: barbershop
$PSQL -c "SELECT current_database(), version_num FROM alembic_version"   # erwartet: barbershop|016
```

---

## 1. Vorbereitung (T−7 … T−2)

### 1a. Lokale Probe gegen das Produktionsschema (ich)
Du lieferst **nur die Struktur** (keine Kundendaten):

```sh
docker exec $DB pg_dump -U postgres --schema-only --no-owner --no-privileges barbershop > ~/schema-only.sql
```
Datei an mich (kein Datenbankinhalt, nur Tabellen/Constraints). Ich lade sie in einen frischen Compose-Postgres, setze `alembic stamp 016`, vergleiche das Schema mit einer frisch migrierten Datenbank (Drift-Check) und zeige Dry-Run → Migration → Downgrade auf synthetischen, produktionsförmigen Daten (Ergebnis dieser Probe für die 22 Zeilen liegt bereits vor).

### 1b. Dry-Run gegen Produktion (du, read-only, exakt so)
Das Skript und das Modul sind im laufenden Prod-Image noch nicht enthalten und werden **nebeneinander** hineinkopiert. Es liest nur (`SET TRANSACTION READ ONLY`), gibt nur IDs und Zeiten aus, keine Namen/E-Mails/Telefonnummern.
Der **Textlauf genügt**. Den CSV-Lauf (`--csv`) gibt es nur, wenn `mismatches` ≠ 0 ist (Entscheidung 12.10.2026).

```sh
# 1) auf deinem Rechner, im Repo auf Branch hotfix/timezone:
scp backend/app/core/tz_migration.py backend/scripts/tz_dry_run.py DEIN_USER@DEIN_SERVER:/tmp/

# 2) auf dem Server (Variablen B/F/DB wie oben gesetzt):
docker cp /tmp/tz_migration.py $B:/tmp/tz_migration.py
docker cp /tmp/tz_dry_run.py   $B:/tmp/tz_dry_run.py
docker exec $B python /tmp/tz_dry_run.py > ~/tz_dry_run_$(date +%F_%H%M).txt
# Nur wenn "mismatches" != 0 (sonst entfällt der CSV-Lauf):
#   docker exec $B python /tmp/tz_dry_run.py --csv > ~/tz_future_$(date +%F_%H%M).csv
docker exec $B rm -f /tmp/tz_migration.py /tmp/tz_dry_run.py
rm -f /tmp/tz_migration.py /tmp/tz_dry_run.py
cat ~/tz_dry_run_*.txt
```
Hinweise: Das Prod-Image hat noch keine `alembic/tz_decisions.json`; das Skript nimmt dann **leere Entscheidungen** — identisch zur committeten Datei. Der Kopierpfad (Modul neben dem Skript, `app` nicht importierbar) ist lokal gegen einen echten Postgres ausprobiert worden.

**Erwartung (nach deinen Queries a–e):** 22 Zeilen, alles Regel `W-B`/`W-B2`, Klasse `W`; `problems that would ABORT the migration`: **none**; `mismatches: 0`; Versatz −120 (Termine bis 24.10.) bzw. −60 (ab 26.10.); 7 zukünftige Termine (2 bestätigt, 5 storniert). Jede Abweichung (andere Regel, ein Problem, andere Zahl) → stoppen und mir die Ausgabe schicken.

### 1c. Abgleich mit Azzam (nur bei `mismatches` ≠ 0)
Entfällt, solange `mismatches: 0` ist (Entscheidung 12.10.2026; zusätzlich gab es zu diesem Zeitpunkt keinen bestätigten zukünftigen Termin). Bei `mismatches` ≠ 0: CSV-Lauf aus 1b ausführen, dann gilt: Aus `tz_future_*.csv` (nur die **bestätigten** zukünftigen Termine sind operativ wichtig): Für jede Zeile muss `mail_vorher` = `angezeigt_nachher_berlin` sein, und diese Uhrzeit muss der Bestätigungsmail entsprechen, die der Kunde bekommen hat. Azzam prüft die Zeilen gegen das Mail-Postfach (Absender/Brevo) und bestätigt die Stichprobe. Abgeschlossene Zeilen: Datum + „ok“ notieren.

---

## 2. T−1 (Samstag 17.10.)

1. Freeze auf `hotfix/timezone`; ich zeige die grünen Läufe (SQLite, PG, E2E, Build, `npm run test:time`) auf genau dem Merge-Stand.
2. **Backup + Restore-Übung** (Schritt 3.2) schon jetzt einmal durchspielen, damit am Sonntag nichts Neues passiert.
3. Dry-Run (1b) erneut; Vergleich zur letzten Liste: nur neu entstandene Online-Buchungen dürfen dazugekommen sein, alle mit Regel `W-B`.

---

## 3. Livegang (Sonntag 18.10.2026)

### 3.1 Aufgaben pausieren
In Coolify die **Scheduled Tasks** (Erinnerungen, Retention) pausieren, damit während der Migration nichts läuft.

### 3.2 Backup + Restore-Übung (vor dem Merge, **Pflicht**)
Der Dump enthält Kundendaten: nur in einem zugriffsgeschützten Verzeichnis ablegen und **nach 14 Tagen löschen**.

```sh
mkdir -p ~/backups && cd ~/backups
STAMP=$(date +%Y%m%d-%H%M)

# Zählstand + Checksumme VOR dem Livegang notieren (Ausgabe aufbewahren!)
$PSQL -c "SELECT count(*), md5(string_agg(id::text||starts_at::text||ends_at::text||updated_at::text, ',' ORDER BY id)) FROM appointments"
$PSQL -c "SELECT (SELECT count(*) FROM customers), (SELECT count(*) FROM services), (SELECT count(*) FROM notification_logs)"

# Sicherung
docker exec $DB pg_dump -U postgres -Fc barbershop > tz-pre-$STAMP.dump
ls -l tz-pre-$STAMP.dump                                   # Größe > 0
docker exec -i $DB pg_restore --list < tz-pre-$STAMP.dump | head -5

# Restore-Übung in eine Scratch-Datenbank AUF DEM SERVER (nicht lokal)
docker exec $DB psql -U postgres -c "CREATE DATABASE restore_test"
docker exec -i $DB pg_restore -U postgres -d restore_test --no-owner < tz-pre-$STAMP.dump
docker exec $DB psql -U postgres -d restore_test -At -c "SELECT count(*), md5(string_agg(id::text||starts_at::text||ends_at::text||updated_at::text, ',' ORDER BY id)) FROM appointments"
# -> muss EXAKT die notierte Zeile ergeben
docker exec $DB psql -U postgres -c "DROP DATABASE restore_test"
```
Zusätzlich, falls dein Hoster es anbietet: Server-/Volume-Snapshot.

### 3.3 Dry-Run direkt vor dem Merge (M2 aus dem Review)
Ein Online-Termin, dessen Bestätigungs-Log verloren ging (Background-Task), würde die Migration abbrechen. Deshalb **unmittelbar vor dem Merge** noch einmal `1b` ausführen: `problems … none` und die Zahlen wie erwartet (+ eventuell neue `W-B`-Zeilen). Erst dann weiter.

### 3.4 Merge (nur nach deiner ausdrücklichen Freigabe)
`hotfix/timezone` nach `main` mergen; Push löst den Deploy aus. Uhrzeit des Merges notieren (`MERGE_ZEIT`).

### 3.5 Deploy-Log prüfen (H1 aus dem Review)
Die Migration ist nur ohne Nachzügler-Risiko, wenn der **alte Container weg ist, bevor der neue startet**. Beleg vom letzten Deploy: das Coolify-Log zeigt „Removing old containers“ **vor** „Starting new application“. Prüfe dasselbe im **Deploy-Log dieses Deploys** (Coolify → Deployments → Log). Steht die Reihenfolge anders, sofort melden (dann Nachzügler-Prüfung 3.6 besonders ernst nehmen).

```sh
docker ps -a --format '{{.Names}}\t{{.Status}}\t{{.CreatedAt}}' | grep "^backend-$APP"
docker inspect -f '{{.State.StartedAt}}' $B
docker logs $B 2>&1 | grep -a -E "Running upgrade|Traceback|RuntimeError|REVIEW_UNDECIDED|OVERLAP|DST_EDGE"
```
Erwartet: `Running upgrade 016 -> 017`, kein Traceback.

### 3.6 Kontrollen nach der Migration (nur lesend)
```sh
$PSQL -c "SELECT version_num FROM alembic_version"                       # 017
$PSQL -c "SELECT rule, klass, count(*) FROM tz_migration_log WHERE column_name='starts_at' GROUP BY 1,2 ORDER BY 1"
                                                                         # = Zählung aus dem Dry-Run
$PSQL -c "SELECT count(*) FROM pg_constraint WHERE conname='no_overlapping_confirmed_appointments'"   # 1
$PSQL -c "SELECT count(*) FROM tz_migration_log WHERE column_name='starts_at' AND klass='W' AND to_char(old_value AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI') <> to_char(new_value AT TIME ZONE 'Europe/Berlin','YYYY-MM-DD HH24:MI')"   # 0
$PSQL -c "SELECT count(*) FROM appointments"                             # gleicher Zählstand wie vorher
# Nachzügler: nicht geloggte Termine, die vor bzw. unmittelbar nach Migrationsbeginn entstanden sind (erwartet 0)
$PSQL -c "SELECT count(*) FROM appointments a WHERE NOT EXISTS (SELECT 1 FROM tz_migration_log l WHERE l.table_name='appointments' AND l.row_id=a.id) AND a.created_at < (SELECT min(migrated_at) FROM tz_migration_log) + interval '2 minutes'"
docker exec $B python scripts/tz_sweep.py                               # stragglers: 0
```
Stichprobe: die 2 bestätigten zukünftigen Termine aus 1c stehen jetzt in Admin und Website mit der Uhrzeit aus der Bestätigungsmail.

### 3.7 Livegang-Probe mit echter Buchung
Mit deiner Test-E-Mail-Adresse; je einmal Sommer- und Winterzeit-Datum (z. B. Di **20.10.** und Di **27.10.**, Montag/Dienstag sind Öffnungstage):

1. **Website:** Buchungsseite → Slots reichen von **09:00 bis 17:30** (nicht 11:00–19:30). Slot 10:00 wählen, buchen.
2. **Bestätigungsseite und Mail:** beide **10:00 Uhr**; Mail kommt an (Posteingang), Absage-Link funktioniert.
3. **Admin-Kalender (Sichtprüfung):**
   - Der Termin steht im Raster in der **10:00-Zeile**, Dauer bis 10:30; Dashboard und PDF-Tagesplan zeigen 10:00.
   - **Zeitzonen-Gegenprobe:** Chrome DevTools → ⋮ → More tools → **Sensors** → Location/Timezone → *America/New_York*, Seite neu laden: Kalender und Website zeigen **unverändert** 10:00 (Berlin), nicht 04:00.
   - Die **Ganztags-Zeile** oberhalb des Rasters ist nicht mehr vorhanden.
   - Klick in eine leere Zelle „10:30“ → im Formular steht **…T10:30**; einen Test-Walk-in speichern → er erscheint in der 10:30-Zeile.
   - Walk-in auf einen belegten Zeitraum desselben Mitarbeiters → Konflikt (409).
4. **Stornofrist:** Termin über den Link stornieren (mehr als 24 h vorher: geht); Slot ist danach wieder buchbar. Eine Buchung für morgen früh: Absage muss abgelehnt werden (Telefonhinweis).
5. **Aufräumen:** Test-Termine und Test-Kunden **ausschließlich über den Admin** löschen (`BookingService.delete_customer`, prüft den DSGVO-Pfad), nie direkt in der Datenbank.
6. **Erinnerungen nicht manuell auslösen** (`run_reminders.py` würde echte Kunden anschreiben). Erst beim nächsten planmäßigen Lauf prüfen, dass die Erinnerung ca. 24 h vor dem echten Termin kommt.
7. Scheduled Tasks wieder aktivieren.

### 3.8 Abbruchkriterien
Migration bricht ab · Backend nicht healthy nach 10 Minuten · Zählstand oder Log-Zählung ≠ Dry-Run · `mismatches` ≠ 0 · Slots außerhalb 09:00–17:30 · Uhrzeit in Mail/Website/Admin uneinheitlich · Constraint fehlt · Kalender zeigt in der New-York-Gegenprobe andere Zeiten.

---

## 4. Wenn die Migration selbst abbricht (M2)

Die Migration läuft in **einer Transaktion**: bei jedem Fehler bleibt die Datenbank unverändert auf **Version 016**. Das Backend startet dann nicht (Container beendet sich und startet neu — Neustart-Schleife). Erkennbar an `RuntimeError: Migration 017 aborted …` samt Zeilen-IDs im Backend-Log.

```sh
docker logs $B 2>&1 | grep -a -B2 -A12 "aborted"
$PSQL -c "SELECT version_num FROM alembic_version"        # muss 016 bleiben
$PSQL -c "SELECT to_regclass('public.tz_migration_log')"   # leer = nichts angelegt
```
**Vorgehen:** In Coolify **„vorherige Version“ deployen** (Rollback auf die letzte lauffähige Version). Die Datenbank ist unverändert, kein Restore nötig. Danach mit den gemeldeten IDs klären (Entscheidung in `alembic/tz_decisions.json` oder Zeile korrigieren), Dry-Run wiederholen, neuen Termin wählen.

---

## 5. Rollback nach erfolgreicher Migration — Reihenfolge zwingend

**Erst `alembic downgrade 016`, dann den Code zurück.** Der alte Code würde die migrierten Zeilen falsch lesen (Slots verschoben, Überschneidungen möglich).

```sh
# 1) Kein Verkehr aufs Backend: Frontend in Coolify STOPPEN, Scheduled Tasks pausieren.
# 2) Downgrade im NEUEN Backend-Container (enthält die 017-Datei):
docker exec $B python -m alembic downgrade 016
```
- Der Downgrade stellt nur Zeilen zurück, die **noch den von der Migration geschriebenen Wert** haben. Nach dem Livegang **bearbeitete** Termine bleiben unverändert; die Ausgabe listet sie (`[017 downgrade] … edited after the upgrade … keep their current value`). Diese Liste für die manuelle Nacharbeit aufbewahren.
- Zeilen, die der neue Code angelegt hat, werden nach denselben Regeln zurückgerechnet (Online-Buchungen zurück auf Wandzeit-als-UTC); mehrdeutige werden gemeldet und nicht angefasst.

```sh
# 3) Kontrolle: Zeilen, die schon vor dem Livegang existierten und nicht bearbeitet wurden, sind wieder wie vorher
$PSQL -c "SELECT version_num FROM alembic_version"                                  # 016
$PSQL -c "SELECT count(*), md5(string_agg(id::text||starts_at::text||ends_at::text||updated_at::text, ',' ORDER BY id)) FROM appointments WHERE created_at < 'MERGE_ZEIT'"
# -> gleiche Checksumme wie vor dem Livegang (abweichend nur um die gemeldeten, danach bearbeiteten Zeilen)
$PSQL -c "SELECT to_regclass('public.tz_migration_log')"                            # leer
$PSQL -c "SELECT count(*) FROM pg_constraint WHERE conname='no_overlapping_confirmed_appointments'"   # 1

# 4) ERST JETZT: in Coolify die vorherige Version deployen; danach Frontend starten, Tasks aktivieren.
```
Schlägt der Downgrade fehl, rollt seine Transaktion zurück (Stand 017 bleibt konsistent). Notfall-Fallback: Backup-Restore in eine frische Datenbank (`pg_restore` aus 3.2), Verbindung umstellen, Buchungen seit dem Backup aus Bestätigungsmails/Brevo nachtragen.

Nach einem Rollback: Ursache klären, Fix, Dry-Run wiederholen, neuer Termin. Vor der Winterzeit gibt es keinen weiteren geschlossenen Sonntag. Ein neuer Termin wird gesondert entschieden (Samstag ist Öffnungstag).

---

## 6. Nach dem Livegang

- **24 Stunden:** Deploy-Log (Reihenfolge „Removing old containers“ vor „Starting new application“) einmal festhalten; Backend-Log auf Fehler; `notification_logs` mit `status='failed'` beobachten; Slots/Buchungen stichprobenartig gegen Mails prüfen.
- **7 Tage:** wenn alles stabil ist, Backup löschen (Datenschutz, 14-Tage-Frist) und die Aufräum-Migration (Löschen von `tz_migration_log`) als eigenen, freigegebenen Schritt planen.
- Danach der separate Mini-Fix B-2 (öffentliche Buchung prüft Öffnungszeiten/Feiertage/Arbeitszeit serverseitig).
