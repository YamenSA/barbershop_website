# Implementation Plan: Admin & Stammdaten (Phase 1)

**Branch**: `002-admin-stammdaten` | **Date**: 2026-06-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-admin/spec.md`

## Summary

Phase 1 makes the Phase 0 domain model operable for the first time via an internal admin interface. The backend gains a new `auth` domain (JWT httponly-cookie sessions, 8 h sliding window, progressive login delay + IP rate-limiting), a new `DayOverride` entity for per-day schedule overrides, appointment reschedule + notes endpoints, a dashboard summary endpoint, and an on-demand daily-plan PDF endpoint. The frontend is a new Next.js 14 admin UI with Edge Middleware auth-guard, a FullCalendar week/day view, and CRUD pages for all master data. All Phase 0 API endpoints gain `get_current_admin` auth protection.

## Technical Context

**Language/Version**: Python 3.11 (Backend) · TypeScript 5 / Next.js 14 App Router (Frontend)

**Primary Dependencies**:
- Backend: FastAPI 0.111+, SQLModel 0.0.18+, Alembic, `python-jose[cryptography]` (JWT), `passlib[bcrypt]` (password hashing), `slowapi` (IP rate limiting), `fpdf2` (PDF generation)
- Frontend: Next.js 14, TypeScript, Tailwind CSS, `@fullcalendar/react` + `@fullcalendar/timegrid` + `@fullcalendar/interaction`

**Storage**: PostgreSQL 15+ (unchanged) — new tables `admin_accounts` + `day_overrides` via Alembic migration

**Testing**: pytest + pytest-asyncio — existing suite extended with auth, day-override, and PDF tests; no new E2E framework (Phase 3)

**Target Platform**: Linux-Server (Docker-Container) — unchanged

**Project Type**: Modular Monolith — new `auth` domain added; new `frontend/` Next.js project bootstrapped

**Performance Goals**: Login response < 1 s (including progressive delay when applicable); PDF generation < 3 s for a full day; dashboard endpoint < 500 ms

**Constraints**:
- `admin_override: true` on appointment creation bypasses working-schedule check but NEVER the EXCLUDE double-booking constraint
- PDF not persisted server-side — generated on-demand, streamed as `Content-Disposition: attachment`
- Session cookie: `httponly; secure; samesite=strict`; 8 h lifetime, reset on activity
- `DayOverride.date` is DATE (day granularity only, not TIMESTAMPTZ range)
- Progressive login delay capped at 30 s per source IP; no hard account lockout

**Scale/Scope**: 1 Salon, 3–10 Teammitglieder, ~200 Termine/Woche — unchanged

## Constitution Check

*GATE: Muss vor Phase-0-Research bestanden sein. Erneute Prüfung nach Phase-1-Design.*

| Prinzip | Status | Nachweis |
|---|---|---|
| I — Spec-First | ✓ | spec.md validiert; 5 Clarifications integriert |
| II — DSGVO by Design | ✓ | PDF enthält nur Mindestfelder; keine dauerhafte Speicherung; Notizen standardmäßig ausgeschlossen; Phase-0-Retention unverändert |
| III — Eine Quelle der Wahrheit | ✓ | Admin-Walk-in und spätere Phase-3-Buchungen teilen dasselbe Booking-Backend |
| IV — Modulare Architektur | ✓ | `auth`-Domäne gekapselt; keine Booking-Interna in auth; erweiterbar für Phase 4 |
| V — Separation of Concerns | ✓ | Auth-Logik in `auth/service.py`; Rate-Limit als Middleware; keine Auth-Logik in Routen |
| VI — Typsicherheit | ✓ | Pydantic v2 für alle neuen Schemas; TypeScript strict; Frontend-Typen aus OpenAPI generiert |
| VII — API als Vertrag | ✓ | Neue Endpunkte unter `/api/v1/`; OpenAPI auto-generiert → `backend/openapi.json` |
| VIII — Auslieferbare Qualität | ✓ | Kein `// TODO` in Deliverables; vollständige Fehlerbehandlung + Validierung |
| IX — Getestete kritische Pfade | ✓ | Auth (TDD), DayOverride-Verfügbarkeit (TDD), Doppelbuchungsschutz (Phase-0-Tests bestehen weiterhin) |
| X — Mobile-First | ⚠ | Admin-UI ist intern; Desktop-first per Spec akzeptiert; responsives Layout (kein Overflow) bleibt Pflicht |
| XI — Sicherheit als Standard | ✓ | JWT httponly-Cookie, bcrypt, progressive Delay, IP-Rate-Limit (slowapi); alle nicht-öffentlichen Endpunkte per `get_current_admin` geschützt |
| XII — Design-System | ✓ | Tailwind + DESIGN.md Tokens; nüchternes Admin-Design per Spec-Vorgabe |

**Gate-Ergebnis: BESTANDEN** — Prinzip X: Desktop-first für Admin bewusst akzeptiert; responsives Layout ohne Overflow bleibt Pflicht.

## Project Structure

### Documentation (diese Phase)

```text
specs/002-admin/
├── plan.md              # Dieses Dokument
├── research.md          # Phase-0-Ausgabe
├── data-model.md        # Phase-1-Ausgabe
├── quickstart.md        # Phase-1-Ausgabe
├── contracts/
│   ├── auth.md          # Auth-Endpunkte (Login, Logout, Me)
│   └── admin.md         # Dashboard, Appointment-Patch, PDF, Customer-Search
└── tasks.md             # Phase-2-Ausgabe (/speckit-tasks — noch nicht erstellt)
```

