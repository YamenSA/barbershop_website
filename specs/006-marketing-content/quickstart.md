# Quickstart — Marketing & Content (Validierung)

Runnable Validierungs-Szenarien, die belegen, dass das Feature end-to-end funktioniert. Details zu Schemas/Feldern in [contracts/marketing-api.md](./contracts/marketing-api.md) und [data-model.md](./data-model.md).

## Voraussetzungen

```sh
# Backend
cd backend
source .venv/Scripts/activate        # bzw. .venv/Scripts/activate.ps1
docker compose up -d db
alembic upgrade head                  # wendet Migration 012 an (Service-Enums + promotions)
uvicorn app.main:app --reload

# Frontend (eigenes Terminal)
cd frontend
# WICHTIG: vor Frontend-Code zuerst node_modules/next/dist/docs/ konsultieren (AGENTS.md)
# .env.local mit NEXT_PUBLIC_* setzen (WhatsApp/Instagram/TikTok/Bewertungs-Link/Geo/Map-Embed)
npm run dev
```

## Backend-Tests (kritische Pfade, Konstitution IX)

```sh
cd backend
pytest -v tests/unit/test_promotion_visibility.py tests/integration/test_marketing.py
```
Erwartung: alle grün.

## Szenario 1 — Kategorisierte Preisliste (US1 / FR-001)

1. Migration prüfen: `GET /api/v1/public/services` liefert für **jede** Leistung `target_group` und `service_kind` (nie `null`) — belegt das kuratierte Backfill (Clarify Q2).
2. Frontend `/dienstleistungen` öffnen: Leistungen nach **Herren / Damen / Kinder** gruppiert mit fixen Preisen; Hinweis „Herren ohne Termin / Damen nur mit Termin" sichtbar; „Jetzt Termin buchen" führt nach `/termin`.

**Erwartetes Ergebnis**: keine Leistung ohne Kategorie; Buchungs-Engine unverändert.

## Szenario 2 — Direkte Kontaktwege (US2 / FR-005–007, SC-004)

1. `/kontakt` auf Mobil (DevTools-Geräteemulation):
   - WhatsApp-Button → öffnet `wa.me`-Chat; **kein** Skript vorab geladen (Network-Tab vor Klick leer von Drittanbietern).
   - Telefonnummer → `tel:`; E-Mail → `mailto:`.
   - „Bewertung schreiben" → Google-Bewertungsformular; Instagram/TikTok als Links.
2. Jede Aktion ist mit **einem** Tap erreichbar (SC-004).

## Szenario 3 — Aktionen/Angebote + Effektivstatus (US3 / FR-009, Clarify Q4)

1. Admin: `POST /api/v1/promotions` mit `ends_on < starts_on` → erwartet `422`.
2. Aktion mit Zeitraum **in der Zukunft**, `is_active=true` anlegen → `GET /promotions` zeigt `effective_status="geplant"`; `GET /public/promotions` enthält sie **nicht**.
3. Aktion mit **heute** im Zeitraum → Admin `effective_status="sichtbar"`; öffentlich enthalten; Frontend-Bereich sichtbar.
4. Aktion mit `ends_on` in der **Vergangenheit** → `effective_status="abgelaufen"`; öffentlich **nicht** ausgeliefert (erzwungene Expiry, UWG).
5. Aktion mit `is_active=false` → `effective_status="versteckt"`; öffentlich nicht ausgeliefert.
6. Alle Aktionen inaktiv/leer → Frontend-Bereich blendet sauber aus (FR-009).
7. Admin `/admin/promotions` zeigt je Aktion den Effektivstatus an (Pflicht-Bedingung Q4).

## Szenario 4 — Vorher/Nachher-Galerie + Einwilligung (US4 / FR-016, SC-005)

1. `/galerie` öffnet: nur Bilder mit nicht-leerer `consentProofId` aus `manifest.json` erscheinen.
2. Negativtest: Manifest-Eintrag ohne `consentProofId` ergänzen → Galerie zeigt ihn **nicht**, und der Manifest-Guard-Test schlägt fehl (belegt SC-005).
3. Bilder haben Alt-Texte (a11y, FR-018).

## Szenario 5 — Karte (consent-gated) & Bewertungen (consent-frei) (US5 / FR-012/013, SC-002)

1. Inkognito, `/kontakt` öffnen, Network-Tab beobachten:
   - **Vor** Klick: **kein** Google-Maps-Iframe/-Skript, **kein** Drittanbieter-Cookie (SC-002); stattdessen Vorschau „Karte laden" + Adresse.
   - Bewertungs-Snapshot (Text) **ist** sofort sichtbar (consent-frei) inkl. „Alle Bewertungen auf Google ansehen"-Link; **keine** als-live dargestellte Gesamtbewertung.
2. „Karte laden" klicken → Maps-Iframe wird gemountet; `localStorage["consent:maps"]="granted"`.
3. Seite neu laden → Karte lädt direkt (Consent persistiert).
4. Consent widerrufen (Steuerung) → Iframe verschwindet, `localStorage`-Schlüssel entfernt; nach Reload erneut nur Vorschau.

## Szenario 6 — SEO / LocalBusiness (FR-015)

1. Seitenquelltext prüfen: LocalBusiness-JSON-LD enthält echten Namen, Adresse, Telefon (aus `/public/salon-profile`), `openingHoursSpecification` (aus `/public/salon-hours`) und Geo (aus Config).
2. Title/Description/H1 enthalten Cottbus-Keywords („Friseur Cottbus", „Barbershop Cottbus", „Damenfriseur Cottbus").

## Szenario 7 — Datenschutz & Performance (FR-014/FR-017, SC-003)

1. `/datenschutz` nennt WhatsApp/Meta, Google Maps (Consent), Google-Bewertungen (Personendaten Dritter), Instagram/TikTok inkl. Drittland-Hinweis.
2. Lighthouse/PageSpeed auf den erweiterten Seiten: LCP < 2,5 s, INP < 200 ms, CLS < 0,1 — Karte nicht im Initial-Pfad, Galerie-Bilder ohne Layout-Shift.
