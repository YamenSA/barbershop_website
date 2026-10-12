# Livegang Zeitzonen-Hotfix (B-1): Ablauf mit allen Befehlen

Termin: **Sonntag 18.10.2026** (Salon geschlossen). Harte Grenze: Umstellung auf Winterzeit am 25.10.
Begründungen, Abbruch- und Rollback-Pfade: `TIMEZONE_HOTFIX_DEPLOY_CHECKLIST.md` und `TIMEZONE_HOTFIX_SPEC.md`.
Die Migration `017` läuft automatisch beim Backend-Start (`entrypoint.sh` → `alembic upgrade head`).

**Stand vor dem Livegang (12.10.2026):** alle Läufe auf `hotfix/timezone` grün (SQLite 223 passed / 16 skipped, PostgreSQL 14 passed, E2E 2 passed, `tsc`, `npm run test:time`, `npm run build`). Backup- und Restore-Übung erfolgreich. Dry-Run gegen Produktion: 23 Zeilen, `problems: none`, `mismatches: 0`.

**Regeln**
- Kein Merge und kein Push ohne ausdrückliche Freigabe am Livegang-Tag. Der Push löst den Produktions-Deploy aus.
- Merge als eigener Merge-Commit (`--no-ff`), damit `git revert -m 1` möglich ist.
- Der CSV-Lauf und der Abgleich 1c mit Azzam entfallen, solange `mismatches: 0` ist. Nur bei `mismatches` ≠ 0 gibt es den CSV-Lauf.
- Test-Termine und Test-Kunden werden ausschließlich über den Admin gelöscht (`BookingService.delete_customer`), nie direkt in der Datenbank.
- Weicht eine Erwartung ab, stoppen und die Ausgabe schicken.

Jeder Schritt trägt den Ort: **SERVER** (SSH), **RECHNER** (Repo auf dem eigenen Rechner), **COOLIFY** (Weboberfläche).

---

## Hälfte 1: Vorbereitung und Merge (Schritte 1–6)

### 1. SERVER: Variablen setzen und Ausgangslage prüfen

```sh
B=$(docker ps --format '{{.Names}}' | grep -i backend  | head -1)
F=$(docker ps --format '{{.Names}}' | grep -i frontend | head -1)
DB=$(docker ps --format '{{.Names}}' | grep -i -E 'postgres|(^|[-_])db' | head -1)
echo "backend=$B frontend=$F db=$DB"
PSQL="docker exec $DB psql -U postgres -d barbershop -At"
$PSQL -c "SELECT current_database(), version_num FROM alembic_version"
```
Erwartung: je Variable genau ein Name; Ausgabe `barbershop|016`.

### 2. COOLIFY: Scheduled Tasks pausieren

Erinnerungen und Retention pausieren, damit während der Migration nichts läuft. Danach in der Oberfläche prüfen, dass beide Tasks als pausiert angezeigt werden.

### 3. SERVER: frisches Backup und Restore-Probe

Der Dump enthält Kundendaten: nur in zugriffsgeschütztem Verzeichnis ablegen, nach spätestens 14 Tagen löschen.

```sh
mkdir -p ~/backups && cd ~/backups && chmod 700 ~/backups
STAMP=$(date +%Y%m%d-%H%M); echo "STAMP=$STAMP"

# Zählstand und Checksumme VOR dem Livegang notieren (Ausgabe aufbewahren!)
$PSQL -c "SELECT count(*), md5(string_agg(id::text||starts_at::text||ends_at::text||updated_at::text, ',' ORDER BY id)) FROM appointments"
$PSQL -c "SELECT (SELECT count(*) FROM customers), (SELECT count(*) FROM services), (SELECT count(*) FROM notification_logs)"
$PSQL -c "SELECT version_num FROM alembic_version"

# Sicherung
docker exec $DB pg_dump -U postgres -Fc barbershop > tz-pre-$STAMP.dump
ls -l tz-pre-$STAMP.dump
docker exec -i $DB pg_restore --list < tz-pre-$STAMP.dump | head -5
```
Erwartung: Dump-Größe > 0, Rechte `-rw-------`, `pg_restore --list` ohne Fehler, `alembic_version` = 016. Stand der Übung vom 12.10.: `23|0d43b3173a763559c3e8d824bff45192` und `10|34|23`. Weichen die Zahlen ab, sind Buchungen dazugekommen. Dann gelten die neuen Werte als Referenz.

