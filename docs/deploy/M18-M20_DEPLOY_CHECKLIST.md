# Deploy-Checkliste M18–M20 (Coolify)

Reihenfolge: **1 Variablen in Coolify setzen → 2 Retention-Aufgabe prüfen/anpassen → 3 Merge → 4 Prüfbefehle**.
Alle Prüfbefehle sind **nur lesend**, außer dem Retention-Dry-Run in 4d (der ändert nichts, ruft aber den Endpunkt auf und zählt gegen sein Limit von 5 pro Tag).

**Stand dieses Merges:** Branch `chore/m18-m20`, **keine Datenbank-Migration** (Alembic bleibt bei 016), also kein DB-Backup-Zwang und ein Code-Rollback ist ohne Datenrisiko möglich. Trotzdem vor dem Merge ein `pg_dump -Fc` als Gewohnheit, wenn du willst.

---

## 1. Variablen in Coolify setzen (vor dem Merge)

Zeige in Coolify die Umgebungsvariablen der Anwendung (Backend-Dienst) und prüfe/setze:

| Variable | Wert | Was passiert, wenn sie fehlt oder leer ist |
|---|---|---|
| `RETENTION_CRON_SECRET` | **neuer**, langer Zufallswert (z. B. `openssl rand -hex 32`). Nicht den alten Standardwert `dev-secret-change-in-prod` verwenden. | `docker compose` bricht ab (`required variable … is missing a value`) → Deploy schlägt fehl, Alt-Container bleibt (bzw. es startet nichts Neues). Zusätzlich lehnt `config.py` einen leeren Wert ab. |
| `FORWARDED_ALLOW_IPS` | **Subnetz des App-Docker-Netzes**, siehe Abschnitt „FORWARDED_ALLOW_IPS ermitteln“ unten. Nie `*`, nicht `10.0.0.0/8`. | wie oben: Deploy bricht ab statt still mit falschen Rate-Limits zu laufen |
| `SQL_ECHO` | nicht setzen oder `False` | Default `False`; nur `True` würde wieder SQL inkl. Parametern loggen (M18) |
| `COOKIE_SECURE` | `True` | `False` in Produktion = Session-Cookie ohne Secure-Flag |
| `CORS_ORIGINS` | echte Domain(s), JSON-Liste | Default sind nur localhost-Origins |
| `BREVO_API_KEY` | gesetzt | Mails schlagen fehl (in Produktion Fehler statt stillem Verschlucken) |
| `EMAIL_FROM`, `EMAIL_REPLY_TO`, `PUBLIC_BASE_URL`, `JWT_SECRET_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `POSTGRES_PASSWORD` | unverändert, nur gegenprüfen | Backend startet nicht |

Hinweis: Wie Coolify auf ein `:?`-Fehlen reagiert (Fehlermeldung im Deploy-Log), ist auf dieser Seite nicht verifiziert — lokal ist es mit `docker compose config` gezeigt worden (Fehlermeldung, Abbruch). Erwartet wird ein fehlgeschlagener Deploy mit dieser Meldung im Log.

### FORWARDED_ALLOW_IPS ermitteln (nur lesend, auf dem Server)

**Wer ist der Peer?** Der Browser spricht das Frontend an, Next.js leitet `/api/...` per Rewrite an `http://backend:8000` weiter. Der **Peer des Backends ist deshalb der Frontend-Container**, nicht Traefik. Traefik → Frontend → Backend; uvicorn wertet `X-Forwarded-For` nur aus, wenn der Peer im Vertrauensbereich liegt.

```sh
# Container finden (Coolify hängt UUIDs an die Namen)
docker ps --format '{{.Names}}' | grep -i -E 'backend|frontend'
B=NAME_DES_BACKEND_CONTAINERS
F=NAME_DES_FRONTEND_CONTAINERS

# In welchen Netzen hängen beide, mit welchen IPs?
docker inspect $B --format '{{.Name}}{{range $n,$v := .NetworkSettings.Networks}} | {{$n}} {{$v.IPAddress}}{{end}}'
docker inspect $F --format '{{.Name}}{{range $n,$v := .NetworkSettings.Networks}} | {{$n}} {{$v.IPAddress}}{{end}}'

# Über welche Adresse erreicht das Frontend das Backend? (entscheidet bei mehreren gemeinsamen Netzen)
docker exec $F node -e "require('dns').lookup('backend',(e,a)=>console.log(a))"

# Subnetz des Netzes, in dem diese Adresse liegt (NETZNAME aus der ersten Ausgabe)
docker network inspect NETZNAME --format '{{.Name}} {{range .IPAM.Config}}{{.Subnet}}{{end}}'
```

**Der Wert** ist genau dieses Subnetz (z. B. `10.0.2.0/24`).

