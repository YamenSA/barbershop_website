<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at `specs/001-fundament/plan.md`.
<!-- SPECKIT END -->

## Domänen-Glossar (DE → EN Code-Bezeichner)

Specs sind auf Deutsch geschrieben; Code verwendet englische Bezeichner. Mapping:

| Deutsch (Spec) | English (Code) |
|---|---|
| Dienstleistung | Service |
| Teammitglied | TeamMember |
| Öffnungszeit / Salon-Öffnungszeit | SalonHours |
| Ganztägige Schließung | SalonClosure |
| Arbeitszeit | WorkingHours |
| Ausnahme | WorkingException |
| Termin | Appointment |
| Kunde | Customer |
| Anonymisierungslauf | `run_retention_job` |

## Implementation Notes

### Running the Backend

The backend is built with FastAPI, SQLModel, and PostgreSQL. It requires Python 3.11+.

1. **Environment Setup**:
   ```sh
   cd backend
   python -m venv .venv
   source .venv/Scripts/activate  # Or activate.ps1 in PowerShell
   pip install -e ".[dev]"
   cp .env.example .env
   ```

2. **Database Setup**:
   The project uses Docker for the PostgreSQL database.
   ```sh
   docker compose up -d db
   ```
   Apply Alembic migrations to create the schema and seed data:
   ```sh
   alembic upgrade head
   ```

3. **Running the Server**:
   ```sh
   uvicorn app.main:app --reload
   ```

4. **Testing**:
   The tests use an in-memory SQLite database (`aiosqlite`) to run without depending on the PostgreSQL container. Note that PostgreSQL specific constraints (like `EXCLUDE USING GIST` for double booking protection) are tested at the application-level via Python logic when using SQLite.
   ```sh
   pytest -v
   ```

5. **GDPR Anonymization Job**:
   To manually run the retention job that anonymizes expired guest appointments and inactive customers:
   ```sh
   python scripts/run_retention.py
   ```

### Architecture Overview

- **Core**: Contains configuration (`app/core/config.py`), database session management (`app/core/database.py`), global error handlers, and base SQLModels.
- **Stammdaten Domain**: Manages static entities like `Service`, `TeamMember`, `SalonHours`, and `WorkingHours`.
- **Booking Domain**: Manages transactional entities like `Appointment` and `Customer`. Includes the core availability engine (`availability.py`) and the GDPR retention logic (`retention.py`).

The OpenAPI schema is automatically exported to `backend/openapi.json`.
