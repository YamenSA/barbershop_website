# Implementation Plan: Öffentliche Website (Phase 2)

**Branch**: `003-website` | **Date**: 2026-06-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-website/spec.md`

## Summary

Phase 2 baut den öffentlichen, mobil-first Außenauftritt des Salons im verbindlichen Markenlook
der `DESIGN.md` (Midnight Black + Malachit + Blade Brass). Acht Seiten (Startseite,
Dienstleistungen, Team, Über uns, FAQ, Kontakt, Impressum, Datenschutz) werden im bestehenden
Next.js-Frontend (`frontend/`) als neue, **öffentliche** Route-Gruppe `(public)` neben dem
bestehenden `/admin`-Bereich gebaut. Die dynamischen Seiten lesen **aktive** Dienstleistungen,
Teammitglieder und Öffnungszeiten über **neue, unauthentifizierte** Backend-Read-Endpunkte
(die bestehenden `stammdaten`-Routen sind admin-geschützt und nicht wiederverwendbar). Neu im
Backend: eine **SalonProfile**-Entität (Adresse/Telefon, admin-verwaltet) als Quelle für
Kontaktseite, Footer und LocalBusiness-Strukturdaten (FR-015). Datenfrische ~60 s via
Incremental Static Regeneration (`revalidate = 60`), passend zum CWV-Budget. Redaktionelle
Inhalte (Über uns, FAQ) liegen als versionierter Content im Projekt. Nur technisch notwendige
Cookies → kein Consent-Banner (FR-017).

## Technical Context

**Language/Version**: TypeScript 5 / Next.js **16.2.7** (App Router, React 19.2) · Python 3.11 (Backend)

**Primary Dependencies**:
- Frontend: Next.js 16.2.7, React 19.2.4, **Tailwind CSS v4** (`@tailwindcss/postcss`), `next/font` (Display + Body), keine neuen schweren Libs. Motion: CSS-Transitions + ggf. `motion` (Framer Motion) nur wo zweckgebunden.
- Backend: FastAPI, SQLModel, Alembic (bestehend) — neue `SalonProfile`-Tabelle + öffentlicher Read-Router.

**Storage**: PostgreSQL (bestehend) — eine neue Tabelle `salon_profile` (Single-Row) via Alembic-Migration. Lesen von `services`, `team_members`, `salon_hours` unverändert.

**Testing**: pytest (Backend) — neue Tests für öffentliche Read-Endpunkte (nur aktive Daten, kein Auth nötig) + SalonProfile. Frontend: bestehendes Lint/Build; manuelle WCAG-/CWV-/Strukturdaten-Validierung per quickstart.

**Target Platform**: Linux-Server (Docker) Backend · Next.js-Server (ISR) Frontend — unverändert.

**Project Type**: Web Application — bestehendes `backend/` (neuer öffentlicher Read-Endpunkt + SalonProfile) + bestehendes `frontend/` (neue `(public)`-Route-Gruppe).

**Performance Goals**: Core Web Vitals (Konstitution): LCP < 2,5 s, INP < 200 ms, CLS < 0,1 auf repräsentativem Mobilprofil. Öffentliche Seiten als ISR statisch ausgeliefert, Bilder via `next/image`.

**Constraints**:
- ⚠️ **Next.js 16 hat Breaking Changes** ggü. Trainingswissen: `frontend/AGENTS.md` verlangt, vor dem Coden die gebündelten Docs in `frontend/node_modules/next/dist/docs/01-app/` zu lesen (Metadata, `sitemap.ts`, `revalidate`, `next/font`, Caching).
- Datenfrische ≤ ~60 s (FR-016): `export const revalidate = 60` pro Seite; deaktivierte Daten verschwinden im selben Fenster (SC-002).
- Nur technisch notwendige Cookies, kein Tracking/Analytics, kein Consent-Banner (FR-017).
- Markenlook ausschließlich aus `DESIGN.md` (Prinzip XII) — Tokens als Tailwind-v4-Theme; Malachit-„One Identity Rule" (≤2 grüne Elemente/Viewport).
- `prefers-reduced-motion` respektiert; Animationen nur über `transform`/`opacity`.
- Öffentliche Endpunkte liefern **ausschließlich aktive** Datensätze und keine personenbezogenen Daten (DSGVO-Datenminimierung, Prinzip II).
- Buchungs-Route ist Platzhalter-Pfad **`/termin`** (Phase 3); CTA verlinkt ihn ohne Interim-Fallback.
- Team-Fotos (`photo_url`) sind externe URLs → `next.config.ts` `images.remotePatterns` muss konfiguriert werden (für `next/image`).
- **Footer-Abhängigkeit (FR-013)**: Da der Footer auf jeder Seite Kontakt/Öffnungszeiten zeigt, werden die SalonProfile-Entität samt `/public/salon-profile` und `/public/salon-hours` **in der Foundational-Phase** bereitgestellt (nicht erst in US5), damit die US1-Shell vollständig und unabhängig testbar ist.

**Scale/Scope**: 1 Salon, 3–10 Teammitglieder, 8 öffentliche Seiten — unverändert.

## Constitution Check

*GATE: Muss vor Phase-0-Research bestanden sein. Erneute Prüfung nach Phase-1-Design.*

| Prinzip | Status | Nachweis |
|---|---|---|
| I — Spec-First | ✓ | spec.md validiert; 3 Clarifications integriert (Kontaktdatenquelle, Frische, Cookies) |
| II — DSGVO by Design | ✓ | Öffentliche Endpunkte liefern nur aktive, nicht-personenbezogene Stammdaten; keine Cookies/Tracking; Datenschutzseite vorhanden (FR-007/017) |
| III — Eine Quelle der Wahrheit | ✓ | Phase 2 schreibt keine Termine; nur lesend. Buchung bleibt Phase 3 |
| IV — Modulare Architektur | ✓ | Öffentlicher Read-Endpunkt im `stammdaten`-Domain (eigener `public_router`); SalonProfile in `stammdaten` gekapselt |
| V — Separation of Concerns | ✓ | Frontend kennt nur die API; Lesen über Service-Schicht; keine DB-Queries in Routen-Handlern |
| VI — Typsicherheit | ✓ | Pydantic-Schemas (Public-Read-Varianten); TS-Typen aus OpenAPI; kein `any` |
| VII — API als Vertrag | ✓ | Neue Endpunkte unter `/api/v1/public/...`; OpenAPI auto-generiert |
| VIII — Auslieferbare Qualität | ✓ | Vollständige Seiten inkl. Leerzustände (FR-014), Fehlerbehandlung, kein `// TODO` |
| IX — Getestete kritische Pfade | ✓ | Tests: öffentliche Endpunkte liefern nur aktive Daten & kein Auth; SalonProfile-Lesen. (Verfügbarkeits-/Buchungslogik unberührt) |
| X — Mobile-First & zugänglich | ✓ | Öffentliche Seiten sind der Kern dieses Prinzips: mobil-first, WCAG 2.1 AA (FR-009) |
| XI — Sicherheit als Standard | ✓ | Öffentliche Read-Endpunkte sind read-only & unautheniticated by design; keine Secrets im Frontend; Eingaben (keine) |
| XII — Design-System & Motion | ✓ | `DESIGN.md`-Tokens als verbindliche Quelle; Impeccable generiert, Emil reviewt; Motion zweckgebunden + `prefers-reduced-motion` |

