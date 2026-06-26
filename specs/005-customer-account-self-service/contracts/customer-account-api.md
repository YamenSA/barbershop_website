# API Contract — Kundenkonto & Self-Service

Basis-Präfix: `/api/v1/account`. Auth über `customer_session`-Cookie (HttpOnly, JWT, `typ="customer"`). Alle Auth-Endpunkte rate-limitiert (`RATE_LIMIT_ACCOUNT_PER_MINUTE`). Fehlerformat wie bestehend: `{ "detail": "<CODE>" }`.

Legende: 🔓 = ohne Login · 🔒 = erfordert `customer_session`.

---

## Authentifizierung & Konto-Lebenszyklus

### 🔓 POST `/account/register` (US1)
Konto anlegen + Verifikations-Mail. **Immer generische Antwort** (keine Enumeration, FR-014).
- Body: `{ "name": str, "email": EmailStr, "phone": str | null, "password": str(min 10) }`
- 202: `{ "message": "Falls die Adresse gültig ist, wurde eine E-Mail gesendet." }`
- 422: `WEAK_PASSWORD` (Validator) / Body-Validierung
- Verhalten: existiert ein **verifiziertes** Konto → keine zweite Identität; optional Hinweis-Mail an die bestehende Adresse. Existiert ein Gast-`Customer` → Credentials anhängen, unverifiziert, Verifikations-Mail. Token: `purpose=email_verification`, +24 h.

### 🔓 POST `/account/verify/{token}` (US1)
E-Mail bestätigen → `email_verified_at` setzen, Login möglich. Token single-use.
- 200: `{ "verified": true }`
- 404 `TOKEN_NOT_FOUND` · 410 `TOKEN_USED` · 410 `TOKEN_EXPIRED`

### 🔓 POST `/account/login` (US1, FR-004)
- Body: `{ "email": EmailStr, "password": str, "remember_me": bool = false }`
- 200 + Set-Cookie `customer_session` (max-age 8 h, bzw. 30 Tage bei `remember_me`): `{ "id": UUID, "name": str, "email": str }`
- 401 `INVALID_CREDENTIALS` (generisch — auch bei unbekannter Email/falschem Passwort)
- 403 `EMAIL_NOT_VERIFIED` (unverifiziertes Konto)
- Failed-Attempt-Backoff (`compute_delay`) wie Phase 1.

### 🔒 POST `/account/logout`
- 200 + Cookie gelöscht: `{ "message": "ok" }`

### 🔒 GET `/account/me`
- 200: `{ "id": UUID, "name": str, "email": str, "phone": str | null }`
- 401 `NOT_AUTHENTICATED`

### 🔓 POST `/account/password/forgot` (FR-005, FR-014)
Reset anfordern. **Immer generische Antwort.**
- Body: `{ "email": EmailStr }`
- 202: `{ "message": "Falls ein Konto existiert, wurde eine E-Mail gesendet." }`
- Token: `purpose=password_reset`, +1 h, single-use; offene Reset-Token werden invalidiert.

### 🔓 POST `/account/password/reset/{token}` (FR-005)
- Body: `{ "password": str(min 10) }`
- 200: `{ "reset": true }`
- 404 `TOKEN_NOT_FOUND` · 410 `TOKEN_USED` · 410 `TOKEN_EXPIRED` · 422 `WEAK_PASSWORD`

---

## Termin-Self-Service

### 🔒 GET `/account/appointments` (US1, FR-006)
Eigene Termine, getrennt kommend/vergangen.
- 200: `{ "upcoming": AccountAppointment[], "past": AccountAppointment[] }`
- `AccountAppointment`: `{ "id": UUID, "service_name": str, "team_member_name": str, "starts_at": datetime, "ends_at": datetime, "status": str, "cancellable": bool, "reschedulable": bool }`
- `cancellable`/`reschedulable` = `status=confirmed` und `now < starts_at - CANCELLATION_CUTOFF_HOURS`.

