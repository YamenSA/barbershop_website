# Implementation Plan: Kundenkonto & Self-Service

**Branch**: `005-customer-account-self-service` | **Date**: 2026-06-10 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-customer-account-self-service/spec.md`

## Summary

Phase 5 gibt registrierten Kunden ein eigenes Konto und Self-Service über drei wiederverwendete Fundamente: das **Phase-1-Auth-Muster** (bcrypt-Hashing, JWT-Cookie, Failed-Attempt-Backoff, slowapi-Rate-Limiting), die **Phase-3-Buchungs-Engine** (Slot-Berechnung, `EXCLUDE`-Constraint, `cancel`-Logik, Guardrails) und den **Phase-3-Versand-/Token-/Anonymisierungs-Pfad** (`notifications`, tokenisierte Links, `delete_customer`-Anonymisierung).

Die bestehende `customers`-Tabelle (Email bereits `unique`) wird um Anmeldedaten erweitert (`hashed_password`, `email_verified_at`) — ein Gast ist ein `Customer` ohne Passwort, ein Konto ein `Customer` mit Passwort. Daraus folgt der zentrale Vereinfachungs-Hebel: Da Online-Buchungen über `_upsert_customer` schon heute per Email demselben `Customer` zugeordnet werden, ist die **Gast-Übernahme (US4) faktisch automatisch** — die Registrierung hängt nur Credentials an den bestehenden Datensatz, die Termine sind über `customer_id` bereits verknüpft.

Neue, klar geschnittene Domäne **`customer_account`**: Registrierung mit Double-Opt-in, Login/Logout mit „Angemeldet bleiben", Passwort-Reset, Konto-Termin-Übersicht, **Selbst-Storno und atomare Umbuchung** (delegiert an die `booking`-Service-Schicht), Profilpflege, DSGVO-Export (JSON) und Selbst-Löschung (kommende Termine zuerst stornieren → Slots frei → anonymisieren). Strikte Rollentrennung Admin vs. Kunde über separates Cookie + `typ`-Claim. Single-use, ablaufende Verifikations-/Reset-Token in einer neuen Tabelle `customer_tokens` (Token nur als Hash gespeichert).

## Technical Context

**Language/Version**: Python 3.11+ (Backend), TypeScript 5 / React 19 (Frontend, Next.js App Router)

**Primary Dependencies**: FastAPI, SQLModel/SQLAlchemy, Alembic, asyncpg, Pydantic v2, python-jose (JWT, vorhanden), passlib[bcrypt] (vorhanden), slowapi (Rate-Limiting, vorhanden), sendgrid (E-Mail, vorhanden); Frontend: Next.js, Tailwind, Motion (Framer Motion)

**Storage**: PostgreSQL (Produktion), SQLite/aiosqlite (Tests). Tabelle `customers` wird erweitert (`hashed_password`, `email_verified_at`); neue Tabelle `customer_tokens`. Keine Änderung an `appointments`/`notification_logs`.

**Testing**: pytest + pytest-asyncio + httpx (Backend, In-Memory SQLite); kritische Pfade test-zuerst (Konstitution IX): Auth/Hashing, Cross-Account-Autorisierung, atomare Umbuchung, Lösch-/Anonymisierungspfad, Enumeration-/Rate-Limit-Verhalten.

**Target Platform**: Linux-Server (Backend, Modular Monolith), Browser/Mobile-First (Frontend)

**Project Type**: Web application (FastAPI-Backend + Next.js-Frontend) — bestehende Repo-Struktur

**Performance Goals**: Konto-Erstellung inkl. Verifikation in wenigen Minuten (SC-001); Verifikations-/Reset-Mail-Zustellung < 5 min; öffentliche/Konto-Seiten Core Web Vitals LCP < 2,5 s / INP < 200 ms / CLS < 0,1 (Konstitution).

**Constraints**: Kein Marketing, keine Zahlungsdaten; Datenminimierung (Name, Email; Telefon optional); Rechtsgrundlage Art. 6 (1) b DSGVO; Passwort nur bcrypt-Hash; Verifikations-/Reset-Token nur als Hash at rest; keine Account-Enumeration; null Cross-Account-Zugriffe (SC-005); null verlorene Slots bei Umbuchung (SC-003).

**Scale/Scope**: Einzel-Salon, kleines Team; wenige Hundert Kundenkonten, wenige Hundert Termine/Monat; Buchungshorizont 60 Tage, 15-min-Raster (aus Phase 3 geerbt).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Prinzip | Relevanz & Status |
|---|---|
| I. Spec-First, keine stillen Annahmen | ✅ Alle `[NEEDS CLARIFICATION]` in der Clarify-Session (2026-06-10) aufgelöst; restliche Defaults in Assumptions dokumentiert. Keine offenen Marker. |
| II. Datenschutz by Design (NICHT VERHANDELBAR) | ✅ Datenminimierung (Name + Email, Telefon optional); Rechtsgrundlage Art. 6 (1) b (FR-015); Passwort bcrypt; Token nur als SHA-256-Hash gespeichert; Selbst-Export (Art. 15/20) + Selbst-Löschung über bestehenden Anonymisierungspfad (Art. 17, FR-011); SendGrid = AV-Vertrag + TLS; Datenschutzerklärung wird ergänzt. |
| III. Eine Quelle der Wahrheit für Termine | ✅ Storno/Umbuchung wirken auf denselben Slot-Pool; Doppelbuchung strukturell per `EXCLUDE`-Constraint (Phase 3). Umbuchung in **einer** DB-Transaktion (alt stornieren + neu anlegen, Rollback bei Konflikt) → null verlorene Slots (SC-003). |
| IV. Modulare Architektur, klare Domänen | ✅ Neue Domäne `customer_account` (Identität + Self-Service-Orchestrierung). Buchungslogik bleibt in `booking`; Versand in `notifications`; gemeinsame Hashing-/JWT-Helfer in `auth.service`. Kein Zugriff auf fremde Interna außer über Service-Schicht. |
| V. Separation of Concerns | ✅ Router → Service → DB; Umbuchung/Storno delegieren an `booking.service`; keine Geschäftslogik im Frontend; keine DB-Queries in Routen. |
| VI. Durchgängige Typsicherheit | ✅ Pydantic-Schemas für alle I/O; TS-Typen im Frontend aus OpenAPI abgeleitet; kein `any`. |
| VII. API ist dokumentierter Vertrag | ✅ Neue Routen unter `/api/v1/account/...` im OpenAPI-Schema; `backend/openapi.json` wird neu exportiert. |
| VIII. Auslieferbare Qualität | ✅ Fehlerbehandlung (401, 403, 404, 409, 410, 422, 429), Validierung, Logging sicherheitsrelevanter Ereignisse (ohne Klartext-Passwort/Token). |
| IX. Getestete kritische Pfade | ✅ Test-zuerst für Auth/Hashing, Verifikations-Gate, Cross-Account-Autorisierung, atomare Umbuchung (Konflikt-Fall), Lösch-Anonymisierung, Enumeration-/Rate-Limit-Verhalten. |
| X. Mobile-First & zugänglich | ✅ Konto-Flows zuerst fürs Smartphone; semantisches HTML, Tastaturbedienung, Kontraste, `prefers-reduced-motion`. |
| XI. Sicherheit als Standard | ✅ Rate-Limiting auf register/login/reset/verify (slowapi) + Failed-Attempt-Backoff; Token unerratbar (`secrets`) und gehasht; strikte Rollentrennung (separates Cookie + `typ`-Claim, FR-016); Secrets nur via ENV; Eingabevalidierung an der API-Grenze. |
| XII. Design-System & bewusste Motion | ✅ Konto-Oberfläche nutzt `DESIGN.md`-Tokens; Motion nur für Feedback/Übergänge über `transform`/`opacity`. |

**Ergebnis: PASS** — keine Verletzungen, keine Einträge in Complexity Tracking erforderlich.

## Project Structure

### Documentation (this feature)

```text
specs/005-customer-account-self-service/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── customer-account-api.md
├── checklists/
│   └── requirements.md  # from /speckit-specify + /speckit-clarify
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── core/
│   │   └── config.py                       # + CUSTOMER_SESSION_EXPIRE_HOURS (8),
│   │                                       #   CUSTOMER_REMEMBER_EXPIRE_DAYS (30),
│   │                                       #   CUSTOMER_VERIFY_TOKEN_HOURS (24),
│   │                                       #   CUSTOMER_RESET_TOKEN_HOURS (1),
│   │                                       #   RATE_LIMIT_ACCOUNT_PER_MINUTE
│   ├── domains/
│   │   ├── auth/
│   │   │   └── service.py                   # + create_customer_token(customer_id, remember),
│   │   │                                    #   validate_customer_token() (typ="customer");
│   │   │                                    #   reuse pwd_context (bcrypt)
│   │   ├── booking/
│   │   │   ├── service.py                   # + list_customer_appointments(),
│   │   │   │                                #   cancel_own_appointment(), reschedule_appointment()
│   │   │   │                                #   (atomic), extend delete_customer() to cancel
│   │   │   │                                #   upcoming appointments first
│   │   │   └── availability.py             # reused (slot lookup for reschedule)
│   │   ├── notifications/
│   │   │   ├── templates.py                 # + render_verification(), render_password_reset(),
│   │   │   │                                #   render_reschedule_confirmation()
│   │   │   └── service.py                   # + send_account_email() helper (no NotificationLog
│   │   │                                    #   dependency on appointment for auth mails)
│   │   └── customer_account/               # NEW DOMAIN
│   │       ├── __init__.py
│   │       ├── models.py                    # CustomerToken (purpose, token_hash, expires_at, used_at)
│   │       ├── schemas.py                   # Register/Login/Reset/Verify/Profile/Export/
│   │       │                                #   AccountAppointmentRead/RescheduleRequest
│   │       ├── service.py                   # register, verify_email, login, request_reset,
│   │       │                                #   reset_password, update_profile, export_data,
│   │       │                                #   delete_account; token issue/verify (hashed)
│   │       ├── dependencies.py              # get_current_customer (customer_session cookie)
│   │       └── router.py                    # /account/* (rate-limited; mix of unauth + auth)
│   └── main.py                             # register customer_account.router under /api/v1
├── alembic/versions/
│   └── 011_customer_account.py             # customers.hashed_password, customers.email_verified_at,
│                                           #   table customer_tokens
└── tests/
    ├── integration/test_customer_account.py # US1–US3 flows, cross-account 403, enumeration,
    │                                         #   verification gate, delete anonymization
    └── unit/test_account_reschedule.py      # atomic reschedule incl. conflict (original retained)

