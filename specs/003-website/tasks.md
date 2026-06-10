# Tasks: Öffentliche Website (Phase 2)

**Input**: Design documents from `specs/003-website/`

**Tech Stack**: Next.js 16.2.7 / React 19 / TypeScript 5 / Tailwind CSS v4 (Frontend) · Python 3.11 / FastAPI / SQLModel / PostgreSQL (Backend)

**Organization**: Tasks grouped by user story (US1–US6) so each story is independently implementable and testable.

**Tests**: Backend integration tests included for the constitution-mandated critical path (Prinzip IX + II): öffentliche Read-Endpunkte liefern nur **aktive**, nicht-personenbezogene Daten **ohne Auth**. Frontend wird über `quickstart.md` (WCAG/CWV/Strukturdaten) manuell validiert — kein E2E-Framework in dieser Phase.

**Post-Analyse-Anpassungen** (`/speckit-analyze`): I1 → SalonProfile/SalonHours-Backend in Foundational vorgezogen (Footer-Daten, FR-013); A1 → Buchungs-CTA zeigt auf `/termin`; U1 → `next.config.ts` `images.remotePatterns` für Team-Fotos ergänzt.

## Format: `[ID] [P?] [US?] Description`

- **[P]**: Parallelisierbar — andere Datei, keine offene Abhängigkeit
- **[US#]**: User-Story-Nummer aus spec.md

> ⚠️ **Vor jeglichem Frontend-Code** `frontend/AGENTS.md` befolgen: Next.js 16 hat Breaking Changes — die gebündelten Docs unter `frontend/node_modules/next/dist/docs/01-app/` lesen (siehe T002).

---

## Phase 1: Setup

**Purpose**: Verzeichnisstruktur und Next-16-Wissensbasis schaffen.

- [X] T001 [P] Öffentliche Route-Gruppe und Ordner anlegen: `frontend/src/app/(public)/`, `frontend/src/components/public/`, `frontend/src/content/`
- [X] T002 [P] Next.js-16-Docs vor dem Coden sichten (per `frontend/AGENTS.md`): `frontend/node_modules/next/dist/docs/01-app/01-getting-started/09-revalidating.md`, `08-caching.md`, `13-fonts.md`, `14-metadata-and-og-images.md` sowie die Metadata-File-Conventions für `sitemap`/`robots`; relevante Abweichungen kurz notieren
- [X] T003 [P] Optional: `motion` (Framer Motion) zu `frontend/package.json` hinzufügen, falls zweckgebundene Komponenten-Animationen geplant sind (sonst reine CSS-Transitions)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Geteilte Marken-/API-Infrastruktur + SalonProfile/SalonHours-Backend (für den Footer, FR-013), die ALLE User Stories benötigen.

**⚠️ CRITICAL**: Keine User-Story-Arbeit beginnt, bevor diese Phase abgeschlossen ist.

### Frontend-Fundament

- [X] T004 DESIGN.md-OKLCH-Tokens (Palette, Radii, Easing) als Tailwind-v4 `@theme` in `frontend/src/app/globals.css` definieren
- [X] T005 Display- + Body-Schrift via `next/font` einbinden und `<html lang="de">` im Root-Layout `frontend/src/app/layout.tsx` setzen
- [X] T006 [P] Typisierten öffentlichen Read-Client (server-side `fetch` mit `next: { revalidate: 60 }`) in `frontend/src/lib/api.ts` ergänzen
- [X] T007 [P] `Public*`-TypeScript-Typen (PublicService, PublicTeamMember, PublicSalonHours, SalonProfile) in `frontend/src/lib/types.ts` ergänzen
- [X] T008 [P] `images.remotePatterns` für externe Team-Foto-Hosts in `frontend/next.config.ts` konfigurieren (für `next/image`) **(U1)**

### Backend-Fundament (öffentliches Routing + SalonProfile/SalonHours)

- [X] T009 Öffentlichen Read-Router-Modul `backend/app/domains/stammdaten/public_router.py` (APIRouter **ohne** Auth-Dependency) anlegen und in `backend/app/main.py` unter `/api/v1/public` mounten
- [X] T010 `SalonProfile`-SQLModel (Single-Row: name, street, postal_code, city, country, phone, email?) in `backend/app/domains/stammdaten/models.py`
- [X] T011 Alembic-Migration `backend/alembic/versions/xxxx_phase2_salon_profile.py`: Tabelle `salon_profile` anlegen + eine Platzhalterzeile seeden
- [X] T012 [P] `SalonProfileRead`, `SalonProfileUpdate` und `PublicSalonHoursRead`-Schemas in `backend/app/domains/stammdaten/schemas.py`
- [X] T013 Service-Methoden `get_salon_profile`, `update_salon_profile`, `get_public_salon_hours` in `backend/app/domains/stammdaten/service.py`
- [X] T014 Öffentliche Endpunkte `GET /public/salon-profile` + `GET /public/salon-hours` in `backend/app/domains/stammdaten/public_router.py`
- [X] T015 Admin-Endpunkte `GET`/`PUT /salon-profile` (auth-geschützt) in `backend/app/domains/stammdaten/router.py`
- [X] T016 [P] Backend-Testdatei `backend/tests/integration/test_public_endpoints.py` mit Fixtures anlegen und Test: `/public/salon-profile` ohne Auth lesbar, `PUT /salon-profile` ohne Admin → 401, `/public/salon-hours` liefert 7 Einträge

**Checkpoint**: Tokens, Fonts, API-Client, öffentliches Routing und Salon-Stammdaten (für Footer) stehen — User Stories können starten.

---

## Phase 3: User Story 1 - Markenkonforme Shell & Startseite (Priority: P1) 🎯 MVP

**Goal**: Globale Marken-Shell (Navigation + Footer mit Kontakt/Öffnungszeiten) und einladende Startseite mit prominentem „Termin buchen"-CTA (→ `/termin`).

**Independent Test**: Startseite auf Mobil/Desktop öffnen; Markenlook entspricht DESIGN.md; Nav/Footer konsistent inkl. Pflichtlinks + Kontakt/Öffnungszeiten; CTA zeigt auf `/termin` (Platzhalter); `prefers-reduced-motion` liefert ruhige Variante.

- [X] T017 [P] [US1] Navigations-Komponente (Desktop-Bar + mobiler Full-Screen-Drawer, sichtbarer „Termin buchen"-CTA) in `frontend/src/components/public/Nav.tsx`
- [X] T018 [P] [US1] `BookingCta`-Komponente, die auf den Platzhalter-Pfad **`/termin`** verlinkt (FR-002), in `frontend/src/components/public/BookingCta.tsx`
- [X] T019 [US1] Footer-Komponente mit Pflichtlinks (Impressum, Datenschutz) + Kontakt/Öffnungszeiten (liest `/public/salon-profile` + `/public/salon-hours` aus Foundational) in `frontend/src/components/public/Footer.tsx`
- [X] T020 [US1] Öffentliches Layout (Nav + Footer + Skip-Link) in `frontend/src/app/(public)/layout.tsx` (nutzt T017–T019)
- [X] T021 [US1] Startseite mit Hero + prominentem „Termin buchen"-CTA und Seiten-Metadata in `frontend/src/app/(public)/page.tsx`
- [X] T022 [P] [US1] Globaler `prefers-reduced-motion`-Fallback, `:focus-visible` Malachit-Ring und Skip-Link-Styles in `frontend/src/app/globals.css`
- [X] T023 [P] [US1] Sitemap (`frontend/src/app/sitemap.ts`) und Robots (`frontend/src/app/robots.ts`) über alle acht öffentlichen Routen

**Checkpoint**: Shell + Startseite eigenständig funktionsfähig, Footer vollständig (Kontakt/Öffnungszeiten), markenkonform.

---

## Phase 4: User Story 2 - Dienstleistungen mit Preisen ansehen (Priority: P1)

**Goal**: Dienstleistungsseite zeigt **aktive** Leistungen (Name, Dauer, Preis, Beschreibung) live aus den Stammdaten, mit sauberem Leerzustand.

**Independent Test**: Im Admin Service aktivieren/deaktivieren → erscheint/verschwindet auf `/dienstleistungen` (≤ ~60 s); ohne aktive Services erscheint Leerzustand.

- [X] T024 [P] [US2] `PublicServiceRead`-Schema (ohne `is_active`) in `backend/app/domains/stammdaten/schemas.py`
- [X] T025 [US2] `get_active_services_public` (Filter `is_active = true`, Sortierung nach `name`) in `backend/app/domains/stammdaten/service.py`
- [X] T026 [US2] `GET /public/services` in `backend/app/domains/stammdaten/public_router.py`
- [X] T027 [P] [US2] Integrationstest: `/public/services` ohne Auth erreichbar, nur aktive, kein `is_active`-Feld — `backend/tests/integration/test_public_endpoints.py`
- [X] T028 [P] [US2] `ServiceCard`-Komponente (Name, Dauer, Preis als Brass-Tag, Beschreibung) in `frontend/src/components/public/ServiceCard.tsx`
- [X] T029 [P] [US2] `EmptyState`-Komponente (markenkonform, wiederverwendbar) in `frontend/src/components/public/EmptyState.tsx`
- [X] T030 [US2] Dienstleistungsseite (ISR `revalidate=60`, Metadata, Leerzustand) in `frontend/src/app/(public)/dienstleistungen/page.tsx`

**Checkpoint**: US1 + US2 unabhängig funktionsfähig.

---

## Phase 5: User Story 3 - Pflicht-Rechtsseiten aufrufen (Priority: P1)

**Goal**: Impressum (§ 5 DDG) und Datenschutzerklärung als eigene, über den Footer erreichbare Seiten (Seitenstruktur; geprüfter Inhalt = Betreiber-Input).

**Independent Test**: Footer-Links „Impressum" und „Datenschutzerklärung" auf jeder Seite öffnen die jeweilige Seite.

- [X] T031 [P] [US3] Impressums-Seite (§-5-DDG-Struktur, Betreiber-Inhalt als klar markierte Platzhalter, kein Live-Platzhaltertext) in `frontend/src/app/(public)/impressum/page.tsx`
- [X] T032 [P] [US3] Datenschutz-Seite (Struktur, spiegelt FR-017: nur technisch notwendige Cookies; Dienste-Abschnitt für Hosting/SendGrid/Twilio) in `frontend/src/app/(public)/datenschutz/page.tsx`
- [X] T033 [US3] Verifizieren, dass die Footer-Pflichtlinks (aus T019) auf `/impressum` und `/datenschutz` auflösen

**Checkpoint**: Rechtliche Go-Live-Voraussetzung strukturell erfüllt.

---

## Phase 6: User Story 4 - Team kennenlernen (Priority: P2)

**Goal**: Team-Seite zeigt **aktive** Mitglieder (Name, Foto, Kurzprofil, angebotene Dienstleistungen) live; Leerzustand und Foto-Platzhalter.

**Independent Test**: Im Admin Teammitglied aktivieren/deaktivieren → erscheint/verschwindet auf `/team`; Mitglied ohne Foto zeigt Platzhalter; ohne aktive Mitglieder Leerzustand.

- [X] T034 [P] [US4] `PublicTeamMemberRead`-Schema (id, name, bio, photo_url, aktive services) in `backend/app/domains/stammdaten/schemas.py`
- [X] T035 [US4] `get_active_team_public` (nur aktive Mitglieder + aktive Services) in `backend/app/domains/stammdaten/service.py`
- [X] T036 [US4] `GET /public/team` in `backend/app/domains/stammdaten/public_router.py`
- [X] T037 [P] [US4] Integrationstest: `/public/team` nur aktive, `photo_url=null` toleriert, kein Auth — `backend/tests/integration/test_public_endpoints.py`
- [X] T038 [P] [US4] `TeamCard`-Komponente (Foto via `next/image` mit markenkonformem Platzhalter-Fallback + Alt-Text, Bio, Service-Tags) in `frontend/src/components/public/TeamCard.tsx`
- [X] T039 [US4] Team-Seite (ISR `revalidate=60`, Metadata, Leerzustand) in `frontend/src/app/(public)/team/page.tsx`

**Checkpoint**: US1–US4 unabhängig funktionsfähig.

---

## Phase 7: User Story 5 - Kontakt & Öffnungszeiten finden (Priority: P2)

**Goal**: Kontaktseite zeigt Adresse + Telefon (SalonProfile, FR-015) und Öffnungszeiten (SalonHours) + LocalBusiness-Strukturdaten; Admin kann das Profil pflegen. *(Backend-Datenquellen liegen bereits in Foundational vor.)*

**Independent Test**: `/kontakt` zeigt Adresse, Telefon und aktuelle Öffnungszeiten; Profiländerung im Admin spiegelt sich (≤ ~60 s); JSON-LD validiert.

- [X] T040 [P] [US5] `JsonLd`-Komponente: LocalBusiness-Strukturdaten (Name, Adresse, Öffnungszeiten, Telefon) in `frontend/src/components/public/JsonLd.tsx`
- [X] T041 [US5] Kontaktseite (Adresse, Telefon, Öffnungszeiten, JSON-LD eingebettet, Metadata) in `frontend/src/app/(public)/kontakt/page.tsx`
- [X] T042 [US5] Admin-Pflegeseite für das Salon-Profil (Adresse/Telefon, nutzt `GET`/`PUT /salon-profile`) in `frontend/src/app/admin/profile/page.tsx`

**Checkpoint**: US1–US5 unabhängig funktionsfähig.

---

## Phase 8: User Story 6 - Über uns & FAQ lesen (Priority: P3)

**Goal**: Redaktionelle Inhalte „Über uns" und „FAQ" als fest gepflegter Projekt-Content, markenkonform und zugänglich.

**Independent Test**: `/ueber-uns` und `/faq` zeigen die redaktionellen Inhalte vollständig im Markenlook; FAQ tastaturbedienbar.

- [X] T043 [P] [US6] Über-uns-Content-Modul in `frontend/src/content/ueber-uns.ts`
- [X] T044 [P] [US6] FAQ-Content-Modul (Frage/Antwort-Liste) in `frontend/src/content/faq.ts`
- [X] T045 [P] [US6] Über-uns-Seite (Body-Prosa max 65ch, Metadata) in `frontend/src/app/(public)/ueber-uns/page.tsx`
- [X] T046 [US6] FAQ-Seite (zugängliches Accordion, Metadata) in `frontend/src/app/(public)/faq/page.tsx`

**Checkpoint**: Alle User Stories unabhängig funktionsfähig.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Qualitäts-Gates über alle Seiten (Spec Success Criteria).

- [X] T047 [P] Per-Seite-Metadata (eigener Titel/Beschreibung) über alle acht Seiten prüfen/ergänzen (FR-010)
- [X] T048 [P] WCAG-2.1-AA-Audit (axe/Lighthouse) auf allen Seiten; Kontrast/Tastatur/Fokus-Befunde beheben (FR-009 / SC-003)
- [X] T049 [P] Core-Web-Vitals-Check (Lighthouse Mobil: LCP/INP/CLS) + Bildoptimierung via `next/image` (FR-011 / SC-004)
- [X] T050 [P] LocalBusiness-Strukturdaten via Rich-Results-Test validieren; `sitemap.xml` + `robots.txt` erreichbar (SC-005)
- [X] T051 [P] Cookie-Audit (DevTools): keine nicht-technischen Cookies, kein Banner (FR-017) + Sprach-Check Deutsch (FR-012)
- [X] T052 `backend/openapi.json` neu exportieren und Frontend-Typen aus dem OpenAPI-Schema abgleichen (Prinzip VI/VII)
- [X] T053 Impeccable-Design-Audit + Emil-Review gegen `DESIGN.md` (Palette/Typografie/Motion, „One Identity Rule", Flat-At-Rest) (SC-006)
- [X] T054 `quickstart.md` Ende-zu-Ende-Validierung durchführen

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: keine Abhängigkeiten — sofort startbar
- **Foundational (Phase 2)**: nach Setup — **BLOCKIERT alle User Stories**; enthält jetzt das SalonProfile/SalonHours-Backend (Footer-Daten)
- **User Stories (Phase 3–8)**: alle nach Foundational; danach parallel (bei Kapazität) oder sequenziell in Prioritätsreihenfolge (P1 → P2 → P3)
- **Polish (Phase 9)**: nach Abschluss der gewünschten User Stories

### User Story Dependencies

- **US1 (P1)**: nach Foundational — keine Story-Abhängigkeit; Footer ist dank vorgezogenem SalonProfile/SalonHours-Backend vollständig (FR-013) und unabhängig testbar
- **US2 (P1)**: nach Foundational — unabhängig (Backend-Endpunkt + Seite)
- **US3 (P1)**: nach Foundational — Footer-Pflichtlinks stammen aus US1 (T033 ist reine Verifikation; Seiten selbst unabhängig)
- **US4 (P2)**: nach Foundational — unabhängig (nutzt `remotePatterns` aus T008)
- **US5 (P2)**: nach Foundational — nur noch Frontend (Backend in Foundational); kein Eingriff in andere Stories
- **US6 (P3)**: nach Foundational — unabhängig (reiner Content)

### Within Each User Story

- Schemas → Service → Endpoint → Test (Backend); Komponenten → Seite (Frontend)
- Backend- und Frontend-Tasks einer Story sind weitgehend parallel ([P])

### Parallel Opportunities

- Setup: T001–T003 parallel
- Foundational: T006/T007/T008 (Frontend) und T012/T016 (Backend) parallel; T004/T005/T009/T010 eigene Dateien
- Innerhalb jeder Story: alle [P]-Tasks (z. B. Backend-Schema + Frontend-Komponenten) parallel
- Nach Foundational können verschiedene Stories von verschiedenen Personen parallel bearbeitet werden

---

## Parallel Example: User Story 2

```bash
# Backend-Schema und Frontend-Komponenten parallel starten:
Task: "PublicServiceRead-Schema in backend/app/domains/stammdaten/schemas.py"   # T024
Task: "ServiceCard-Komponente in frontend/src/components/public/ServiceCard.tsx" # T028
Task: "EmptyState-Komponente in frontend/src/components/public/EmptyState.tsx"   # T029
# Danach sequenziell: T025 (Service) → T026 (Endpoint) → T027 (Test); T030 (Seite)
```

---

## Implementation Strategy

### MVP First

1. Phase 1 (Setup) + Phase 2 (Foundational) abschließen
2. **US1** (Shell + Startseite, vollständiger Footer) → eigenständig validieren = sichtbares MVP
3. **Go-Live-Minimum**: zusätzlich **US2** (Dienstleistungen) und **US3** (Rechtsseiten) — alle P1. Ohne Impressum/Datenschutz darf die Seite nicht live (Edge Case/Konstitution).

### Incremental Delivery

1. Setup + Foundational → Fundament steht (inkl. Salon-Stammdaten)
2. US1 → validieren (MVP-Shell)
3. US2 + US3 → P1 vollständig (live-fähiges Minimum)
4. US4 + US5 → P2 (Team, Kontakt/Strukturdaten)
5. US6 → P3 (redaktionelle Inhalte)
6. Phase 9 Qualitäts-Gates vor Go-Live (live erst mit fertigem MVP, kein Interimszustand)

### Parallel Team Strategy

Nach Foundational: Entwickler A → US1, B → US2+US3, C → US4+US5, D → US6. Stories integrieren unabhängig.

---

## Notes

- [P] = andere Datei, keine offene Abhängigkeit
- Backend-Tests (T016, T027, T037) decken den constitution-kritischen Pfad (nur aktive Daten, kein Auth, DSGVO-Datenminimierung) ab — vor der jeweiligen Endpunkt-Implementierung lauffähig machen
- ⚠️ Vor Frontend-Code Next-16-Docs lesen (T002); Animationen nur über `transform`/`opacity`
- Rechtsinhalte (US3) gehen nicht mit Platzhaltertexten live — geprüfter Betreiber-Inhalt ist Go-Live-Voraussetzung
- Nach jeder erledigten Task sofort hier abhaken
