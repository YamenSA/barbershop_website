<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at `specs/006-marketing-content/plan.md`.
<!-- SPECKIT END -->

## UI-/Theme-Konventionen

**`DESIGN.md` ist die Single Source of Truth.** Details + Ratios dort; Kurzfassung
(symmetrisch zu `CLAUDE.md`):

- **Public-Text-Tiers (Tokens, gegen echtes BG `oklch(0.10 0 0)`):** `text-ink` `#F5F5F5` (~18.9:1, Primär) · `text-secondary` `#B8B8B8` (~10.4:1, Fließtext/Bios/Sublines) · `text-tertiary`/`text-ash` `#999999` (~7.2:1, Meta/Chips/„Mein Konto"). Keine Ad-hoc-`text-gray-*`/Opacity-Tricks. `#999999` ist die Untergrenze für kleinen Text.
- **Button-Label-Regel:** Label auf Malachite-**Flächen** ist dunkel (`text-midnight`, ~6.8:1) — niemals weiß (~2.8:1, reißt AA). Weißes Label nur auf dunklerem Grün (Admin `#15803D`, ~4.7:1). Malachite als **Text** auf Dunkel ist ok.
- **Theme-Grenze & Admin-Bereich:**
  - **Public & Kundenseite (`/`, `/konto/*`):** Dark-Theme-only (`oklch(0.12 0.000 0)` Basis).
  - **Admin (`/admin/*`):** Gepinntes HELLES Theme. `.admin-shell` setzt `color-scheme: light` + eigene Tokens (`--admin-page/-surface/-border/-text/-text-muted/-primary`). Jede Fläche setzt BG **und** Text explizit; erbt nichts von den umschaltenden Public-Tokens. Akzent grün (`#15803D`), **kein Indigo**. Jedes Paar ≥ 4.5:1.
  - **Semantische Status-Farben (Admin):** Für dynamische UI-Zustände (Erfolg, Fehler, Warnungen) nutzt der Code bewusst native Tailwind-Klassen zur Erweiterung des hellen Themes: `text-red-600`/`bg-red-50` (Fehler), `text-green-700` oder `#15803D`/`bg-green-50` (Erfolg), `text-amber-700`/`bg-gray-50` (Ungespeichert), sowie `bg-malachite/10 text-malachite` (Status: Aktiv) und `bg-brass/10 text-brass` (Status: Geplant).
- **Skip-Link (WCAG 2.4.1):** in `app/layout.tsx`, Ruhezustand `sr-only`, bei `focus-visible` Malachite-Pill **oben-zentriert** (`z-[9999]`) — nicht oben-links, damit das Logo nicht überlagert wird.
- **Startseite (`app/page.tsx`):** rendert eigenes `Nav`+`Footer`; feste 8-Sektionen-Reihenfolge (Hero → Leistungs-Highlights → Team-Teaser → Galerie-Vorschau → Warum wir → Öffnungszeiten+Standort → finaler CTA → Footer); vorhandene Daten/Komponenten wiederverwenden, kein neuer Content; Karte consent-frei als statisches Bild.
- **Header-Aktionshierarchie**: *Primär* „Termin buchen“ (Malachite-Solid-Button); *Sekundär* „Mein Konto“ untergeordnet mit `User`-Icon, `text-tertiary`, Brass nur im `:hover`/active, `focus-visible:ring-brass/60`.

## Offene Befunde (Architektur / DSGVO)
Es gibt derzeit folgende dokumentierte Befunde (siehe `docs/analysis/ADMIN_FIX_SPEC.md` für Details):
- **M10:** DSGVO: PII in `appointments` (Gastdaten/Notes) wird bei Anonymisierung eines Kunden nicht mit gelöscht. **Entscheidung:** Das Feld `notes` wird immer zwingend geleert, da Freitext nicht sicher auf Personenbezug prüfbar ist (Namen, Orte). Diese Notizen dürfen später nicht als "Feature" gerettet werden.
- **M11:** DSGVO: Fehlender Datenexport (Art. 15) für Admins.
- **M12:** Security/Audit: Fehlendes `anonymized_by` und Audit-Log bei Löschungen.
- **M13:** DSGVO: Retention-Logik für inaktive Kunden (Fokus: passwortlose Online-Bucher).
- **M14:** Admin-Tabellen (`customers`, `hours`, `services`, `team`) überlaufen horizontal bei <700px und verdecken Aktionen.
- **M15:** Admin-Kalender: Fehlende Kontaktdaten (Telefon) und Kundenlink im Termin-Modal.
- **M16:** Admin-Kalender: Neues Datum & Uhrzeit im Termin-Modal unschön (leer) vorbelegt.
- **M17:** Admin-Kalender: Inkonsistente Akzentfarbe (Violett in Modal und Events statt Malachite).
- **M18 (P0, umgesetzt, noch nicht deployed):** Security/DSGVO: PII in Klartext-Logs. SQL-Echo war hartkodiert (`echo=True`) und drei eigene `logger.error`-Aufrufe protokollierten E-Mail-Adressen. Jetzt: `SQL_ECHO`-Env-Var (Default `False`), Log-Aufrufe nutzen `customer.id` statt E-Mail. **Nach Deploy: Alt-Logs auf dem Server manuell leeren** (siehe Deployment-Abschnitt unten).
- **M19 (P1, umgesetzt und getestet, wartet auf Deploy-Freigabe):** Security/DSGVO: Log-Rotation (Docker `logging`-Optionen für `backend`+`frontend`) und IP-Kürzung im Zugriffslog (`backend/app/core/logging.py`, letztes IPv4-Oktett / letzte 80 IPv6-Bit vor dem Schreiben auf `0`). Datenschutzerklärung §4 entsprechend ein zweites Mal angepasst ("gekürzt … rotieren automatisch"). **Traefik-Access-Log geprüft und geschlossen** (2026-07-20, Azzam auf dem Server): kein Access-Log, kein zweiter IP-Speicherort — §4 vollständig korrekt. Details in `docs/analysis/ADMIN_FIX_SPEC.md`.
- **M20 (P1, umgesetzt und getestet, wartet auf Deploy-Freigabe):** Security (kein Datenschutzthema): Rate-Limits (Login, Registrierung, Passwort-Reset, öffentliche Buchung, Storno) liefen gegen die interne Frontend-Container-IP statt die echte Besucher-IP. Fix: `FORWARDED_ALLOW_IPS` als Pflichtvariable (Wert = Subnetz des App-Docker-Netzes, kein Pin im Repo, s. u.). Entscheidung: **volle IP** für Rate-Limiting (nirgends geloggt, nur kurz im Speicher — s. `docs/analysis/ADMIN_FIX_SPEC.md`, M20). AK-M20.4 (Header-Spoofing-Schutz) per echtem uvicorn-Subprozess verifiziert, nicht per `ASGITransport` — dieser Test ist wegen einer Windows-spezifischen Verlangsamung des Gesamtlaufs standardmäßig übersprungen und läuft explizit mit `RUN_E2E_TESTS=1` (Details in `ADMIN_FIX_SPEC.md`).

## Deployment & Environment Variables

**TLS-Zertifikat (`azzam-salon.de`):** Aktuell gültig bis **14.12.2026** (erneuert
15.09.2026, Coolify/Traefik-ACME; per `openssl` auf dem Server geprüft). Coolify erneuert Let's-Encrypt-Zertifikate i. d. R.
automatisch vor Ablauf — **Mitte November 2026 trotzdem gegenprüfen** (Coolify-UI
oder `docker logs coolify-proxy`), dass die Erneuerung tatsächlich gegriffen hat.
Hinweis aus derselben Prüfung (2026-07-20): ACME-Fehlermeldungen mit Token `*` im
Traefik-Log stammen mit hoher Wahrscheinlichkeit von externen Scannern
(`/.well-known/acme-challenge/`), kein Konfigurationsfehler. DNS korrekt: beide
`azzam-salon.de` und `www.azzam-salon.de` zeigen auf den Server.

**WICHTIG**: `RETENTION_CRON_SECRET` ist **Pflicht** und wird nirgends im Repo vorbelegt.
`docker-compose.yml` referenziert sie als `${RETENTION_CRON_SECRET:?…}`: fehlt sie oder ist
sie leer, bricht bereits `docker compose` / der Coolify-Deploy ab; zusätzlich lässt
`config.py` (`min_length=1`) einen leeren Wert beim Start nicht zu. Der Löschendpunkt bleibt
damit vor unautorisiertem Zugriff geschützt. Bei jedem neuen Server-Setup oder Coolify-Deploy
MUSS sie in Coolify gesetzt sein (früher war ein Standardwert im Compose-File hartkodiert).

**WICHTIG (M20)**: Die Umgebungsvariable `FORWARDED_ALLOW_IPS` ist ebenfalls **Pflicht**
(fehlt oder leer ⇒ `docker compose` bricht mit `:?` ab und `config.py` lehnt den Start ab).
Sie steuert, welchen Peers uvicorn den `X-Forwarded-For`-Header vertraut — ohne sie fällt
uvicorn lautlos auf seinen Default `127.0.0.1` zurück und die Login-/Buchungs-Rate-Limits
laufen dann unbemerkt gegen die interne Frontend-Container-IP statt gegen die echte
Besucher-IP (alle Besucher teilen sich ein Kontingent).

**Wird NICHT in `docker-compose.yml` hartkodiert** — Coolify verwaltet das Docker-Netz
selbst, ein Subnetz lässt sich auf einem bestehenden Netz nicht ändern (ein Pin-Versuch
wurde deshalb wieder entfernt, s. `docs/analysis/ADMIN_FIX_SPEC.md`, M20). Der Wert wird wie
`CORS_ORIGINS`/`COOKIE_SECURE` in Coolify gesetzt:
- **Lokal ohne Docker:** `127.0.0.1` (uvicorn-Default, kein Proxy im Spiel).
- **Coolify/Produktion:** **exakt das Subnetz des App-Docker-Netzes** (z. B. `10.0.2.0/24`),
  **nicht** das umgebende `/8`. Backend-Peer ist der **Frontend**-Container (Next.js-Rewrite),
  nicht Traefik. Docker vergibt Container-IPs dynamisch aus dem Netz-Subnetz und ändert sie bei
  jedem Neustart — eine Einzeladresse (`/32`) bricht also beim nächsten Deploy; das Subnetz
  des Netzes ist der kleinste Bereich, der den Frontend-Container auch danach sicher abdeckt.
  Ermittlung (nur lesend), Begründung und Grenzen: `docs/deploy/M18-M20_DEPLOY_CHECKLIST.md`,
  Abschnitt „FORWARDED_ALLOW_IPS ermitteln“. **Nie `*`.**
- **Drift-Check:** Deckt der gesetzte Wert die eigene Container-Adresse nicht mehr ab (z. B.
  nach einer Netz-Neuanlage mit anderem Subnetz), schreibt das Backend beim Start eine
  Log-Warnung (`app/core/logging.py`). Nach jedem Deploy im Log danach schauen.

Details: `docs/analysis/ADMIN_FIX_SPEC.md`, M20.

### Coolify Scheduled Tasks (Cronjobs)
Für die tägliche Datenlöschung muss in Coolify ein Scheduled Task angelegt werden. Die Einrichtung erfolgt zweistufig:

**Schritt 1: Trockenlauf (Testen)**
- **Container**: backend
- **Command**: `python scripts/retention_cron.py` (ohne Argumente)
- **Frequency**: e.g. `0 3 * * *` (Täglich um 03:00 Uhr)
Lass den Task einmal laufen und prüfe im Task-Log, ob das Ergebnis plausibel ist (Dry-Run = true).

**Schritt 2: Scharfschalten**
Wenn das Log sauber ist, ändere den Command auf:
- **Command**: `python scripts/retention_cron.py --execute`

Das Skript schlägt fehl (Exit-Code != 0), wenn das Secret fehlt oder das Backend Fehler meldet.

**Woher kommt das Secret?** Der Scheduled Task läuft per `docker exec` im laufenden
`backend`-Container; `scripts/retention_cron.py` liest `RETENTION_CRON_SECRET` aus der
**Umgebung dieses Containers** (dieselbe, aus der auch der Endpunkt es liest). Der Command
darf das Secret daher **nicht** enthalten — exakt `python scripts/retention_cron.py`
(bzw. `… --execute`). Secret wechseln = in Coolify ändern und das Backend **neu deployen**
(Container neu erstellen); ein bestehender Container behält seine alte Umgebung. Am Task
selbst ist dann nichts zu ändern (nur prüfen, dass im Command kein `RETENTION_CRON_SECRET=…`
steht). Prüfung nach dem Deploy: `docs/deploy/M18-M20_DEPLOY_CHECKLIST.md`, Abschnitt 4.


### Alt-Logs mit PII bereinigen (einmalig, nach dem M18-Deploy)

Der M18-Fix verhindert nur *künftige* PII in Logs. Der bisherige `backend`-Container hat
seit Produktivstart jede Query inkl. Parametern geloggt (SQL-Echo) — diese Logs liegen
noch auf dem Server und werden **nicht** durch den Deploy selbst gelöscht. Docker legt
pro Container eine eigene Log-Datei an; beim Deploy erstellt Coolify normalerweise einen
neuen Container (neue Container-ID, neue Log-Datei) — die PII bleibt in der Log-Datei
des *alten* Containers, bis diese explizit entfernt wird. Vorgehen per SSH auf dem
Coolify-Host, **nach** erfolgreichem Deploy des M18-Fixes:

```sh
# 1. Alten (gestoppten) und neuen (laufenden) backend-Container auflisten
docker ps -a --filter "name=backend" --format "{{.ID}}  {{.Names}}  {{.Status}}"

# 2. Den ALTEN, gestoppten Container entfernen — löscht dessen Log-Datei mit
docker rm <alte_container_id>

# 3. Falls der neue Container VOR dem Deploy schon eine Weile mit dem alten
#    Code lief (Logs mit PII), dessen aktuelle Log-Datei leeren (Root/sudo nötig,
#    json-file-Treiber vorausgesetzt):
sudo sh -c ': > $(docker inspect --format="{{.LogPath}}" <laufende_container_id>)'
```

**Hinweis:** Falls Coolify die Logs zusätzlich an ein externes Log-Aggregations-Tool
weiterleitet oder einen anderen Logging-Treiber als `json-file` nutzt, müssen die Logs
auch dort bereinigt werden — das lässt sich von hier aus nicht prüfen, bitte in den
Coolify-Server-/Logging-Einstellungen nachsehen.

## Zeit & Zeitzonen (Hotfix B-1)

- **Die Datenbank speichert echtes UTC.** Alles, was der Salon als Uhrzeit meint (Öffnungszeiten,
  Termine, „24 h vorher“, Vorlaufzeit) ist **Europe/Berlin-Wandzeit** und wird ausschließlich über
  `backend/app/core/time.py` (`SALON_TZ`, `combine_local`, `to_salon`, `salon_day_bounds`, …) je Datum
  per `zoneinfo` umgerechnet — **nie** mit festem Offset, nie mit Server- oder Browserzeit.
- **Naive Datetimes:** von außen (API-Eingabe, Tests) = Berlin-Wandzeit (`to_utc`); aus der Datenbank
  (SQLite liefert naive Werte) = UTC (`as_utc`). Ausgaben der API tragen den Berliner Offset
  (`SalonDatetimeOut`, `+02:00`/`+01:00`); die Datenbank bleibt UTC.
- **Frontend:** Zeiten nur über `frontend/src/lib/time.ts` (`Intl` mit `timeZone: 'Europe/Berlin'`), kein
  `toLocale*`/`getHours()`/`toISOString().slice(0,10)`. FullCalendar läuft mit `timeZone="Europe/Berlin"`
  (Plugin `@fullcalendar/luxon3`). Test: `npm run test:time` (Node, läuft unter mehreren `TZ`-Werten).
- **Neue `timestamptz`-Spalte?** Sie muss in `app/core/tz_migration.py` (`CONVERTED_COLUMNS` oder
  `REAL_UTC_COLUMNS`) eingetragen werden — ein Schema-Test schlägt sonst fehl.
- Migration 017 (Wandzeit-als-UTC → echtes UTC), Dry-Run und Rollback: `TIMEZONE_HOTFIX_SPEC.md`.

## Tests: SQLite und PostgreSQL

Die Standard-Suite läuft gegen In-Memory-SQLite (`pytest -v`). PostgreSQL-spezifisches
(z. B. der `EXCLUDE`-Constraint gegen Doppelbuchungen) prüft nur ein echtes Postgres:
Tests mit dem Marker `@pytest.mark.postgres` werden auf SQLite **übersprungen** und laufen
nur im PG-Modus (`TEST_DATABASE_URL=postgresql+asyncpg://…/<name>_test`, Datenbankname muss auf
`_test` enden — `conftest.py` verweigert sonst; nach jedem Test wird `TRUNCATE`d).
Voraussetzung: Docker läuft, Port 5432 ist frei, Python-venv aktiv. Nur Seed-/Testdaten.

```sh
cd backend && source .venv/Scripts/activate   # Linux/macOS: .venv/bin/activate
bash scripts/run_pg_tests.sh                  # startet nur den compose-`db`-Dienst (eigenes Projekt
                                              # + Volume), legt barbershop_test an, `alembic upgrade
                                              # head`, `pytest -m postgres`, räumt danach auf
```
Ein PG-Test zählt erst als Nachweis, wenn dieser Lauf mit Ausgabe gezeigt wurde. Der
uvicorn-Subprozess-Test läuft separat: `RUN_E2E_TESTS=1 pytest tests/integration/test_forwarded_for_trust_boundary.py`.

## Workflow Regeln

- **Vor jedem Push muss `npm run build` im Frontend lokal grün sein**. Ein Push löst bei uns den Produktions-Deploy aus.
- **Push nur nach meiner ausdrücklichen Freigabe**.
- **Ein Test zählt erst als Nachweis, wenn er nachweislich ausgeführt wurde und grün
  war.** Eine Testdatei, die existiert und plausibel aussieht, ist kein Beleg — sie
  muss tatsächlich unter `pytest` (bzw. dem jeweiligen Runner) gelaufen sein, mit
  echten Assertions, gegen existierende Fixtures. "Verifiziert" oder "getestet" darf
  nur gemeldet werden, wenn die Ausführung und ihr grünes Ergebnis gezeigt wurden
  (Testname + Ergebnis), nicht aufgrund des bloßen Vorhandenseins der Datei. Anlass:
  zwei aus P0-3 stammende Dateien (`test_p0_3_verify.py`, Teile von
  `test_admin_endpoints.py`) referenzierten nicht existierende Fixtures bzw. einen
  veralteten Response-Vertrag und sind nie erfolgreich gelaufen, wurden aber als
  Absicherung mitgeführt.

