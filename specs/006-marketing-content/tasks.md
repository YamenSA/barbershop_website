---
description: "Task list for Marketing & Content (Public-Site-Erweiterung)"
---

# Tasks: Marketing & Content (Public-Site-Erweiterung)

**Input**: Design documents from `/specs/006-marketing-content/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/marketing-api.md](./contracts/marketing-api.md), [quickstart.md](./quickstart.md)

**Tests**: Test-Tasks sind enthalten für die von der Konstitution (Prinzip IX) geforderten kritischen Pfade: Promotion-Sichtbarkeit/Effektivstatus + erzwungene Expiry, Promotion-Validierung, Service-Enum-Ausgabe + Backfill, Galerie-Manifest-Guard (SC-005). Übrige UI-Validierung läuft über `quickstart.md`.

**Organization**: Tasks sind nach User Story gruppiert (Prioritäten aus spec.md). Jede Story ist eigenständig implementier- und testbar.

## Format: `[ID] [P?] [Story] Beschreibung`

- **[P]**: Parallelisierbar (andere Datei, keine offene Abhängigkeit)
- **[Story]**: US1–US5 (Traceability zur spec.md)
- Exakte Dateipfade in jeder Beschreibung

## Path Conventions

Web-App (bestehende Struktur): Backend `backend/app/...`, Tests `backend/tests/...`, Frontend `frontend/src/...`. **Buchungs-Engine bleibt unverändert** (Konstitution III).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Konfigurations-Scaffolding, das mehrere Stories voraussetzen

- [X] T001 [P] Neue `NEXT_PUBLIC_*`-Variablen (WhatsApp-Nummer, Instagram-URL, TikTok-URL, „Bewertung schreiben"-Link, Google-Profil-Link, Geo `LAT`/`LNG`, Map-Embed-URL) mit Kommentaren in `frontend/.env.example` ergänzen
- [X] T002 [P] Vor jeglichem Frontend-Code die Guides unter `frontend/node_modules/next/dist/docs/` zu App-Router-Metadata, `next/image` und Server/Client-Components sichten (gemäß `frontend/AGENTS.md`) und Abweichungen notieren

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Von mehreren Stories gemeinsam genutzte Bausteine

**⚠️ CRITICAL**: Muss vor US2/US5 stehen (Config-Konsum); blockiert nicht US1/US3.

- [X] T003 Typisiertes `SiteConfig`-Modul in `frontend/src/lib/site-config.ts` anlegen, das die `NEXT_PUBLIC_*`-Werte liest (nur **neue** Links + Geo; NAP bleibt aus `/public/salon-profile` + `/public/salon-hours`, Clarify Q3)

**Checkpoint**: Config bereit — User-Story-Phasen können beginnen.

---

## Phase 3: User Story 1 — Leistungen, Preise & Buchung nach Zielgruppe (Priority: P1) 🎯 MVP

**Goal**: Nach Zielgruppe (Herren/Damen/Kinder) gegliederte Preisliste mit fixen Preisen, Walk-in-Messaging und Buchungs-CTA.

**Independent Test**: `/dienstleistungen` zeigt Leistungen nach Zielgruppe gruppiert mit Preisen; `GET /public/services` liefert für jede Leistung `target_group`/`service_kind` (nie null); „Jetzt Termin buchen" führt nach `/termin`.

### Tests for User Story 1 ⚠️ (zuerst schreiben, müssen fehlschlagen)

- [X] T004 [P] [US1] Integrationstest: `GET /api/v1/public/services` liefert für **jede** Leistung nicht-null `target_group` und `service_kind` (belegt Backfill) in `backend/tests/integration/test_public_services.py`

### Implementation for User Story 1

- [X] T005 [P] [US1] Enums `TargetGroup` (HERREN/DAMEN/KINDER) und `ServiceKind` (SCHNITT/BART/FARBE/STYLING/SONSTIGES) sowie `target_group`/`service_kind` (`NOT NULL`) am `Service`-Modell in `backend/app/domains/stammdaten/models.py` ergänzen
- [X] T006 [P] [US1] `ServiceBase`/`ServiceCreate`/`ServiceUpdate`/`ServiceRead` und `PublicServiceRead` um `target_group`/`service_kind` in `backend/app/domains/stammdaten/schemas.py` erweitern
- [X] T007 [US1] Alembic-Migration `backend/alembic/versions/012_service_categorization.py` (`down_revision = "011"`): Spalten nullable+temp-Default → **kuratiertes `UPDATE` je bestehender Leistung** (fachlich korrekte Werte per Name — **GUARD G2: kein Blanket-`HERREN`-Default**) → Default entfernen → `SET NOT NULL` (hängt an T005)
- [X] T008 [US1] Pflichtfeld-Validierung beim Anlegen + Partial-Update in `backend/app/domains/stammdaten/service.py` (Fehlerbehandlung 422)
- [X] T009 [P] [US1] `Service`-Type um `target_group`/`service_kind` (+ TS-Unions) in `frontend/src/lib/types.ts` erweitern und in `getPublicServices` in `frontend/src/lib/api.ts` durchreichen
- [X] T010 [P] [US1] `PriceList`-Komponente (Gruppierung nach `target_group`, dann `service_kind`; fixe Preise; DESIGN.md-Tokens) in `frontend/src/components/public/PriceList.tsx`
- [X] T011 [US1] `frontend/src/app/(public)/dienstleistungen/page.tsx`: `PriceList` rendern + Walk-in-Hinweis „Herren ohne Termin / Damen nur mit Termin" + `BookingCta` (hängt an T010)
- [X] T012 [P] [US1] Pflicht-Auswahlfelder `target_group`/`service_kind` im Admin-Service-Formular in `frontend/src/app/admin/services/page.tsx`

**Checkpoint**: US1 eigenständig funktionsfähig — MVP auslieferbar.

---

## Phase 4: User Story 2 — Direkte Kontakt- und Conversion-Wege (Priority: P2)

**Goal**: WhatsApp, Anruf, E-Mail, „Bewertung schreiben", Instagram/TikTok als reine Links, one-tap auf Mobil, ohne Fremd-Skripte.

**Independent Test**: Auf Mobil sind WhatsApp/Telefon/Termin/„Bewertung schreiben" je mit einem Tap erreichbar; vor dem Antippen lädt kein Drittanbieter-Skript.

### Implementation for User Story 2

- [X] T013 [P] [US2] `ContactActions`-Komponente (WhatsApp `wa.me`, `tel:`, `mailto:`, „Bewertung schreiben"; `rel="noopener noreferrer"`; reine Links) in `frontend/src/components/public/ContactActions.tsx` (nutzt `site-config` + NAP aus `/public/salon-profile`)
- [X] T014 [US2] `ContactActions` in `frontend/src/app/(public)/kontakt/page.tsx` einbinden (hängt an T013)
- [X] T015 [P] [US2] Instagram/TikTok/WhatsApp/„Bewertung schreiben"-Links im Footer ergänzen (keine eingebetteten Feeds/Skripte) in `frontend/src/components/public/Footer.tsx`
- [X] T016 [P] [US2] Sticky Mobile-Kontaktleiste (WhatsApp + Anrufen + Termin) für one-tap in `frontend/src/components/public/MobileContactBar.tsx` + Einbindung im Public-Layout

**Checkpoint**: US1 + US2 funktionieren unabhängig.

---

## Phase 5: User Story 3 — Vertrauensinhalte: Team, Angebote, FAQ (Priority: P2)

**Goal**: Öffentliche Team-Seite (Wiederverwendung), admin-pflegbare Aktionen/Angebote mit Datum+Toggle-Sichtbarkeit & Effektivstatus, FAQ-Ergänzungen.

**Independent Test**: Team-Seite zeigt Stammdaten-Friseure; aktive Aktionen erscheinen, abgelaufene/versteckte nicht; Admin zeigt je Aktion den Effektivstatus; FAQ beantwortet Terminpflicht/Kartenzahlung/Parkplatz.

### Tests for User Story 3 ⚠️ (zuerst schreiben, müssen fehlschlagen)

- [X] T017 [P] [US3] Unit-Test: `compute_effective_status` (`visible`/`scheduled`/`expired`/`hidden`), erzwungene Expiry **inkl. Tagesgrenzen-Fall in Europe/Berlin** (I2), und `ends_on >= starts_on`-Validierung in `backend/tests/unit/test_promotion_visibility.py`
- [X] T018 [P] [US3] Integrationstest: Promotions-CRUD (admin) + `GET /api/v1/public/promotions` liefert **nur sichtbare** Aktionen in `backend/tests/integration/test_marketing.py`

### Implementation for User Story 3

- [X] T019 [P] [US3] `marketing`-Domäne anlegen: `Promotion`-Modell (`title`, `description`, `starts_on`, `ends_on`, `is_active`, Timestamps) in `backend/app/domains/marketing/models.py` + `backend/app/domains/marketing/__init__.py`
- [X] T020 [P] [US3] Schemas `PromotionCreate`/`PromotionUpdate`/`PromotionRead` (inkl. `effective_status` als EN-Enum `visible`/`scheduled`/`expired`/`hidden`, M1) + `PublicPromotionRead` in `backend/app/domains/marketing/schemas.py`
- [X] T021 [US3] Service: CRUD, `compute_effective_status`, `list_public_active` (`is_active AND today ∈ [starts_on, ends_on]`, **`today` in Europe/Berlin — GUARD I2**), Validierung `ends_on >= starts_on` in `backend/app/domains/marketing/service.py` (hängt an T019, T020)
- [X] T022 [P] [US3] Admin-Router `/promotions` (geschützt durch `get_current_admin`) in `backend/app/domains/marketing/admin_router.py`
- [X] T023 [P] [US3] Public-Router `/public/promotions` (nur sichtbare) in `backend/app/domains/marketing/public_router.py`
- [X] T024 [US3] `marketing`-Admin- und Public-Router in `backend/app/main.py` registrieren (hängt an T022, T023)
- [X] T025 [US3] Alembic-Migration `backend/alembic/versions/013_promotions.py` für Tabelle `promotions` mit **`down_revision = "012"`** (saubere Kette nach den Service-Enums — verifizieren, dass `alembic upgrade head` 011→012→013 durchläuft; hängt an T019)
- [X] T026 [US3] OpenAPI-Schema neu nach `backend/openapi.json` exportieren (hängt an T024)
- [X] T027 [P] [US3] `Promotion`/`PublicPromotion`/`PromotionStatus`-Types in `frontend/src/lib/types.ts` + `getPublicPromotions` und Admin-CRUD-Calls in `frontend/src/lib/api.ts`
- [X] T028 [P] [US3] `PromotionsSection`-Komponente (rendert aktive Aktionen; blendet bei leerem Ergebnis sauber aus) in `frontend/src/components/public/PromotionsSection.tsx`
- [X] T029 [US3] `PromotionsSection` auf der Startseite/im Angebote-Bereich `frontend/src/app/page.tsx` einbinden (hängt an T028)
- [X] T030 [P] [US3] Admin-CRUD-Seite für Aktionen mit **Effektivstatus-Anzeige**: API liefert EN-Enum (`visible`/`scheduled`/`expired`/`hidden`), Lokalisierung „sichtbar/geplant/abgelaufen/versteckt" in der UI-Schicht (M1) in `frontend/src/app/admin/promotions/page.tsx`
- [X] T031 [P] [US3] Öffentliche Team-Seite `frontend/src/app/(public)/team/page.tsx` verfeinern (Wiederverwendung der Stammdaten-Friseure)
- [X] T032 [P] [US3] FAQ um Terminpflicht/Kartenzahlung/Parkplatz ergänzen in `frontend/src/app/(public)/faq/page.tsx`

**Checkpoint**: US1–US3 funktionieren unabhängig.

---

## Phase 6: User Story 4 — Vorher/Nachher-Galerie (Priority: P3)

**Goal**: Statische Vorher/Nachher-Galerie, abgesichert durch versioniertes Einwilligungs-Manifest; nur Bilder mit Nachweis erscheinen.

**Independent Test**: `/galerie` zeigt nur Manifest-Einträge mit nicht-leerer `consentProofId`; ein Eintrag ohne Nachweis erscheint nicht und lässt den Guard-Check fehlschlagen.

### Implementation for User Story 4

- [X] T033 [P] [US4] `GalleryItem`-Type ergänzen und Einwilligungs-Manifest `frontend/src/content/galerie/manifest.json` anlegen (Einträge mit `id`, `beforeSrc`, `afterSrc`, `alt`, `consentProofId`, `publishedAt`)
- [X] T034 [P] [US4] Vorher/Nachher-Bilddateien unter `frontend/public/galerie/` ablegen (real vom Inhaber, mit Nachweis)
- [X] T035 [US4] Typisierter Loader + **Consent-Guard** (filtert Einträge ohne `consentProofId`) in `frontend/src/lib/content.ts` (hängt an T033)
- [X] T036 [US4] `BeforeAfterGallery`-Komponente (Alt-Texte, `next/image`, feste Aspect-Ratio → CLS-frei) in `frontend/src/components/public/BeforeAfterGallery.tsx` (hängt an T035)
- [X] T037 [US4] Galerie-Seite `frontend/src/app/(public)/galerie/page.tsx` + Nav-Link in `frontend/src/components/public/Nav.tsx` (hängt an T036)
- [X] T038 [US4] Build-/CI-Guard-Script `frontend/scripts/validate-gallery.mjs` (schlägt fehl, wenn ein veröffentlichter Eintrag `consentProofId` vermissen lässt) + npm-Script in `frontend/package.json` (SC-005/FR-016)

**Checkpoint**: US1–US4 funktionieren unabhängig.

---

## Phase 7: User Story 5 — Standort-Karte (Consent) & Google-Bewertungen (Priority: P3)

**Goal**: Bewertungen als consent-freier statischer Snapshot; **nur die Karte** consent-gegated (Click-to-load, widerrufbar).

**Independent Test**: Vor Einwilligung kein Maps-Iframe/-Skript/-Cookie; Bewertungs-Text sofort sichtbar; nach „Karte laden" erscheint die Karte; Widerruf entfernt sie wieder.

### Implementation for User Story 5

- [X] T039 [P] [US5] Bewertungs-Snapshot `frontend/src/content/reviews.json` (`profileUrl`, `writeReviewUrl`, kuratierte attribuierte Zitate) — **GUARD G3: reiner First-Party-Text, keine als-live Gesamtbewertung, kein Google-Bewertungs-Widget/-Skript**
- [X] T040 [P] [US5] `Review`-Type + Loader in `frontend/src/lib/types.ts` / `frontend/src/lib/content.ts`
- [X] T041 [P] [US5] `useConsent`-Hook (`localStorage["consent:maps"]`, `grant`/`revoke`) in `frontend/src/lib/consent.ts`
- [X] T042 [US5] `ConsentGate` + `LocationMap` (Iframe erst nach Consent, Vorschau „Karte laden", Fallback Adresse/Link, widerrufbar, tastaturbedienbar) in `frontend/src/components/public/ConsentGate.tsx` und `frontend/src/components/public/LocationMap.tsx` — **GUARD G1: Vorschaubild selbst gehostet (kein Google-Static-Maps/-Tile vor Consent); im Netzwerk-Tab verifizieren, dass vor Klick keine Google-Request erfolgt** (hängt an T041)
- [X] T043 [P] [US5] `ReviewsSnapshot`-Komponente (Zitate + Google-Profil-Link; keine als-live Aggregat-Bewertung) in `frontend/src/components/public/ReviewsSnapshot.tsx` (hängt an T040)
- [X] T044 [US5] `LocationMap` + `ReviewsSnapshot` in `frontend/src/app/(public)/kontakt/page.tsx` einbinden (hängt an T042, T043)

**Checkpoint**: Alle User Stories unabhängig funktionsfähig.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Story-übergreifende Anforderungen (SEO, Datenschutz, Performance, A11y)

- [X] T045 [P] LocalBusiness-JSON-LD aus `SalonProfile` + `SalonHours` + Geo in `frontend/src/lib/seo.ts`; Cottbus-Keyword-Metadaten (Title/Description/H1) über die öffentlichen Seiten ausrollen (FR-015)
- [X] T046 [P] `frontend/src/app/(public)/datenschutz/page.tsx` um WhatsApp/Meta, Google Maps (Consent), Google-Bewertungen (Personendaten Dritter), Instagram/TikTok + Drittland-Hinweis erweitern (FR-014)
- [X] T047 Performance-Budgets (LCP < 2,5 s / INP < 200 ms / CLS < 0,1) per Lighthouse auf den erweiterten Seiten prüfen; Karte nicht im Initial-Pfad, Galerie ohne Layout-Shift (FR-017/SC-003)
- [X] T048 [P] Accessibility-Durchgang (WCAG 2.1 AA): Tastaturbedienung `ConsentGate`, Alt-Texte, Kontraste, `prefers-reduced-motion` (FR-018)
- [X] T049 Backend-Suite `pytest -v` grün stellen und `quickstart.md`-Szenarien 1–7 end-to-end durchgehen

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: keine Abhängigkeiten — sofort startbar
- **Foundational (Phase 2)**: nach Setup; Voraussetzung für US2/US5 (Config-Konsum)
- **US1 (Phase 3)**: nur Setup nötig — **unabhängig** (kein `site-config`)
- **US3 (Phase 5)**: nur Setup nötig — **unabhängig** (eigene Domäne)
- **US2 (Phase 4) / US5 (Phase 7)**: nach Foundational (nutzen `site-config`)
- **US4 (Phase 6)**: nur Setup nötig — **unabhängig** (statischer Content)
- **Polish (Phase 8)**: nach allen gewünschten Stories

### User Story Dependencies

- **US1 (P1)**: unabhängig — MVP
- **US2 (P2)**: unabhängig (braucht nur `site-config` aus Foundational)
- **US3 (P2)**: unabhängig
- **US4 (P3)**: unabhängig
- **US5 (P3)**: unabhängig (braucht nur `site-config`); Bewertungen consent-frei, nur Karte consent-gated

### Within Each User Story

- Test-Tasks zuerst (US1, US3) → müssen fehlschlagen vor Implementierung
- Modelle vor Services, Services vor Endpunkten, Kern vor Integration

### Parallel Opportunities

- Setup T001, T002 parallel
- US1: T004 (Test) parallel zu Schreibvorbereitung; T005/T006 parallel (Modelle vs. Schemas); T009/T010/T012 parallel
- US3: T017/T018 (Tests) parallel; T019/T020 parallel; T022/T023 parallel; T027/T028/T030/T031/T032 parallel
- US4: T033/T034 parallel
- US5: T039/T040/T041/T043 parallel
- Polish: T045/T046/T048 parallel
- Bei mehreren Entwickler:innen können US1–US5 nach Foundational parallel laufen

---

## Parallel Example: User Story 3

```bash
# Tests zuerst (müssen fehlschlagen):
Task: "Unit-Test Promotion-Status in backend/tests/unit/test_promotion_visibility.py"   # T017
Task: "Integrationstest Promotions in backend/tests/integration/test_marketing.py"       # T018