Restore-Übung in eine Scratch-Datenbank **auf dem Server**. Nur `restore_test` wird angefasst, nie `barbershop`.

```sh
DUMP=tz-pre-$STAMP.dump

# Schutz: muss 0 sein, sonst abbrechen
docker exec $DB psql -U postgres -d postgres -At -c "SELECT count(*) FROM pg_database WHERE datname='restore_test'"

docker exec $DB psql -U postgres -d postgres -c "CREATE DATABASE restore_test"
docker exec -i $DB pg_restore -U postgres -d restore_test --no-owner < $DUMP; echo "pg_restore exit=$?"

docker exec $DB psql -U postgres -d restore_test -At -c "SELECT (SELECT count(*) FROM customers), (SELECT count(*) FROM services), (SELECT count(*) FROM notification_logs)"
docker exec $DB psql -U postgres -d restore_test -At -c "SELECT count(*), md5(string_agg(id::text||starts_at::text||ends_at::text||updated_at::text, ',' ORDER BY id)) FROM appointments"
docker exec $DB psql -U postgres -d restore_test -At -c "SELECT version_num FROM alembic_version"

# Aufräumen
docker exec $DB psql -U postgres -d postgres -c "DROP DATABASE restore_test"
docker exec $DB psql -U postgres -d postgres -At -c "SELECT datname FROM pg_database WHERE datname IN ('barbershop','restore_test') ORDER BY 1"
```
Erwartung: Schutzabfrage `0`; `pg_restore exit=0`; Zählzeile und Termin-Zeile im Restore **identisch** mit den Werten vor der Sicherung; Version 016; am Ende bleibt nur `barbershop` übrig.
Zusätzlich, falls der Hoster es anbietet: Server- oder Volume-Snapshot.

### 4. RECHNER + SERVER: Dry-Run direkt vor dem Merge

Zweck: Ein Online-Termin, dessen Bestätigungs-Log verloren ging, würde die Migration abbrechen. Das Skript liest nur (`SET TRANSACTION READ ONLY`) und gibt nur IDs und Zeiten aus.

**RECHNER** (Repo auf Branch `hotfix/timezone`):
```sh
git branch --show-current
git status --short backend
scp backend/app/core/tz_migration.py backend/scripts/tz_dry_run.py DEIN_USER@DEIN_SERVER:/tmp/
```
Erwartung: Branch `hotfix/timezone`, `git status` leer, beide Dateien mit 100 % kopiert.

**SERVER:**
```sh
docker cp /tmp/tz_migration.py $B:/tmp/tz_migration.py
docker cp /tmp/tz_dry_run.py   $B:/tmp/tz_dry_run.py

OUT=~/tz_dry_run_$(date +%F_%H%M).txt
docker exec $B python /tmp/tz_dry_run.py > $OUT; echo "exit=$?"
cat $OUT
```
Erwartung: `exit=0`; `problems that would ABORT the migration: none`; `mismatches: 0`; alle Zeilen Regel `W-B` oder `W-B2`, Klasse `W`; Versatz −120 (Termine bis 24.10.) bzw. −60 (ab 26.10.). Stand 12.10.: 23 Zeilen (14 `W-B`, 9 `W-B2`); neu hinzugekommene Online-Buchungen müssen `W-B` sein. Der Bericht enthält nur IDs, Zeiten und Zahlen; die Zählung dient später als Vergleich für Schritt 9.

**Nur wenn `mismatches` ≠ 0:** stoppen, Ausgabe schicken und den CSV-Lauf ausführen (`docker exec $B python /tmp/tz_dry_run.py --csv > ~/tz_future_$(date +%F_%H%M).csv`); danach folgt der Abgleich 1c mit Azzam. Sonst entfällt beides.