### 🔒 POST `/account/appointments/{id}/cancel` (US2, FR-008)
Eigenen Termin stornieren (Slot frei).
- 200: aktualisierte `AccountAppointment`
- 404 `APPOINTMENT_NOT_FOUND` (fremd oder unbekannt — Cross-Account, FR-007)
- 410 `CANCELLATION_WINDOW_CLOSED` (Frist überschritten)
- 409 `INVALID_STATUS` (nicht `confirmed`)

### 🔒 POST `/account/appointments/{id}/reschedule` (US2, FR-009)
Atomare Umbuchung: neuer Slot wird verbindlich reserviert, bevor der alte freigegeben wird (eine Transaktion, Rollback bei Konflikt → Original bleibt).
- Body: `{ "starts_at": datetime, "team_member_id": UUID | null }`
- 200: neue `AccountAppointment`
- 404 `APPOINTMENT_NOT_FOUND` (Cross-Account)
- 410 `CANCELLATION_WINDOW_CLOSED` (Original außerhalb der Frist)
- 409 `BOOKING_CONFLICT` (neuer Slot belegt → Original unverändert, SC-003)
- 422 `BOOKING_TOO_SOON` / `BOOKING_TOO_FAR` / `INVALID_SLOT_TIME` (gleiche Guardrails wie Erstbuchung)
- Bestätigungs-Mail (`render_reschedule_confirmation`).

> Slot-Auswahl nutzt den bestehenden Public-Endpoint `GET /api/v1/public/booking/availability` (kein neuer Verfügbarkeits-Endpunkt nötig).

---

## Profil & DSGVO

### 🔒 PATCH `/account/profile` (US3, FR-010)
- Body: `{ "name": str | null, "phone": str | null }` (Email-Änderung nicht im MVP — Identität/Verifikationsanker)
- 200: aktualisiertes `me`-Objekt

### 🔒 GET `/account/export` (US3, FR-012)
DSGVO-Auskunft/Übertragbarkeit als JSON-Download.
- 200 `application/json`, `Content-Disposition: attachment`: `{ "profile": {…}, "appointments": AccountAppointment[], "exported_at": datetime }`

### 🔒 DELETE `/account` (US3, FR-011)
Selbst-Löschung: kommende `confirmed`-Termine zuerst stornieren (Slots frei) → Anonymisierung (`delete_customer`) → `hashed_password`/`email_verified_at` leeren → Token löschen → Cookie löschen.
- 204 (kein Inhalt); danach Login unmöglich.

---

## Fehler-Codes (Übersicht)

| Code | HTTP | Bedeutung |
|---|---|---|
| `NOT_AUTHENTICATED` | 401 | Kein/ungültiges `customer_session` |
| `INVALID_CREDENTIALS` | 401 | Login fehlgeschlagen (generisch) |
| `EMAIL_NOT_VERIFIED` | 403 | Login auf unverifiziertem Konto |
| `WEAK_PASSWORD` | 422 | < 10 Zeichen |
| `TOKEN_NOT_FOUND` | 404 | Verifikations-/Reset-Token unbekannt |
| `TOKEN_USED` / `TOKEN_EXPIRED` | 410 | Token verbraucht/abgelaufen |
| `APPOINTMENT_NOT_FOUND` | 404 | Unbekannt oder fremd (Cross-Account) |
| `CANCELLATION_WINDOW_CLOSED` | 410 | Storno-/Umbuchungsfrist überschritten |
| `BOOKING_CONFLICT` | 409 | Slot belegt (Original bleibt) |
| `INVALID_STATUS` | 409 | Aktion auf nicht-`confirmed`-Termin |
| `BOOKING_TOO_SOON`/`_TOO_FAR`/`INVALID_SLOT_TIME` | 422 | Guardrail-Verletzung |

Rate-Limit-Überschreitung: `429` (slowapi-Handler, bestehend).
