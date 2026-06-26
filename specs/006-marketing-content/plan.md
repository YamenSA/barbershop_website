# Implementation Plan: Marketing & Content (Public-Site-Erweiterung)

**Branch**: `006-marketing-content` | **Date**: 2026-06-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-marketing-content/spec.md`

## Summary

Phase 6 erweitert die **bestehende** öffentliche Website (Phase 2) und das Admin (Phase 1) um Marketing-, Inhalts- und Conversion-Elemente, **ohne** die Buchungs-Engine (Phase 3/4) zu verändern. Die Arbeit zerfällt in fünf klar getrennte, eigenständig auslieferbare Schichten — bewusst so geschnitten, dass nur **eine einzige** davon (die Standort-Karte) überhaupt Consent-Infrastruktur braucht:

1. **Kategorisierte Preisliste (US1, P1):** Das bestehende `Service`-Modell erhält zwei `NOT NULL`-Enum-Felder `target_group` (Herren/Damen/Kinder) und `service_kind` (Schnitt/Bart/Farbe/…). Bestandsdaten werden in der Migration **explizit je Leistung kuratiert** befüllt (Clarify Q2). Die öffentliche Preisliste gruppiert nach Zielgruppe; „Herren ohne Termin / Damen nur mit Termin" ist reines Messaging.
2. **Direkte Kontaktwege (US2, P2):** WhatsApp (`wa.me`), `tel:`/`mailto:`, Instagram/TikTok/„Bewertung schreiben" — reine Links, **keine** Fremd-Skripte. Bereits vorhandene Salon-/Stammdaten (Telefon, Adresse, Öffnungszeiten aus `SalonProfile`/`SalonHours`) werden wiederverwendet; nur die neuen Werte (Social-/WhatsApp-/Bewertungs-Links, Geo) liegen in einer env-getriebenen Frontend-Config (Clarify Q3).
3. **Vertrauensinhalte (US3, P2):** Öffentliche Team-Seite existiert bereits (`/team`) und wird wiederverwendet/verfeinert; **neue Backend-Domäne `marketing`** für admin-pflegbare Aktionen/Angebote mit Datum+Toggle-Sichtbarkeit und berechnetem Effektivstatus (Clarify Q4); FAQ (statisch, Phase 2) wird um Terminpflicht/Kartenzahlung/Parkplatz ergänzt.
4. **Vorher/Nachher-Galerie (US4, P3):** Bilder **statisch im Repo**, abgesichert durch eine versionierte **Einwilligungs-Manifest-Datei** (Bild ↔ Nachweis-ID); Veröffentlichung nur mit Nachweis, ein Guard verhindert Bilder ohne Nachweis (Clarify Q1, SC-005).
5. **Standort-Karte & Bewertungen (US5, P3):** Google-Bewertungen als **statischer, kuratierter JSON-Snapshot** (attribuierte Zitate + Profil-Link, **keine** vorgetäuschte Live-Gesamtbewertung) → consent-frei. **Nur die Karte** ist consent-gegated (Click-to-load, widerrufbar, clientseitiger Consent) gemäß §25 TTDSG/DSGVO (Clarify Q5).

Backend-Footprint ist klein: zwei Spalten an `Service` (Migration `012`, US1) und eine neue Tabelle `promotions` (Migration `013`, US3). Die Aufteilung in **zwei** Migrationen ist bewusst — sie hält US1 (Preisliste, MVP) unabhängig deploybar von US3 (Aktionen); `013` hängt mit `down_revision = "012"` sauber in die Alembic-Kette. Galerie, Bewertungen, Links und Consent sind rein im Next.js-Frontend. SEO/LocalBusiness-Schema (Phase 2) wird auf Cottbus-Keywords und echte Stammdaten ausgerichtet.

## Technical Context

**Language/Version**: Python 3.11+ (Backend), TypeScript 5 / React 19 (Frontend, Next.js App Router)

**Primary Dependencies**: FastAPI, SQLModel/SQLAlchemy, Alembic, asyncpg, Pydantic v2 (Backend); Next.js (App Router), Tailwind CSS, Motion (Framer Motion) (Frontend). **Keine neuen Laufzeit-Abhängigkeiten** — insbesondere keine Google-Places-/Maps-JS-SDKs (Karte als nach-Consent eingebetteter Iframe, Bewertungen als statischer Snapshot).

**Storage**: PostgreSQL (Produktion), SQLite/aiosqlite (Tests). `services`-Tabelle erweitert (`target_group`, `service_kind`, beide `NOT NULL`); neue Tabelle `promotions`. **Statische Inhaltsdateien im Repo** (kein DB-Storage): Galerie-Bilder + `manifest.json` (Einwilligungs-Registratur), `reviews.json` (Bewertungs-Snapshot). Consent-Status: clientseitig (`localStorage`), kein serverseitiges Personendatum.

**Testing**: pytest + pytest-asyncio + httpx (Backend, In-Memory SQLite). Kritische Pfade test-zuerst (Konstitution IX): Promotion-Sichtbarkeit/Effektivstatus (Datum+Toggle, erzwungene Expiry), Promotion-Validierung (`ends_on >= starts_on`), Service-Enum-Felder in der öffentlichen Ausgabe + Migrations-Backfill, Galerie-Manifest-Guard (kein Bild ohne Nachweis). Frontend: TS-Typprüfung; Consent-„kein Drittanbieter-Skript vor Einwilligung" als manuell/Playwright verifizierbares Szenario (quickstart.md).

**Target Platform**: Linux-Server (Backend, Modular Monolith), Browser/Mobile-First (Frontend)

**Project Type**: Web application (FastAPI-Backend + Next.js-Frontend) — bestehende Repo-Struktur, wird erweitert, nicht neu gebaut

**Performance Goals**: Core Web Vitals halten (Konstitution/FR-017): LCP < 2,5 s, INP < 200 ms, CLS < 0,1 — auch mit neuen Inhalten/Embeds. Embeds (Karte) laden ausschließlich verzögert/nach Consent; Bilder optimiert (`next/image`), Galerie/Karte ohne Layout-Shift (feste Aspect-Ratios → CLS).

**Constraints**: DSGVO/§25 TTDSG (NICHT VERHANDELBAR): vor aktiver Einwilligung kein Drittanbieter-Skript/-Cookie (SC-002); Consent ausschließlich für die Karte, widerrufbar, clientseitig; Galerie ohne Personendaten im Repo (nur Nachweis-ID); Bewertungs-Snapshot republiziert nur öffentlich auf Google Vorhandenes (Vorname), attribuiert, entfernbar — **keine** als-live dargestellte Aggregat-Bewertung (UWG-Irreführungsrisiko); abgelaufene Aktionen werden durch Datum **erzwungen** ausgeblendet (UWG). Buchungs-Engine unverändert; Zahlung bar vor Ort.

**Scale/Scope**: Einzel-Salon Cottbus, kleines Team; Dutzende Leistungen, wenige gleichzeitige Aktionen, kuratierte Galerie/Bewertungen (Größenordnung 10–30 Einträge). Inhalte deutschsprachig.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Prinzip | Relevanz & Status |
|---|---|
| I. Spec-First, keine stillen Annahmen | ✅ Clarify-Session 2026-06-13: 5 Fragen (Q1–Q5) aufgelöst und in die Spec integriert; keine offenen `[NEEDS CLARIFICATION]`-Marker. |
| II. Datenschutz by Design (NICHT VERHANDELBAR) | ✅ Datenminimierung: Galerie-Manifest enthält nur **Nachweis-IDs**, keine Personendaten; Consent **nur** für die Karte (Art. 6 (1) a / §25 TTDSG), Click-to-load, widerrufbar; vor Einwilligung kein Drittskript/-Cookie (SC-002). Bewertungs-Snapshot = nur öffentlich Vorhandenes, attribuiert, entfernbar; **keine** vorgetäuschte Live-Aggregat-Bewertung. Drittland-Hinweis (Meta/WhatsApp, Google) in der Datenschutzerklärung (FR-014). Keine Zahlungsdaten. |
| III. Eine Quelle der Wahrheit für Termine | ✅ Buchungs-Engine **unverändert**; „Herren ohne Termin / Damen nur mit Termin" ist reines Messaging, kein Schreibpfad. Alle CTAs verweisen auf bestehende `/termin`. |
| IV. Modulare Architektur, klare Domänen | ✅ Neue, schmal geschnittene Domäne `marketing` (nur Aktionen/Angebote). Service-Kategorisierung bleibt in `stammdaten`. Galerie/Bewertungen/Consent leben im Frontend (statische Inhalte) — kein Backend-Streuverlust. |
| V. Separation of Concerns | ✅ Router → Service → DB; keine DB-Queries in Routen; keine Geschäftslogik im Frontend (Effektivstatus wird backend-seitig berechnet und als Feld geliefert). Frontend kennt nur die API + statische Content-Dateien. |
| VI. Durchgängige Typsicherheit | ✅ `target_group`/`service_kind` als Python-`Enum`; Pydantic-Schemas für alle I/O; TS-Typen aus OpenAPI/`types.ts`; Galerie-Manifest & Reviews als getypte TS-Interfaces; kein `any`. |
| VII. API ist dokumentierter Vertrag | ✅ Neue Routen `/api/v1/promotions` (admin) und `/api/v1/public/promotions`; erweiterte `…/public/services`. `backend/openapi.json` wird neu exportiert. |
| VIII. Auslieferbare Qualität | ✅ Fehlerbehandlung (404/409/422), Validierung (`ends_on >= starts_on`, Enum-Constraints), Logging; saubere Empty-States (kein aktives Angebot → Bereich blendet aus). Keine `// TODO`-Lücken. |
| IX. Getestete kritische Pfade | ✅ Test-zuerst für Promotion-Sichtbarkeit/Effektivstatus + erzwungene Expiry, Promotion-Validierung, Service-Enum-Ausgabe + Migrations-Backfill, Galerie-Manifest-Guard (SC-005). |
| X. Mobile-First & zugänglich | ✅ Kontakt-Aktionen one-tap auf Mobil (SC-004); WCAG 2.1 AA (FR-018); semantisches HTML, Alt-Texte (Galerie), Tastaturbedienung des Consent-Gates; `prefers-reduced-motion`. |
| XI. Sicherheit als Standard | ✅ Admin-Aktionen hinter `get_current_admin`; Eingabevalidierung an der API-Grenze; Links als reine `href` (kein `dangerouslySetInnerHTML`); `rel="noopener noreferrer"` für externe Links; Secrets/IDs via ENV (Frontend-Config). |
| XII. Design-System & bewusste Motion | ✅ Alle neuen Komponenten nutzen `DESIGN.md`-Tokens; Motion nur über `transform`/`opacity`; Embeds verzögert → Performance hat Vorrang (FR-017). |

