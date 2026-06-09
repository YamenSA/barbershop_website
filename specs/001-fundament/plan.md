# Implementation Plan: Fundament & Domänen-Modell

**Branch**: `001-fundament-domain` | **Date**: 2026-06-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-fundament/spec.md`

## Summary

Phase 0 legt die gemeinsame Datenbasis für alle Folge-Phasen: Dienstleistungen, Teammitglieder, Salon-Öffnungszeiten, individuelle Arbeitszeiten und Ausnahmen, Termine sowie Kunden. Keine endnutzerseitige Oberfläche — nur Entitäten, Validierungsregeln, Live-Verfügbarkeitsberechnung und struktureller Doppelbuchungsschutz.

Technischer Kern: PostgreSQL EXCLUDE USING GIST (`btree_gist`-Extension) für Überlappungsschutz; SQLModel-Entities mit Pydantic-v2; konfigurierbarer DSGVO-Anonymisierungsjob.

## Technical Context

**Language/Version**: Python 3.11 (Backend), TypeScript 5 (Frontend, ab Phase 2)

**Primary Dependencies**: FastAPI 0.111+, Pydantic v2, SQLModel 0.0.18+, Alembic, PostgreSQL 15+ (`btree_gist`-Extension erforderlich)

**Storage**: PostgreSQL 15+ — GiST-Index für Überschneidungsschutz (tstzrange)

**Testing**: pytest + pytest-asyncio (Backend); Playwright (E2E, ab Phase 3)

**Target Platform**: Linux-Server (Docker-Container)

**Project Type**: Modular Monolith — ein Backend, intern nach Domänen (`stammdaten`, `booking`, `notifications`)

**Performance Goals**: Verfügbarkeitsberechnung < 500 ms (SC-002); Anonymisierungslauf 10.000 Datensätze < 5 min (SC-004)

**Constraints**: Keine Slot-Tabelle (FR-006); Doppelbuchungsschutz auf DB-Ebene (FR-007); DSGVO-Fristen konfigurierbar (FR-008)

**Scale/Scope**: 1 Salon, 3–10 Teammitglieder, ~200 Termine/Woche, ~5.000 Kunden

## Constitution Check

*GATE: Muss vor Phase-0-Research bestanden sein. Erneute Prüfung nach Phase-1-Design.*

| Prinzip | Status | Nachweis |
|---|---|---|
| I — Spec-First | ✓ | `spec.md` vorhanden und validiert |
| II — DSGVO by Design | ✓ | FR-008: Aufbewahrung/Anonymisierung; keine Zahlungsdaten |
| III — Eine Quelle der Wahrheit | ✓ | Ein DB-Schema, kein Slot-Cache; EXCLUDE-Constraint |
| IV — Modulare Architektur | ✓ | Domänen `stammdaten` / `booking` klar abgegrenzt |
| V — Separation of Concerns | ✓ | models → services → router; kein DB-Zugriff in Routen |
| VI — Typsicherheit | ✓ | Pydantic v2 für alle API-Ein-/Ausgaben |
| VII — API als Vertrag | ✓ | FastAPI generiert OpenAPI; Routen unter `/api/v1/` |
| VIII — Auslieferbare Qualität | ✓ | Kein `// TODO` in Deliverables |
| IX — Getestete kritische Pfade | ✓ | Availability-Berechnung + Booking-Integrität TDD-Pflicht |
| X — Mobile-First | N/A | Keine UI in Phase 0 |
| XI — Sicherheit als Standard | ⚠ | Auth-Schutz kommt in Phase 1; Endpunkte hier intern definiert |
| XII — Design-System | N/A | Keine UI in Phase 0 |

**Gate-Ergebnis: BESTANDEN** — Prinzip XI (Auth) bewusst auf Phase 1 verschoben.

## Project Structure

### Documentation (diese Phase)

```text
specs/001-fundament/
├── plan.md              # Dieses Dokument
├── research.md          # Phase-0-Ausgabe
├── data-model.md        # Phase-1-Ausgabe
├── quickstart.md        # Phase-1-Ausgabe
├── contracts/
│   ├── stammdaten.md    # CRUD: Services, Team, Öffnungszeiten, Arbeitszeiten
│   └── booking.md       # Availability + Appointments
└── tasks.md             # Phase-2-Ausgabe (/speckit-tasks)
```

### Source Code (Repository-Root)

```text
backend/
├── app/
│   ├── core/
│   │   ├── config.py          # Settings (DB-URL, Retention-Fristen)
│   │   └── database.py        # Async DB-Session (SQLModel + asyncpg)
│   ├── domains/
│   │   ├── stammdaten/
│   │   │   ├── models.py      # SQLModel-Entitäten
│   │   │   ├── schemas.py     # Pydantic Request/Response
│   │   │   ├── service.py     # Geschäftslogik
│   │   │   └── router.py      # FastAPI-Routen /api/v1/
│   │   └── booking/
│   │       ├── models.py
│   │       ├── schemas.py
│   │       ├── service.py
│   │       ├── availability.py  # Verfügbarkeits-Engine
│   │       ├── router.py
│   │       └── retention.py   # DSGVO-Anonymisierungsjob
│   └── main.py
├── alembic/
│   └── versions/
├── tests/
│   ├── unit/
│   │   ├── test_availability.py   # TDD — kritischer Pfad
│   │   └── test_retention.py      # TDD — kritischer Pfad
│   └── integration/
│       ├── test_booking_integrity.py  # Doppelbuchungsschutz
│       └── test_entities.py
└── pyproject.toml

frontend/               # Ab Phase 2
```

**Structure Decision**: Web Application (Option 2) — Backend unter `backend/`, intern nach Domänen. Frontend kommt in Phase 2.

## Complexity Tracking

*Keine Constitution-Verletzungen — Tabelle leer.*

## Artifacts

| Artefakt | Pfad | Status |
|---|---|---|
| Research | `specs/001-fundament/research.md` | ✓ |
| Data Model | `specs/001-fundament/data-model.md` | ✓ |
| API-Contract: Stammdaten | `specs/001-fundament/contracts/stammdaten.md` | ✓ |
| API-Contract: Booking | `specs/001-fundament/contracts/booking.md` | ✓ |
| Quickstart | `specs/001-fundament/quickstart.md` | ✓ |
| Tasks | `specs/001-fundament/tasks.md` | ⏳ `/speckit-tasks` |