Aufräumen:
```sh
docker exec $B rm -f /tmp/tz_migration.py /tmp/tz_dry_run.py
rm -f /tmp/tz_migration.py /tmp/tz_dry_run.py
docker exec $B ls /tmp/tz_migration.py /tmp/tz_dry_run.py 2>&1 | head -3
chmod 600 $OUT
```
Erwartung: Die Prüfung meldet `No such file or directory`.

### 5. RECHNER: Merge-Voraussetzungen

```sh
git fetch origin
git rev-parse --short main origin/main hotfix/timezone
git rev-list --left-right --count main...hotfix/timezone
git status --short
cd frontend && npm run build
```
Erwartung: `main` und `origin/main` stehen beide bei `88daa6b`; der Zähler zeigt `0` Commits, die `main` voraus ist (`0  N`); `npm run build` ist grün (Regel aus der `CLAUDE.md`). Die untracked Dateien (`.agents/…`, `.specify/…`, `REDESIGN_SPEC.md`, `SYSTEMBERICHT.md`) gehören nicht zum Hotfix und bleiben draußen. Ist `main` weitergewandert, stoppen.

### 6. RECHNER: lokaler Merge (noch kein Deploy)

```sh
git switch main
git merge --no-ff hotfix/timezone -m "Merge hotfix/timezone: Zeitzonen-Hotfix B-1 (Migration 017)"
git log --oneline -3
git show --no-patch --format='%h %s' HEAD
```
Erwartung: Merge-Commit mit zwei Eltern (`git rev-list --parents -n 1 HEAD` zeigt zwei Eltern-IDs). Die ID notieren. **Kein Push.**

---

## Hälfte 2: Deploy, Kontrollen, Probe, Nachlauf (Schritte 7–12)

### 7. RECHNER: Push (nur mit ausdrücklicher Freigabe zu diesem Zeitpunkt)

```sh
git push origin main
```
Der Push löst den Produktions-Deploy aus. Uhrzeit notieren (`MERGE_ZEIT`, UTC und Berlin).

### 8. COOLIFY + SERVER: Deploy-Log und Migration prüfen

**COOLIFY** → Deployments → Log: Die Zeile "Removing old containers" muss **vor** "Starting new application" stehen. Steht die Reihenfolge anders, sofort melden und die Nachzügler-Prüfung in Schritt 9 besonders ernst nehmen.

**SERVER:**
```sh
B=$(docker ps --format '{{.Names}}' | grep -i backend | head -1)
docker ps -a --format '{{.Names}}\t{{.Status}}\t{{.CreatedAt}}' | grep -i backend
docker inspect -f '{{.State.StartedAt}}' $B
docker logs $B 2>&1 | grep -a -E "Running upgrade|Traceback|RuntimeError|REVIEW_UNDECIDED|OVERLAP|DST_EDGE"
```
Erwartung: `Running upgrade 016 -> 017`, kein Traceback. Backend nach höchstens 10 Minuten healthy, sonst Abbruchkriterium.

### 9. SERVER: Kontrollen nach der Migration (nur lesend)

```sh
$PSQL -c "SELECT version_num FROM alembic_version"
$PSQL -c "SELECT rule, klass, count(*) FROM tz_migration_log WHERE column_name='starts_at' GROUP BY 1,2 ORDER BY 1"
$PSQL -c "SELECT count(*) FROM pg_constraint WHERE conname='no_overlapping_confirmed_appointments'"
$PSQL -c "SELECT count(*) FROM tz_migration_log WHERE column_name='starts_at' AND klass='W' AND to_char(old_value AT TIME ZONE 'UTC','YYYY-MM-DD HH24:MI') <> to_char(new_value AT TIME ZONE 'Europe/Berlin','YYYY-MM-DD HH24:MI')"
$PSQL -c "SELECT count(*) FROM appointments"
$PSQL -c "SELECT count(*) FROM appointments a WHERE NOT EXISTS (SELECT 1 FROM tz_migration_log l WHERE l.table_name='appointments' AND l.row_id=a.id) AND a.created_at < (SELECT min(migrated_at) FROM tz_migration_log) + interval '2 minutes'"
docker exec $B python scripts/tz_sweep.py
```
Erwartung der Reihe nach: `017`; Regelzählung wie im Dry-Run aus Schritt 4 (Stand 12.10.: 14 `W-B`, 9 `W-B2`); Constraint `1`; Abweichungsabfrage `0`; Terminzahl gleich dem Zählstand aus Schritt 3; Nachzügler `0`; `tz_sweep.py` meldet stragglers `0`.
Stichprobe, falls es zukünftige bestätigte Termine gibt: Sie stehen in Admin und Website mit der Uhrzeit der Bestätigungsmail.