frontend/
├── src/app/(account)/konto/
│   ├── layout.tsx                          # account shell + auth guard
│   ├── registrieren/page.tsx
│   ├── login/page.tsx
│   ├── verifizieren/[token]/page.tsx
│   ├── passwort-vergessen/page.tsx
│   ├── passwort-zuruecksetzen/[token]/page.tsx
│   ├── termine/page.tsx                    # upcoming + past; cancel/reschedule actions
│   ├── profil/page.tsx                     # edit profile
│   └── datenschutz/page.tsx                # export download + delete account
├── src/components/account/                 # AuthForms, AppointmentList, RescheduleDialog,
│                                           #   ProfileForm, DeleteAccountDialog
├── src/lib/api.ts                          # + account auth + appointment self-service calls
└── src/lib/types.ts                        # + account DTOs
```

**Structure Decision**: Bestehende Web-App-Struktur bleibt. Identität & Self-Service-Orchestrierung leben in der neuen, schmal geschnittenen Domäne `customer_account` (Konstitution IV). Buchungs-/Slot-Logik (Storno, atomare Umbuchung) bleibt in `booking` und wird von `customer_account` über die Service-Schicht aufgerufen — keine Duplizierung der Engine. Auth-Primitive (bcrypt, JWT) werden aus `auth.service` wiederverwendet und nur um kundenspezifische Token-Funktionen ergänzt. Versand-Templates für Verifikation/Reset/Umbuchung kommen in die bestehende `notifications`-Domäne. Frontend erhält eine eigene Route-Gruppe `(account)` analog zu `(public)`.

## Complexity Tracking

> Keine Constitution-Verletzungen — Abschnitt entfällt.