**Begründung, warum das der kleinste sichere Bereich ist:**
- Docker vergibt Container-IPs dynamisch aus dem Subnetz des Netzes und **ändert sie bei jedem Neustart/Deploy**. Eine Einzeladresse (`/32`) oder ein kleiner Ausschnitt würde beim nächsten Deploy den Frontend-Container nicht mehr abdecken; das Subnetz deckt jede Adresse ab, die Docker in diesem Netz vergeben kann. Enger geht nur mit fest vergebenen Container-IPs, die dieses Repo bewusst nicht pinnt (ein Pin-Versuch wurde in M20 zurückgenommen).
- Das umgebende `/8` würde zusätzlich hunderte fremder Netze/Container des Servers vertrauen — jeder dort könnte `X-Forwarded-For` fälschen und Rate-Limits umgehen. Das Subnetz des App-Netzes enthält nur Container dieses Stacks (db, backend, frontend).
- **Nicht** das Subnetz des Coolify-Proxy-Netzes (`coolify`) eintragen, das würde alle Apps des Servers vertrauen. Hängen Frontend und Backend in mehreren gemeinsamen Netzen, gilt das Netz, dessen Subnetz die Adresse aus der `dns.lookup`-Zeile enthält.

**Grenzen:** Legt Coolify das Netz neu an (z. B. Stack gelöscht/neu erstellt), kann das Subnetz wechseln. Dann schreibt das Backend beim Start eine Warnung (`FORWARDED_ALLOW_IPS=… does not cover this container's own address`), und die Rate-Limits laufen wieder gegen die interne IP. Deshalb Prüfung 4b nach **jedem** Deploy, der das Netz betrifft. Zusatzcheck: Das Backend darf in Coolify **keine eigene Domain** haben (sonst wäre Traefik ein direkter Peer).

---

## 2. Retention-Aufgabe (Coolify → Scheduled Tasks)

**Woher bekommt die Aufgabe das Secret?** Aus der **Umgebung des Backend-Containers**. Coolify führt den Command per `docker exec` im laufenden Container aus, `scripts/retention_cron.py` liest `RETENTION_CRON_SECRET` aus `os.environ` und schickt es als Bearer-Token an `http://localhost:8000/api/v1/maintenance/retention`; der Endpunkt vergleicht mit demselben Wert aus derselben Umgebung. (Aus Skript und Compose gelesen; ein Secret im Task-Command ist dafür nicht nötig.)

**Was du bei neuem Secret an der Aufgabe ändern musst:**
1. Command prüfen: er muss exakt `python scripts/retention_cron.py` lauten (später `python scripts/retention_cron.py --execute`). **Steht dort `RETENTION_CRON_SECRET=…` oder ein Token, das entfernen.** Container = `backend`.
2. Sonst **nichts** an der Aufgabe. Wichtig: Ein bereits laufender Container behält seine alte Umgebung. Das neue Secret gilt erst nach dem **Neu-Deploy** (Schritt 3); Änderung der Variable allein genügt nicht.
3. Solange die Aufgabe noch auf Trockenlauf steht (kein `--execute`), bleibt sie so; erst nach erfolgreicher Prüfung 4d ändern.

---

## 3. Merge

1. Vorbedingungen: Punkt 1 und 2 erledigt, dein „Go“.
2. `chore/m18-m20` nach `main` mergen (nur nach deiner ausdrücklichen Freigabe). Der Push auf `main` löst den Produktions-Deploy aus.
3. Deploy-Log in Coolify beobachten: Build grün, Backend startet (`alembic upgrade head` meldet keine neue Migration, Stand 016), keine `ValidationError`, keine `required variable`-Meldung.

**Abbruch/Rollback:** Backend startet nicht oder Prüfung 4a scheitert → in Coolify auf die **vorherige Version** zurückdeployen (keine Migration lief, kein DB-Rollback nötig). Die neuen Variablen stören den alten Code nicht (`extra=ignore`).

---

## 4. Prüfbefehle nach dem Deploy (nur lesend)

Vorab (Namen setzen, siehe Abschnitt 1):

```sh
B=NAME_DES_BACKEND_CONTAINERS
F=NAME_DES_FRONTEND_CONTAINERS
```

### 4a. Backend healthy
Die Images haben keinen Healthcheck und die App keinen `/health`-Endpunkt, deshalb diese Kombination:

```sh
# Läuft er, ohne Restart-Schleife?  (erwartet: running, restarts=0)
docker inspect $B --format '{{.State.Status}} restarts={{.RestartCount}} seit {{.State.StartedAt}}'

# Start sauber?  (erwartet: "Application startup complete" / "Uvicorn running", kein Traceback/ValidationError)
docker logs --tail 60 $B 2>&1 | grep -a -E 'Running upgrade|startup complete|Uvicorn running|Traceback|ValidationError|ERROR'

# Migrationsstand  (erwartet: 016 (head))
docker exec $B python -m alembic current

# Antwortet die API?  (erwartet: 200)
docker exec $B python -c "import urllib.request as u; print(u.urlopen('http://localhost:8000/api/v1/public/salon-hours').status)"

# Keine FORWARDED_ALLOW_IPS-Warnung?  (erwartet: keine Ausgabe)
docker logs $B 2>&1 | grep -a 'FORWARDED_ALLOW_IPS'

# Website von außen  (erwartet: 200)
curl -s -o /dev/null -w '%{http_code}\n' https://azzam-salon.de/
```

