# Implementation Plan: Smart Booking Engine

**Branch**: `004-smart-booking-engine` | **Date**: 2026-06-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-smart-booking-engine/spec.md`

## Summary

Phase 3 öffnet den bestehenden, bisher rein admin-internen Buchungs-Kern (Domäne `booking`: `availability.py`, `service.py`, DB-Constraints) für **öffentliche Gast-Buchungen** ohne Konto. Der Flow Dienstleistung → Stylist → Zeit → Kontaktdaten → Bestätigung wird über neue, ungeschützte und rate-limitierte Public-Endpoints bereitgestellt; die Buchung wird sofort verbindlich bestätigt (FR-016). Neu hinzu kommen: eine **E-Mail-Benachrichtigungsdomäne** (`notifications`, SendGrid) für Bestätigung und 24-h-Erinnerung, ein **tokenisierter Storno-Link** (kein Login, Frist 24 h), Buchungs-Guardrails (2 h Vorlauf, 60 Tage Horizont, „beliebiger Stylist") und ein **Erinnerungs-Job** analog zum bestehenden Retention-Job. Der Web-Kalender bleibt die alleinige Quelle der Wahrheit; Doppelbuchungen sind bereits per PostgreSQL-`EXCLUDE USING GIST` strukturell verhindert — der Public-Flow muss die Constraint-Verletzung nur sauber als `409` abfangen.

## Technical Context

**Language/Version**: Python 3.11+ (Backend), TypeScript 5 / React 19 (Frontend, Next.js App Router)

**Primary Dependencies**: FastAPI, SQLModel/SQLAlchemy, Alembic, asyncpg, Pydantic v2, slowapi (Rate-Limiting, bereits vorhanden), **sendgrid** (neu, E-Mail); Frontend: Next.js, Tailwind, Motion (Framer Motion)

**Storage**: PostgreSQL (Produktion), SQLite/aiosqlite (Tests). Bestehende Tabellen `appointments`, `customers` werden erweitert; neue Tabelle `notification_logs`.

**Testing**: pytest + pytest-asyncio + httpx (Backend, In-Memory SQLite); kritische Pfade test-zuerst (Konstitution IX)

**Target Platform**: Linux-Server (Backend, Modular Monolith), Browser/Mobile-First (Frontend)

**Project Type**: Web application (FastAPI-Backend + Next.js-Frontend) — bestehende Repo-Struktur

**Performance Goals**: Buchungs-Abschluss < 2 min (SC-001); Bestätigung-Zustellung < 5 min (SC-003); öffentliche Seiten Core Web Vitals LCP < 2,5 s / INP < 200 ms / CLS < 0,1 (Konstitution)

**Constraints**: Keine Zahlungsverarbeitung; nur E-Mail-Kanal; Datenminimierung (Name + E-Mail Pflicht, Telefon optional); DSGVO Art. 6 (1) b; Storno-Token unerratbar; Doppelbuchung null (SC-002)

**Scale/Scope**: Einzel-Salon, kleines Team, Buchungshorizont 60 Tage, 15-min-Raster; Größenordnung wenige Hundert Termine/Monat

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Prinzip | Relevanz & Status |
|---|---|
| I. Spec-First, keine stillen Annahmen | ✅ Alle 3 kritischen `[NEEDS CLARIFICATION]` in der Clarify-Session aufgelöst; restliche Defaults in Assumptions dokumentiert. |
| II. Datenschutz by Design (NICHT VERHANDELBAR) | ✅ Nur Name + E-Mail (Datenminimierung); Rechtsgrundlage Art. 6 (1) b; keine SMS/keine separate Einwilligung; Retention über bestehenden `run_retention_job`; SendGrid = AV-Vertrag + TLS (Research). Storno-Token kryptografisch zufällig. |
| III. Eine Quelle der Wahrheit für Termine | ✅ Doppelbuchung strukturell per `EXCLUDE USING GIST`. **Fix (D1):** Constraint in Migration 009 von `tsrange` auf `tstzrange` umstellen (korrekt/immutable für timestamptz). Public-Service fängt `IntegrityError` → `409 BOOKING_CONFLICT`; Garantie wird Postgres-verifiziert getestet (T013a), nicht nur unter SQLite. |
| IV. Modulare Architektur, klare Domänen | ✅ Neue Domäne `notifications`; `booking` bleibt geschnitten; kein Zugriff auf fremde Interna außer über Service-Schicht. |
| V. Separation of Concerns | ✅ Public-Router → BookingService/NotificationService → DB; keine Geschäftslogik im Frontend; keine DB-Queries in Routen. |
| VI. Durchgängige Typsicherheit | ✅ Pydantic-Schemas für alle Public-I/O; TS-Typen im Frontend aus OpenAPI abgeleitet. |
| VII. API ist dokumentierter Vertrag | ✅ Neue Routen unter `/api/v1/public/...`, im OpenAPI-Schema; `backend/openapi.json` wird neu exportiert. |
| VIII. Auslieferbare Qualität | ✅ Fehlerbehandlung (409, 422, 410 abgelaufener Token), Validierung, Logging des Versandstatus. |
| IX. Getestete kritische Pfade | ✅ Slot-Berechnung, Buchungs-Integrität (Concurrency), Token-Storno, Reminder-Idempotenz test-zuerst. |
| X. Mobile-First & zugänglich | ✅ Buchungs-Flow zuerst fürs Smartphone; semantisches HTML, Tastatur, Kontraste, `prefers-reduced-motion`. |
| XI. Sicherheit als Standard | ✅ Rate-Limiting auf POST-Buchung/Storno (slowapi); Token unerratbar; Eingabevalidierung an der API-Grenze; Secrets nur via ENV. |
| XII. Design-System & bewusste Motion | ✅ Flow nutzt `DESIGN.md`-Tokens; Motion nur für Schritt-Übergänge/Feedback über `transform`/`opacity`. |

**Ergebnis: PASS** — keine Verletzungen, keine Einträge in Complexity Tracking erforderlich.

## Project Structure

### Documentation (this feature)

```text
specs/004-smart-booking-engine/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (public booking API)
│   └── public-booking.md
├── checklists/
│   └── requirements.md  # from /speckit-specify + /speckit-clarify
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── core/
│   │   └── config.py                      # + SENDGRID_API_KEY, EMAIL_FROM, PUBLIC_BASE_URL,
│   │                                      #   BOOKING_MIN_LEAD_HOURS, BOOKING_MAX_HORIZON_DAYS,
│   │                                      #   REMINDER_LEAD_HOURS, CANCELLATION_CUTOFF_HOURS,
│   │                                      #   RATE_LIMIT_BOOKING_PER_MINUTE
│   ├── domains/
│   │   ├── booking/
│   │   │   ├── models.py                  # + Appointment.cancellation_token, Appointment.origin
│   │   │   ├── schemas.py                 # + PublicAppointmentCreate, PublicAppointmentRead,
│   │   │   │                              #   PublicSlotQuery, CancellationView
│   │   │   ├── service.py                 # + create_public_appointment(), cancel_by_token(),
│   │   │   │                              #   guardrails, "any stylist" resolution, IntegrityError→409
│   │   │   ├── availability.py            # reused; + multi-member ("any stylist") helper
│   │   │   └── public_router.py           # NEW: /public/booking/* (unauth, rate-limited)
│   │   └── notifications/                 # NEW DOMAIN
│   │       ├── models.py                  # NotificationLog
│   │       ├── service.py                 # NotificationService (send confirmation/reminder)
│   │       ├── email.py                   # SendGrid client wrapper (+ console fallback in dev)
│   │       ├── templates.py               # German confirmation + reminder bodies
│   │       └── reminders.py               # run_reminder_job() (idempotent via NotificationLog)
│   └── main.py                            # register booking.public_router
├── scripts/run_reminders.py               # NEU: CLI runner (neben bestehendem scripts/run_retention.py)
├── alembic/versions/
│   └── 009_phase3_booking_notifications.py  # cancellation_token, origin, notification_logs
└── tests/
    ├── integration/test_public_booking.py   # US1 + US3 public flow, concurrency, guardrails
    └── unit/test_notifications.py           # confirmation/reminder selection + idempotency

frontend/
├── src/app/(public)/termin/
│   ├── page.tsx                           # Booking flow shell (Schritt-Stepper)
│   └── stornieren/[token]/page.tsx        # Token cancellation view
├── src/components/public/booking/         # ServicePicker, StylistPicker, SlotPicker,
│                                          #   ContactForm, Confirmation, CancelCard
├── src/lib/api.ts                         # + public booking + cancel calls
└── src/lib/types.ts                       # + PublicAppointmentCreate/Read, Slot, CancellationView
```

**Structure Decision**: Bestehende Web-App-Struktur (FastAPI-Backend + Next.js-Frontend) wird beibehalten. Die Buchungslogik lebt weiter in der Domäne `booking`; die öffentlichen Endpoints kommen als neues `booking/public_router.py` hinzu (gespiegelt zum bestehenden `stammdaten/public_router.py`). Benachrichtigungen werden gemäß Konstitution IV als eigene Domäne `notifications` geschnitten. Der Erinnerungs-Job folgt dem etablierten Muster des Retention-Jobs (Service-Funktion + dünnes CLI-Skript).

## Complexity Tracking

> Keine Constitution-Verletzungen — Abschnitt entfällt.