### Source Code (Repository-Root)

```text
backend/
├── app/
│   ├── core/
│   │   ├── config.py          # + JWT_SECRET_KEY, SESSION_EXPIRE_HOURS=8, RATE_LIMIT_LOGIN_*
│   │   └── database.py        # Unverändert
│   ├── domains/
│   │   ├── auth/                        # NEU
│   │   │   ├── models.py                # AdminAccount (SQLModel)
│   │   │   ├── schemas.py               # LoginRequest, TokenResponse, AdminOut
│   │   │   ├── service.py               # verify_password, create_token, validate_token, progressive_delay
│   │   │   ├── router.py                # POST /auth/login · POST /auth/logout · GET /auth/me
│   │   │   └── dependencies.py          # get_current_admin FastAPI dependency
│   │   ├── stammdaten/
│   │   │   ├── models.py                # + DayOverride (NEU)
│   │   │   ├── schemas.py               # + DayOverrideCreate, DayOverrideRead
│   │   │   ├── service.py               # + DayOverride CRUD
│   │   │   └── router.py                # + DayOverride-Routen; auth protection auf alle Routen
│   │   └── booking/
│   │       ├── models.py                # Unverändert
│   │       ├── schemas.py               # + AppointmentUpdate (reschedule + notes)
│   │       ├── service.py               # + reschedule_appointment, update_notes; admin_override flag
│   │       ├── availability.py          # + DayOverride in Verfügbarkeitsberechnung einbeziehen
│   │       ├── router.py                # + PATCH /appointments/{id}; auth protection
│   │       ├── admin_router.py          # NEU: GET /admin/dashboard · GET /admin/daily-plan/pdf
│   │       └── retention.py             # Unverändert
│   └── main.py                          # + auth_router, admin_router eingebunden
├── alembic/
│   └── versions/
│       └── xxxx_phase1_auth_dayoverride.py  # NEU: admin_accounts + day_overrides Tabellen
├── tests/
│   ├── unit/
│   │   ├── test_availability.py         # + DayOverride-Szenarien (TDD)
│   │   ├── test_auth.py                 # NEU: token, progressive delay (TDD)
│   │   └── test_retention.py            # Unverändert
│   └── integration/
│       ├── test_booking_integrity.py    # Unverändert
│       ├── test_auth_endpoints.py       # NEU: login / logout / protected routes
│       ├── test_admin_endpoints.py      # NEU: dashboard, PDF content, day_overrides
│       └── test_entities.py             # Unverändert
└── pyproject.toml        # + python-jose[cryptography], passlib[bcrypt], slowapi, fpdf2

frontend/                 # NEU (ab dieser Phase)
├── src/
│   ├── app/
│   │   ├── admin/
│   │   │   ├── layout.tsx               # Auth-guard wrapper
│   │   │   ├── page.tsx                 # Dashboard (heutige Termine + arbeitende Stylisten)
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── calendar/
│   │   │   │   └── page.tsx             # FullCalendar Wochen-/Tagesansicht + Modals
│   │   │   ├── services/
│   │   │   │   └── page.tsx
│   │   │   ├── team/
│   │   │   │   └── page.tsx
│   │   │   ├── hours/
│   │   │   │   └── page.tsx             # Öffnungszeiten + Schließungen
│   │   │   └── schedule/
│   │   │       └── page.tsx             # Arbeitszeiten + DayOverrides je Stylist
│   │   └── layout.tsx
│   ├── components/
│   │   └── admin/
│   │       ├── AppointmentForm.tsx      # Neuen Termin anlegen (Kunden-Suche + Gast-Fallback)
│   │       ├── AppointmentModal.tsx     # Termin bearbeiten (Status, Notiz, Verschieben)
│   │       ├── ClosureWarningDialog.tsx # Warnung + Bestätigung bei Schließung mit Terminen
│   │       └── DailyPlanExport.tsx      # PDF-Export-Button + Stylist-Filter + include_notes Toggle
│   ├── lib/
│   │   ├── api.ts                       # Typed fetch-Client mit Error-Handling
│   │   └── types.ts                     # TypeScript-Typen (aus OpenAPI-Schema generiert)
│   └── middleware.ts                    # Next.js Edge Middleware: /admin/* Auth-Guard
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

**Structure Decision**: Web Application (Option 2) — Backend `backend/` (neue `auth`-Domäne + Erweiterungen), neues Next.js-Projekt `frontend/` für Admin-UI.

## Complexity Tracking

*Keine Constitution-Verletzungen — Tabelle leer.*

## Artifacts

| Artefakt | Pfad | Status |
|---|---|---|
| Research | `specs/002-admin/research.md` | ✓ |
| Data Model | `specs/002-admin/data-model.md` | ✓ |
| API-Contract: Auth | `specs/002-admin/contracts/auth.md` | ✓ |
| API-Contract: Admin | `specs/002-admin/contracts/admin.md` | ✓ |
| Quickstart | `specs/002-admin/quickstart.md` | ✓ |
| Tasks | `specs/002-admin/tasks.md` | ⏳ `/speckit-tasks` |
