# Phase 0 — Research: Marketing & Content

Alle fachlichen Unbekannten wurden in der Clarify-Session (2026-06-13, Q1–Q5) aufgelöst; dieses Dokument konsolidiert die daraus folgenden technischen Entscheidungen und die wenigen offenen Umsetzungsfragen. Keine `[NEEDS CLARIFICATION]`-Marker verbleiben.

## D1 — Service-Kategorisierung: zwei Enum-Spalten statt Tags

- **Decision**: `Service` erhält `target_group` (`TargetGroup`: HERREN/DAMEN/KINDER) und `service_kind` (`ServiceKind`: SCHNITT/BART/FARBE/STYLING/SONSTIGES), beide `NOT NULL`, als Python-`str, Enum`. Öffentliche Preisliste gruppiert primär nach `target_group`, sekundär nach `service_kind`.
- **Rationale**: FR-001 schreibt feste Enums (keine freien Tags) und „genau eine Zielgruppe pro Leistung" fest. Enums geben Typsicherheit (Konstitution VI), stabile Sortierung und verhindern „uncategorized" strukturell.
- **Alternatives considered**: Freie Tags / Many-to-many-Kategorien — von FR-001 ausdrücklich ausgeschlossen (Pflege-/Konsistenzrisiko). Separate Kategorie-Tabelle — Overkill für ein festes, kleines Werteset.
- **Offene Umsetzungsfrage (planungsintern, kein Spec-Blocker)**: Die konkrete Werteliste von `ServiceKind` über Schnitt/Bart/Farbe hinaus wird beim Backfill aus den real existierenden Leistungen abgeleitet; `SONSTIGES` als Auffang verhindert Lücken.

## D2 — Migration 012: kuratiertes Per-Service-Backfill, dann NOT NULL

- **Decision**: Migration `012_service_categorization.py`: (a) Spalten **nullable** mit temporärem Server-Default hinzufügen, (b) **je bestehender Leistung per Name die fachlich korrekte** `target_group`/`service_kind` setzen (kuratierte `UPDATE`-Statements), (c) Server-Default entfernen und Spalten auf `NOT NULL` setzen. `down_revision = "011"` (folgt auf `011_customer_account`).
- **⚠️ Verbindlich — Guard (kein Blanket-Default)**: Das Backfill MUSS jeder Leistung den **fachlich korrekten** Wert geben — **nicht** pauschal `HERREN` für alle. Ein pauschaler Default produziert falsch-aber-konsistente Daten, die kein Analyzer und kein Schema-Check erkennt; nur die reale Datenkontrolle (echte Leistungen ↔ korrekte Zielgruppe) deckt das ab. Die `UPDATE`-Statements werden aus den tatsächlich existierenden Leistungen abgeleitet.
- **Rationale**: Clarify Q2 verlangt explizites korrektes Backfill, keine pauschale Default-Kategorie und kein „uncategorized". Das Drei-Schritt-Muster ist der Postgres-Standardweg, ein nicht-nullables Feld zu Bestandsdaten hinzuzufügen, ohne die Tabelle zu sperren-by-default.
- **SQLite/Tests**: Tests bauen das Schema aus den Modellen (`create_all`), daher sind die Spalten dort von Anfang an `NOT NULL`; die Migration selbst wird gegen Postgres gefahren. Ein Integrationstest prüft, dass die öffentliche Service-Ausgabe die Felder enthält.
- **Alternatives considered**: Pauschal `HERREN` als Default (Q2-Option A, vom Nutzer verworfen); Migration blockieren bis manuell befüllt (Q2-Option C) — unnötig, da die Bestandsleistungen bekannt sind.

## D3 — Aktionen/Angebote: neue Domäne `marketing`, Datum + Toggle, berechneter Effektivstatus

