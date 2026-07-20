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
- **M19 (P1, spezifiziert, wartet auf Freigabe):** Security/DSGVO: Log-Rotation (Docker `logging`-Optionen für `backend`+`frontend`) und IP-Kürzung im Zugriffslog (letztes IPv4-Oktett / letzte 80 IPv6-Bit vor dem Schreiben auf `0`, statt nur zeitlich zu begrenzen). Details in `docs/analysis/ADMIN_FIX_SPEC.md`. Erst nach Umsetzung + Test darf die Datenschutzerklärung ein zweites Mal angepasst werden ("gekürzt" statt "vollständig").

## Deployment & Environment Variables

**WICHTIG**: Die Umgebungsvariable `RETENTION_CRON_SECRET` ist **Pflicht**. Das Backend startet nicht (Pydantic ValidationError), wenn diese Variable fehlt. Dies schtzt den DSGVO-Lschendpunkt vor unautorisiertem Zugriff. Bei jedem neuen Server-Setup oder Coolify-Deploy MUSS diese Variable gesetzt werden.

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

## Workflow Regeln

- **Vor jedem Push muss 
pm run build im Frontend lokal grn sein**. Ein Push lst bei uns den Produktions-Deploy aus.
- **Push nur nach meiner ausdrcklichen Freigabe**.
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

