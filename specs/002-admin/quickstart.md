# Quickstart & Validation Guide: Admin & Stammdaten (Phase 1)

**Branch**: `002-admin-stammdaten` | **Date**: 2026-06-09

This guide documents runnable validation scenarios that prove the Phase 1 feature works end-to-end. It assumes the Phase 0 backend is running with a fresh database and Phase 0 seed data applied.

For data model details see [data-model.md](data-model.md). For endpoint signatures see [contracts/auth.md](contracts/auth.md) and [contracts/admin.md](contracts/admin.md).

---

## Prerequisites

```sh
# Start the database
docker compose up -d db

# Apply all migrations (Phase 0 + Phase 1)
cd backend
alembic upgrade head
# → creates admin_accounts (seeded from env) and day_overrides tables

# Set required environment variables (Phase 1 additions)
export JWT_SECRET_KEY="a-long-random-secret"
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="changeme123"

# Start backend
uvicorn app.main:app --reload

# Start frontend (separate terminal)
cd ../frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## SC-001: Auth Gate — Unauthenticated Access Rejected

**Goal**: Verify all admin endpoints reject unauthenticated requests.

```sh
# Without session cookie — expect 401
curl -s http://localhost:8000/api/v1/services | jq .
# → {"detail": "Not authenticated.", "code": "NOT_AUTHENTICATED"}

curl -s http://localhost:8000/api/v1/admin/dashboard | jq .
# → {"detail": "Not authenticated.", "code": "NOT_AUTHENTICATED"}
```

**Login and verify session is issued**:
```sh
curl -s -c cookies.txt -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "changeme123"}' | jq .
# → {"username": "admin"}
# → cookies.txt now contains httponly session cookie

# Now authenticated request succeeds
curl -s -b cookies.txt http://localhost:8000/api/v1/services | jq .
# → [...] (empty array or existing services)
```

**Automated tests** (`pytest -v -k test_auth`):
- `test_unauthenticated_returns_401` — all protected routes
- `test_login_success_sets_cookie`
- `test_login_wrong_password_returns_401_generic_message`
- `test_logout_clears_session`

---

## SC-002: Full Master Data Roundtrip

**Goal**: Create service + team member + working hours + verify they persist.

```sh
# 1. Create a service
SERVICE=$(curl -s -b cookies.txt -X POST http://localhost:8000/api/v1/services \
  -H "Content-Type: application/json" \
  -d '{"name": "Herrenschnitt", "duration_minutes": 45, "price_cents": 2500}')
SERVICE_ID=$(echo $SERVICE | jq -r '.id')

# 2. Create a team member
MEMBER=$(curl -s -b cookies.txt -X POST http://localhost:8000/api/v1/team-members \
  -H "Content-Type: application/json" \
  -d '{"name": "Max Mustermann", "bio": "Spezialist"}')
MEMBER_ID=$(echo $MEMBER | jq -r '.id')

# 3. Assign service to team member
curl -s -b cookies.txt -X PUT http://localhost:8000/api/v1/team-members/$MEMBER_ID/services \
  -H "Content-Type: application/json" \
  -d "{\"service_ids\": [\"$SERVICE_ID\"]}" | jq .
# → {"assigned": ["<SERVICE_ID>"]}

# 4. Set working hours (Mon–Fri 09:00–17:00)
curl -s -b cookies.txt -X PUT http://localhost:8000/api/v1/team-members/$MEMBER_ID/working-hours \
  -H "Content-Type: application/json" \
  -d '[
    {"day_of_week": 0, "start_time": "09:00", "end_time": "17:00"},
    {"day_of_week": 1, "start_time": "09:00", "end_time": "17:00"},
    {"day_of_week": 2, "start_time": "09:00", "end_time": "17:00"},
    {"day_of_week": 3, "start_time": "09:00", "end_time": "17:00"},
    {"day_of_week": 4, "start_time": "09:00", "end_time": "17:00"}
  ]' | jq .

# 5. Verify persistence
curl -s -b cookies.txt http://localhost:8000/api/v1/team-members/$MEMBER_ID | jq .
# → name "Max Mustermann", services includes SERVICE_ID
```

---

## SC-003: Walk-in Blocks Slot — Double-Booking Prevented

**Goal**: A manually created appointment immediately blocks the slot; a second appointment in the same slot is rejected.

```sh
# Assumes SERVICE_ID and MEMBER_ID from SC-002, and SalonHours set for today

# 1. Create walk-in (admin_override allows outside schedule if needed)
TODAY="2026-06-09T10:00:00Z"
APPT=$(curl -s -b cookies.txt -X POST http://localhost:8000/api/v1/appointments \
  -H "Content-Type: application/json" \
  -d "{
    \"team_member_id\": \"$MEMBER_ID\",
    \"service_id\": \"$SERVICE_ID\",
    \"guest_name\": \"Hans Müller\",
    \"guest_phone\": \"+49 170 1234567\",
    \"starts_at\": \"$TODAY\",
    \"admin_override\": true
  }")
echo $APPT | jq .status
# → "confirmed"   ← immediately confirmed

