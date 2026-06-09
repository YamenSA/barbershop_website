# Research: Admin & Stammdaten (Phase 1)

**Branch**: `002-admin-stammdaten` | **Date**: 2026-06-09

All decisions resolve unknowns from the Technical Context. No open NEEDS CLARIFICATION items remain.

---

## Decision 1: Auth Mechanism — JWT in httponly Cookie

**Decision**: JWT access token stored in an `httponly; secure; samesite=strict` cookie, issued by FastAPI on login, validated via FastAPI dependency `get_current_admin`.

**Rationale**: httponly cookies are immune to XSS (no JavaScript access), samesite=strict prevents CSRF. A Next.js frontend calling a FastAPI backend on the same origin can read cookie responses transparently. No client-side token storage needed. The 8 h expiry (sliding via cookie refresh on each request) matches the clarified session lifetime without requiring a separate refresh-token flow for a single-admin use case.

**Alternatives considered**:
- *localStorage JWT*: Simple to implement but vulnerable to XSS — rejected.
- *Server-side sessions (Redis)*: More stateful complexity; overkill for a single-admin, single-server setup — rejected.
- *NextAuth.js*: Appropriate for multi-provider OAuth; unnecessary complexity for a simple username/password admin — rejected.

---

## Decision 2: Progressive Login Delay — In-Memory Per-IP Counter

**Decision**: Track failed login attempts per source IP in a module-level `dict` (or TTLCache via `cachetools`). On each failure increment count; compute delay = `min(2^(count-1), 30)` seconds. Apply via `asyncio.sleep` before returning the 401 response. `slowapi` enforces a hard cap of 20 requests/minute per IP on the login endpoint as an outer layer.

**Rationale**: Per clarification — progressive delay capped at 30 s, no hard account lockout (single-admin DoS risk). In-memory dict is sufficient at single-server scale; no Redis dependency needed. Generic 401 error message regardless of whether username or password is wrong.

**Alternatives considered**:
- *Hard account lockout*: Rejected by clarification — single admin could be locked out by an attacker.
- *Redis-backed counters*: Required for multi-server deployments; not needed at this scale.
- *CAPTCHA*: External dependency, requires DSGVO AV-Vertrag consideration — rejected for Phase 1.

---

## Decision 3: PDF Generation — fpdf2

**Decision**: Use `fpdf2` (pure-Python, no external renderer) to generate the daily schedule PDF on-demand as a simple table (time, service, stylist, customer name; notes column optional).

**Rationale**: The daily plan is a simple tabular document. `fpdf2` produces it with minimal memory footprint, no external binary dependencies (unlike WeasyPrint which requires Cairo/Pango), and no server-side file system writes needed. Streamed directly as `StreamingResponse` with `Content-Disposition: attachment; filename="tagesplan-YYYY-MM-DD.pdf"`.

**Alternatives considered**:
- *WeasyPrint*: HTML-to-PDF with full CSS support; overkill for a table; heavy native dependencies — rejected.
- *reportlab*: More mature and capable, but significantly more verbose API for simple tables — rejected.
- *Puppeteer (Node)*: Server-side headless Chrome; cross-language complexity, heavy — rejected.

---

## Decision 4: Calendar Frontend Component — FullCalendar React

**Decision**: Use `@fullcalendar/react` with `@fullcalendar/timegrid` (day/week views) and `@fullcalendar/interaction` (click to create, drag to reschedule).

**Rationale**: FullCalendar is the industry-standard React calendar for scheduling UIs; it natively supports time-grid (vertical slot) views, resource filtering (per stylist via `@fullcalendar/resource-timegrid`), event drag-and-drop, and click-to-add. Eliminates significant custom positioning logic.

**Alternatives considered**:
- *react-big-calendar*: Less actively maintained; resource view requires more custom work — rejected.
- *Custom-built*: Significant time investment for drag-and-drop and multi-resource layout — rejected.

---

## Decision 5: DayOverride — New Entity (Not WorkingException Extension)

**Decision**: Introduce a new `DayOverride` entity with fields `date` (DATE), `override_type` (ENUM: `day_off` | `extra_hours`), optional `custom_start_time`/`custom_end_time` for `extra_hours`, and `reason`.

**Rationale**: `WorkingException` in Phase 0 models time-range blockers (vacations, multi-day sick leave as TIMESTAMPTZ ranges). Phase 1's "Tages-Überschreibung" is semantically different: it is a day-level typed override (the stylist is off TODAY / works extra TODAY). Merging these concepts into one entity would require nullable unions and type-dependent validation. A clean separate entity is clearer and keeps the availability engine logic readable.

Availability formula with DayOverride:
```
effective_hours[day] =
  if DayOverride.type == 'day_off'  → empty (stylist unavailable all day)
  if DayOverride.type == 'extra_hours' → DayOverride.custom_start/end_time
  else → WorkingHours[day_of_week]  (standard schedule)
then intersect with SalonHours[day_of_week]
then subtract confirmed Appointments
```

**Alternatives considered**:
- *Extend WorkingException with exception_type*: Would require nullable custom_start/end_time and complex validation depending on type; pollutes Phase 0 model — rejected.
- *Single-field override (just mark day as off)*: Not expressive enough for extra_hours scenario — rejected.

---

## Decision 6: Admin-Override Flag on Appointment Creation

**Decision**: Add `admin_override: bool = False` to `POST /appointments` request body. When `True` (admin-only, requires `get_current_admin`), the service layer skips the working-schedule intersection check but still enforces the EXCLUDE double-booking constraint.

**Rationale**: Per spec — admin knows who is physically present; walk-ins outside the formal schedule are valid. The EXCLUDE constraint at the database level remains the hard stop regardless of any flag.

**Alternatives considered**:
- *Separate admin endpoint `POST /admin/appointments`*: Duplicate endpoint with minor flag difference; splits booking logic — rejected.
- *No override at all*: Would prevent legitimate walk-ins where a stylist comes in ad-hoc — rejected per spec.

---

## Decision 7: Customer Search — Prefix Match on Name + Phone

**Decision**: Update `GET /customers?search=<query>` to match against `name` (case-insensitive prefix) OR `phone` (prefix). Implemented via `ILIKE 'query%'` on `name` and `LIKE 'query%'` on `phone` in the service layer.

**Rationale**: Per clarification — admin looks up customers by name or phone number during appointment creation. Prefix search is efficient with a B-tree index on both columns; no full-text index needed at this scale.

**Alternatives considered**:
- *Full-text search (pg_trgm)*: More powerful but requires additional PostgreSQL extension and setup — overkill for ~5,000 customers.
- *Exact phone match only*: Too strict; partial recall is useless for real-world lookup — rejected.
