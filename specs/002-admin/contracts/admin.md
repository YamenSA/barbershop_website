# API-Contract: Admin Extensions

**Branch**: `002-admin-stammdaten` | **Date**: 2026-06-09
**Base URL**: `/api/v1`
**Auth**: All endpoints require valid session cookie (`get_current_admin`). See `contracts/auth.md`.
**Format**: JSON (Content-Type: application/json)

This contract documents:
1. New admin-specific endpoints (dashboard, PDF)
2. New endpoints for DayOverride management
3. Changes to existing Phase 0 endpoints (appointment update, customer search)

Phase 0 CRUD endpoints for Services, TeamMembers, SalonHours, SalonClosures, WorkingHours, WorkingExceptions, and Appointments remain as defined in `specs/001-fundament/contracts/` — auth protection is now added to all of them.

---

## 1. Dashboard

### GET /admin/dashboard

Returns today's appointments and which team members are working today.

**Query Parameters**:
- `date` (DATE, optional, default: today) — override the target date

**Response 200**:
```json
{
  "date": "2026-06-09",
  "appointments": [
    {
      "id": "uuid",
      "starts_at": "2026-06-09T09:00:00Z",
      "ends_at": "2026-06-09T09:45:00Z",
      "service_name": "Herrenschnitt",
      "team_member_name": "Max Mustermann",
      "customer_name": "Hans Müller",
      "status": "confirmed"
    }
  ],
  "working_today": [
    {
      "team_member_id": "uuid",
      "team_member_name": "Max Mustermann",
      "starts_at": "09:00",
      "ends_at": "17:00"
    }
  ]
}
```

`working_today` reflects the effective schedule for the date: WorkingHours with DayOverride applied, intersected with SalonHours. Members with `day_off` override or no working hours for the day are excluded.

**Response 200** (no data):
```json
{
  "date": "2026-06-09",
  "appointments": [],
  "working_today": []
}
```

---

## 2. Daily Plan PDF Export

### GET /admin/daily-plan/pdf

Generate and stream the daily schedule as a PDF. Not persisted server-side.

**Query Parameters**:

| Parameter | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `date` | DATE (YYYY-MM-DD) | Ja | Tag des Tagesplans |
| `team_member_id` | UUID | Nein | Filter auf einen Stylisten |
| `include_notes` | BOOL (default: false) | Nein | Interne Notizen einschließen |

**Response 200** — `Content-Type: application/pdf` · `Content-Disposition: attachment; filename="tagesplan-YYYY-MM-DD.pdf"`:

Binary PDF stream. PDF contains a table with columns:

| Uhrzeit | Dienstleistung | Stylist | Kunde |
|---------|---------------|---------|-------|
| 09:00 | Herrenschnitt | Max Mustermann | Hans Müller |

When `include_notes=true`, a fifth column **Notiz** is appended.

**Response 200** (no appointments): PDF with "Keine Termine für diesen Tag." message.

**Response 400**: Invalid date format.

---

## 3. Day Overrides (Tages-Überschreibungen)

### GET /team-members/{id}/day-overrides

List day overrides for a team member.

**Query Parameters**:
- `from` (DATE, optional) — start of range
- `to` (DATE, optional) — end of range

**Response 200**:
```json
[
  {
    "id": "uuid",
    "team_member_id": "uuid",
    "date": "2026-06-10",
    "override_type": "day_off",
    "custom_start_time": null,
    "custom_end_time": null,
    "reason": "krank",
    "created_at": "2026-06-09T08:00:00Z"
  },
  {
    "id": "uuid",
    "team_member_id": "uuid",
    "date": "2026-06-14",
    "override_type": "extra_hours",
    "custom_start_time": "10:00",
    "custom_end_time": "16:00",
    "reason": "spontan da",
    "created_at": "2026-06-09T08:00:00Z"
  }
]
```

---

### POST /team-members/{id}/day-overrides

