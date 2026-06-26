---
description: "Task list for Kundenkonto & Self-Service (005)"
---

# Tasks: Kundenkonto & Self-Service

**Input**: Design documents from `/specs/005-customer-account-self-service/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/customer-account-api.md, quickstart.md

**Tests**: Included — Konstitution IX verlangt test-zuerst für kritische Pfade (Auth, Cross-Account-Autorisierung, atomare Umbuchung, Lösch-Anonymisierung, Enumeration/Rate-Limit).

**Organization**: Nach User Story gruppiert; jede Story ist eigenständig implementier- und testbar.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallel ausführbar (andere Datei, keine offene Abhängigkeit)
- **[Story]**: US1–US4 (Setup/Foundational/Polish ohne Story-Label)

## Path Conventions

Web-App: `backend/app/...`, `backend/tests/...`, `frontend/src/...` (bestehende Struktur aus plan.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Konfiguration und Domänen-Gerüst

- [X] T001 Add account settings to `backend/app/core/config.py` (`CUSTOMER_SESSION_EXPIRE_HOURS=8`, `CUSTOMER_REMEMBER_EXPIRE_DAYS=30`, `CUSTOMER_VERIFY_TOKEN_HOURS=24`, `CUSTOMER_RESET_TOKEN_HOURS=1`, `RATE_LIMIT_ACCOUNT_PER_MINUTE=10`) und in `backend/.env.example` dokumentieren
- [X] T002 [P] Create `customer_account` domain package skeleton: `backend/app/domains/customer_account/__init__.py`, leere `models.py`, `schemas.py`, `service.py`, `dependencies.py`, `router.py`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Datenmodell, Auth-Plumbing und Routing, die ALLE Stories brauchen

**⚠️ CRITICAL**: Keine User-Story-Arbeit vor Abschluss dieser Phase

- [X] T003 [P] Extend `Customer` model with `hashed_password: Optional[str]` and `email_verified_at: Optional[datetime]` (tz) in `backend/app/domains/booking/models.py`
- [X] T004 [P] Create `CustomerToken` model (`customer_id` FK, `token_hash` unique, `purpose` enum {email_verification,password_reset}, `expires_at`, `used_at`, `created_at`) in `backend/app/domains/customer_account/models.py`
- [X] T005 Create Alembic migration `backend/alembic/versions/011_customer_account.py` (add `customers.hashed_password`, `customers.email_verified_at`; create `customer_tokens`; downgrade reverses) — depends on T003, T004
- [X] T006 [P] Add customer JWT helpers `create_customer_token(customer_id, remember)` and `validate_customer_token(token)` (claim `typ="customer"`, sub=customer UUID) in `backend/app/domains/auth/service.py`, reusing `pwd_context`/`JWT_SECRET_KEY`/`ALGORITHM`
- [X] T007 [P] Define base Pydantic schemas (Register, Login, ForgotPassword, ResetPassword, ProfileUpdate, AccountAppointment, RescheduleRequest, MeOut) with password ≥10 validator in `backend/app/domains/customer_account/schemas.py`
- [X] T008 Implement `get_current_customer` dependency reading the `customer_session` cookie via `validate_customer_token` in `backend/app/domains/customer_account/dependencies.py` — depends on T006
- [X] T009 Implement hashed token issue/consume helpers (`issue_token(purpose)` → plaintext + stored SHA-256 hash; `consume_token(token, purpose)` → 404/410 checks, set `used_at`; invalidate-open-tokens) in `backend/app/domains/customer_account/service.py` — depends on T004, T005
- [X] T010 Create router skeleton (prefix `/account`) and register it under `/api/v1` in `backend/app/main.py` — depends on T002

**Checkpoint**: Foundation ready — user stories can begin.

---

## Phase 3: User Story 1 - Konto anlegen, verifizieren & eigene Termine sehen (Priority: P1) 🎯 MVP

**Goal**: Registrierung mit Double-Opt-in, Login/Logout („Angemeldet bleiben"), Passwort-Reset und die eigene Termin-Übersicht.

**Independent Test**: Konto anlegen → vor Verifikation Login abgelehnt → Verifikationslink → Login → nur eigene Termine sichtbar, keine fremden.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T011 [P] [US1] Integration test register→verify→login, unverified-login `403`, generische Enumeration-Antwort bei register in `backend/tests/integration/test_customer_account.py`
- [X] T012 [P] [US1] Integration test `GET /account/appointments` zeigt nur eigene Termine; Zugriff auf fremden Termin → `404` (Cross-Account) in `backend/tests/integration/test_customer_account.py`
- [X] T013 [P] [US1] Integration test Passwort forgot→reset (generische Antwort, Token single-use, abgelaufen `410`) in `backend/tests/integration/test_customer_account.py`

### Implementation for User Story 1

- [X] T014 [P] [US1] Add `render_verification()` and `render_password_reset()` German templates (tokenisierte Links via `PUBLIC_BASE_URL`) in `backend/app/domains/notifications/templates.py`
- [X] T015 [US1] Add `send_account_email()` helper (kein appointment-FK, Versand über `send_email`) in `backend/app/domains/notifications/service.py`
- [X] T016 [US1] Implement `register()` service: upsert/locate non-anonymized `Customer` by email, set bcrypt hash, issue verification token, send mail, **always generic response** in `backend/app/domains/customer_account/service.py`
- [X] T017 [US1] Implement `verify_email()` service (consume token, set `email_verified_at`) in `backend/app/domains/customer_account/service.py`
- [X] T018 [US1] Implement `login()` service (verify bcrypt, verification gate `403`, generic `401`, `remember_me` exp, reuse `compute_delay`/`record_failed_attempt` backoff) in `backend/app/domains/customer_account/service.py`
- [X] T019 [US1] Implement `request_reset()` + `reset_password()` services (generic response, consume token, update hash) in `backend/app/domains/customer_account/service.py`
- [X] T020 [US1] Implement `list_customer_appointments(customer_id)` (upcoming/past split, cancellable/reschedulable flags) in `backend/app/domains/booking/service.py`
- [X] T021 [US1] Implement account endpoints register, verify, login (set `customer_session` cookie), logout, me, password/forgot, password/reset, appointments — all `@limiter.limit(RATE_LIMIT_ACCOUNT_PER_MINUTE)` on auth routes — in `backend/app/domains/customer_account/router.py`
- [X] T022 [P] [US1] Add account DTOs to `frontend/src/lib/types.ts` and auth/appointment API calls to `frontend/src/lib/api.ts`
- [X] T023 [P] [US1] Build account auth context + pages register, login, verifizieren/[token], passwort-vergessen, passwort-zuruecksetzen/[token] and `layout.tsx` guard under `frontend/src/app/(account)/konto/` (+ components in `frontend/src/components/account/`)
- [X] T024 [P] [US1] Build `frontend/src/app/(account)/konto/termine/page.tsx` (upcoming/past lists)

**Checkpoint**: US1 fully functional and independently testable (MVP).

---

## Phase 4: User Story 2 - Termine selbst stornieren & umbuchen (Priority: P2)

**Goal**: Eigenen Termin ohne Anruf stornieren (Slot frei) oder atomar umbuchen (neuer Slot reserviert bevor alter freigegeben).

**Independent Test**: Termin stornieren → Slot wieder frei; umbuchen auf freie Zeit → neuer Termin bestätigt, alter frei; bei belegtem Zielslot → `409`, Original bleibt.

### Tests for User Story 2 ⚠️ (write first, must fail)

- [X] T025 [P] [US2] Integration test cancel (Slot freigegeben), Frist überschritten `410`, fremder Termin `404` in `backend/tests/integration/test_customer_account.py`
- [X] T026 [P] [US2] Unit test atomare Umbuchung inkl. Konflikt: bei belegtem Zielslot `409` und Originaltermin bleibt `confirmed` in `backend/tests/unit/test_account_reschedule.py`

### Implementation for User Story 2

- [X] T027 [US2] Implement `cancel_own_appointment(customer_id, appointment_id)` (ownership→404, cutoff→410, status→`cancelled`) in `backend/app/domains/booking/service.py`
- [X] T028 [US2] Implement `reschedule_appointment(customer_id, appointment_id, new_starts, team_member_id)` in single transaction (cancel old + insert new with same guardrails, rollback on `IntegrityError`/overlap → 409) in `backend/app/domains/booking/service.py`
- [X] T029 [US2] Add `render_reschedule_confirmation()` template in `backend/app/domains/notifications/templates.py`
- [X] T030 [US2] Add account endpoints `POST /account/appointments/{id}/cancel` and `/reschedule` (send confirmation mail) in `backend/app/domains/customer_account/router.py`
- [X] T031 [P] [US2] Build cancel action + reschedule dialog (uses existing `GET /public/booking/availability`) in `frontend/src/components/account/` and wire into `termine/page.tsx`

**Checkpoint**: US1 + US2 both work independently.

---

## Phase 5: User Story 3 - Profil verwalten, Daten exportieren, Konto löschen (Priority: P3)

**Goal**: Basisprofil bearbeiten, DSGVO-Export (JSON), Selbst-Löschung (kommende Termine zuerst stornieren → anonymisieren → Login unmöglich).

**Independent Test**: Name ändern; JSON-Export herunterladen; Konto löschen → danach kein Login, Daten anonymisiert, kommende Termine `cancelled`.

### Tests for User Story 3 ⚠️ (write first, must fail)

- [X] T032 [P] [US3] Integration test profile update, export JSON (Profil + Historie), delete → kommende Termine `cancelled`, Daten anonymisiert, anschließend Login `401` in `backend/tests/integration/test_customer_account.py`

### Implementation for User Story 3

- [X] T033 [US3] Implement `update_profile(customer_id, name, phone)` (Datenminimierung; keine Email-Änderung) in `backend/app/domains/customer_account/service.py`
- [X] T034 [US3] Implement `export_data(customer_id)` returning JSON (profile + appointments + exported_at) in `backend/app/domains/customer_account/service.py`
- [X] T035 [US3] Implement `delete_account(customer_id)`: cancel upcoming confirmed appointments, then reuse/extend `BookingService.delete_customer` anonymization, clear `hashed_password`/`email_verified_at`, delete `customer_tokens` in `backend/app/domains/customer_account/service.py` (+ extend `backend/app/domains/booking/service.py` if needed)
- [X] T036 [US3] Add account endpoints `PATCH /account/profile`, `GET /account/export` (attachment), `DELETE /account` (clear cookie, 204) in `backend/app/domains/customer_account/router.py`
- [X] T037 [P] [US3] Build `frontend/src/app/(account)/konto/profil/page.tsx` and `.../datenschutz/page.tsx` (export download + delete confirmation dialog)

**Checkpoint**: US1–US3 independently functional.

---

## Phase 6: User Story 4 - Frühere Gast-Buchungen übernehmen (Priority: P3, MVP-optional)

**Goal**: Nach Verifikation sieht der Kunde frühere, nicht-anonymisierte Gast-Buchungen mit derselben Email.

**Independent Test**: Als Gast mit Email X buchen → Konto mit X registrieren+verifizieren → frühere Buchung erscheint; anonymisierte Alttermine nicht.

### Tests for User Story 4 ⚠️ (write first, must fail)

- [X] T038 [P] [US4] Integration test Gast bucht (Email X) → register+verify (X) → `GET /account/appointments` enthält die Gast-Buchung; anonymisierter Altdatensatz wird nicht zugeordnet in `backend/tests/integration/test_customer_account.py`

### Implementation for User Story 4

- [X] T039 [US4] Verify/adjust `register()` so it links to the existing non-anonymized `Customer` by exact email (no duplicate identity; anonymized excluded) in `backend/app/domains/customer_account/service.py` — depends on T016

**Checkpoint**: All user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T040 [P] Re-export `backend/openapi.json` after new endpoints (Konstitution VII)
- [X] T041 [P] Update Datenschutzerklärung for account processing (Art. 6 (1) b, FR-015) in `frontend/src/app/(public)/datenschutz/page.tsx`
- [X] T042 [P] Unit tests: password validator (≥10 chars) and token hashing/expiry/single-use in `backend/tests/unit/test_account_tokens.py`
- [X] T043 Verify role separation: customer `customer_session` cookie rejected by admin endpoints and admin `session` rejected by `/account/*` (assertion test) in `backend/tests/integration/test_customer_account.py`
- [ ] T044 Run `quickstart.md` end-to-end validation (manual flows US1–US4) and confirm SC-001..SC-005

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: keine Abhängigkeiten
- **Foundational (Phase 2)**: nach Setup — BLOCKIERT alle Stories
- **User Stories (Phase 3–6)**: nach Foundational; danach parallelisierbar oder seriell P1→P2→P3
- **Polish (Phase 7)**: nach den gewünschten Stories

### User Story Dependencies

- **US1 (P1)**: nur Foundational — Fundament für alle weiteren (Login/Übersicht)
- **US2 (P2)**: Foundational; nutzt Login aus US1 zur Demonstration, Backend-Logik aber eigenständig testbar
- **US3 (P3)**: Foundational; nutzt Login aus US1
- **US4 (P3)**: Foundational + T016 (register); sonst eigenständig

### Within Each User Story

- Tests zuerst (müssen fehlschlagen) → Models → Services → Endpoints → Frontend
- Gleiche Datei = nicht [P]; `service.py`/`router.py`-Tasks derselben Story laufen seriell

### Parallel Opportunities

- Setup: T002 ∥ (nach T001)
- Foundational: T003 ∥ T004 ∥ T006 ∥ T007; danach T005, T008, T009, T010
- US1 Tests T011 ∥ T012 ∥ T013; Frontend T022 ∥ T023 ∥ T024; Template T014 ∥ Tests
- US2 Tests T025 ∥ T026; Frontend T031 parallel zum Backend
- Nach Foundational können US1/US2/US3 von verschiedenen Personen parallel bearbeitet werden

---

## Parallel Example: User Story 1

```bash
# Tests zuerst (parallel):
Task: "T011 Integration test register→verify→login in backend/tests/integration/test_customer_account.py"
Task: "T012 Integration test appointments + cross-account 404"
Task: "T013 Integration test password forgot/reset"

# Frontend (parallel, nach Backend-Endpoints):
Task: "T022 types.ts + api.ts account calls"
Task: "T023 auth context + register/login/verify/reset pages"
Task: "T024 termine list page"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (register→verify→login→eigene Termine) → Deploy/Demo.

### Incremental Delivery

US1 (MVP) → US2 (Storno/Umbuchung) → US3 (Profil/Export/Löschung) → US4 (Gast-Übernahme). Jede Story wird unabhängig getestet und ausgeliefert.

---

## Notes

- [P] = andere Datei, keine offene Abhängigkeit
- Nach jeder implementierten Task sofort hier abhaken
- Tests vor Implementierung rot sehen (Konstitution IX)
- `backend/tests/integration/test_customer_account.py` wird von mehreren Test-Tasks geteilt → diese Tasks **nicht** gleichzeitig editieren (seriell trotz [P]-Ziel verschiedener Stories)
- Commit nach jeder Task oder logischer Gruppe
