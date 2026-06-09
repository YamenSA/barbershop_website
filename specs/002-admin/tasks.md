# Tasks: Admin & Stammdaten (Phase 1)

**Input**: Design documents from `specs/002-admin/`

**Tech Stack**: Python 3.11 / FastAPI / SQLModel / PostgreSQL (Backend) · Next.js 14 / TypeScript / Tailwind CSS / FullCalendar (Frontend)

**Organization**: Tasks grouped by user story (US1–US8) so each story is independently implementable and testable.

**Tests**: Included for constitution-mandated critical paths (auth, DayOverride availability, double-booking, PDF content). Optional paths use integration tests only where spec marks acceptance criteria as "nachweisbar per Test".

## Format: `[ID] [P?] [US?] Description`

- **[P]**: Parallelizable — different files, no incomplete dependency
- **[US#]**: User Story number from spec.md

---

## Phase 1: Setup

**Purpose**: Install new dependencies, bootstrap the frontend project, extend config.

- [x] T001 Add Phase 1 backend dependencies to `backend/pyproject.toml`: `python-jose[cryptography]`, `passlib[bcrypt]`, `slowapi`, `fpdf2`
- [x] T002 [P] Bootstrap Next.js 14 frontend project in `frontend/` with TypeScript, Tailwind CSS, and App Router: `npx create-next-app@latest frontend --typescript --tailwind --app --src-dir`
- [x] T003 [P] Add frontend dependencies to `frontend/package.json`: `@fullcalendar/react`, `@fullcalendar/timegrid`, `@fullcalendar/interaction`, `@fullcalendar/core`
- [x] T004 Add new environment variables to `backend/.env.example`: `JWT_SECRET_KEY`, `SESSION_EXPIRE_HOURS=8`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `RATE_LIMIT_LOGIN_PER_MINUTE=20`
- [x] T005 [P] Extend `backend/app/core/config.py` to expose `jwt_secret_key: str`, `session_expire_hours: int = 8`, `admin_username: str`, `admin_password: str`, `rate_limit_login: int = 20` from environment

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema extensions, auth infrastructure, and frontend baseline — MUST complete before any user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Database

- [x] T006 Create Alembic migration `backend/alembic/versions/xxxx_phase1_auth_dayoverride.py` that: (1) adds `description TEXT NULLABLE` to `services` table, (2) creates `admin_accounts` table per data-model.md, (3) creates `day_overrides` table with CHECK constraints per data-model.md, (4) adds B-tree index on `day_overrides(team_member_id, date)`, (5) adds B-tree index on `customers(phone)`, (6) seeds one `AdminAccount` row from `ADMIN_USERNAME` + `ADMIN_PASSWORD` env vars (bcrypt hash computed in migration)
- [x] T007 Add `description: str | None = None` field to `Service` SQLModel in `backend/app/domains/stammdaten/models.py` and update `ServiceCreate`/`ServiceRead`/`ServiceUpdate` schemas in `backend/app/domains/stammdaten/schemas.py`
- [x] T008 Add `AdminAccount` SQLModel to `backend/app/domains/auth/models.py`: fields `id (UUID PK)`, `username (VARCHAR 100 UNIQUE NOT NULL)`, `hashed_password (VARCHAR 255 NOT NULL)`, `created_at`, `updated_at`
- [x] T009 Add `DayOverride` SQLModel to `backend/app/domains/stammdaten/models.py`: fields `id (UUID PK)`, `team_member_id (FK)`, `date (DATE NOT NULL)`, `override_type (VARCHAR 20 NOT NULL)`, `custom_start_time (TIME NULLABLE)`, `custom_end_time (TIME NULLABLE)`, `reason (VARCHAR 200 NULLABLE)`, `created_at`; add UNIQUE constraint on `(team_member_id, date)` and CHECK constraints from data-model.md

### Backend Auth Infrastructure

- [x] T010 Create `backend/app/domains/auth/schemas.py`: `LoginRequest(username, password)`, `TokenResponse(username)`, `AdminOut(username)`
- [x] T011 Create `backend/app/domains/auth/service.py`: implement `verify_password(plain, hashed) → bool` using passlib bcrypt; `create_session_token(username) → str` using python-jose (HS256, exp = now + SESSION_EXPIRE_HOURS); `validate_session_token(token) → str` (raises HTTPException 401 on invalid/expired); `record_failed_attempt(ip: str)` + `compute_delay(ip: str) → float` implementing `min(2^(count-1), 30)` progressive delay using an in-memory TTLCache (cachetools, 10-minute window)
- [x] T012 Create `backend/app/domains/auth/dependencies.py`: `get_current_admin(request: Request, db: AsyncSession) → AdminAccount` — reads `session` cookie, calls `validate_session_token`, fetches AdminAccount from DB; raises 401 if missing or invalid
- [x] T013 Create `backend/app/domains/auth/router.py`: `POST /auth/login` (verify password, progressive delay, set httponly+secure+samesite=strict cookie, return 200); `POST /auth/logout` (clear cookie, return 200); `GET /auth/me` (return AdminOut); wire `slowapi` limiter to login route at `RATE_LIMIT_LOGIN_PER_MINUTE` req/min per IP
- [x] T014 Register `slowapi` `Limiter` in `backend/app/main.py`; add auth router at `/api/v1/auth`; add `get_current_admin` dependency to all existing stammdaten and booking routers in `backend/app/domains/stammdaten/router.py` and `backend/app/domains/booking/router.py`

### Auth Unit Tests (Critical Path — TDD)

- [x] T015 [P] Create `backend/tests/unit/test_auth.py`: tests for `create_session_token` + `validate_session_token` (valid token, expired token, tampered token); tests for `compute_delay` (0 failures → 0 s, 1 failure → 1 s, 5 failures → 16 s, 6+ failures → capped at 30 s); test `verify_password` correct and incorrect

### Frontend Baseline

- [x] T016 Create `frontend/src/middleware.ts`: Next.js Edge Middleware that protects all `/admin/*` routes — reads session cookie; redirects to `/admin/login` if absent or invalid; passes through to `/admin/login` unconditionally
- [x] T017 [P] Create `frontend/src/lib/types.ts`: TypeScript interfaces for all API response types (Service, TeamMember, SalonHours, SalonClosure, WorkingHours, DayOverride, Appointment, Customer, DashboardResponse) derived from OpenAPI schema in `backend/openapi.json`
- [x] T018 [P] Create `frontend/src/lib/api.ts`: typed fetch wrapper with base URL from `NEXT_PUBLIC_API_URL` env var, automatic cookie forwarding, JSON error parsing, and typed helper functions for each API resource
- [x] T019 Create `frontend/src/app/layout.tsx`: root layout with Tailwind globals, Inter font, and `<html lang="de">` for German locale
- [x] T020 Create `frontend/src/app/admin/layout.tsx`: admin shell layout with top navigation (Dashboard, Kalender, Dienstleistungen, Team, Öffnungszeiten, Arbeitsplan) and logout button calling `POST /auth/logout`

**Checkpoint**: Foundation complete — run `pytest backend/tests/unit/test_auth.py -v` to verify all auth unit tests pass before proceeding.

---

## Phase 3: User Story 1 — Admin-Authentifizierung (Priority: P1) 🎯 MVP

**Goal**: Admin can log in, access the admin area, and log out. All other pages redirect to login when unauthenticated.

**Independent Test**: Without cookies → any `/admin/*` route redirects to `/admin/login`. With correct credentials → redirected to dashboard. Wrong credentials → 401 with generic message and progressive delay.

### Implementation

- [x] T021 [US1] Create `frontend/src/app/admin/login/page.tsx`: login form (username + password fields, submit button, error display for 401); on success redirect to `/admin`; show loading state during request
- [x] T022 [US1] Create integration tests `backend/tests/integration/test_auth_endpoints.py`: `test_login_success_sets_cookie`, `test_login_wrong_password_returns_401_generic_message`, `test_logout_clears_cookie`, `test_protected_endpoint_without_cookie_returns_401`, `test_protected_endpoint_with_cookie_returns_200`

**Checkpoint**: US1 complete — verify `pytest backend/tests/integration/test_auth_endpoints.py -v` all pass; manually open browser at `/admin` → redirects to login; log in → lands on `/admin`.

---

## Phase 4: User Story 2 — Stammdaten: Dienstleistungen & Teammitglieder (Priority: P2)

**Goal**: Admin can create, edit, and deactivate services and team members, and manage which stylists offer which services.

**Independent Test**: Create a service + team member, assign service, deactivate service → it disappears from active list but existing data persists.

### Implementation

- [x] T023 [P] [US2] Create `frontend/src/app/admin/services/page.tsx`: table listing active/all services; inline form to create/edit (name, duration, price, description); deactivate button with confirmation; toggle `active_only` filter
- [x] T024 [P] [US2] Create `frontend/src/app/admin/team/page.tsx`: table listing team members; form to create/edit (name, photo_url, bio); service assignment multi-select (checkboxes from active services); deactivate button with confirmation

**Checkpoint**: US2 complete — create a service and team member via the UI, assign service, reload and verify persistence; deactivate service and verify it no longer appears in the active list.

---

## Phase 5: User Story 3 — Salon-Öffnungszeiten & Schließungen (Priority: P3)

**Goal**: Admin can set weekly salon hours and add/remove closure days; a duplicate closure is rejected; saving a closure on a day with existing appointments requires explicit confirmation.

**Independent Test**: Set Mon 09:00–18:00; add closure for a future date with appointments → 409 warning → confirm → closure saved; attempt duplicate closure → 409 rejected.

### Implementation

- [x] T025 [US3] Update `POST /salon-closures` in `backend/app/domains/stammdaten/service.py` and `backend/app/domains/stammdaten/router.py`: before saving, check for confirmed appointments on `date`; if any exist and `force=False`, return `409 CLOSURE_CONFLICT_WARNING` with count; if `force=True` or no conflicts, save and return 201
- [x] T026 [US3] Update `backend/app/domains/stammdaten/schemas.py`: add `force: bool = False` to `SalonClosureCreate`; add `ClosureConflictWarning` response schema with `conflicting_appointment_count` and `requires_confirmation`
- [x] T027 [US3] Create `frontend/src/app/admin/hours/page.tsx`: two sections — (1) weekly hours editor (7-row table, open/close time pickers per day); (2) closures list with add form (date + reason) and delete button; integrate `ClosureWarningDialog.tsx` for conflict confirmation
- [x] T028 [P] [US3] Create `frontend/src/components/admin/ClosureWarningDialog.tsx`: modal showing conflict count + "N confirmed appointments exist on this date. Save closure anyway?" with Cancel / Confirm buttons; on confirm re-sends request with `force: true`

**Checkpoint**: US3 complete — set salon hours, add a closure with and without existing appointments, verify duplicate rejection.

---

## Phase 6: User Story 4 — Wochen-Arbeitsplan & Tages-Überschreibungen (Priority: P4)

**Goal**: Admin can set each stylist's recurring weekly schedule and override individual days (day off or extra hours); the availability engine reflects overrides for exactly that day.

**Independent Test**: Set Mon–Fri 09:00–17:00 for a stylist; add `day_off` override for next Monday → availability returns 0 slots for that Monday; Tuesday unchanged.

### DayOverride Backend

- [x] T029 [US4] Add `DayOverrideCreate`, `DayOverrideRead` Pydantic schemas to `backend/app/domains/stammdaten/schemas.py`
- [x] T030 [US4] Implement `DayOverride` CRUD in `backend/app/domains/stammdaten/service.py`: `list_day_overrides(team_member_id, from_date, to_date)`, `create_day_override(team_member_id, data)` (409 on duplicate date), `delete_day_override(override_id)`
- [x] T031 [US4] Add DayOverride routes to `backend/app/domains/stammdaten/router.py`: `GET /team-members/{id}/day-overrides`, `POST /team-members/{id}/day-overrides`, `DELETE /team-members/{id}/day-overrides/{override_id}` — all protected by `get_current_admin`
- [x] T032 [US4] Update `backend/app/domains/booking/availability.py`: before intersecting with WorkingHours, query `DayOverride` for the requested date; if `day_off` → return empty slots for that member; if `extra_hours` → use `(custom_start_time, custom_end_time)` instead of WorkingHours; if no override → use WorkingHours as before

### DayOverride Unit Tests (Critical Path — TDD)

- [x] T033 [US4] Extend `backend/tests/unit/test_availability.py`: `test_day_off_override_returns_no_slots`, `test_extra_hours_override_uses_custom_times`, `test_no_override_uses_working_hours`, `test_override_does_not_affect_adjacent_days` — write and confirm FAIL before T032

### Frontend

- [x] T034 [US4] Create `frontend/src/app/admin/schedule/page.tsx`: stylist selector; weekly hours editor per stylist (reuse working-hours PUT endpoint); day-override calendar or list view — add override button (date picker + type selector + optional times + reason); delete override button; show effective hours for selected week

**Checkpoint**: US4 complete — run `pytest backend/tests/unit/test_availability.py -v` all pass; verify via quickstart SC-005 scenario.

---

## Phase 7: User Story 5 — Kalender & manuelle Terminerfassung (Priority: P5)

**Goal**: Admin sees a day/week calendar of all appointments filtered by stylist and can create walk-in appointments (for existing customers or guests) with double-booking protection.

**Independent Test**: Two appointments in same slot for same stylist → first succeeds, second returns 409 BOOKING_CONFLICT.

### Backend Updates

- [x] T035 [US5] Add `admin_override: bool = False` field to `AppointmentCreate` schema in `backend/app/domains/booking/schemas.py` (not persisted)
- [x] T036 [US5] Update `backend/app/domains/booking/service.py` `create_appointment`: when `admin_override=True` (and `get_current_admin` dependency present on route), skip working-schedule intersection check; always enforce EXCLUDE double-booking constraint regardless of flag
- [x] T037 [US5] Update `GET /customers` in `backend/app/domains/booking/service.py`: extend `search` filter to match `phone` by prefix using `LIKE 'query%'` in addition to existing `ILIKE 'query%'` on `name`

### Walk-in Integration Tests (Critical Path)

- [x] T038 [US5] Create `backend/tests/integration/test_admin_endpoints.py`: `test_admin_walkin_creates_confirmed_appointment`, `test_admin_walkin_blocks_slot_for_second_attempt` (409 expected), `test_admin_override_skips_schedule_check_but_not_double_booking`, `test_customer_search_by_phone_prefix`

### Frontend Calendar

- [x] T039 [US5] Create `frontend/src/components/admin/AppointmentForm.tsx`: form with service selector, stylist selector (filtered by service), datetime picker, customer search input (debounced, calls `/customers?search=`), customer result list, guest fallback fields (name + phone); `admin_override` checkbox (pre-ticked); submit calls `POST /appointments`
- [x] T040 [US5] Create `frontend/src/app/admin/calendar/page.tsx`: FullCalendar `<TimeGridPlugin>` with day and week views; `resourceTimeGrid` filtered by stylist via dropdown; fetch `GET /appointments?from=&to=&team_member_id=` on view change; clicking an empty slot opens `AppointmentForm` pre-filled with slot time; events display service name + customer name; clicking an event opens `AppointmentModal`

**Checkpoint**: US5 complete — verify quickstart SC-003 double-booking scenario; create a walk-in via calendar UI and confirm it appears immediately.

---

## Phase 8: User Story 6 — Terminverwaltung (Priority: P6)

**Goal**: Admin can reschedule an appointment (new time and/or stylist), change its status, and add/update an internal note.

**Independent Test**: Reschedule to a conflicting slot → 409 BOOKING_CONFLICT; reschedule to a free slot → appointment moves; set status to `cancelled` → slot freed.

### Backend

- [x] T041 [US6] Add `AppointmentUpdate` Pydantic schema to `backend/app/domains/booking/schemas.py`: `starts_at: datetime | None`, `team_member_id: UUID | None`, `notes: str | None` — all optional
- [x] T042 [US6] Implement `PATCH /appointments/{id}` in `backend/app/domains/booking/service.py`: if `starts_at` or `team_member_id` provided, recalculate `ends_at`, check EXCLUDE constraint (409 if conflict); update `notes` if provided; reject if appointment status is not `confirmed` (409 INVALID_STATUS_TRANSITION); protect with `get_current_admin`
- [x] T043 [US6] Add `PATCH /appointments/{id}` route to `backend/app/domains/booking/router.py`

### Frontend

- [x] T044 [US6] Create `frontend/src/components/admin/AppointmentModal.tsx`: shows appointment details; status dropdown (confirmed → completed / cancelled / no_show); notes textarea (editable); reschedule section (new date/time picker + stylist selector); save calls `PATCH /appointments/{id}`; show 409 conflict error inline

**Checkpoint**: US6 complete — open an appointment in the calendar, reschedule to a free slot, verify it moves; attempt reschedule into a busy slot, verify 409 error shown.

---

## Phase 9: User Story 7 — Tages-Übersicht / Dashboard (Priority: P7)

**Goal**: After login, admin sees today's appointments and which stylists are working today.

**Independent Test**: Open `/admin` → dashboard shows today's appointments list and working-today list; on a day with no appointments, lists are empty without error.

### Backend

- [x] T045 [US7] Create `backend/app/domains/booking/admin_router.py` with `GET /admin/dashboard`: accept optional `date` query param (default today); query confirmed appointments for that date; compute `working_today` by evaluating effective schedule per team member (WorkingHours + DayOverride intersected with SalonHours, excluding SalonClosure); return `DashboardResponse` schema
- [x] T046 [US7] Add `DashboardResponse` schema to `backend/app/domains/booking/schemas.py`: `date`, `appointments: list[AppointmentSummary]`, `working_today: list[WorkingMemberSummary]`
- [x] T047 [US7] Register `admin_router` in `backend/app/main.py` under `/api/v1`

### Frontend

- [x] T048 [US7] Create `frontend/src/app/admin/page.tsx`: dashboard page fetching `GET /admin/dashboard`; renders two sections — "Heutige Termine" (time, service, stylist, customer) and "Heute im Einsatz" (stylist name + hours); shows empty-state messages when lists are empty

**Checkpoint**: US7 complete — log in → dashboard renders; verify empty-state on a day with no appointments.

---

## Phase 10: User Story 8 — Tagesplan als PDF exportieren (Priority: P8)

**Goal**: Admin can export a daily schedule as PDF — mandatory fields only by default; notes on explicit opt-in; optional filter by stylist; PDF not stored server-side.

**Independent Test**: `GET /admin/daily-plan/pdf?date=YYYY-MM-DD` returns a PDF with 4 columns and no notes column; with `include_notes=true` returns 5 columns.

### Backend

- [x] T049 [US8] Implement `GET /admin/daily-plan/pdf` in `backend/app/domains/booking/admin_router.py` using `fpdf2`: query appointments for `date` (filtered by `team_member_id` if provided); build PDF table with columns Uhrzeit / Dienstleistung / Stylist / Kunde (+ Notiz if `include_notes=true`); return `StreamingResponse(content, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=tagesplan-YYYY-MM-DD.pdf"})`; protect with `get_current_admin`

### PDF Tests (Critical Path — spec SC-004)

- [x] T050 [US8] Add to `backend/tests/integration/test_admin_endpoints.py`: `test_pdf_returns_pdf_content_type`, `test_pdf_excludes_notes_by_default` (assert "Notiz" not in PDF text), `test_pdf_includes_notes_when_opted_in`, `test_pdf_filters_by_team_member`, `test_pdf_not_stored_on_filesystem` (assert no file written to disk)

### Frontend

- [x] T051 [US8] Create `frontend/src/components/admin/DailyPlanExport.tsx`: export button with date picker (default today), optional stylist filter dropdown, `include_notes` toggle (default off, labeled "Notizen einschließen"); on click fetches `GET /admin/daily-plan/pdf` with params and triggers browser download via `URL.createObjectURL`
- [x] T052 [US8] Add `DailyPlanExport` component to `frontend/src/app/admin/calendar/page.tsx` toolbar and `frontend/src/app/admin/page.tsx` (dashboard)

**Checkpoint**: US8 complete — run `pytest backend/tests/integration/test_admin_endpoints.py -v -k pdf`; export PDF from UI and verify content in browser PDF viewer.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Final wiring, quality checks, and quickstart validation.

- [x] T053 Export updated OpenAPI schema: start backend, run `python -c "import json, httpx; open('backend/openapi.json','w').write(httpx.get('http://localhost:8000/openapi.json').text)"` and regenerate `frontend/src/lib/types.ts` from the updated schema
- [ ] T054 [P] Verify responsive layout: open all admin pages at 1024px and 1440px viewport widths; confirm no horizontal overflow, no truncated text in tables
- [x] T055 [P] DSGVO review: confirm `POST /admin/daily-plan/pdf` writes no file to disk; confirm `GET /admin/dashboard` returns no `notes` field in appointment summaries; confirm `PATCH /appointments/{id}` audit log entry exists in server logs
- [x] T056 Run all quickstart.md validation scenarios (SC-001 through SC-005) from `specs/002-admin/quickstart.md` and confirm each passes
- [x] T057 Run full test suite `pytest backend/ -v` and confirm 0 failures; fix any regressions in Phase 0 tests caused by auth protection changes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately; T002 and T003 (frontend bootstrap) can run in parallel with T001/T004/T005
- **Phase 2 (Foundational)**: Depends on Phase 1 complete — BLOCKS all user stories; T006–T009 (DB) → T010–T014 (backend auth) → T015 (auth unit tests); T016–T020 (frontend baseline) can run in parallel with T010–T014
- **Phase 3 (US1)**: Depends on Phase 2 — MVP gate
- **Phase 4 (US2)**: Depends on Phase 2; can run in parallel with Phase 3 (different files)
- **Phase 5 (US3)**: Depends on Phase 2; can run in parallel with Phase 3/4
- **Phase 6 (US4)**: Depends on Phase 2; T033 written before T032 (TDD)
- **Phase 7 (US5)**: Depends on Phase 6 (availability engine must include DayOverride)
- **Phase 8 (US6)**: Depends on Phase 2; independently startable after Phase 2
- **Phase 9 (US7)**: Depends on Phase 6 (dashboard uses effective schedule calculation)
- **Phase 10 (US8)**: Depends on Phase 2; independently startable after Phase 2
- **Phase 11 (Polish)**: Depends on all desired user stories complete

### User Story Dependencies

- **US1 (P1)**: After Phase 2 — no story dependencies
- **US2 (P2)**: After Phase 2 — no story dependencies; backend already exists from Phase 0
- **US3 (P3)**: After Phase 2 — no story dependencies
- **US4 (P4)**: After Phase 2 — no story dependencies; TDD: T033 before T032
- **US5 (P5)**: After US4 (Phase 6) — availability engine must include DayOverride first
- **US6 (P6)**: After Phase 2 — no story dependencies
- **US7 (P7)**: After US4 (Phase 6) — dashboard effective-schedule depends on DayOverride
- **US8 (P8)**: After Phase 2 — no story dependencies

### Within Each User Story

- DB schema → service layer → API route → frontend component
- TDD tasks (T015, T033, T038, T050) written before their implementation targets

---

## Parallel Execution Examples

### Phase 2 Parallel Opportunities

```
Parallel Group A (DB): T006, T007, T008, T009
  → then: T010, T011, T012, T013 (auth service — sequential, T012 depends on T011)
  → then: T014 (wire routers)

Parallel Group B (frontend baseline, independent of Group A):
  T016, T017, T018, T019, T020 (all touch different files)

Parallel Group C (auth unit tests, after T011):
  T015
```

### Phase 7 (US5) Parallel Opportunities

```
Parallel Group: T035, T037 (different files/concerns)
  then: T036 (depends on T035)
  then: T038 (integration tests, after T036)
  then: T039, T040 (frontend, different files — parallel)
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 (Setup)
2. Complete Phase 2 (Foundational) — run `pytest backend/tests/unit/test_auth.py -v`
3. Complete Phase 3 (US1 — Login)
4. **STOP and VALIDATE**: Admin can log in; all other routes protected
5. Continue to US2–US8 incrementally

### Incremental Delivery Order (Recommended)

1. Phase 1 + Phase 2 → Foundation + auth gate
2. Phase 3 (US1) → Login works → MVP
3. Phase 4 (US2) → Stammdaten UI
4. Phase 5 (US3) → Hours & closures
5. Phase 6 (US4) → Working schedule + day overrides
6. Phase 7 (US5) → Calendar + walk-in (depends on US4)
7. Phase 8 (US6) → Appointment management
8. Phase 9 (US7) → Dashboard (depends on US4)
9. Phase 10 (US8) → PDF export
10. Phase 11 → Polish + full quickstart validation

---

## Notes

- `[P]` tasks touch different files and have no dependency on incomplete sibling tasks
- TDD tasks (T015, T033, T038, T050) MUST fail before their implementation counterparts are written
- `admin_override` flag (T035–T036) is a request-only field — never persisted to DB
- Phase 0 EXCLUDE constraint remains the hard double-booking guard regardless of any flag
- After T014 adds `get_current_admin` to existing routers, all Phase 0 integration tests that call protected endpoints must include auth cookie — update test fixtures accordingly
- Commit after each checkpoint to preserve independently verified increments
