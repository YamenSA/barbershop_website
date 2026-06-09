# Tasks: Fundament & Domänen-Modell

**Input**: Design documents from `specs/001-fundament/`

**Prerequisites**: plan.md ✓ | spec.md ✓ | research.md ✓ | data-model.md ✓ | contracts/ ✓

**Tests**: TDD für kritische Pfade (Konstitution Prinzip IX: Verfügbarkeitsberechnung, Buchungs-Integrität, Anonymisierung).

**Organization**: Aufgaben nach User Story gruppiert. Jede Story ist unabhängig testbar und deploybar.

## Format: `[ID] [P?] [Story?] Beschreibung mit Dateipfad`

- **[P]**: Parallelisierbar (unterschiedliche Dateien, keine Abhängigkeiten)
- **[Story]**: Zugehörige User Story (US1–US4)
- Alle Pfade relativ zum Repository-Root

---

## Phase 1: Setup (Projekt-Infrastruktur)

**Zweck**: Projektstruktur und Tooling einrichten — keine Funktionalität, nur das Fundament.

- [x] T001 Create backend project structure per plan.md layout (`backend/app/`, `backend/tests/`, `backend/alembic/`)
- [x] T002 Initialize Python project with all dependencies in `backend/pyproject.toml` (fastapi, sqlmodel, alembic, asyncpg, pydantic[email], uvicorn, pytest, pytest-asyncio, httpx)
- [x] T003 [P] Create Docker setup for development in `docker-compose.yml`
- [x] T004 [P] Configure linting and formatting in `backend/pyproject.toml` (ruff rules, line length, import sorting)
- [x] T005 [P] Create `.env.example` with required variables (`DATABASE_URL`, `RETENTION_GUEST_MONTHS=12`, `RETENTION_CUSTOMER_MONTHS=24`)

**Checkpoint**: `docker compose up -d db` startet PostgreSQL erfolgreich.

---

## Phase 2: Fundament (Blocking Prerequisites)

**Zweck**: Kern-Infrastruktur, die ALLE User Stories benötigen. Kein US-Work bis diese Phase abgeschlossen ist.

**⚠️ KRITISCH**: Keine User-Story-Arbeit, bevor diese Phase vollständig ist.

- [x] T006 Create environment config with Pydantic Settings in `backend/app/core/config.py` (DATABASE_URL, RETENTION_GUEST_MONTHS, RETENTION_CUSTOMER_MONTHS, alle aus ENV-Variablen)
- [x] T007 Setup async database session with SQLModel + asyncpg in `backend/app/core/database.py` (get_session Dependency, engine creation)
- [x] T008 [P] Create base SQLModel mixin with UUID primary key and timestamps in `backend/app/core/base.py` (id: UUID default_factory, created_at, updated_at)
- [x] T009 [P] Create FastAPI application with CORS middleware and router registration in `backend/app/main.py` (app factory, /api/v1 prefix)
- [x] T010 [P] Create global error handling (IntegrityError → 409, ValidationError → 422) in `backend/app/core/exceptions.py`
- [x] T011 Initialize Alembic with async support in `backend/alembic/env.py` (asyncpg driver, SQLModel metadata import)
- [x] T012 Create first migration: enable btree_gist extension in `backend/alembic/versions/001_enable_btree_gist.py`

**Checkpoint**: `alembic upgrade head` läuft fehlerfrei; `SELECT extname FROM pg_extension WHERE extname = 'btree_gist';` liefert 1 Zeile.

---

## Phase 3: User Story 1 — Dienstleistungen + Teamzuordnung (Priority: P1) 🎯 MVP

**Goal**: Admin kann Dienstleistungen anlegen und Teammitgliedern zuordnen. Vollständige CRUD-API für `services`, `team_members` und `team_member_services`.

**Independent Test**: `pytest tests/integration/test_entities.py -v` — alle Tests grün. Manuell: Service anlegen, zwei Teammitglieder zuordnen, Abfrage liefert beide zurück.

### TDD: US1-Tests

> **Schreibe diese Tests ZUERST. Sie müssen FEHLSCHLAGEN, bevor du mit der Implementierung beginnst.**

- [x] T013 [P] [US1] Write integration tests for Service CRUD (create, read, update, deactivate) in `backend/tests/integration/test_entities.py`
- [x] T014 [P] [US1] Write integration tests for TeamMember CRUD and service assignment (n:m) in `backend/tests/integration/test_entities.py`

### Implementierung: US1

