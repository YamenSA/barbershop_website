# Abgleich Rechtstexte ↔ tatsächliches Systemverhalten

> **Datum:** 2026-07-20
> **Status:** Vorarbeit für eine juristische Prüfung — **kein Rechtsrat und kein Ersatz
> dafür.** Dieses Dokument beschreibt, was der Code tatsächlich tut, und stellt es den
> vorhandenen Texten gegenüber. Die rechtliche Bewertung und die Formulierung der
> Texte selbst müssen von einer Person mit DSGVO-/Wettbewerbsrecht-Kenntnis erfolgen.
> Es werden hier bewusst **keine fertigen Rechtstexte** vorgeschlagen.

---

## TEIL 1 — Bestandsaufnahme

| Dokument | Datei | Route | Bemerkung |
|---|---|---|---|
| Impressum | `frontend/src/app/(public)/impressum/page.tsx` | `/impressum` | Vollständig ausformuliert, kein Platzhalter. `robots: noindex`. |
| Datenschutzerklärung | `frontend/src/app/(public)/datenschutz/page.tsx` | `/datenschutz` | Weitgehend ausformuliert, **enthält einen live sichtbaren, unausgefüllten Platzhalter** (Hosting-Anbieter, §4 — siehe unten). Stand-Vermerk „Juni 2026" im Text (Zeile 40). |
| Konto-Datenschutzseite | `frontend/src/app/(account)/konto/datenschutz/page.tsx` | `/konto/datenschutz` | Kein Rechtstext, sondern die funktionale UI für Export (Art. 20) und Kontolöschung. Verlinkt auf `/datenschutz` und `/impressum` (Zeilen 101–107). |
| Cookie-/Consent-Banner | — | — | **Kein klassischer Cookie-Banner.** Stattdessen: (a) ein Klick-Zustimmungs-Gate für den Google-Maps-Embed auf `/kontakt` (`ConsentGate.tsx` + `useConsent()` in `frontend/src/lib/consent.ts`), (b) eine Einwilligungs-Checkbox im Buchungsformular (`ContactForm.tsx:126–132`). Die Datenschutzerklärung begründet explizit, warum kein allgemeiner Banner vorhanden ist (§3, „ausschließlich technisch notwendige Cookies"). |
| AGB / Stornobedingungen | — | — | **Nicht vorhanden.** Repo-weite Suche (`AGB`, `Stornobedingungen`, `Widerrufsrecht`, `terms`, `storno`) findet nichts außer informeller Erwähnung der 24h-Stornofrist in `content/faq.ts:36` und `components/public/booking/Confirmation.tsx:43`. Kein Rechtsdokument, keine Route. |

### Erreichbarkeit

| Bereich | Layout | Impressum/Datenschutz erreichbar? |
|---|---|---|
| Startseite & alle `(public)`-Seiten (inkl. `/termin`, `/termin/stornieren/[token]`) | `app/(public)/layout.tsx` → `Footer.tsx` | **Ja.** Footer mit Links zu `/impressum` und `/datenschutz` auf jeder Seite dieser Gruppe (`Footer.tsx:153–165`). Zusätzlich im Buchungsformular selbst ein direkter Link zur Datenschutzerklärung (`ContactForm.tsx:127`). |
| Kundenkonto — eingeloggter Bereich (`/konto/termine`, `/konto/profil`, `/konto/datenschutz`) | `app/(account)/konto/layout.tsx` | **Indirekt.** Die Kopfzeile verlinkt nur auf `/konto/datenschutz` (Zeile 55 in `konto/layout.tsx`); von dort aus geht es weiter zu `/datenschutz` und `/impressum`. Kein direkter Link in der Kopfzeile selbst. |
| Kundenkonto — **Einstiegsseiten** (`/konto/registrieren`, `/konto/login`, `/konto/verifizieren`, `/konto/passwort-vergessen`, `/konto/passwort-zuruecksetzen`) | `app/(account)/konto/layout.tsx`, Zweig `isPublicPath` | **Nein.** Für diese Pfade wird laut Layout-Logik (`konto/layout.tsx:22,49`) **kein Header/Footer gerendert** (`{!isPublicPath && user && (...)}`). Die Registrierungsseite selbst (`konto/registrieren/page.tsx`) enthält **keinen** Link zur Datenschutzerklärung und **keine** Einwilligungs-/Kenntnisnahme-Checkbox — anders als das öffentliche Buchungsformular. Ein Kunde kann Name, E-Mail, Telefon und Passwort eingeben, ohne dass auf der Seite selbst ein Hinweis auf die Datenschutzerklärung erscheint. |
| Admin-Bereich (`/admin/*`) | `app/admin/layout.tsx` | Nicht geprüft — nicht kundenrelevant, daher außerhalb des Fokus dieser Aufgabe. |

**Befund Teil 1:** Impressum/Datenschutz sind im öffentlichen Bereich und im eingeloggten Kontobereich erreichbar. **Nicht erreichbar sind sie exakt an der Stelle, an der im Kundenkonto-Flow zuerst personenbezogene Daten erhoben werden** (Registrierungsformular).

---

## TEIL 2 — Datenverarbeitungen im Code (Ist-Zustand)

Alle Angaben mit Datei:Zeile belegt. Diese Tabelle beschreibt **Verhalten**, keine rechtliche Einordnung.

| # | Vorgang | Welche Daten | Wozu | Wie lange | An wen / wohin | Beleg |
|---|---|---|---|---|---|---|
| 1 | Online-Terminbuchung | Name, E-Mail, Telefon (optional), gewählte Leistung, Terminzeit | Terminverwaltung | Bis Retention greift (siehe #12) | Nur intern (PostgreSQL) | `backend/app/domains/booking/service.py:593-661` (`create_public_appointment`) |
| 1a | **Implizite Profilerstellung** — jede Online-Buchung legt/aktualisiert einen `Customer`-Datensatz an, **unabhängig davon, ob ein Konto erstellt wird** | Name, E-Mail, Telefon; `last_active_at` wird bei jeder Buchung aktualisiert | Wiedererkennung per E-Mail über mehrere Buchungen hinweg | Persistiert dauerhaft (kein separates Löschen "nach dem Termin") bis Retention (#12) greift | Intern | `backend/app/domains/booking/service.py:512-528` (`_upsert_customer`, unbedingt aufgerufen in Zeile 643) |
| 2 | Admin-Walk-in-Termin (vor Ort eingetragen) | `guest_name`, `guest_phone` direkt am Termin, **kein** `Customer`-Datensatz | Terminverwaltung ohne Konto | Bis Retention greift (#12, Gast-Zweig) | Intern | `backend/app/domains/booking/schemas.py:43-57` (`AppointmentCreate`/`AppointmentBase`), `models.py:52-53` |
| 3 | Terminstornierung per Link | Zufallstoken (`cancellation_token`, 32 Byte) in der Bestätigungsmail | Storno ohne Login | Token lebt so lange wie der Termin-Datensatz | Intern; Token per E-Mail an Kunden (via Brevo, #16) | `backend/app/domains/booking/service.py:561-590`, `service.py:652` |
| 4 | Kundenkonto-Registrierung | Name, E-Mail, Telefon (optional), Passwort (bcrypt-gehasht) | Self-Service-Portal | Dauerhaft bis Löschung/Retention | Intern | `backend/app/domains/customer_account/service.py:89-142` |
| 5 | E-Mail-Verifizierung (Double-Opt-in) | Einmal-Token (SHA-256-Hash in DB, Klartext nur im Mail-Link), gültig 24 h (`CUSTOMER_VERIFY_TOKEN_HOURS`) | Bestätigung der E-Mail-Adresse | Token bis Verbrauch/Ablauf; danach verbleibt nur `email_verified_at`-Zeitstempel | Intern; Token per E-Mail (Brevo) | `backend/app/domains/customer_account/service.py:28-58`, `models.py:12-29` |
| 6 | Login Kundenkonto | E-Mail, Passwort-Hash-Vergleich, IP (für Verzögerung bei Fehlversuchen) | Authentifizierung | Session-Cookie s. #14 | Intern | `backend/app/domains/customer_account/service.py:155-179` |
| 7 | Login Admin | Benutzername, Passwort-Hash-Vergleich, IP (Brute-Force-Schutz, In-Memory-Cache, TTL 600s) | Authentifizierung Admin-Bereich | Cache 10 Min., nicht persistiert | Intern | `backend/app/domains/auth/router.py:21-54`, `backend/app/domains/auth/service.py:12,70-77` |
| 8 | Passwort-Reset | Einmal-Token (SHA-256-Hash), gültig 1 h (`CUSTOMER_RESET_TOKEN_HOURS`) | Passwort-Wiederherstellung | Bis Verbrauch/Ablauf | Intern; Token per E-Mail (Brevo) | `backend/app/domains/customer_account/service.py:182-216` |
| 9 | Profil-Update | Name, Telefon | Datenpflege durch Kunden selbst | Dauerhaft | Intern | `backend/app/domains/customer_account/service.py:219-229` |
| 10 | Datenexport (Art. 20) | Profil (Name, E-Mail, Telefon) + gesamte Terminhistorie als JSON | Datenübertragbarkeit | Einmaliger Download, nicht serverseitig gespeichert | An den Kunden selbst (Browser-Download) | `backend/app/domains/customer_account/service.py:232-245` |
| 11 | Kontolöschung durch Kunden selbst | Anonymisierung Name/E-Mail/Telefon, Storno künftiger Termine, Löschung aller `CustomerToken`, Entfernen von Passwort-Hash & Verifizierungsstatus | DSGVO Art. 17 | Sofort wirksam | Intern | `backend/app/domains/customer_account/service.py:248-286` |
| 12 | Admin-Löschung eines Kunden | Wie #11, zusätzlich: verknüpfte `Appointment`-Zeilen werden bereinigt (`guest_name`/`guest_phone` → `NULL`, `notes` → `"[anonymisiert]"`) | DSGVO Art. 17 durch Admin ausgelöst | Sofort wirksam | Intern | `backend/app/domains/booking/service.py:82-106` |
| 13 | **Automatisierte Retention** | Kunden ohne Aktivität > `RETENTION_CUSTOMER_MONTHS` (Produktionswert **12** Monate, s.u.); Walk-in-Termine ohne `customer_id` älter als `RETENTION_GUEST_MONTHS` (**12** Monate) | Löschzweck-Wegfall | Cutoff-Berechnung `now − Monate·30 Tage` | Intern; ausgelöst per Cron über `POST /api/v1/maintenance/retention` | `backend/app/domains/maintenance/service.py:17-18,21-24,30-38`; Produktionswerte `docker-compose.yml:37-38` (`RETENTION_GUEST_MONTHS=12`, `RETENTION_CUSTOMER_MONTHS=12`); Code-Default ebenfalls 12 (`backend/app/core/config.py:6-7`) |
| 14 | Session-Cookie Kunde | `customer_session`, HttpOnly, SameSite=Lax, `Secure` abhängig von `COOKIE_SECURE` | Anmeldestatus halten | Standard: `CUSTOMER_SESSION_EXPIRE_HOURS` (8 h); mit "angemeldet bleiben": `CUSTOMER_REMEMBER_EXPIRE_DAYS` (30 Tage) | Nur Browser ↔ eigener Server | `backend/app/domains/customer_account/router.py:35,38-51` |
| 15 | Session-Cookie Admin | `session`, HttpOnly, SameSite=Lax, `Secure` abhängig von `COOKIE_SECURE` | Anmeldestatus Admin-Bereich | `SESSION_EXPIRE_HOURS` (Default 8 h) | Nur Browser ↔ eigener Server | `backend/app/domains/auth/router.py:46-53` |
| 16 | Consent-Flag Google-Maps-Embed | `consent:maps` als `localStorage`-Eintrag (kein Cookie) | Einwilligung für Kartenladung merken | Bis Nutzer widerruft oder Browser-Storage löscht | Nur im Browser des Nutzers, nicht an Server übertragen | `frontend/src/lib/consent.ts:20,31-41`; genutzt in `ConsentGate.tsx:29`, `LocationMap.tsx:22` |
| 17 | E-Mail-Versand (Bestätigung, Erinnerung, Verifizierung, Reset) | Empfänger-E-Mail, Betreff, HTML-Body (enthält Name, Leistungsname, Mitarbeitername, Termindaten bzw. Token-Link) | Transaktions-E-Mails | Verarbeitung durch Brevo je nach deren eigener Aufbewahrung (nicht im Code steuerbar) | **Brevo** (`api.brevo.com`, HTTPS) | `backend/app/domains/notifications/email.py:10,21-61`; Templates mit PII: `backend/app/domains/notifications/service.py:91-105,124-137` |
| 18 | Server-Zugriffslog (uvicorn) | Standardmäßig: Client-IP, Zeitstempel, Methode, Pfad, Statuscode | Betrieb/Fehlersuche | **Keine Anonymisierung, keine Rotation im Code konfiguriert** — läuft mit uvicorn-Standardeinstellungen | Docker-Container-Log auf dem Hostsystem | `backend/entrypoint.sh:1-4` (startet `uvicorn ... ` ohne `--no-access-log` oder Custom-Formatter); kein `logging`-Abschnitt in `docker-compose.yml` oder `Dockerfile` |
| 19 | SQL-Query-Log | *(bereits behoben, M18, Commit `1163ba9`)* — vorher: jede Query inkl. Parametern (auch PII) im Log. Jetzt: `SQL_ECHO`-Env-Var, Default `False`. | — | — | — | `backend/app/core/database.py:9`, `backend/app/core/config.py:9` |
| 20 | Anwendungs-Log bei Termin-Änderung (Audit) | Termin-ID, Startzeit, Mitarbeiter-ID — **kein** Name/E-Mail/Telefon | Nachvollziehbarkeit Admin-Änderungen | Wie Docker-Log (#18) | Docker-Container-Log | `backend/app/domains/booking/service.py:289-294` |
| 21 | Google Maps Embed (`/kontakt`) | Bei Klick auf „Karte laden": IP-Adresse, Browserdaten, ggf. Cookies — direkt an Google (auch USA möglich) | Interaktive Karte | Steuerung durch Google, nicht durch dieses System | **Google Ireland Limited** / ggf. Google LLC (USA) | `frontend/src/components/public/LocationMap.tsx:28-38`, Consent-Gate davor `ConsentGate.tsx:31-49` |
| 22 | Google Maps Vorschaubild (Startseite) | Keine — statisches Bild `/images/map-preview.jpg`, Klick führt als normaler Link zu Google Maps (kein Embed, keine Vorab-Verbindung) | Standort zeigen | — | Erst bei Klick: Google | `frontend/src/app/page.tsx:252-258` |
| 23 | WhatsApp-Link | Keine Datenübertragung beim Seitenaufruf; erst bei Klick Weiterleitung zu `wa.me` | Kontaktaufnahme | — | **WhatsApp Ireland Limited** (erst nach Klick) | `frontend/src/components/public/Footer.tsx:125-134`, `frontend/src/lib/site-config.ts:15` |
| 24 | Google-Bewertungen | Statischer Snapshot: Rezensenten-Vorname + Nachname-Initiale, Bewertungstext, Datum — aus Repo-Datei, keine Live-Verbindung | Social Proof | Bis manuell entfernt | Keine Drittanbieter-Verbindung | `frontend/src/content/reviews.json:1-15` |
| 25 | Instagram-/TikTok-Link | Keine Datenübertragung beim Seitenaufruf; reiner `<a>`-Link | Kanal-Verweis | — | Meta Platforms / TikTok (erst nach Klick) | `frontend/src/components/public/Footer.tsx:101-124`, `frontend/src/lib/site-config.ts:16-17` |
| 26 | Schriftarten | Keine — `next/font/google` lädt und hostet die Fonts **zur Build-Zeit selbst**; kein Laufzeit-Request an `fonts.googleapis.com`/`fonts.gstatic.com`. **Verifiziert im gebauten Output** (nicht nur im Quellcode): `.next/static/media/*.woff2` enthält die tatsächlichen Font-Dateien; die generierten `@font-face`-Regeln (`.next/static/chunks/39j-df5_7kmkz.css`) verweisen relativ auf `../media/*.woff2` (Same-Origin); repo-weite Suche nach `fonts.googleapis`/`fonts.gstatic` im gesamten Build-Output ergibt null Treffer. Auch die vorgerenderten HTML-Seiten enthalten keine `<link>`/`<script>` mit externer `http(s)`-Quelle und keine `preconnect`/`dns-prefetch`-Hints zu Google-Font-Hosts. | Typografie | — | Keine Drittanbieter-Verbindung | `frontend/src/app/layout.tsx:2,5-16`; Build-Nachweis: `.next/static/chunks/39j-df5_7kmkz.css`, `.next/static/media/*.woff2` |
| 27 | Hosting | — (im Code nicht identifizierbar) | Betrieb der Website | — | **Unbestätigt** — s. offene Frage | `docker-compose.yml`, keine Angabe im Code selbst |

Ergänzend geprüft, **kein externer Request gefunden**: keine Analytics-Skripte (kein GA/GTM/Meta-Pixel/Hotjar/Clarity), keine externen Icon-CDNs (Icons sind Inline-SVG, kein Icon-Paket in `package.json`), keine `<script src="http…">`/`<link href="http…">` im Quellcode. `next.config.ts:6-16` erlaubt zwar `next/image`-Optimierung von beliebigen `https`-Hosts (`remotePatterns: hostname: '**'`), das läuft aber serverseitig (Next-Server holt das Bild, nicht der Browser des Besuchers) und wird aktuell nirgends mit einer externen Bild-URL genutzt — kein akutes Risiko, aber eine sehr weit gefasste Konfiguration, die das bei künftigem Code unbemerkt ermöglichen würde.

---

## TEIL 3 — Abgleich: Text vs. System

### Kategorie 1 — im Text beschrieben und korrekt umgesetzt

- Cookie-Nutzung Admin-Bereich, technisch notwendig, kein Consent-Banner nötig (§3 ↔ #15).
- Terminbuchungsdaten und Zweck (§5 ↔ #1), Rechtsgrundlage b) plausibel für Vertragserfüllung.
- Brevo als Versanddienstleister korrekt benannt inkl. Adresse und Datenschutzlink (§5 ↔ #17).
- Kundenkonto-Cookie `customer_session`, HttpOnly, „max. 30 Tage" (§6 ↔ #14) — Name und Frist stimmen exakt mit dem Code überein.
- Datenexport (Art. 20) und Kontolöschung real im UI umgesetzt, nicht nur behauptet (§6, §8 ↔ #10, #11).
- Google-Maps-Embed als Klick-Zustimmungs-Lösung mit Widerruf, LocalStorage-Schlüssel `consent:maps` — Text (§10) beschreibt exakt den Mechanismus, den der Code umsetzt (↔ #21).
- WhatsApp/Instagram als reine Links ohne Tracking beim Seitenaufruf (§10 ↔ #23, #25).
- Google-Bewertungen als „statischer Snapshot ohne Verbindung zu Google" (§10 ↔ #24) — zutreffend.
- Aufbewahrungsfrist Gastbuchungen „12 Monate" (§7) ↔ Code-Wert `RETENTION_GUEST_MONTHS=12` — stimmt für den admin-erfassten Walk-in-Fall (#2/#13).

### Kategorie 2 — im System vorhanden, im Text nicht oder unpräzise beschrieben

- **Implizite Profilerstellung bei Online-Buchung.** §5 beschreibt die Buchungsdaten, §6 beschreibt das Kundenkonto als etwas, das „Sie … freiwillig … anlegen" können — das legt nahe, ohne Registrierung entstehe kein dauerhaftes Profil. Tatsächlich legt **jede** Online-Buchung einen persistenten `Customer`-Datensatz an (#1a), auch ohne Passwort/Registrierung. Dieser Datensatz unterliegt der „Kundenkonten"-Frist aus §7, nicht der „Gastbuchungen"-Frist — obwohl der Nutzer sich nie als „Kunde mit Konto" verstanden hat. War bereits vor dieser Prüfung als Lücke bekannt (Referenz: `docs/analysis/ADMIN_FIX_SPEC.md`, M13-Kontext).
- **Retention-Mechanik „Gastbuchung" trifft online nie zu.** Der 12-Monate-nach-Termin-Mechanismus, den §7 unter „Termine ohne Kundenkonto (Gastbuchungen)" beschreibt, greift laut Code ausschließlich für admin-erfasste Walk-ins (`Appointment.customer_id == None`, #2). Ein Website-Besucher, der online ohne Passwort bucht, fällt technisch immer unter die `Customer`-Zeile und damit unter die „Kundenkonten"-Regel (Aktivitäts-Frist, kein fixer Termin-Bezug — `last_active_at` wird bei jeder neuen Buchung zurückgesetzt, s. #1a). Die Zuordnung „Gastbuchung = keine Kontoerstellung" aus dem Text trifft für den Online-Kanal so nicht zu.
- **Cookie-Abschnitt (§3) vs. Kundenkonto-Abschnitt (§6) leicht widersprüchlich.** §3 beschreibt Cookies pauschal als „nach Ablauf der Sitzung bzw. nach einem kurzen Zeitraum" gelöscht; §6 nennt für denselben Cookie-Typ (Sitzungscookie Kundenkonto) korrekt „max. 30 Tage" bei „angemeldet bleiben" — 30 Tage ist kein „kurzer Zeitraum" im üblichen Wortsinn.
- **TikTok-Link im Code vorgesehen** (`siteConfig.tiktokUrl`, `Footer.tsx:113-124`), aber in §10 nur Instagram genannt. Ob TikTok in Produktion aktiv ist, hängt von einer Umgebungsvariable ab (`NEXT_PUBLIC_TIKTOK_URL`), die im geprüften `docker-compose.yml` nicht gesetzt ist — Live-Status auf dem tatsächlichen Server ungeprüft.
- **Selbst gehostete Schriftarten** (#26) — keine Erwähnung im Text nötig (kein Drittanbieter-Kontakt), aber ein positiver Fakt, den ein Prüfer sonst manuell verifizieren müsste. Kein Abmahnrisiko (LG-München-Fallgruppe „externe Google Fonts" trifft hier nicht zu — verifiziert am gebauten Output, s. Zeile #26).

### Kategorie 3 — im Text behauptet, im System nicht umgesetzt (kritischste Kategorie)

- ~~**IP-Anonymisierung / kurze Löschfrist der Server-Logs (§4) — nicht umgesetzt.**~~ **Text-Sofortfix behoben (2026-07-20).** Der Text behauptete wörtlich: „IP-Adresse (anonymisiert bzw. nach kurzer Zeit gelöscht)" — im Code gab es dafür keinerlei Mechanismus (uvicorn-Standard-Zugriffslog, volle Client-IP, keine Rotation, s. #18). **Entscheidung des Auftraggebers:** beide Lösungsoptionen umsetzen, Text zuerst. Schritt 1 (sofort): Textzeile auf die tatsächliche Faktenlage korrigiert — „IP-Adresse (vollständig, ohne automatische Löschung)" (`datenschutz/page.tsx`, reine Fakten-Feststellung, keine Rechtsprosa). Schritt 2 (technische Gegenmaßnahme): als **M19** in `docs/analysis/ADMIN_FIX_SPEC.md` spezifiziert — Docker-Log-Rotation (`backend`+`frontend`) plus IP-Kürzungsfilter vor dem Schreiben (IPv4 letztes Oktett, IPv6 letzte 80 Bit auf `0`) plus Regressionstest; **wartet auf Freigabe zur Umsetzung.** Erst nach grünem M19 darf der Text ein zweites Mal auf „gekürzt" angepasst werden.
- ~~**Kundenkonten-Aufbewahrungsfrist „24 Monate" (§7) — Code sagt 12 Monate.**~~ **Behoben (2026-07-20).** Text sagte „Bei 24 Monaten ohne Aktivität …", Produktionswert und Code-Default sind seit der M13-Entscheidung **12 Monate** (`RETENTION_CUSTOMER_MONTHS=12` in `docker-compose.yml:38` und `config.py:7`; Entscheidung dokumentiert in `docs/analysis/ADMIN_FIX_SPEC.md`, Abschnitt M13). Die Zahl in `datenschutz/page.tsx` (§7, Abschnitt „Kundenkonten") wurde von 24 auf 12 korrigiert — reine Zahlenkorrektur, keine Umformulierung des Abschnitts.
- ~~**Hosting-Anbieter (§4) — Angabe fehlt vollständig, live sichtbarer Platzhalter.**~~ **Behoben (2026-07-20).** Der bisherige Platzhalter „Betreiber einzutragen" (`datenschutz/page.tsx`, vormals Zeilen 149-153) wurde durch die tatsächliche Angabe ersetzt: Hetzner Online GmbH, Industriestr. 25, 91710 Gunzenhausen, Deutschland, mit Link zur Hetzner-Datenschutzerklärung. Firmierung und Anschrift stammen aus Hetzners eigenem Impressum/Datenschutzerklärung (`hetzner.com/de/legal/imprint/`, `hetzner.com/de/legal/privacy-policy/`, live abgerufen, nicht aus dem Training übernommen) und wurden über die englische und deutsche Fassung gegengeprüft (übereinstimmend: HRB 6089, Registergericht Ansbach, USt-IdNr. DE 812871812). **Offen bleibt:** ob ein Auftragsverarbeitungsvertrag mit Hetzner besteht (s. offene Fragen) — das ist eine Tatsachenfrage, die nur Azzam beantworten kann, keine Textfrage.
- **Fehlende Datenschutz-Verlinkung bei Konto-Registrierung** — kein „Text behauptet"-Fall im engeren Sinn, aber die implizite Zusage aus §6 („Sie können … ein Kundenkonto anlegen") findet ohne begleitenden Hinweis auf die Datenschutzerklärung an der Erhebungsstelle selbst statt (s. Teil 1, Erreichbarkeits-Tabelle). Wird hier aufgeführt, weil es strukturell zur „Zusage nicht eingehalten"-Kategorie gehört: die Datenschutzerklärung selbst verspricht Transparenz „im Rahmen des Kundenkontos", ist an der Stelle der Ersterhebung aber nicht sichtbar verlinkt.

---

## TEIL 4 — Impressum: Prüfung gegen § 5 DDG

| Pflichtangabe (§ 5 DDG) | Vorhanden? | Fundstelle | Bemerkung |
|---|---|---|---|
| Name/Firma + Anschrift | ✅ | `impressum/page.tsx:32-38` | „Azzam Barbershop, Inhaber: Usama Azzam, Sielower Chaussee 38, 03044 Cottbus" |
| Vertretungsberechtigte Person | ✅ (implizit) | ebenda | Als Einzelunternehmen deckt „Inhaber: Usama Azzam" das ab. Die Rechtsform (z. B. „Einzelunternehmen") wird nicht explizit benannt — üblicherweise unschädlich bei erkennbarem Einzelunternehmen, aber nicht explizit ausgeschrieben. |
| Kontakt (Telefon, E-Mail) | ✅ | `impressum/page.tsx:49-66` | Telefon + E-Mail vorhanden. Keine Fax-Nummer (nicht mehr verpflichtend). |
| Umsatzsteuer-Identifikationsnummer | ❌ / unklar | — | **Keine USt-IdNr. angegeben, keine Angabe zu Kleinunternehmerstatus.** § 5 DDG verlangt die USt-IdNr. nur „soweit vorhanden" — ob eine existiert oder ob § 19 UStG (Kleinunternehmerregelung) greift, ist aus dem Code nicht ersichtlich. Siehe offene Frage. |
| Zuständige Kammer (Handwerksbetrieb) | ✅ | `impressum/page.tsx:83-89` | „Handwerkskammer Cottbus, Altmarkt 17, 03046 Cottbus" — vorhanden und mit Anschrift. |
| Gesetzliche Berufsbezeichnung + Verleihungsstaat | ✅ | `impressum/page.tsx:79-80` | „Friseur (verliehen in der Bundesrepublik Deutschland)". |
| Berufsrechtliche Regelungen + Zugänglichkeit | ✅ | `impressum/page.tsx:92-106` | Verweis auf HwO mit Link zu gesetze-im-internet.de. |
| Verantwortlicher nach § 18 Abs. 2 MStV | ✅ | `impressum/page.tsx:110-123` | Vorhanden. |
| OS-Streitbeilegung (Art. 14 ODR-VO) | ✅ | `impressum/page.tsx:167-190` | Link vorhanden, plus Hinweis auf fehlende Teilnahmebereitschaft an Verbraucherschlichtung. |
| Handwerksrolle-Eintragungsnummer | — nicht geprüft als Pflichtangabe | — | Keine gesetzliche Pflichtangabe *im Impressum* nach § 5 DDG selbst (das ist ein separates gewerberechtliches Thema, keine Impressumspflicht) — wird hier nur als Hinweis erwähnt, nicht als Lücke gewertet, um keine Anforderung zu erfinden. |

**Ergebnis Teil 4:** Das Impressum ist inhaltlich ungewöhnlich vollständig für einen Handwerksbetrieb (Handwerkskammer- und Berufsrechts-Angaben sind oft die Schwachstelle — hier vorhanden). Die einzige klare offene Stelle ist die **USt-IdNr./Kleinunternehmer-Frage**, die nur Azzam beantworten kann.

---

## Lückenliste, nach Risiko sortiert

1. ~~**[Hoch]** Live sichtbarer, unausgefüllter Platzhalter „Betreiber einzutragen" für den Hosting-Anbieter.~~ **Behoben 2026-07-20** (s. Teil 3, Kategorie 3). Offen bleibt nur noch die AVV-Bestätigung (offene Frage #2).
2. **[Hoch → Teilbehoben, Rest wartet auf Freigabe]** Behauptete IP-Anonymisierung/kurze Log-Löschfrist (§4) entsprach nicht dem tatsächlichen Logging-Verhalten (#18). **Entscheidung:** beide Optionen, Text zuerst. Schritt 1 (Text, erledigt 2026-07-20): §4 beschreibt jetzt „vollständig, ohne automatische Löschung" statt der falschen Anonymisierungs-Behauptung. Schritt 2 (Technik, spezifiziert als **M19** in `ADMIN_FIX_SPEC.md`, P1, wartet auf Freigabe): Docker-Log-Rotation für `backend`+`frontend` sowie ein IP-Kürzungsfilter vor dem Schreiben ins Zugriffslog (IPv4 letztes Oktett, IPv6 letzte 80 Bit auf `0` — entfernt den Personenbezug an der Quelle statt ihn nur zeitlich zu begrenzen) plus Regressionstest. Erst nach M19 darf der Text ein zweites Mal auf „gekürzt" angepasst werden.
3. ~~**[Mittel]** Aufbewahrungsfrist „24 Monate" für Kundenkonten im Text vs. tatsächlich 12 Monate.~~ **Behoben 2026-07-20** (s. Teil 3, Kategorie 3).
4. **[Mittel]** Implizite Profilerstellung bei jeder Online-Buchung (auch ohne Kontoerstellung) wird in §5/§6 nicht klar genug von der freiwilligen Kontoerstellung abgegrenzt; die „Gastbuchung"-Frist aus §7 betrifft online faktisch niemanden, der über das Buchungsformular kommt.
5. **[Mittel]** Keine Verlinkung der Datenschutzerklärung auf den Kundenkonto-Einstiegsseiten (`/konto/registrieren` u. a.) — dort, wo zuerst Name/E-Mail/Telefon/Passwort erhoben werden, fehlt jeder Hinweis.
6. **[Niedrig]** USt-IdNr./Kleinunternehmerstatus im Impressum weder angegeben noch als „entfällt" vermerkt.
7. **[Niedrig]** Kein AGB-/Stornobedingungen-Dokument; die 24h-Frist steht nur informell in FAQ/Bestätigungstext. Rechtliche Notwendigkeit hängt von der Einordnung der Terminbuchung ab (ggf. Ausnahme vom Widerrufsrecht bei terminierten Dienstleistungen, § 312g Abs. 2 Nr. 9 BGB — juristisch zu prüfen, hier nicht bewertet).
8. **[Niedrig]** Kleinere interne Inkonsistenz zwischen §3 („kurzer Zeitraum") und §6 („max. 30 Tage") für denselben Cookie-Mechanismus.
9. **[Niedrig]** TikTok-Verlinkung im Code vorbereitet, in der Datenschutzerklärung (§10) nicht erwähnt; Live-Status auf dem Produktivserver ungeprüft.
10. **[Niedrig]** `next.config.ts` erlaubt technisch beliebige externe Bildquellen (`remotePatterns: '**'`); aktuell ungenutzt, aber keine Beschränkung, die künftigen Missbrauch verhindern würde.
11. **[Erledigt]** Externe Schriftarten/Icons/Skripte/Stylesheets — geprüft, **kein Befund**. `next/font/google` hostet Barlow Condensed und Inter selbst (Build-Nachweis s. Teil 2, #26); keine Icon-Bibliothek (Inline-SVG, kein Paket in `package.json`); keine externen `<script>`/`<link>`-Quellen im Quellcode oder im gerenderten HTML-Output; keine `preconnect`/`dns-prefetch`-Hints zu Font-Hosts.

---

## Offene Fragen an Azzam (nur er kann sie beantworten)

1. ~~**Hosting-Anbieter:**~~ Beantwortet und in §4 eingetragen (Hetzner Online GmbH, s. Teil 3, Kategorie 3).
2. **Auftragsverarbeitungsvertrag (AVV) mit dem Hosting-Anbieter:** Ist einer abgeschlossen (Art. 28 DSGVO)? Bleibt offen — reine Tatsachenfrage, nicht aus dem Code ableitbar.
3. **Auftragsverarbeitungsvertrag mit Brevo:** Ist ein AVV mit Brevo (Sendinblue GmbH) abgeschlossen?
4. **Umsatzsteuer:** Besitzt der Betrieb eine USt-IdNr.? Falls nein: Gilt die Kleinunternehmerregelung (§ 19 UStG)? Beides fehlt aktuell im Impressum.
5. **Rechtsform-Bezeichnung:** Soll das Impressum die Rechtsform explizit benennen (z. B. „Einzelunternehmen"), auch wenn sie sich aus „Inhaber" bereits ergibt?
6. **TikTok:** Ist der TikTok-Link auf dem Produktivserver aktuell aktiv (Umgebungsvariable gesetzt)? Falls ja, muss §10 der Datenschutzerklärung ihn mit aufnehmen.
7. **Server-Log-Retention:** Soll eine feste Aufbewahrungsfrist für Zugriffslogs technisch umgesetzt werden (Rotation/Löschung), oder soll stattdessen die Formulierung in §4 an das tatsächliche Verhalten angepasst werden? Das ist eine Produktentscheidung, die vor der Textkorrektur getroffen werden sollte.
8. ~~**Retention-Frist Kundenkonten:**~~ Auf 12 Monate korrigiert (Anweisung vom 2026-07-20, entspricht der bestehenden M13-Entscheidung im Code).
9. **Stornobedingungen/AGB:** Soll ein separates Dokument erstellt werden, oder reicht die informelle 24h-Angabe in FAQ/Bestätigungsmail? Hängt von einer rechtlichen Einschätzung ab (Widerrufsrecht bei terminierten Dienstleistungen), die hier bewusst nicht vorweggenommen wird.

---

## Hinweis zur Verwendung dieses Dokuments

Dieses Dokument ist eine technische Bestandsaufnahme zur Vorbereitung einer
juristischen Prüfung. Es ersetzt keine Rechtsberatung, trifft keine rechtliche
Bewertung der Schwere einzelner Punkte und schlägt bewusst keine
Textformulierungen vor. Die Einordnung, was zwingend zu ändern ist, was Risiko
toleriert werden kann und wie die Texte konkret zu formulieren sind, obliegt einer
Person mit einschlägiger DSGVO-/Wettbewerbsrecht-Kenntnis.