Create a day override for a team member.

**Request Body** (`day_off`):
```json
{
  "date": "2026-06-10",
  "override_type": "day_off",
  "reason": "krank"
}
```

**Request Body** (`extra_hours`):
```json
{
  "date": "2026-06-14",
  "override_type": "extra_hours",
  "custom_start_time": "10:00",
  "custom_end_time": "16:00",
  "reason": "spontan da"
}
```

**Response 201**: Created override (full object as in GET list).

**Response 409**: An override already exists for this team member on this date.

**Response 422**: Validation error (e.g., `extra_hours` without times, `custom_end_time` ≤ `custom_start_time`).

---

### DELETE /team-members/{id}/day-overrides/{override_id}

Remove a day override.

**Response 204**: No content.
**Response 404**: Override not found.

---

## 4. Appointment Update (Reschedule + Notes)

Extends the Phase 0 appointment contract with a general-purpose PATCH endpoint for admin use.

### PATCH /appointments/{id}

Update time, stylist, and/or notes on an appointment. All fields optional; only provided fields are changed.

**Request Body**:
```json
{
  "starts_at": "2026-06-09T11:00:00Z",
  "team_member_id": "uuid",
  "notes": "Kunde wünscht kurze Seiten."
}
```

**Response 200**: Updated appointment (full object, same schema as `GET /appointments/{id}`).

**Response 409**: Reschedule would create a double-booking conflict:
```json
{
  "detail": "Team member has an overlapping confirmed appointment at the requested time.",
  "code": "BOOKING_CONFLICT",
  "conflicting_slot": {
    "starts_at": "2026-06-09T10:45:00Z",
    "ends_at": "2026-06-09T11:30:00Z"
  }
}
```

**Response 404**: Appointment not found.

**Response 422**: Validation error (e.g., `starts_at` in the past — admin-override does not bypass time validation).

**Notes**:
- `ends_at` is always recalculated from `starts_at + service.duration_minutes`; it cannot be set directly.
- Rescheduling a `cancelled` or `completed` appointment is not allowed (409 with `code: INVALID_STATUS_TRANSITION`).

---

## 5. Appointment Creation — Admin Override Flag

Extends the Phase 0 `POST /appointments` request schema:

```json
{
  "team_member_id": "uuid",
  "service_id": "uuid",
  "customer_id": "uuid",
  "starts_at": "2026-06-09T10:00:00Z",
  "notes": null,
  "admin_override": true
}
```

`admin_override: true` skips the working-schedule intersection check (allows walk-ins outside the stylist's formal hours). The EXCLUDE double-booking constraint is never bypassed.

`admin_override` is not stored in the database; it is a request-only flag.

---

## 6. Customer Search — Updated

Extends the Phase 0 `GET /customers?search=` to also match `phone` by prefix.

### GET /customers

**Query Parameters** (updated):
- `search` (string, optional) — prefix match against `name` (case-insensitive) OR `phone`
- `page`, `page_size` — unchanged

**Example**: `GET /customers?search=017` returns customers whose phone starts with "017".

**Response 200**: Unchanged format (see Phase 0 contract). Anonymized customers (`anonymized_at IS NOT NULL`) remain excluded.

---

## Salon Closure — Conflict Warning

### POST /salon-closures (updated behaviour)

When saving a closure for a date that already has confirmed appointments, the backend returns:

**Response 409** (conflict warning — NOT a hard rejection):
```json
{
  "detail": "There are confirmed appointments on this date.",
  "code": "CLOSURE_CONFLICT_WARNING",
  "conflicting_appointment_count": 3,
  "requires_confirmation": true
}
```

To proceed, the client re-sends the request with `"force": true`:

```json
{
  "date": "2026-12-26",
  "reason": "Betriebsurlaub",
  "force": true
}
```

**Response 201**: Closure saved. Existing appointments are NOT auto-cancelled.
