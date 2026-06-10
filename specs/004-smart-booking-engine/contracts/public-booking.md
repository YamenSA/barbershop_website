# API Contract: Public Booking

**Branch**: `004-smart-booking-engine` | **Date**: 2026-06-10

Alle Endpoints sind **öffentlich** (keine Auth), unter Präfix `/api/v1/public/booking`, und schreibende Endpoints sind rate-limitiert (slowapi, `RATE_LIMIT_BOOKING_PER_MINUTE`). Bestehende öffentliche Stammdaten-Endpoints (`/api/v1/public/services`, `/team`, `/salon-hours`) liefern die Auswahllisten für Schritt 1–2 und werden **nicht** geändert. Der maßgebliche Contract ist das generierte `backend/openapi.json`; dieses Dokument ist die menschenlesbare Vorgabe.

---

## GET `/public/booking/availability`

Verfügbare Startzeiten für eine Dienstleistung an einem Tag (FR-001, FR-012, FR-013, FR-014).

**Query**: `service_id` (UUID, req), `target_date` (date, req), `team_member_id` (UUID | `"any"`, req).

**200 OK**:
```json
{
  "date": "2026-06-16",
  "service_id": "…",
  "slots": [
    { "starts_at": "2026-06-16T14:00:00Z", "ends_at": "2026-06-16T14:45:00Z",
      "team_member_id": "…" }
  ]
}
```
- Slots außerhalb `[now+2h, now+60d]` werden serverseitig ausgeblendet.
- Bei `team_member_id="any"`: `team_member_id` je Slot = konkret zuweisbarer Stylist.
- Leere `slots`-Liste, wenn kein Slot frei (geschlossen, ausgebucht, Tages-Override) — kein Fehler.

## POST `/public/booking/appointments`

Gast-Buchung anlegen, sofort bestätigt (FR-002, FR-003, FR-016). Rate-limitiert.

**Body** (`PublicAppointmentCreate`):
```json
{
  "service_id": "…",
  "team_member_id": "… | any",
  "starts_at": "2026-06-16T14:00:00Z",
  "customer": { "name": "Max M.", "email": "max@example.com", "phone": null },
  "privacy_acknowledged": true
}
```
Pflicht: `service_id`, `team_member_id`, `starts_at`, `customer.name`, `customer.email`, `privacy_acknowledged=true` (FR-009, FR-010). `phone` optional.

**201 Created** (`PublicAppointmentRead`):
```json
{
  "id": "…", "service_id": "…", "team_member_id": "…",
  "starts_at": "2026-06-16T14:00:00Z", "ends_at": "2026-06-16T14:45:00Z",
  "status": "confirmed",
  "cancellation_token": "…",
  "payment_note": "Zahlung bar vor Ort"
}
```
- Löst E-Mail-Bestätigung asynchron aus (FR-005); Token in der E-Mail enthält den Storno-Link.

**Fehler**:
| Code | Bedeutung |
|---|---|
| `409 BOOKING_CONFLICT` | Slot inzwischen vergeben (DB-`EXCLUDE`-Verletzung, US1 Szenario 4) |
| `422` | Außerhalb Öffnungs-/Arbeitszeit, kein Raster-Treffer, außerhalb Buchungsfenster, Pflichtfeld fehlt, `privacy_acknowledged != true` |
| `404` | Dienstleistung/Stylist nicht gefunden |
| `429` | Rate-Limit überschritten |

## GET `/public/booking/cancel/{token}`

Schreibgeschützte Ansicht eines Termins für die Storno-Seite (US3 Szenario 3, idempotent).

**200 OK** (`CancellationView`):
```json
{
  "starts_at": "2026-06-16T14:00:00Z",
  "service_name": "Herrenhaarschnitt",
  "team_member_name": "Sara",
  "status": "confirmed",
  "cancellable": true,
  "cancellation_deadline": "2026-06-15T14:00:00Z"
}
```
- `cancellable=false`, wenn bereits `cancelled` oder Frist überschritten.
- `404`, wenn Token unbekannt.

## POST `/public/booking/cancel/{token}`

Termin stornieren (FR-008, US3). Rate-limitiert.

**200 OK**: `CancellationView` mit `status: "cancelled"`, Slot ist wieder buchbar.

**Fehler**:
| Code | Bedeutung |
|---|---|
| `404` | Token unbekannt |
| `409 ALREADY_CANCELLED` | Termin war bereits storniert (idempotente Ansicht, keine Änderung) |
| `410 CANCELLATION_WINDOW_CLOSED` | Frist (24 h) überschritten → Hinweis auf telefonischen Kontakt |
| `429` | Rate-Limit überschritten |

---

## Nicht in diesem Contract (bewusst)

- **Umbuchung/Verschieben** — Phase 4 (Clarify-Entscheidung Q2).
- **SMS** — kein Kanal im MVP (Clarify-Entscheidung Q1).
- **Admin-Endpoints** — bestehen bereits (`booking/router.py`, `admin_router.py`); Online-Buchungen erscheinen dort automatisch (FR-016) und benötigen keine neue Route.