### 4b. Rate-Limits nutzen die echte Besucher-IP
Der Limiter und das Access-Log lesen denselben Client-Wert, den uvicorn nach der Auswertung von `X-Forwarded-For` setzt. Zeigt das Access-Log deine öffentliche IP (gekürzt), dann greift die Vertrauensstellung und die Limits laufen gegen dich statt gegen den Frontend-Container.

Achtung: Server-seitig gerenderte Seitenaufrufe (Next.js → Backend) tragen **keine** Besucher-IP; sie erscheinen mit der Frontend-Adresse. Aussagekräftig sind nur Aufrufe, die dein **Browser** auslöst, z. B. die Buchungsseite:

```sh
# 1. Auf deinem Rechner/Handy (ideal: Mobilfunk/Hotspot) deine öffentliche IP ermitteln:
curl -s https://api.ipify.org
# 2. Auf demselben Gerät im Browser https://azzam-salon.de/termin öffnen (lädt /api/v1/public/services und /team).
# 3. Auf dem Server:
docker logs --since 10m $B 2>&1 | grep -a -E 'GET /api/v1/public/(services|team)' | tail -6
```

Erwartet: die Client-Adresse ist deine IP mit **letztem Oktett `0`** (bei IPv6: gekürzt, endet auf `::`) — **nicht** die Adresse des Frontend-Containers (`10.x…` bzw. Subnetz aus Abschnitt 1). Steht dort die Container-Adresse, vertraut das Backend dem Peer nicht: `FORWARDED_ALLOW_IPS` deckt den Frontend-Container nicht ab (Abschnitt 1 wiederholen).

### 4c. Logs enthalten nur gekürzte IPs, keine PII, Rotation aktiv
```sh
# Zugriffslog-Zeilen, deren IPv4-Client NICHT auf .0 endet  (erwartet: 0)
docker logs --tail 1000 $B 2>&1 | grep -a -E '^INFO: +[0-9]+\.[0-9]+\.[0-9]+\.[1-9][0-9]*:' | wc -l

# Stichprobe der letzten Zugriffe (Client-Adressen enden auf .0 bzw. ::)
docker logs --tail 8 $B 2>&1 | grep -a ' - "'

# Keine SQL-Statements/Parameter im Log  (M18, erwartet: 0)
docker logs $B 2>&1 | grep -a -c -E 'INSERT INTO|SELECT |UPDATE .* SET'

# Keine E-Mail-Adressen im Log  (erwartet: 0)
docker logs $B 2>&1 | grep -a -c -E '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'

# Log-Rotation konfiguriert  (erwartet: json-file mit max-size:10m und max-file:3)
docker inspect $B --format '{{.HostConfig.LogConfig}}'
docker inspect $F --format '{{.HostConfig.LogConfig}}'
```
Die Logs des **alten** Containers (mit SQL-Echo) bleiben bestehen, bis sie manuell entfernt werden — das ist ein separater, nicht-lesender Schritt (Abschnitt „Alt-Logs mit PII bereinigen“ in `CLAUDE.md`).

### 4d. Retention-Dry-Run läuft autorisiert durch
Der Trockenlauf ändert keine Daten (er zählt nur). Er zählt gegen das Endpunkt-Limit von **5 pro Tag** (plus der geplante Lauf um 03:00), also nicht mehr als 2–3 manuelle Versuche.

```sh
# Positiv: mit dem Secret aus der Container-Umgebung  (erwartet: "Status Code: 200", "mode": "DRY_RUN", exit=0)
docker exec $B python scripts/retention_cron.py; echo "exit=$?"

# Negativ (Kontrolle, dass der Endpunkt wirklich prüft)  (erwartet: HTTPError 403, exit=1)
docker exec -e RETENTION_CRON_SECRET=falsch $B python scripts/retention_cron.py; echo "exit=$?"
```

Alternativ in Coolify beim Scheduled Task **„Execute now“** und das Task-Log lesen: dieselbe Ausgabe (`Status Code: 200`, `mode: DRY_RUN`).

Lokal gegen echtes Postgres + uvicorn wurde genau dieser Ablauf gezeigt (richtiges Secret: 200/`DRY_RUN`/exit 0; falsches: 403/exit 1; fehlendes: Fehlermeldung/exit 1).

---

## 5. Danach

- Alt-Logs bereinigen (`CLAUDE.md`, Abschnitt „Alt-Logs mit PII bereinigen“), sobald der neue Container stabil läuft.
- In `docs/analysis/ADMIN_FIX_SPEC.md` M18/M19/M20 auf „deployt“ setzen.
- Danach den Retention-Task von Trockenlauf auf `--execute` umstellen (zweistufig laut `CLAUDE.md`).