- **Decision**: Neue Backend-Domäne `marketing` mit Modell `Promotion(title, description, starts_on: date, ends_on: date, is_active: bool, created_at, updated_at)`. Öffentliche Sichtbarkeit: `is_active AND today ∈ [starts_on, ends_on]`. Backend berechnet `effective_status ∈ {visible, scheduled, expired, hidden}` und liefert es im Admin-`Read`-Schema; die **Lokalisierung** (sichtbar/geplant/abgelaufen/versteckt) erfolgt in der UI-Schicht (M1). Validierung: `ends_on >= starts_on`. Tabelle via Migration **`013_promotions.py`** mit `down_revision = "012"` (saubere Alembic-Kette nach den Service-Enums).
- **Rationale**: Clarify Q4 — Datum **erzwingt** Expiry (UWG-Irreführungsschutz), Toggle erlaubt Entwurf/Sofort-Kill; die Admin-Pflicht-Bedingung (Effektivstatus anzeigen) wird erfüllt, indem der Status **server-seitig** berechnet wird (Konstitution V: keine Geschäftslogik im Frontend). `date`-Granularität genügt für salonweite Aktionen. Englische Enum-Identifier halten die Glossar-Konvention (Code = EN) sauber.
- **Statuslogik**: `not is_active → hidden`; sonst `today < starts_on → scheduled`; `today > ends_on → expired`; sonst `visible`.
- **⚠️ Verbindlich — Zeitzone (I2, hochgestuft)**: „today" MUSS in **Europe/Berlin** berechnet werden (dieselbe tz-Disziplin wie `tstzrange`/Buchung Phase 3 und Anonymisierung Phase 4). Eine UTC-statt-Berlin-Off-by-one ließe ein abgelaufenes Angebot **bis zu einen Tag zu lange** öffentlich stehen — exakt der UWG-Irreführungsfall, den die erzwungene Expiry verhindern soll. Kein implementierungsseitiger „Afterthought".
- **Alternatives considered**: Nur Datum (Q4-Option B) — verworfen, da kein Entwurf/Sofort-Kill; nur Toggle (Option C) — verworfen (UWG-Risiko, Datum nur beschreibend). Promotions im Frontend-Content statt DB — verworfen: FR-009 verlangt admin-pflegbar ohne Deployment. Deutsche Enum-Werte im API-Vertrag — verworfen zugunsten EN-Identifier + UI-Lokalisierung (M1).

## D4 — Galerie: statische Bilder + versioniertes Einwilligungs-Manifest

- **Decision**: Bilder unter `frontend/public/galerie/`; Registratur `frontend/src/content/galerie/manifest.json` als Array von `{ id, beforeSrc, afterSrc, alt, consentProofId, publishedAt }`. Ein typisierter Loader (`content.ts`) plus **Guard** rendert ausschließlich Einträge mit nicht-leerer `consentProofId`; ein Unit-/Build-Test schlägt fehl, falls ein veröffentlichter Eintrag den Nachweis vermissen lässt (SC-005/FR-016).
- **Rationale**: Clarify Q1 — Manifest im Repo neben den Bildern; Git liefert Add/Remove-Historie und damit Widerrufs-Nachvollziehbarkeit. `consentProofId` ist eine **interne Referenz** auf einen offline geführten Nachweis — **keine** Personendaten im Repo (Datenminimierung, Konstitution II).
- **Alternatives considered**: DB-Modell + Admin-Upload (Q1-Option B) — bewusst Fast-Follow nach Launch (FR-010), nicht diese Phase. Nachweis-Dokumente im Repo — verworfen (enthielten Personendaten).
- **Format**: JSON gewählt (nativ in Next.js importierbar, kein YAML-Parser nötig).

## D5 — Google-Bewertungen: statischer kuratierter Snapshot (consent-frei)

