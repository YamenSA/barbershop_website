# Phase 1 Data Model: Smart Booking Engine

**Branch**: `004-smart-booking-engine` | **Date**: 2026-06-10

Baut auf den Phase-1-Entitäten der Domäne `booking` auf (`appointments`, `customers`). Änderungen sind **additiv** und rückwärtskompatibel; bestehende Constraints (`customer_id` XOR Gast-Felder, `ends_after_starts`, `EXCLUDE USING GIST no_overlapping_confirmed_appointments`) bleiben unverändert gültig.

---

## 1. Appointment (erweitert)

Tabelle `appointments` — neue Felder:

| Feld | Typ | Constraints | Zweck |
|---|---|---|---|
| `cancellation_token` | str (URL-safe, ~43 Zeichen) | `nullable=True`, `unique=True`, indexiert | Kontolose Stornierung (US3); via `secrets.token_urlsafe(32)`. Null für reine Walk-ins. |
| `origin` | enum `AppointmentOrigin` (`online`, `walk_in`) | `nullable=False`, default `walk_in` | Herkunfts-Unterscheidung (Spec Key Entity). Online-Buchungen = `online`. |

**Bestehende Felder** (unverändert): `id`, `team_member_id` (FK), `service_id` (FK), `customer_id` (FK, optional), `guest_name`, `guest_phone`, `starts_at` (tz), `ends_at` (tz, abgeleitet aus `service.duration_minutes`), `status`, `notes`, Timestamps.

**Status-Lebenszyklus** (`AppointmentStatus`, bereits vorhanden — erfüllt FR-017):

```text
confirmed ──► cancelled      (Kunde via Token ODER Admin)
confirmed ──► completed      (Admin nach Termin)
confirmed ──► no_show        (Admin, No-Show-Auswertung → SC-006)
```

- Online-Buchung startet direkt in `confirmed` (FR-016, keine Admin-Freigabe).
- Storno nur erlaubt aus `confirmed` und solange `starts_at > now + CANCELLATION_CUTOFF_HOURS` (FR-008).

**Validierungs-/Geschäftsregeln (Service-Ebene)**:
- `starts_at` auf 15-min-Raster (FR-013).
- `now + 2h ≤ starts_at ≤ now + 60 Tage` (FR-012).
- `[starts_at, ends_at)` vollständig in Schnittmenge Salon-Öffnung ∩ Stylist-Zeitplan, frei von Belegung/Exceptions (FR-001, via `availability.get_available_slots`).
- Doppelbuchung: DB-`EXCLUDE`-Constraint maßgeblich; `IntegrityError` → `409` (FR-003).
- Online-Buchung: `origin="online"`, `customer_id` gesetzt, Gast-Felder null.

## 2. Customer (unverändert, neue Nutzung)

Tabelle `customers` — Schema unverändert. Neue Verwendung im Public-Flow:

- Online-Buchung sucht per `email` einen bestehenden, nicht anonymisierten `Customer`; sonst neu anlegen (Name + E-Mail Pflicht, `phone` optional — FR-009).
- `last_active_at` wird bei Buchung gesetzt/aktualisiert → steuert Retention (FR-011).
- Vorbereitung Phase 4: stabiler, später mit Konto verknüpfbarer Eintrag.

## 3. NotificationLog (neu)

Neue Tabelle `notification_logs` — Versand-Nachweis & Idempotenz für Bestätigung/Erinnerung.

| Feld | Typ | Constraints | Zweck |
|---|---|---|---|
| `id` | UUID | PK | |
| `appointment_id` | UUID | FK → `appointments.id`, indexiert | Bezug zum Termin |
| `kind` | enum `NotificationKind` (`confirmation`, `reminder`) | `nullable=False` | Art der Nachricht |
| `channel` | enum `NotificationChannel` (`email`) | `nullable=False`, default `email` | nur E-Mail im MVP; erweiterbar |
| `status` | enum `NotificationStatus` (`pending`, `sent`, `failed`) | `nullable=False`, default `pending` | Versandstatus (Admin-Sichtbarkeit, Edge Case) |
| `recipient` | str | `nullable=False` | Ziel-E-Mail (Schnappschuss) |
| `error` | str | `nullable=True` | Fehlertext bei `failed` |
| `sent_at` | datetime (tz) | `nullable=True` | Zeitpunkt erfolgreicher Zustellung |
| Timestamps | | | `created_at`, `updated_at` |

**Eindeutigkeit / Idempotenz**: höchstens eine `sent`/`pending`-Zeile je (`appointment_id`, `kind`). Der Reminder-Job prüft auf Existenz, bevor er sendet (R3) → keine Doppel-Erinnerung.

**Beziehungen**: `NotificationLog` *N → 1* `Appointment`.

---

## Entity-Relationship (Kurzform)

```text
Customer 1 ──< Appointment >── 1 Service        (Stammdaten Phase 1)
                   │   │
                   │   └── 1 TeamMember          (Stammdaten Phase 1)
                   │
                   └──< NotificationLog          (neu, Phase 3)
```

## Konfiguration (neue Settings)

| Setting | Default | Bezug |
|---|---|---|
| `SENDGRID_API_KEY` | — (ENV) | R2 |
| `EMAIL_FROM` | — (ENV) | R2 |
| `PUBLIC_BASE_URL` | — (ENV) | Storno-Link in E-Mail (R4) |
| `BOOKING_MIN_LEAD_HOURS` | 2 | FR-012 |
| `BOOKING_MAX_HORIZON_DAYS` | 60 | FR-012 |
| `REMINDER_LEAD_HOURS` | 24 | FR-007 |
| `REMINDER_SCAN_INTERVAL_HOURS` | 1 | FR-007 (nur Cron-Kadenz, nicht korrektheitsrelevant) |
| `CANCELLATION_CUTOFF_HOURS` | 24 | FR-008 |
| `RATE_LIMIT_BOOKING_PER_MINUTE` | 10 | Konstitution XI |

## Migration

`009_phase3_booking_notifications.py`:
1. `ALTER TABLE appointments ADD COLUMN cancellation_token` (+ unique index).
2. `ALTER TABLE appointments ADD COLUMN origin` (enum, default `walk_in`, NOT NULL).
3. `CREATE TABLE notification_logs` (+ FK, + Index auf `appointment_id`).
4. Constraint `no_overlapping_confirmed_appointments` von `tsrange` auf `tstzrange(starts_at, ends_at, '[)')` umstellen — `team_member_id WITH =` und `WHERE (status='confirmed')` exakt erhalten, `btree_gist` aktiv (immutable/korrekt für timestamptz — D1). Vor Deploy gegen Echtdaten-Kopie testen; Scheitern = realer Doppelbuchungs-Fund.
5. Partieller Unique-Index `uq_reminder_sent` auf `notification_logs (appointment_id) WHERE kind='reminder' AND status='sent'` (DB-seitige Reminder-Idempotenz — A1).