- [x] T015 [P] [US1] Create Service SQLModel entity with validation in `backend/app/domains/stammdaten/models.py` (id, name unique, duration_minutes > 0, price_cents >= 0, is_active)
- [x] T016 [P] [US1] Create TeamMember SQLModel entity and TeamMemberService join table in `backend/app/domains/stammdaten/models.py` (id, name, bio nullable, photo_url nullable, is_active)
- [x] T017 [US1] Create migration for services, team_members, team_member_services tables in `backend/alembic/versions/002_stammdaten_entities.py` (depends on T015, T016)
- [x] T018 [P] [US1] Create Service request/response Pydantic schemas in `backend/app/domains/stammdaten/schemas.py` (ServiceCreate, ServiceRead, ServiceUpdate)
- [x] T019 [P] [US1] Create TeamMember request/response Pydantic schemas in `backend/app/domains/stammdaten/schemas.py` (TeamMemberCreate, TeamMemberRead, ServiceAssignment)
- [x] T020 [US1] Implement StammdatenService with Service CRUD and TeamMember CRUD business logic in `backend/app/domains/stammdaten/service.py` (depends on T015, T016, T018, T019)
- [x] T021 [US1] Implement Service and TeamMember routers with all endpoints per contracts/stammdaten.md in `backend/app/domains/stammdaten/router.py` (GET/POST/PUT/DELETE /api/v1/services, /api/v1/team-members, PUT /api/v1/team-members/{id}/services)
- [x] T022 [US1] Register stammdaten router in `backend/app/main.py`

**Checkpoint**: Tests aus T013/T014 sind GRÜN. `POST /api/v1/services` liefert 201; `GET /api/v1/services` listet alle aktiven Services.

---

## Phase 4: User Story 2 — Verfügbarkeitsberechnung (Priority: P1)

**Goal**: System berechnet verfügbare Slots live aus Salon-Öffnungszeiten, Arbeitszeiten, Ausnahmen und bestätigten Terminen. Kein Slot-Cache.

**Independent Test**: `pytest tests/unit/test_availability.py -v` — alle Tests grün, inkl. Performance-Test < 200ms. API: `GET /api/v1/availability?service_id=X&date=Y` liefert korrekte Slots.

### TDD: US2-Tests (KRITISCHER PFAD — Konstitution Prinzip IX)

> **Schreibe diese Tests ZUERST. Sie müssen FEHLSCHLAGEN, bevor du mit der Implementierung beginnst.**

- [x] T023 [US2] Write unit tests for availability engine covering all scenarios from spec.md in `backend/tests/unit/test_availability.py`:
  - Basis-Slot-Generierung innerhalb Arbeitszeiten
  - Salon-Schließungstag → leeres Ergebnis
  - Ganztägige Salon-Schließung (SalonClosure) → leeres Ergebnis
  - Ausnahme (Urlaub) entfernt betroffene Slots
  - Bestätigter Termin blockiert Slot
  - Stornierter Termin blockiert Slot NICHT
  - Individuelle Arbeitszeit enger als Öffnungszeit → nur Schnittmenge buchbar
  - Performance: Berechnung unter 200ms bei typischen Daten

### Implementierung: US2

- [x] T024 [P] [US2] Create SalonHours and SalonClosure SQLModel entities in `backend/app/domains/stammdaten/models.py` (SalonHours: day_of_week 0–6 UNIQUE, is_open, open_time, close_time; SalonClosure: date UNIQUE, reason)
- [x] T025 [P] [US2] Create WorkingHours and WorkingException SQLModel entities in `backend/app/domains/stammdaten/models.py` (WorkingHours: team_member_id FK, day_of_week, start_time, end_time, UNIQUE(team_member_id, day_of_week); WorkingException: team_member_id FK, starts_at, ends_at, reason)
- [x] T026 [US2] Create migration for salon_hours, salon_closures, working_hours, working_exceptions in `backend/alembic/versions/003_scheduling_entities.py` (depends on T024, T025)
- [x] T027 [US2] Create seed migration with 7 default salon_hours rows (Mo–So, initially all open 9–18 Uhr) in `backend/alembic/versions/004_seed_salon_hours.py`
- [x] T028 [P] [US2] Create SalonHours and SalonClosure Pydantic schemas in `backend/app/domains/stammdaten/schemas.py` (SalonHoursRead, SalonHoursUpdate, SalonClosureCreate, SalonClosureRead)
- [x] T029 [P] [US2] Create WorkingHours and WorkingException Pydantic schemas in `backend/app/domains/stammdaten/schemas.py`
- [x] T030 [US2] Implement availability calculation engine in `backend/app/domains/booking/availability.py`:
  - `get_available_slots(session, team_member_id, service_id, date)` → List[SlotResult]
  - Schnittmenge aus SalonHours + WorkingHours, abzüglich WorkingExceptions + confirmed Appointments
  - Slicing in `service.duration_minutes`-Intervalle
  - Keine externen Bibliotheken — reines datetime-Arithmetic
