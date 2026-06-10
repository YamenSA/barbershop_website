---
description: "Task list for Smart Booking Engine implementation"
---

# Tasks: Smart Booking Engine

**Input**: Design documents from `/specs/004-smart-booking-engine/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/public-booking.md, quickstart.md

**Tests**: INCLUDED — Konstitution IX verlangt automatisierte Tests für die kritischen Pfade (Slot-Berechnung, Buchungs-Integrität, Storno, Retention/Reminder). Test-zuerst, wo sinnvoll.

**Organization**: Tasks sind nach User Story gruppiert; jede Story ist unabhängig implementier- und testbar.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallel ausführbar (andere Datei, keine offene Abhängigkeit)
- **[Story]**: US1 / US2 / US3 (aus spec.md)
- Pfade sind relativ zum Repo-Root.

## Path Conventions

Web-App: Backend unter `backend/app/...`, Tests unter `backend/tests/...`, Frontend unter `frontend/src/...` (bestehende Struktur).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Abhängigkeiten und Konfiguration für die neuen Public-/Notification-Funktionen.

- [ ] T001 [P] `sendgrid` als Abhängigkeit in `backend/pyproject.toml` ergänzen (dependencies)
- [ ] T002 [P] Neue Settings in `backend/app/core/config.py` ergänzen (`SENDGRID_API_KEY`, `EMAIL_FROM`, `PUBLIC_BASE_URL`, `BOOKING_MIN_LEAD_HOURS=2`, `BOOKING_MAX_HORIZON_DAYS=60`, `REMINDER_LEAD_HOURS=24`, `REMINDER_SCAN_INTERVAL_HOURS=1` (nur Cron-Kadenz/Doku, nicht korrektheitsrelevant — s. T024), `CANCELLATION_CUTOFF_HOURS=24`, `RATE_LIMIT_BOOKING_PER_MINUTE=10`) und `backend/.env.example` anlegen/aktualisieren
- [ ] T003 [P] Verzeichnisse anlegen: `frontend/src/app/(public)/termin/` und `frontend/src/components/public/booking/` (Platzhalter), `backend/app/domains/notifications/` (Domänen-Paket mit `__init__.py`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Datenmodell, Migration, Notification-Basis und Public-Router-Gerüst, auf denen ALLE Stories aufbauen.

**⚠️ CRITICAL**: Keine User-Story-Arbeit beginnt, bevor diese Phase abgeschlossen ist.

- [ ] T004 Alembic-Migration `backend/alembic/versions/009_phase3_booking_notifications.py` erstellen:
  (a) Spalten `cancellation_token` (unique index) und `origin` (enum, default `walk_in`, NOT NULL) auf `appointments`;
  (b) Tabelle `notification_logs` mit FK + Index auf `appointment_id`;
  (c) **D1-Fix**: bestehende Constraint `no_overlapping_confirmed_appointments` droppen und neu anlegen mit `tstzrange(starts_at, ends_at, '[)')` statt `tsrange(...)`. Dabei `team_member_id WITH =`, das partielle Prädikat `WHERE (status = 'confirmed')` und `'[)'` exakt erhalten; sicherstellen, dass `btree_gist` aktiv ist (Migration 001). `tstzrange` ist immutable/korrekt für die `timestamptz`-Spalten aus Migration 007;
  (d) **A1-Idempotenz**: partieller Unique-Index `uq_reminder_sent` auf `notification_logs (appointment_id)` WHERE `kind='reminder' AND status='sent'`.
  Vorbild: bestehende 005/008-Migrationen (Downgrade stellt den alten Zustand wieder her). **Vor Deploy gegen eine Kopie etwaiger Echtdaten laufen lassen** — scheitert (c) an bestehenden Überlappungen, ist das ein echter Doppelbuchungs-Fund (manuell bereinigen), kein Migrationsfehler.
- [ ] T005 [P] `Appointment` um `cancellation_token` + `origin` und neues `AppointmentOrigin`-Enum (`online`, `walk_in`) erweitern in `backend/app/domains/booking/models.py`
- [ ] T006 [P] `NotificationLog`-Model + Enums (`NotificationKind`, `NotificationChannel`, `NotificationStatus`) erstellen in `backend/app/domains/notifications/models.py`
- [ ] T007 [P] SendGrid-Adapter mit Konsolen-Fallback (ohne API-Key) erstellen in `backend/app/domains/notifications/email.py`
- [ ] T008 [P] Deutsche E-Mail-Templates (Bestätigung mit Termindetails + „Zahlung bar vor Ort" + Storno-Link aus `PUBLIC_BASE_URL`; Erinnerung) erstellen in `backend/app/domains/notifications/templates.py`
- [ ] T009 `NotificationService`-Basis (Versand → `email.py`, Persistenz/Statuspflege in `notification_logs`, Idempotenz-Helfer `has_sent(appointment_id, kind)`) erstellen in `backend/app/domains/notifications/service.py` (depends on T006, T007, T008)
- [ ] T010 Public-Router-Gerüst `backend/app/domains/booking/public_router.py` anlegen und in `backend/app/main.py` unter `/api/v1/public/booking` registrieren; slowapi-Limiter für Buchungs-/Storno-Endpoints verdrahten
- [ ] T011 [P] TS-Typen ergänzen (`PublicAppointmentCreate`, `PublicAppointmentRead`, `PublicSlot`, `AvailabilityResponse`, `CancellationView`) in `frontend/src/lib/types.ts`
- [ ] T012 [P] API-Client-Funktionen ergänzen (`getPublicAvailability`, `createPublicAppointment`, `getCancellation`, `cancelAppointment`) in `frontend/src/lib/api.ts`

**Checkpoint**: Modelle, Migration, Notification-Basis und Router-Gerüst stehen — Stories können beginnen.

---

## Phase 3: User Story 1 — Termin online buchen und Bestätigung erhalten (Priority: P1) 🎯 MVP

**Goal**: Gast wählt Dienstleistung → Stylist (oder „beliebiger Stylist") → Zeit → Kontaktdaten und erhält eine sofort bestätigte Buchung plus Bestätigungs-E-Mail; der Slot ist danach belegt.

**Independent Test**: Ohne Konto eine Dienstleistung wählen, freien Slot buchen, `201` + Bestätigung erhalten; Slot fehlt danach in der Verfügbarkeit und erscheint im Admin-Kalender (`origin=online`).

### Tests for User Story 1 ⚠️ (zuerst schreiben, müssen fehlschlagen)

- [ ] T013 [US1] Integrationstest `backend/tests/integration/test_public_booking.py` (SQLite, App-Ebene): Happy-Path-Buchung + Slot danach nicht mehr verfügbar (US1 Sz. 1), Walk-in-Kollision blendet Slot aus (Sz. 2), Dauer-Überhang an Schließzeit (Sz. 5), App-seitiger Overlap-Vorabcheck → `409` (Sz. 4), Guardrails 2 h/60 Tage → `422`, Pflichtfeld/`privacy_acknowledged` fehlt → `422`
- [ ] T013a [US1] **Postgres-verifizierter** Integritätstest `backend/tests/integration/test_booking_constraint_pg.py`: läuft gegen echtes Postgres (`DATABASE_URL` → `docker compose up -d db`), per pytest-Marker `@pytest.mark.postgres` von der SQLite-Suite getrennt. Prüft empirisch, dass die `tstzrange`-EXCLUDE-Constraint zwei überlappende `confirmed`-Termine desselben Stylisten abweist (`IntegrityError` → `409`) — SQLite kann GIST/EXCLUDE nicht abbilden, daher MUSS dieser Test gegen Postgres laufen. Garantie für FR-003/SC-002. **Gate: muss grün sein, bevor auf die Doppelbuchungs-Garantie vertraut wird.** (depends on T004)

### Implementation for User Story 1

- [ ] T014 [P] [US1] Public-Schemas (`PublicAppointmentCreate` inkl. `customer`+`privacy_acknowledged`, `PublicAppointmentRead` inkl. `cancellation_token`+`payment_note`, `PublicSlot`, `AvailabilityResponse`) in `backend/app/domains/booking/schemas.py`
- [ ] T015 [US1] `availability.py` erweitern: „beliebiger Stylist" (Mehr-Member-Auflösung, Slot→konkretes `team_member_id`) und serverseitige Ausblendung außerhalb `[now+2h, now+60d]` in `backend/app/domains/booking/availability.py`
- [ ] T016 [US1] `create_public_appointment` in `backend/app/domains/booking/service.py`: Customer-Upsert per E-Mail (`last_active_at` setzen), Guardrails (2 h/60 Tage + 15-min-Raster), Any-Stylist-Auflösung auf konkretes Mitglied, `origin=online`, Token via `secrets.token_urlsafe(32)`, `IntegrityError` → `409 BOOKING_CONFLICT` (depends on T014, T015)
- [ ] T017 [US1] `NotificationService.send_confirmation(appointment)` (Template rendern, versenden, `notification_logs` schreiben) in `backend/app/domains/notifications/service.py`
- [ ] T018 [US1] Endpoints verdrahten: `GET /public/booking/availability` und `POST /public/booking/appointments` (rate-limitiert, Bestätigung via `BackgroundTasks`) in `backend/app/domains/booking/public_router.py` (depends on T016, T017)
- [ ] T019 [P] [US1] Buchungs-UI-Komponenten (ServicePicker, StylistPicker inkl. „beliebiger Stylist", SlotPicker, ContactForm mit Datenschutz-Hinweis/Checkbox, Confirmation) in `frontend/src/components/public/booking/`
- [ ] T020 [US1] Buchungs-Flow-Seite/Stepper (Dienstleistung→Stylist→Zeit→Kontakt→Bestätigung) in `frontend/src/app/(public)/termin/page.tsx` (depends on T019, T011, T012)
- [ ] T021 [US1] Einstiegs-CTA „Termin buchen" auf Startseite und Dienstleistungs-Seite verlinken in `frontend/src/app/page.tsx` und `frontend/src/app/(public)/dienstleistungen/page.tsx`

**Checkpoint**: US1 ist eigenständig lauffähig und testbar — MVP erreicht.

---

## Phase 4: User Story 2 — Erinnerung vor dem Termin (Priority: P2)

**Goal**: 24 h vor dem Termin wird automatisch eine Erinnerungs-E-Mail ausgelöst; stornierte Termine erhalten keine.

**Independent Test**: Buchung mit Start in ~24 h anlegen, `run_reminders.py` ausführen → genau eine Erinnerung; erneuter Lauf → keine zweite; stornierte Buchung → keine Erinnerung.

### Tests for User Story 2 ⚠️

- [ ] T022 [P] [US2] Unit-Test `backend/tests/unit/test_notifications.py`: Reminder-Auswahl im 24-h-Fenster, Idempotenz (kein Doppelversand bei mehreren Läufen), Überspringen stornierter Termine (US2 Sz. 2), Entfall bei Buchung < 24 h vorher (Sz. 3)

### Implementation for User Story 2

- [ ] T023 [US2] `NotificationService.send_reminder(appointment)` (Reminder-Template, Versand, Log) in `backend/app/domains/notifications/service.py`
- [ ] T024 [US2] `run_reminder_job(session)` in `backend/app/domains/notifications/reminders.py`: **alle** bestätigten, noch nicht erinnerten Termine mit Start in `(now, now+REMINDER_LEAD_HOURS]` selektieren (keine untere `−Δ`-Grenze — sonst erhielten knapp gebuchte Termine nie eine Erinnerung; ein verpasster Cron-Lauf heilt sich beim nächsten selbst); stornierte ausschließen; optional Last-Minute-Marge `start > now + 30 min`. Doppelversand verhindert der Sent-Marker: (1) App-Check `has_sent(appointment_id, reminder)`, (2) DB-seitig der partielle Unique-Index `uq_reminder_sent` — `IntegrityError` beim Schreiben des `sent`-Logs wird als „bereits gesendet" geschluckt. `REMINDER_SCAN_INTERVAL_HOURS` ist nur die Cron-Kadenz und nicht korrektheitsrelevant. (depends on T023)
- [ ] T025 [US2] CLI-Runner `backend/scripts/run_reminders.py` analog `backend/scripts/run_retention.py` (depends on T024)

**Checkpoint**: US1 und US2 funktionieren unabhängig.

---

## Phase 5: User Story 3 — Termin selbst stornieren ohne Konto (Priority: P3)

**Goal**: Kunde storniert über tokenisierten Link (kein Konto) bis 24 h vorher; Slot wird wieder frei. Umbuchung nicht enthalten (Phase 4).

**Independent Test**: Storno-Link aus der Bestätigung aufrufen, stornieren → Slot wieder buchbar; erneuter Aufruf zeigt `cancelled` (idempotent); < 24 h vorher → `410` mit Telefon-Hinweis.

### Tests for User Story 3 ⚠️

- [ ] T026 [P] [US3] Integrationstest `backend/tests/integration/test_public_cancellation.py`: Storno erfolgreich + Slot wieder verfügbar (Sz. 1), Frist überschritten → `410` (Sz. 2), erneuter Aufruf idempotent zeigt `cancelled` (Sz. 3), unbekannter Token → `404`

### Implementation for User Story 3

- [ ] T027 [P] [US3] `CancellationView`-Schema (Termindetails, `cancellable`, `cancellation_deadline`) in `backend/app/domains/booking/schemas.py`
- [ ] T028 [US3] `get_cancellation_view(token)` und `cancel_by_token(token)` in `backend/app/domains/booking/service.py`: Status-Guard (nur `confirmed`), 24-h-Cutoff, Token-Lookup; Fehler `404`/`409 ALREADY_CANCELLED`/`410 CANCELLATION_WINDOW_CLOSED`
- [ ] T029 [US3] Endpoints `GET` + `POST /public/booking/cancel/{token}` (rate-limitiert) verdrahten in `backend/app/domains/booking/public_router.py` (depends on T027, T028)
- [ ] T030 [P] [US3] Storno-Seite + CancelCard in `frontend/src/app/(public)/termin/stornieren/[token]/page.tsx` und `frontend/src/components/public/booking/`
- [ ] T031 [US3] Sicherstellen, dass der Storno-Link in der Bestätigungs-E-Mail auf `/(public)/termin/stornieren/{token}` zeigt (Template aus T008 prüfen/justieren) (depends on T030)

**Checkpoint**: Alle drei Stories sind unabhängig funktionsfähig.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Querschnitt, Compliance, Doku, Qualität.

- [ ] T032 [P] Datenschutzerklärung um „Online-Terminbuchung" und „SendGrid (E-Mail-Versand, AV-Vertrag)" ergänzen in `frontend/src/app/(public)/datenschutz/page.tsx`
- [ ] T033 [P] Aktualisiertes OpenAPI-Schema nach `backend/openapi.json` exportieren
- [ ] T034 [P] Implementierungs-Hinweise in `CLAUDE.md` ergänzen (Reminder-Job: `python scripts/run_reminders.py`)
- [ ] T035 [P] Barrierefreiheit & Mobile-First-Durchgang am Buchungs-Flow (semantisches HTML, Tastatur, Kontraste, `prefers-reduced-motion`) gemäß `DESIGN.md`
- [ ] T036 [P] Frontend-Fehler-/Rate-Limit-/Leerzustände der Buchungs- und Storno-Formulare härten (409 „Slot vergeben", 422, 410, 429)
- [ ] T037 Quickstart-Validierung end-to-end gemäß `specs/004-smart-booking-engine/quickstart.md` durchführen. **Verpflichtend (FR-011/DSGVO):** verifizieren, dass eine Online-Buchung `Customer.last_active_at` setzt und dass `run_retention_job` einen abgelaufenen Online-Kunden erfasst und anonymisiert — z.B. via gezieltem Test in `backend/tests/unit/test_retention.py` (Online-Customer mit zurückdatiertem `last_active_at` → nach Lauf `anonymized_at` gesetzt).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: keine Abhängigkeiten — sofort starten.
- **Foundational (Phase 2)**: nach Setup — BLOCKIERT alle Stories.
- **User Stories (Phase 3–5)**: nach Foundational. US1 ist MVP; US2/US3 bauen auf der Notification- bzw. Token-Basis aus Foundational/US1 auf, sind aber unabhängig testbar.
- **Polish (Phase 6)**: nach den gewünschten Stories.

### User Story Dependencies

- **US1 (P1)**: nur Foundational. Keine Abhängigkeit von anderen Stories.
- **US2 (P2)**: Foundational (NotificationService-Basis). Nutzt `send_reminder`; unabhängig von US1-Endpoints testbar (Buchung kann im Test direkt angelegt werden).
- **US3 (P3)**: Foundational (Token-Feld). T031 referenziert das Bestätigungs-Template aus Foundational; ansonsten unabhängig.

### Within Each User Story

- Tests zuerst (sollen fehlschlagen) → Modelle/Schemas → Services → Endpoints → Frontend.
- Schemas vor Service, Service vor Endpoint, Backend vor zugehörigem Frontend-Page.

### Parallel Opportunities

- Setup: T001, T002, T003 parallel.
- Foundational: T005, T006, T007, T008 parallel; T011, T012 parallel (Frontend). T009 nach T006–T008; T010 nach Router-Gerüst.
- US1: T014 und T019 parallel zu Backend-Logik; T013 (Test) vorab.
- Stories untereinander parallelisierbar, sobald Foundational steht (verschiedene Entwickler).

---

## Parallel Example: Foundational Phase

```bash
# Modelle & Notification-Basis parallel:
Task: "T005 Appointment-Felder + AppointmentOrigin in backend/app/domains/booking/models.py"
Task: "T006 NotificationLog-Model in backend/app/domains/notifications/models.py"
Task: "T007 SendGrid-Adapter in backend/app/domains/notifications/email.py"
Task: "T008 E-Mail-Templates in backend/app/domains/notifications/templates.py"
# Frontend-Grundlage parallel:
Task: "T011 TS-Typen in frontend/src/lib/types.ts"
Task: "T012 API-Client in frontend/src/lib/api.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 Setup → Phase 2 Foundational (kritisch, blockiert alles).
2. Phase 3 US1 komplett.
3. **STOP & VALIDATE**: US1 unabhängig testen (Buchung + Bestätigung + Kalender + Concurrency).
4. Deploy/Demo als MVP.

### Incremental Delivery

1. Setup + Foundational → Fundament steht.
2. US1 → testen → Demo (MVP).
3. US2 (Erinnerung) → testen → Demo.
4. US3 (Storno) → testen → Demo.

---

## Notes

- [P] = andere Datei, keine offene Abhängigkeit.
- Nach jeder erledigten Task sofort hier abhaken (Projekt-Konvention).
- Doppelbuchung ist DB-seitig (`EXCLUDE USING GIST`) gesichert; Tests unter SQLite prüfen die App-Ebene (CLAUDE.md).
- Tests vor Implementierung rot sehen; nach Implementierung grün.
- Keine Online-Zahlung, kein SMS — bewusst außerhalb des Scope (Clarify Q1).