### 10. RECHNER/BROWSER: Livegang-Probe mit echter Buchung

Mit deiner Test-E-Mail-Adresse, je einmal Sommer- und Winterzeit (z. B. Di **20.10.** und Di **27.10.**, Montag und Dienstag sind Öffnungstage).

1. **Website:** Buchungsseite zeigt Slots von **09:00 bis 17:30** (nicht 11:00–19:30). Slot 10:00 wählen und buchen.
2. **Bestätigungsseite und Mail:** beide zeigen **10:00 Uhr**; die Mail kommt an; der Absage-Link funktioniert.
3. **Admin-Kalender:**
   - Der Termin steht in der 10:00-Zeile, Dauer bis 10:30; Dashboard und PDF-Tagesplan zeigen 10:00.
   - **Zeitzonen-Gegenprobe:** Chrome DevTools → ⋮ → More tools → Sensors → Location/Timezone → *America/New_York*, Seite neu laden. Kalender und Website zeigen unverändert 10:00 (Berlin), nicht 04:00.
   - Die Ganztags-Zeile oberhalb des Rasters ist nicht mehr vorhanden.
   - Klick in eine leere Zelle "10:30" → das Formular zeigt `…T10:30`; ein Test-Walk-in erscheint in der 10:30-Zeile.
   - Walk-in auf einen belegten Zeitraum desselben Mitarbeiters → Konflikt (409).
4. **Stornofrist:** Termin über den Link stornieren (mehr als 24 h vorher geht); der Slot ist danach wieder buchbar. Eine Buchung für morgen früh: die Absage muss abgelehnt werden (Telefonhinweis).

Bei Abweichung in Slots, Uhrzeiten oder New-York-Probe: Abbruchkriterium (Checkliste 3.8).

### 11. Aufräumen und Tasks reaktivieren

1. **Test-Termine stornieren und Test-Kunden ausschließlich über den Admin löschen.** Der Admin ruft `BookingService.delete_customer` auf und prüft damit den DSGVO-Pfad. Nie direkt in der Datenbank löschen (kein `DELETE`, kein `psql`).
   Wichtig zum Verhalten (laut Code): `delete_customer` **anonymisiert** den Kunden (Name, E-Mail, Telefon), leert Gastname, Gast-Telefon und Notizen der zugehörigen Termine und setzt `anonymized_at`. Die Zeilen selbst bleiben bestehen. Die Terminzahl in `appointments` steigt dadurch dauerhaft um die Test-Termine; das ist kein Fehler. Terminzahlen aus Schritt 3 und 9 danach nicht mehr 1:1 vergleichen.
2. Kontrolle (nur lesend), dass die Test-Mail nirgends mehr steht:
   ```sh
   $PSQL -c "SELECT count(*) FROM customers WHERE email = 'DEINE_TEST_MAIL'"
   $PSQL -c "SELECT count(*) FROM appointments WHERE guest_name IS NOT NULL AND guest_name ILIKE '%DEIN_TESTNAME%'"
   ```
   Erwartung: beide `0`. Steht noch etwas, den Admin-Pfad erneut prüfen (Gast-Buchung ohne Kundenverknüpfung wird von `delete_customer` nicht erfasst) und mir die Zeile (ohne Klartextdaten) melden.