- [x] T031 [US2] Implement SalonHours, SalonClosure, WorkingHours, WorkingException routers per contracts/stammdaten.md in `backend/app/domains/stammdaten/router.py` (GET/PUT /api/v1/salon-hours, GET/POST/DELETE /api/v1/salon-closures, GET/PUT /api/v1/team-members/{id}/working-hours, GET/POST/DELETE /api/v1/team-members/{id}/exceptions)
- [x] T032 [US2] Implement Availability router in `backend/app/domains/booking/router.py` (GET /api/v1/availability, validates service_id and team_member_id existence, delegates to availability.py)
- [x] T033 [US2] Register booking router in `backend/app/main.py`

**Checkpoint**: Tests aus T023 sind GRÜN. `GET /api/v1/availability?service_id=X&date=2026-07-15` liefert korrekte Slots; an Schließungstagen leeres Array.

---

## Phase 5: User Story 3 — Termine + Doppelbuchungsschutz (Priority: P1)

**Goal**: Termine können mit Kundenkonto oder Gast-Daten angelegt werden. DB-Constraint verhindert strukturell überlappende bestätigte Termine für dasselbe Teammitglied.

**Independent Test**: `pytest tests/integration/test_booking_integrity.py -v` — inkl. gleichzeitiger Buchungsversuche. API: `POST /api/v1/appointments` liefert 409 bei Überlappung.

### TDD: US3-Tests (KRITISCHER PFAD — Konstitution Prinzip IX)

> **Schreibe diese Tests ZUERST. Sie MÜSSEN FEHLSCHLAGEN, bevor der EXCLUDE-Constraint existiert.**

- [x] T034 [US3] Write integration tests for booking integrity in `backend/tests/integration/test_booking_integrity.py`:
  - Überlappender bestätigter Termin → IntegrityError / 409
  - Angrenzende Termine (halboffenes Intervall `[)`) → beide accepted
  - Stornierter Termin blockiert keinen Slot → zweiter Termin accepted
  - Gast-Buchung ohne Kundenkonto (name + phone) → 201
  - Kundenkonto-Buchung mit customer_id → 201
  - Gleichzeitige Buchungsversuche (2 Threads, gleicher Slot) → genau 1 erfolgreich

### Implementierung: US3

- [x] T035 [P] [US3] Create Customer SQLModel entity with GDPR fields in `backend/app/domains/booking/models.py` (id, name, email UNIQUE, phone nullable, last_active_at, anonymized_at nullable)
- [x] T036 [P] [US3] Create Appointment SQLModel entity with status enum and constraints in `backend/app/domains/booking/models.py`:
  - Status enum: confirmed/completed/cancelled/no_show
  - CHECK: (customer_id IS NOT NULL XOR guest_name+guest_phone IS NOT NULL)
  - CHECK: ends_at > starts_at
  - EXCLUDE USING GIST: team_member_id equality + tstzrange overlap WHERE status='confirmed'
- [x] T037 [US3] Create migration for customers and appointments tables with EXCLUDE USING GIST constraint in `backend/alembic/versions/005_booking_entities.py` (raw SQL für EXCLUDE-Constraint, da kein ORM-Support)
- [x] T038 [P] [US3] Create Customer Pydantic schemas in `backend/app/domains/booking/schemas.py` (CustomerCreate, CustomerRead)
- [x] T039 [P] [US3] Create Appointment Pydantic schemas in `backend/app/domains/booking/schemas.py` (AppointmentCreate for customer + guest variants, AppointmentRead, StatusUpdate)
- [x] T040 [US3] Implement CustomerService in `backend/app/domains/booking/service.py` (create, get, list, anonymize-on-delete)
- [x] T041 [US3] Implement AppointmentService in `backend/app/domains/booking/service.py`:
  - `create_appointment`: berechnet ends_at aus service.duration_minutes, fängt IntegrityError → AppointmentConflictError
  - `update_status`: validiert erlaubte Übergänge (confirmed → completed/cancelled/no_show)
  - `list_appointments`: mit Filtern (date, team_member_id, status)
- [x] T042 [US3] Implement Appointment and Customer routers per contracts/booking.md in `backend/app/domains/booking/router.py` (GET/POST /api/v1/appointments, GET /api/v1/appointments/{id}, PATCH /api/v1/appointments/{id}/status, GET/POST /api/v1/customers, GET/DELETE /api/v1/customers/{id})

