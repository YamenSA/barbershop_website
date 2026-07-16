# Quickstart & Validation: Smart Booking Engine

**Branch**: `004-smart-booking-engine` | **Date**: 2026-06-10

Validierungsleitfaden für den öffentlichen Buchungs-Flow. Setzt das in `CLAUDE.md` beschriebene Backend-Setup voraus. Implementierungsdetails stehen in [data-model.md](./data-model.md) und [contracts/public-booking.md](./contracts/public-booking.md).

## Voraussetzungen

- Backend-Setup (venv, `pip install -e ".[dev]"`) und DB-Container laufen — siehe `CLAUDE.md`.
- Neue ENV-Werte in `backend/.env` (siehe [data-model.md](./data-model.md) → Konfiguration): `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO`, `PUBLIC_BASE_URL` sowie optional die Guardrail-/Rate-Limit-Settings (sonst greifen Defaults). Ohne `BREVO_API_KEY` läuft der E-Mail-Adapter (Brevo, HTTP-API via httpx) im Konsolen-Fallback.
- Migration anwenden: `alembic upgrade head` (bringt `009_phase3_booking_notifications`).
- Seed-Stammdaten (Dienstleistungen, Team, Öffnungszeiten, Arbeitszeiten) aus Phase 1 vorhanden.

## Setup

```sh
cd backend
alembic upgrade head
uvicorn app.main:app --reload      # API auf :8000
# in zweitem Terminal:
cd frontend && npm run dev         # Web auf :3000
```

## Validierungsszenarien

### US1 — Öffentlich buchen + Bestätigung (P1)

1. Web: `http://localhost:3000/termin` öffnen → Dienstleistung → Stylist (oder „beliebiger Stylist") → Tag → freien Slot wählen.
2. Kontaktdaten (Name, E-Mail; Telefon optional), Datenschutz-Hinweis bestätigen, absenden.
3. **Erwartet**: Bestätigungsseite mit Datum, Uhrzeit, Stylist, Dienstleistung, „Zahlung bar vor Ort" und Storno-Link; `201` mit `cancellation_token`.
4. **Erwartet**: Bestätigungs-E-Mail wird ausgelöst (im Dev-Fallback in der Server-Konsole sichtbar); `notification_logs`-Zeile `kind=confirmation, status=sent`.
5. Im Admin-Kalender (`/admin/calendar`) erscheint der Termin als `confirmed` mit `origin=online` (FR-016).
6. Derselbe Slot ist über `GET /public/booking/availability` nicht mehr in `slots` enthalten.

Negativprüfungen:
- **Walk-in-Kollision** (US1 Sz. 2): Admin trägt Walk-in ein → der Slot fehlt in der Public-Verfügbarkeit.
- **Dauer-Überhang** (US1 Sz. 5): 45-min-Dienstleistung nahe Schließzeit bietet keine zu späte Startzeit an.
- **Concurrency** (US1 Sz. 4): zwei gleichzeitige `POST` auf denselben letzten Slot → genau ein `201`, der andere `409 BOOKING_CONFLICT`.
- **Guardrails**: `starts_at` < jetzt+2 h oder > jetzt+60 Tage → `422`.

### US2 — Erinnerung (P2)

1. Bestätigten Termin anlegen, dessen Start in ~24 h liegt.
2. Reminder-Job ausführen: `python scripts/run_reminders.py`.
3. **Erwartet**: genau eine `reminder`-E-Mail; `notification_logs`-Zeile `kind=reminder, status=sent`.
4. Job erneut ausführen → **keine** zweite Erinnerung (Idempotenz).
5. Termin stornieren, Job ausführen → **keine** Erinnerung (US2 Sz. 2).

### US3 — Storno ohne Konto (P3)

1. Storno-Link aus der Bestätigung öffnen: `http://localhost:3000/termin/stornieren/<token>`.
2. **Erwartet**: Termindetails + „Stornieren"-Aktion (`GET /public/booking/cancel/{token}`, `cancellable=true`).
3. Stornieren → `200`, Status `cancelled`; der Slot ist in der Verfügbarkeit wieder buchbar.
4. Link erneut öffnen → zeigt `cancelled` an, keine erneute Änderung (idempotent, US3 Sz. 3).
5. Bei einem Termin < 24 h vor Start: Storno → `410 CANCELLATION_WINDOW_CLOSED` mit Telefon-Hinweis (US3 Sz. 2).

### FR-011 — Retention (DSGVO-Löschpflicht, verpflichtend)

1. Online-Kunden mit zurückdatiertem `last_active_at` (> `RETENTION_CUSTOMER_MONTHS`) anlegen.
2. `python scripts/run_retention.py` ausführen.
3. **Erwartet**: der Online-Kunde wird anonymisiert (`anonymized_at` gesetzt, Name/E-Mail/Telefon ersetzt) — Online-Buchungen unterliegen derselben Löschregel wie Gast-/Walk-in-Daten. Ohne diesen Nachweis bleiben Online-Kunden dauerhaft in der DB.

## Automatisierte Tests

```sh
cd backend && pytest -v \
  tests/integration/test_public_booking.py \
  tests/unit/test_notifications.py
```
Abdeckung (Konstitution IX): Slot-Berechnung inkl. „beliebiger Stylist", Buchungs-Integrität/Concurrency (App-Ebene unter SQLite), Token-Storno inkl. Frist & Idempotenz, Reminder-Auswahl & Idempotenz, Guardrails.

## Erfolgskriterien-Bezug

| Check | Success Criterion |
|---|---|
| Flow Start→Bestätigung zügig abschließbar | SC-001 (< 2 min) |
| Keine kollidierenden Termine (Concurrency-Test grün) | SC-002 |
| Bestätigung zeitnah ausgelöst | SC-003 (< 5 min) |
| Reminder reduziert No-Shows (Betriebsmessung) | SC-006 (< 10 %) |