3. **COOLIFY:** Scheduled Tasks wieder aktivieren (Erinnerungen, Retention). Der Retention-Command bleibt exakt `python scripts/retention_cron.py` (bzw. `… --execute`), ohne Secret im Command.
4. **Erinnerungen nicht manuell auslösen** (`run_reminders.py` würde echte Kunden anschreiben). Beim nächsten planmäßigen Lauf prüfen, dass die Erinnerung ca. 24 h vor dem echten Termin kommt.

### 12. Nachlauf

- **24 Stunden:** Deploy-Log (Reihenfolge "Removing old containers" vor "Starting new application") festhalten; Backend-Log auf Fehler prüfen; `notification_logs` mit `status='failed'` beobachten; Buchungen stichprobenartig gegen Mails prüfen.
- **Spätestens 26.10.2026** (14-Tage-Frist) löschen: `~/backups/tz-pre-*.dump` und `~/tz_dry_run_*.txt`.
- **Nach 7 stabilen Tagen:** die Aufräum-Migration (Löschen von `tz_migration_log`) als eigenen, freigegebenen Schritt planen. Danach der Mini-Fix B-2.

---

## Rollback

**Migration bricht ab (Version bleibt 016):** Die Migration läuft in einer Transaktion, die Datenbank bleibt unverändert. Erkennbar an `RuntimeError: Migration 017 aborted …` im Backend-Log.
```sh
docker logs $B 2>&1 | grep -a -B2 -A12 "aborted"
$PSQL -c "SELECT version_num FROM alembic_version"        # muss 016 bleiben
$PSQL -c "SELECT to_regclass('public.tz_migration_log')"   # leer = nichts angelegt
```
Vorgehen: In **COOLIFY** die vorherige Version deployen. Kein Restore nötig. Danach Ursache klären, Dry-Run wiederholen, neuen Sonntag wählen.

**Nach erfolgreicher Migration zurück (Reihenfolge zwingend):** erst `alembic downgrade 016`, dann den Code.
```sh
# 1) COOLIFY: Frontend STOPPEN, Scheduled Tasks pausieren.
# 2) SERVER: Downgrade im NEUEN Backend-Container
docker exec $B python -m alembic downgrade 016
# 3) SERVER: Kontrolle
$PSQL -c "SELECT version_num FROM alembic_version"                                   # 016
$PSQL -c "SELECT count(*), md5(string_agg(id::text||starts_at::text||ends_at::text||updated_at::text, ',' ORDER BY id)) FROM appointments WHERE created_at < 'MERGE_ZEIT'"
$PSQL -c "SELECT to_regclass('public.tz_migration_log')"                             # leer
$PSQL -c "SELECT count(*) FROM pg_constraint WHERE conname='no_overlapping_confirmed_appointments'"   # 1
# 4) ERST JETZT: Code zurück (RECHNER):
git switch main
git revert -m 1 <MERGE_COMMIT_ID>
#    (Revert-Commit pushen = Deploy, nur mit Freigabe; alternativ in COOLIFY die vorherige Version deployen)
#    Danach Frontend starten, Tasks aktivieren.
```
Der Downgrade stellt nur Zeilen zurück, die noch den von der Migration geschriebenen Wert haben. Nach dem Livegang bearbeitete Termine bleiben unverändert; die Ausgabe listet sie (`[017 downgrade] … edited after the upgrade … keep their current value`). Diese Liste für die Nacharbeit aufbewahren. Notfall-Fallback: Restore aus dem Dump von Schritt 3 in eine frische Datenbank, Verbindung umstellen, Buchungen seit dem Backup aus Bestätigungsmails/Brevo nachtragen.

## Abbruchkriterien

Migration bricht ab · Backend nicht healthy nach 10 Minuten · Zählstand oder Log-Zählung ≠ Dry-Run · `mismatches` ≠ 0 · Slots außerhalb 09:00–17:30 · Uhrzeit in Mail, Website und Admin uneinheitlich · Constraint fehlt · Kalender zeigt in der New-York-Gegenprobe andere Zeiten.