**Checkpoint**: Tests aus T034 sind GRÜN. Gleichzeitige Buchungsversuche: exakt 1 succeeds, 1 gibt 409 zurück.

---

## Phase 6: User Story 4 — DSGVO-Anonymisierung (Priority: P2)

**Goal**: Personenbezogene Daten werden nach konfigurierbaren Fristen anonymisiert. Gast-Termine nach 12 Monaten, Kunden-Accounts nach 24 Monaten Inaktivität. Fristen sind ohne Code-Änderung konfigurierbar.

**Independent Test**: `pytest tests/unit/test_retention.py -v` — alle Tests grün, inkl. konfigurierbare Fristen.

### TDD: US4-Tests (KRITISCHER PFAD — Konstitution Prinzip IX)

> **Schreibe diese Tests ZUERST. Sie müssen FEHLSCHLAGEN, bevor die Retention-Logik implementiert ist.**

- [x] T043 [US4] Write unit tests for retention logic in `backend/tests/unit/test_retention.py`:
  - Gast-Termin > 12 Monate → guest_name und guest_phone anonymisiert
  - Gast-Termin < 12 Monate → unverändert
  - Kunden-Account > 24 Monate Inaktivität → name/email/phone anonymisiert
  - Kunden-Account < 24 Monate → unverändert
  - Konfigurierbare Frist: 6 Monate in Testenv greift korrekt
  - Sofortige Anonymisierung bei Konto-Löschung

### Implementierung: US4

- [x] T044 [US4] Implement retention job in `backend/app/domains/booking/retention.py`:
  - `run_retention_job(session, config)` → RetentionResult
  - Liest `RETENTION_GUEST_MONTHS` und `RETENTION_CUSTOMER_MONTHS` aus config
  - Gast-Anonymisierung: setzt `guest_name = "[anonymisiert]"`, `guest_phone = "[anonymisiert]"`
  - Kunden-Anonymisierung: setzt `name`, `email`, `phone` auf Platzhalter, setzt `anonymized_at`
  - Gibt Anzahl anonymisierter Datensätze zurück
- [x] T045 [US4] Add management script for retention job in `backend/scripts/run_retention.py` (CLI entry point: loads config from ENV, creates DB session, calls `run_retention_job`, prints `RetentionResult` as JSON to stdout)
- [x] T046 [US4] Wire CustomerService.delete to call anonymize immediately (update `backend/app/domains/booking/service.py`)

**Checkpoint**: Tests aus T043 sind GRÜN. `python backend/scripts/run_retention.py` läuft fehlerfrei und gibt `{"anonymized_guest_appointments": N, "anonymized_customers": M, "duration_seconds": X.X}` aus.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Zweck**: Qualitätssicherung und Validierung aller User Stories.

- [x] T047 [P] Run all quickstart.md validation scenarios and document results in `backend/tests/integration/test_quickstart.py`
- [x] T048 [P] Add HTTP-level performance test in `backend/tests/integration/test_performance.py`: `test_availability_under_500ms` — seed 5 team members + 20 existing appointments, assert `GET /api/v1/availability` responds in < 500ms per SC-002
- [x] T048b [P] Add retention volume test in `backend/tests/integration/test_performance.py`: `test_retention_10k_records` — bulk-insert 10.000 expired guest appointment rows, assert `run_retention_job` completes in < 300s per SC-004
- [x] T049 [P] Review FastAPI auto-generated OpenAPI schema at `/docs` — verify all endpoints from contracts/ are present and correctly typed
- [x] T049a [P] Export OpenAPI schema to `backend/openapi.json` via `python -c "import json; from app.main import app; print(json.dumps(app.openapi()))" > backend/openapi.json` — commit to repo for Phase 2 frontend type generation (Konstitution Prinzip VI)
- [x] T050 [P] Verify EXCLUDE USING GIST constraint schema in DB: `\d appointments` zeigt Constraint; validate with concurrent test
- [x] T051 Update `CLAUDE.md` with implementation notes (actual paths, running instructions, DB setup)

**Checkpoint**: Alle Validierungsszenarien aus quickstart.md bestanden. Availability-Response < 500ms (T048). Retention-Lauf 10.000 Datensätze < 300s (T048b). OpenAPI-Docs vollständig; `backend/openapi.json` committed (T049a).

---

## Dependencies & Execution Order

### Phasen-Abhängigkeiten

