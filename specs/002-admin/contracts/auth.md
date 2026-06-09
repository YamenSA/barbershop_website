# API-Contract: Auth

**Branch**: `002-admin-stammdaten` | **Date**: 2026-06-09
**Base URL**: `/api/v1`
**Format**: JSON (Content-Type: application/json)

Auth endpoints are the only routes that do **not** require the `get_current_admin` dependency. All other `/api/v1/*` endpoints are protected — unauthenticated requests receive `401`.

---

## POST /auth/login

Authenticate admin and start a session.

**Request Body**:
```json
{
  "username": "admin",
  "password": "secret"
}
```

**Response 200** — sets `session` cookie (`httponly; secure; samesite=strict`; 8 h expiry):
```json
{
  "username": "admin"
}
```

**Response 401** — invalid credentials (generic message, never reveals which field is wrong; progressive delay applied before response):
```json
{
  "detail": "Invalid credentials.",
  "code": "AUTH_FAILED"
}
```

**Response 429** — IP rate limit exceeded (> 20 attempts / minute):
```json
{
  "detail": "Too many login attempts. Try again later.",
  "code": "RATE_LIMITED"
}
```

**Security behaviours**:
- Each failed attempt from a source IP increments a counter; delay before response = `min(2^(count-1), 30)` seconds.
- The `session` cookie is renewed (new expiry) on every authenticated request to implement the 8 h sliding window.

---

## POST /auth/logout

End the current session.

**Auth**: Requires valid session cookie.

**Response 200** — clears the `session` cookie:
```json
{ "detail": "Logged out." }
```

**Response 401** — if not authenticated:
```json
{
  "detail": "Not authenticated.",
  "code": "NOT_AUTHENTICATED"
}
```

---

## GET /auth/me

Return the currently authenticated admin's info.

**Auth**: Requires valid session cookie.

**Response 200**:
```json
{
  "username": "admin"
}
```

**Response 401**: Not authenticated (same format as above).

---

## Auth Error Format (all protected endpoints)

Any request to a protected endpoint without a valid session:

```json
{
  "detail": "Not authenticated.",
  "code": "NOT_AUTHENTICATED"
}
```

HTTP status: `401 Unauthorized`.