**Ergebnis: PASS** — keine Verletzungen, keine Einträge in Complexity Tracking erforderlich.

## Project Structure

### Documentation (this feature)

```text
specs/006-marketing-content/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── marketing-api.md  # Phase 1 output (promotions + erweiterte services)
├── checklists/
│   └── requirements.md  # from /speckit-specify + /speckit-clarify
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── domains/
│   │   ├── stammdaten/
│   │   │   ├── models.py          # Service + target_group, service_kind (Enum, NOT NULL);
│   │   │   │                      #   neue Enums TargetGroup, ServiceKind
│   │   │   ├── schemas.py         # ServiceBase/Create/Update/Read + PublicServiceRead
│   │   │   │                      #   erweitert um target_group, service_kind
│   │   │   └── service.py         # create/update validieren neue Pflichtfelder
│   │   └── marketing/             # NEW DOMAIN (nur Aktionen/Angebote)
│   │       ├── __init__.py
│   │       ├── models.py          # Promotion(title, description, starts_on, ends_on,
│   │       │                      #   is_active, timestamps)
│   │       ├── schemas.py         # PromotionCreate/Update/Read(+effective_status),
│   │       │                      #   PublicPromotionRead
│   │       ├── service.py         # CRUD + compute_effective_status() + list_public_active()
│   │       ├── admin_router.py    # /promotions (get_current_admin)
│   │       └── public_router.py   # /public/promotions (aktive only)
│   └── main.py                    # marketing-Router (admin + public) registrieren
├── alembic/versions/
│   ├── 012_service_categorization.py  # services.target_group/service_kind (+ kuratiertes
│   │                                  #   Backfill JE LEISTUNG → NOT NULL) — US1
│   └── 013_promotions.py              # table promotions; down_revision = "012" — US3
└── tests/
    ├── unit/test_promotion_visibility.py   # Effektivstatus + erzwungene Expiry + Validierung
    └── integration/test_marketing.py       # public services enums, promotions CRUD/public

frontend/
├── src/
│   ├── app/(public)/
│   │   ├── dienstleistungen/page.tsx   # nach Zielgruppe gruppierte Preisliste + Terminhinweis
│   │   ├── team/page.tsx               # bestehend — verfeinern
│   │   ├── galerie/page.tsx            # NEU: Vorher/Nachher (nur Bilder mit Nachweis)
│   │   ├── kontakt/page.tsx            # Kontakt-Aktionen + Standort (Karte consent-gated) +
│   │   │                               #   Bewertungs-Snapshot
│   │   ├── faq/page.tsx                # Terminpflicht/Kartenzahlung/Parkplatz ergänzen
│   │   └── datenschutz/page.tsx        # WhatsApp/Meta, Maps, Bewertungen, Instagram/TikTok,
│   │                                   #   Drittland-Hinweis (FR-014)
│   ├── components/public/
│   │   ├── PriceList.tsx               # gruppiert nach Zielgruppe; Walk-in-Hinweis
│   │   ├── ContactActions.tsx          # WhatsApp/tel/mailto/Bewertung — one-tap, reine Links
│   │   ├── PromotionsSection.tsx       # blendet aus, wenn keine aktive Aktion
│   │   ├── BeforeAfterGallery.tsx      # rendert nur Manifest-Einträge mit consentProofId
│   │   ├── ReviewsSnapshot.tsx         # kuratierte Zitate + Google-Profil-Link (kein Live-Aggregat)
│   │   ├── ConsentGate.tsx             # Click-to-load Wrapper (nur Karte), widerrufbar
│   │   └── LocationMap.tsx             # Iframe erst nach Consent; Fallback Adresse/Link
│   ├── content/
│   │   ├── galerie/manifest.json       # Einwilligungs-Registratur (Bild ↔ Nachweis-ID)
│   │   └── reviews.json                # Bewertungs-Snapshot (attribuierte Zitate + profileUrl)
│   ├── lib/
│   │   ├── site-config.ts              # env-getrieben: WhatsApp/Instagram/TikTok/Bewertungs-Link/
│   │   │                               #   Geo/Map-Embed (nur NEUE Werte; NAP kommt aus API)
│   │   ├── consent.ts                  # useConsent-Hook (localStorage, widerrufbar)
│   │   ├── content.ts                  # getrennt typisierte Loader für manifest/reviews + Guard
│   │   ├── seo.ts                      # LocalBusiness-JSON-LD aus SalonProfile+SalonHours+Geo
│   │   ├── api.ts                      # + getPublicPromotions(); services enums durchreichen
│   │   └── types.ts                    # + TargetGroup/ServiceKind/Promotion/Review/GalleryItem
│   └── app/admin/promotions/page.tsx   # NEU: Admin-CRUD Aktionen + Effektivstatus-Anzeige
└── public/galerie/                     # statische Vorher/Nachher-Bilddateien
```

**Structure Decision**: Bestehende Web-App-Struktur bleibt. Der **einzige** neue Backend-Baustein ist die schmale Domäne `marketing` (Aktionen/Angebote) plus zwei Enum-Spalten an `Service` in `stammdaten` — alles andere ist statischer Frontend-Content (Galerie-Manifest, Bewertungs-Snapshot) oder reine Links/Config. Diese Aufteilung folgt direkt der Spec-Architektur: nur die Karte zieht Consent-Infrastruktur nach sich, daher lebt sie als isolierte `ConsentGate`-Komponente, nicht als globales Banner. NAP-Daten werden aus den vorhandenen `SalonProfile`/`SalonHours` gespeist (Clarify Q3), nicht dupliziert. Galerie-Bilder und Bewertungen sind bewusst nicht in der DB (Clarify Q1/Q5) — Git liefert Versionierung/Audit „gratis" und hält Personendaten Dritter aus der Datenbank heraus (Datenminimierung).

## Complexity Tracking

> Keine Constitution-Verletzungen — Abschnitt entfällt.