# Dann Modelle + Schemas parallel:
Task: "Promotion-Modell in backend/app/domains/marketing/models.py"   # T019
Task: "Promotion-Schemas in backend/app/domains/marketing/schemas.py" # T020
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (`/dienstleistungen` + `GET /public/services`) → Deploy/Demo.

### Incremental Delivery

Foundation → US1 (MVP) → US2 → US3 → US4 → US5 → Polish. Jede Story fügt Wert hinzu, ohne vorige zu brechen. **Die Buchungs-Engine wird in keiner Phase verändert.**

---

## ⚠️ Implementierungs-Guards (vom Analyzer nicht prüfbar — Realität statt Spec↔Plan↔Tasks)

- **G1 — Karten-Vorschau First-Party (T042)**: Das Klick-zum-Laden-Vorschaubild MUSS selbst gehostet sein; **kein** Google-Static-Maps-Bild/-Tile, sonst Drittanbieter-Request **vor** Einwilligung → SC-002 nur scheinbar grün. Im **Netzwerk-Tab** verifizieren (keine Google-Requests vor Klick).
- **G2 — Service-Backfill korrekt je Leistung (T007)**: Migration `012` weist jeder Bestandsleistung die **fachlich korrekte** Zielgruppe/Leistungsart zu — **kein Blanket-`HERREN`**. Falsch-aber-konsistente Daten sieht kein Analyzer; reale Datenkontrolle nötig.
- **G3 — Bewertungen First-Party-Text (T039/T043)**: reiner statischer First-Party-Text; **keine** vorgetäuschte Live-Gesamtbewertung (UWG), **kein** Google-Bewertungs-Widget/-Skript (sonst consent-pflichtig → bricht die „nur Karte"-Abgrenzung).
- **I2 — Promotion-Expiry in Europe/Berlin (T017/T021)**: `today` zeitzonen-korrekt; UTC-Off-by-one = abgelaufenes Angebot bis zu 1 Tag zu lange online = UWG-Irreführung.

## Notes

- [P] = andere Datei, keine offene Abhängigkeit
- Test-Tasks (US1/US3) zuerst schreiben und fehlschlagen lassen (Konstitution IX)
- **Nach jeder implementierten Task sofort in dieser `tasks.md` abhaken** (Projekt-Feedback)
- Vor Frontend-Code `node_modules/next/dist/docs/` konsultieren (T002)
- **C1 (FR-004)**: „Jetzt Termin buchen" auf neuen Seiten wird durch die globale `Nav`-CTA erfüllt; optional eine kontextuelle CTA unter der Galerie zur Conversion (kein Muss).
- **U1 (Pfad-Hygiene)**: Vor T015/T016 die Pfade `Footer.tsx` und das Public-`layout.tsx` verifizieren (create-if-missing bewusst).
- Migrationskette: `011` → `012` (Service-Enums) → `013` (promotions); `down_revision` entsprechend setzen.
- Galerie-Manifest enthält nur Nachweis-IDs, keine Personendaten; Bewertungen nur öffentlich Vorhandenes, entfernbar
- Nach Backend-Vertragsänderungen `backend/openapi.json` neu exportieren (T026)