# 2. Attempt second appointment in same slot
curl -s -b cookies.txt -X POST http://localhost:8000/api/v1/appointments \
  -H "Content-Type: application/json" \
  -d "{
    \"team_member_id\": \"$MEMBER_ID\",
    \"service_id\": \"$SERVICE_ID\",
    \"guest_name\": \"Anna Schmidt\",
    \"guest_phone\": \"+49 171 9876543\",
    \"starts_at\": \"$TODAY\",
    \"admin_override\": true
  }" | jq .
# → 409 BOOKING_CONFLICT with conflicting_slot details
```

**Automated test**: `test_booking_integrity.py::test_admin_walkin_blocks_slot_immediately`

---

## SC-004: Daily Plan PDF — Notes Excluded by Default

**Goal**: PDF contains mandatory fields; notes absent by default, present when opted in.

```sh
DATE="2026-06-09"

# Default export — no notes
curl -s -b cookies.txt \
  "http://localhost:8000/api/v1/admin/daily-plan/pdf?date=$DATE" \
  -o tagesplan.pdf
# → PDF file downloaded; open and verify: columns = Uhrzeit, Dienstleistung, Stylist, Kunde (4 columns, no Notiz)

# With notes
curl -s -b cookies.txt \
  "http://localhost:8000/api/v1/admin/daily-plan/pdf?date=$DATE&include_notes=true" \
  -o tagesplan_mit_notizen.pdf
# → 5 columns including Notiz
```

**Automated test**: `test_admin_endpoints.py::test_pdf_excludes_notes_by_default` — inspects PDF byte stream for note column presence via fpdf2 content assertion.

---

## SC-005: DayOverride Changes Availability for Exactly One Day

**Goal**: Setting `day_off` for a team member removes them from availability on that day only.

```sh
# Assumes MEMBER_ID with Mon–Fri 09:00–17:00 schedule
# Pick the next Monday
NEXT_MONDAY="2026-06-15"

# 1. Verify member is available on NEXT_MONDAY before override
curl -s -b cookies.txt \
  "http://localhost:8000/api/v1/availability?service_id=$SERVICE_ID&date=$NEXT_MONDAY&team_member_id=$MEMBER_ID" | jq '.slots | length'
# → > 0 (slots available)

# 2. Create day_off override for NEXT_MONDAY
curl -s -b cookies.txt -X POST \
  http://localhost:8000/api/v1/team-members/$MEMBER_ID/day-overrides \
  -H "Content-Type: application/json" \
  -d "{\"date\": \"$NEXT_MONDAY\", \"override_type\": \"day_off\", \"reason\": \"krank\"}" | jq .
# → 201 Created

# 3. Availability now returns 0 slots on NEXT_MONDAY
curl -s -b cookies.txt \
  "http://localhost:8000/api/v1/availability?service_id=$SERVICE_ID&date=$NEXT_MONDAY&team_member_id=$MEMBER_ID" | jq '.slots | length'
# → 0

# 4. Adjacent day (Tuesday) is unaffected
NEXT_TUESDAY="2026-06-16"
curl -s -b cookies.txt \
  "http://localhost:8000/api/v1/availability?service_id=$SERVICE_ID&date=$NEXT_TUESDAY&team_member_id=$MEMBER_ID" | jq '.slots | length'
# → > 0 (unchanged)
```

**Automated test**: `test_availability.py::test_day_off_override_removes_availability_for_exact_date`

---

## Supplementary Validation Scenarios

### Login Rate-Limiting / Progressive Delay

```sh
# Fire 6 rapid failed logins — observe increasing response time
for i in $(seq 1 6); do
  time curl -s -X POST http://localhost:8000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username": "admin", "password": "wrong"}'; echo
done
# → Delays should increase: ~0s, ~1s, ~2s, ~4s, ~8s, ~16s (capped at 30s)
```

### Closure Conflict Warning + Force Confirm

```sh
DATE_WITH_APPTS="2026-06-09"

# First attempt — returns 409 warning
curl -s -b cookies.txt -X POST http://localhost:8000/api/v1/salon-closures \
  -H "Content-Type: application/json" \
  -d "{\"date\": \"$DATE_WITH_APPTS\", \"reason\": \"Test\"}" | jq .
# → 409 CLOSURE_CONFLICT_WARNING, requires_confirmation: true

# Confirm with force flag
curl -s -b cookies.txt -X POST http://localhost:8000/api/v1/salon-closures \
  -H "Content-Type: application/json" \
  -d "{\"date\": \"$DATE_WITH_APPTS\", \"reason\": \"Test\", \"force\": true}" | jq .
# → 201 Created; existing appointments remain confirmed
```

### Customer Search by Phone Prefix

```sh
curl -s -b cookies.txt "http://localhost:8000/api/v1/customers?search=017" | jq '.items[].phone'
# → returns customers whose phone starts with "017"
```

### UI Login Flow (Browser)

1. Open `http://localhost:3000/admin` → redirected to `/admin/login`
2. Enter username/password → redirected to `/admin` (dashboard)
3. Navigate to `/admin/calendar` → FullCalendar renders with today's appointments
4. Click a free slot → AppointmentForm opens
5. Type "Mar" in customer search → customers with name starting "Mar" appear
6. Complete form and save → appointment appears in calendar immediately