**Gate-Ergebnis: BESTANDEN** — keine Verletzungen. Komplexitäts-Tabelle bleibt leer.

## Project Structure

### Documentation (diese Phase)

```text
specs/003-website/
├── plan.md              # Dieses Dokument
├── research.md          # Phase-0-Ausgabe
├── data-model.md        # Phase-1-Ausgabe
├── quickstart.md        # Phase-1-Ausgabe
├── contracts/
│   └── public-api.md    # Öffentliche Read-Endpunkte + SalonProfile
└── tasks.md             # Phase-2-Ausgabe (/speckit-tasks — noch nicht erstellt)
```

### Source Code (Repository-Root)

```text
backend/
├── app/
│   └── domains/stammdaten/
│       ├── models.py            # + SalonProfile (Single-Row Settings-Entität)
│       ├── schemas.py           # + SalonProfileRead/Update; PublicServiceRead, PublicTeamMemberRead, PublicSalonHoursRead
│       ├── service.py           # + get_active_services_public, get_active_team_public, get_public_salon_hours, get/update_salon_profile
│       ├── router.py            # + SalonProfile-Admin-Routen (GET/PUT, auth-geschützt)
│       └── public_router.py     # NEU: unauthenticated GET /public/services|team|salon-hours|salon-profile
├── alembic/versions/
│   └── xxxx_phase2_salon_profile.py   # NEU: salon_profile Tabelle + Seed-Zeile
├── tests/integration/
│   └── test_public_endpoints.py       # NEU: nur aktive Daten, kein Auth nötig, SalonProfile
└── app/main.py                        # + public_router (prefix /api/v1)

frontend/
└── src/
    ├── app/
    │   ├── (public)/                  # NEU: öffentliche Route-Gruppe (eigenes Layout: Nav + Footer)
    │   │   ├── layout.tsx             # Marken-Shell: Navigation, Footer (Pflichtlinks), Skip-Link
    │   │   ├── page.tsx               # Startseite (Hero + „Termin buchen"-CTA → /termin)
    │   │   ├── dienstleistungen/page.tsx   # ISR, liest /public/services
    │   │   ├── team/page.tsx               # ISR, liest /public/team
    │   │   ├── ueber-uns/page.tsx          # redaktioneller Content
    │   │   ├── faq/page.tsx                # redaktioneller Content
    │   │   ├── kontakt/page.tsx            # /public/salon-profile + /public/salon-hours
    │   │   ├── impressum/page.tsx          # Betreiber-Rechtsinhalt
    │   │   └── datenschutz/page.tsx        # Betreiber-Rechtsinhalt
    │   ├── sitemap.ts                 # NEU: Sitemap (App-Router-Konvention)
    │   ├── robots.ts                  # NEU: robots.txt
    │   ├── layout.tsx                 # Root: next/font (Display+Body), <html lang="de">
    │   └── globals.css                # + DESIGN.md Tokens als Tailwind-v4 @theme
    │   └── admin/profile/page.tsx     # NEU: Admin-Pflege des Salon-Profils (Adresse/Telefon, FR-015)
    ├── components/public/             # NEU: Nav, Footer, ServiceCard, TeamCard, EmptyState, BookingCta, JsonLd
    ├── content/                       # NEU: redaktionelle Inhalte (ueber-uns, faq) + Standortdaten-Fallback
    └── lib/
        ├── api.ts                     # + öffentliche Read-Funktionen (server-side fetch, revalidate=60)
        └── types.ts                   # + Public*-Typen
# zusätzlich: frontend/next.config.ts  # + images.remotePatterns für externe Team-Foto-Hosts
```

**Structure Decision**: Web Application — Erweiterung des bestehenden `backend/` (öffentlicher Read-Router + SalonProfile) und des bestehenden `frontend/` (neue `(public)`-Route-Gruppe mit eigenem Layout, getrennt vom geschützten `/admin`-Bereich). Kein neues Projekt.

## Complexity Tracking

*Keine Constitution-Verletzungen — Tabelle leer.*

## Artifacts

| Artefakt | Pfad | Status |
|---|---|---|
| Research | `specs/003-website/research.md` | ✓ |
| Data Model | `specs/003-website/data-model.md` | ✓ |
| API-Contract: Public | `specs/003-website/contracts/public-api.md` | ✓ |
| Quickstart | `specs/003-website/quickstart.md` | ✓ |
| Tasks | `specs/003-website/tasks.md` | ⏳ `/speckit-tasks` |