- **Decision**: `frontend/src/content/reviews.json` = `{ profileUrl, writeReviewUrl, reviews: [{ id, author, rating, text, date, sourceUrl }] }`. `ReviewsSnapshot` rendert kuratierte Einzelzitate + Link „Alle Bewertungen auf Google ansehen". **Keine** aggregierte Sterne-Gesamtbewertung als-live; die aktuelle Zahl holt der Besucher über den Profil-Link.
- **⚠️ Verbindlich — Guard (First-Party-Text, kein Widget)**: Der Snapshot MUSS reiner **statischer First-Party-Text** bleiben — (a) **keine** vorgetäuschte Live-Gesamtbewertung („4,8 ★ aus N") → UWG-Irreführung; (b) **kein** eingebettetes Google-Bewertungs-Widget/-Skript → sonst würde der Bereich consent-pflichtig und die „nur die Karte"-Abgrenzung (D6) bräche. Aktuelle Gesamtzahl ausschließlich über den Profil-Link.
- **Rationale**: Clarify Q5 — reiner Text → consent-frei; veraltete Aggregat-Bewertung wäre UWG-irreführend. `author` enthält Personendaten Dritter → nur öffentlich auf Google Vorhandenes (Vorname), attribuiert mit `sourceUrl`, jederzeit per Edit entfernbar.
- **Alternatives considered**: Live Places API (laufende Drittanbindung + Consent + Kosten) — von FR-013 ausgeschlossen; Admin-Modell (Q5-Option B) — bewusst verschoben; hartkodiert in der Komponente (Option C) — schlechtere Trennung/Pflege.

## D6 — Consent nur für die Karte: Click-to-load, clientseitig, widerrufbar

- **Decision**: `ConsentGate`/`LocationMap`: Vor Einwilligung **kein** Maps-Iframe/-Skript im DOM — stattdessen statische Vorschau (Adresse + „Karte laden"-Button). Klick setzt `localStorage["consent:maps"]="granted"` und mountet erst dann den Maps-`<iframe>`. Widerruf entfernt den Schlüssel und unmountet den Iframe. `useConsent`-Hook kapselt Lesen/Setzen/Widerruf; respektiert Tastatur + `prefers-reduced-motion`.
- **⚠️ Verbindlich — Guard (Vorschau muss First-Party sein)**: Das Klick-zum-Laden-Vorschaubild DARF **nicht** von Google kommen (kein Google-Static-Maps-Bild, kein Google-Tile). Ein von Google geladenes Vorschaubild löst die Drittanbieter-Anfrage **vor** der Einwilligung aus und bricht damit genau den Consent-Gate, den es schützen soll — SC-002 stünde fälschlich auf grün. Die Vorschau MUSS ein **selbst gehostetes Platzhalter-/Eigenbild** sein (z. B. statisches Asset unter `/public`). Verifikation erfolgt im **Netzwerk-Tab** (keine Google-Requests vor Klick), nicht im Code-Review.
- **Rationale**: §25 TTDSG/DSGVO (FR-012, SC-002) — Drittinhalte erst nach aktiver, widerrufbarer Einwilligung. Da **nur** die Karte betroffen ist (Q5), genügt ein lokales Per-Embed-Gate; **kein** globales Cookie-Banner nötig (weniger Reibung, kein serverseitiges Personendatum). Dies gilt **nur**, solange Bewertungen First-Party-Text bleiben (D5) — ein Google-Bewertungs-Widget würde die Karte-only-Consent-Abgrenzung sprengen.
- **Alternatives considered**: Globaler Consent-Manager / CMP-Bibliothek — Overkill für genau einen Dienst. Statische Map-Kachel ohne Iframe — als Fallback/Vorschau ja, aber die interaktive Karte bleibt das Ziel nach Consent.
- **Fallback** (Edge Case Spec): Bei Tracking-Blocker/Ladefehler bleibt die Adress-/Routen-Link-Vorschau sichtbar.

## D7 — Kontakt-/Site-Config vs. Stammdaten-Wiederverwendung

- **Decision**: `site-config.ts` (env-getrieben, `NEXT_PUBLIC_*`) hält **nur die neuen** Werte: WhatsApp-Nummer, Instagram-/TikTok-URL, Google-„Bewertung schreiben"-Link, Google-Profil-Link, Geo-Koordinaten und Map-Embed-URL. **NAP** (Name, Adresse, Telefon, Öffnungszeiten) kommt aus den bestehenden API-Endpunkten `/public/salon-profile` und `/public/salon-hours`.
- **Rationale**: Clarify Q3 — Bestehendes wiederverwenden, nur Fehlendes konfigurieren; kein neues Admin-Settings-Modell in dieser Phase. Geo fehlt in `SalonProfile`, daher als Config (passt zur Q3-Regel „Config nur für Fehlendes").
- **Alternatives considered**: Neues Admin-„Kontaktdaten"-Modell (Q3-Option B) — verworfen (Scope); alles in Config (Option A) — verworfen, NAP existiert bereits in der DB.

## D8 — SEO / LocalBusiness (FR-015)

- **Decision**: `seo.ts` erzeugt das LocalBusiness-JSON-LD dynamisch aus `SalonProfile` (Name/Adresse/Telefon) + `SalonHours` (`openingHoursSpecification`) + Geo aus `site-config`. Seiten-Metadaten (Title/Description/H1) auf „Friseur Cottbus", „Barbershop Cottbus", „Damenfriseur Cottbus" ausrichten.
- **Rationale**: FR-015 verlangt echte Stammdaten im Schema; Wiederverwendung der vorhandenen Phase-2-LocalBusiness-Basis statt Hartkodierung (konsistent mit D7).
- **Alternatives considered**: Statisches, hartkodiertes Schema — verworfen (Drift-Risiko gegenüber gepflegten Öffnungszeiten/Adresse).

## D9 — Next.js-Versionsbesonderheit (Build-Risiko)

- **Decision**: Vor dem Schreiben von Frontend-Code die Guides unter `frontend/node_modules/next/dist/docs/` konsultieren (Hinweis in `frontend/AGENTS.md`: diese Next.js-Version hat Breaking Changes ggü. üblichen Konventionen).
- **Rationale**: Verhindert Fehlannahmen zu App-Router-APIs/Metadata/Image; betrifft Galerie (`next/image`), Metadata-Export und Server/Client-Component-Grenzen (Consent-Gate ist `'use client'`).
- **Alternatives considered**: Aus dem Gedächtnis bauen — durch das AGENTS.md-Memo ausdrücklich abgeraten.

## D10 — Performance der Embeds (FR-017)

- **Decision**: Karte lädt erst nach Consent (entfällt im Initial-LCP-Pfad). Galerie-Bilder via `next/image` mit festen Aspect-Ratios (CLS-frei) und Lazy-Loading unterhalb des Folds. Keine zusätzlichen Schriftarten/JS-SDKs.
- **Rationale**: FR-017/SC-003 — Budgets (LCP < 2,5 s, INP < 200 ms, CLS < 0,1) müssen halten; verzögertes/nach-Consent-Laden ist der direkte Hebel.
- **Alternatives considered**: Eager-Embed der Karte — verletzt sowohl Consent (SC-002) als auch Performance (SC-003).