- **Phase 1 (Setup)**: Keine Abhängigkeiten — sofort starten
- **Phase 2 (Fundament)**: Abhängig von Phase 1 — BLOCKIERT alle User Stories
- **Phase 3 (US1)**: Abhängig von Phase 2; parallel zu US2/US3/US4 möglich (nach Fundament)
- **Phase 4 (US2)**: Abhängig von Phase 2; Entitäten US1 nicht benötigt
- **Phase 5 (US3)**: Abhängig von Phase 2; benötigt Customer/Appointment (unabhängig von US1/US2 im Modell)
- **Phase 6 (US4)**: Abhängig von Phase 5 (Appointment + Customer Entities vorhanden)
- **Phase 7 (Polish)**: Abhängig von allen gewünschten User Stories

### User Story Dependencies

- **US1 (P1)**: Startet nach Phase 2 — keine Abhängigkeit von anderen Stories
- **US2 (P1)**: Startet nach Phase 2 — keine Abhängigkeit von US1 oder US3
- **US3 (P1)**: Startet nach Phase 2 — keine Abhängigkeit von US1 oder US2
- **US4 (P2)**: Startet nach US3 (benötigt Appointment + Customer Entitäten)

### Innerhalb jeder User Story

1. TDD: Tests schreiben → sicherstellen dass sie FEHLSCHLAGEN
2. Modelle → Migration
3. Schemas → Services → Router
4. Tests müssen am Ende GRÜN sein

---

## Parallel-Beispiele

### Parallele Ausführung: Phase 2 (Fundament)

```text
Task: T008 — base.py (UUID-Mixin)
Task: T009 — main.py (FastAPI App)
Task: T010 — exceptions.py (Error Handling)
→ Dann: T011 (Alembic), T012 (btree_gist Migration)
```

### Parallele Ausführung: US1-Modelle

```text
Task: T015 — Service Model in stammdaten/models.py
Task: T016 — TeamMember Model in stammdaten/models.py
→ Dann: T017 (Migration), T020 (Service-Layer)
```

### Parallele Ausführung: US3-Modelle

```text
Task: T035 — Customer Model in booking/models.py
Task: T036 — Appointment Model in booking/models.py
→ Dann: T037 (Migration mit EXCLUDE-Constraint)
```

### Parallele Story-Ausführung (nach Phase 2)

```text
Developer A: Phase 3 (US1) — Stammdaten CRUD
Developer B: Phase 4 (US2) — Verfügbarkeitsberechnung
Developer C: Phase 5 (US3) — Termine + Doppelbuchungsschutz
```

---

## Implementation Strategy

### MVP: User Story 1 + 2 + 3 (alle P1)

Alle drei P1-Stories sind das MVP. US4 (DSGVO-Anonymisierung) ist P2 und kann nachgeliefert werden.

1. Phase 1 (Setup) abschließen
2. Phase 2 (Fundament) abschließen — **kritischer Blocker**
3. Phase 3 (US1) — CRUD fertig stellen
4. Phase 4 (US2) — Verfügbarkeit fertig stellen
5. Phase 5 (US3) — Termine + Doppelbuchungsschutz fertig stellen
6. **STOPP + VALIDIEREN**: Alle P1-Tests grün → Phase 0 MVP vollständig
7. Phase 6 (US4) — DSGVO-Anonymisierung
8. Phase 7 (Polish)

### Inkrementelle Lieferung

Nach jeder Phase ist das System in einem lauffähigen Zustand:
- Nach Phase 3: Service + Team-Daten pflegbar → Admin kann Angebot konfigurieren
- Nach Phase 4: Verfügbarkeit abrufbar → Buchungs-Flow (Phase 3) kann entwickelt werden
- Nach Phase 5: Termine buchbar → vollständiges Domänenmodell abgeschlossen
- Nach Phase 6: DSGVO-Compliance vollständig

---

## Notes

- `[P]` = Parallelisierbar (unterschiedliche Dateien, keine offenen Abhängigkeiten)
- `[US1–US4]` = Zugehörigkeit zur User Story für Rückverfolgbarkeit
- TDD-Tasks (T013, T014, T023, T034, T043) MÜSSEN vor den zugehörigen Implementierungs-Tasks geschrieben und als FEHLSCHLAGEND bestätigt sein
- Der EXCLUDE-Constraint in T037 erfordert raw SQL in der Alembic-Migration (kein SQLModel-ORM-Support für EXCLUDE)
- Aufbewahrungsfristen-Abnahme durch Datenschutzbeauftragten steht noch aus — Konfigurierbarkeit ist bereits eingebaut
