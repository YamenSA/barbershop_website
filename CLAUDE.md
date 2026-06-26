<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at `specs/006-marketing-content/plan.md`.
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
| Tages-Überschreibung | `DayOverride` |
| Admin-Konto | `AdminAccount` |

## UI-/Theme-Konventionen

**`DESIGN.md` ist die Single Source of Truth.** Details + Ratios dort; Kurzfassung:

- **Public-Text-Tiers (Tokens, gegen echtes BG `oklch(0.10 0 0)`):** `text-ink` `#F5F5F5` (~18.9:1, Primär) · `text-secondary` `#B8B8B8` (~10.4:1, Fließtext/Bios/Sublines) · `text-tertiary`/`text-ash` `#999999` (~7.2:1, Meta/Chips/„Mein Konto"). Keine Ad-hoc-`text-gray-*`/Opacity-Tricks. `#999999` ist die Untergrenze für kleinen Text.
- **Button-Label-Regel:** Label auf Malachite-**Flächen** ist dunkel (`text-midnight`, ~6.8:1) — niemals weiß (~2.8:1, reißt AA). Weißes Label nur auf dunklerem Grün (Admin `#15803D`, ~4.7:1). Malachite als **Text** auf Dunkel ist ok.
- **Admin = gepinntes HELLES Theme:** `.admin-shell` setzt `color-scheme: light` + eigene Tokens (`--admin-page/-surface/-border/-text/-text-muted/-primary`). Jede Fläche setzt BG **und** Text explizit; erbt nichts von den umschaltenden Public-Tokens. Akzent grün (`#15803D`), **kein Indigo**. Jedes Paar ≥ 4.5:1.
- **Skip-Link (WCAG 2.4.1):** in `app/layout.tsx`, Ruhezustand `sr-only`, bei `focus-visible` Malachite-Pill **oben-zentriert** (`z-[9999]`) — nicht oben-links, damit das Logo nicht überlagert wird.
- **Startseite (`app/page.tsx`):** rendert eigenes `Nav`+`Footer`; feste 8-Sektionen-Reihenfolge (Hero → Leistungs-Highlights → Team-Teaser → Galerie-Vorschau → Warum wir → Öffnungszeiten+Standort → finaler CTA → Footer); vorhandene Daten/Komponenten wiederverwenden, kein neuer Content; Karte consent-frei als statisches Bild.
- **Header-Aktionshierarchie**:
  - *Primär*: „Termin buchen“ als auffälliger Malachite-Solid-Button.
  - *Sekundär*: „Mein Konto“ klar untergeordnet mit Personen-Icon (`User`), gedämpfter Sekundärfarbe (`text-tertiary`), Brass-Farbe (`Blade Brass`) ausschließlich im `:hover`/active-State sowie Tastatur-Fokus-Markierung (`focus-visible:ring-brass/60`).

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

6. **Notification Reminder Job**:
   To manually run the reminder job that sends email notifications for upcoming appointments (24h lead time):
   ```sh
   python scripts/run_reminders.py
   ```

### Architecture Overview

- **Core**: Contains configuration (`app/core/config.py`), database session management (`app/core/database.py`), global error handlers, and base SQLModels.
- **Stammdaten Domain**: Manages static entities like `Service`, `TeamMember`, `SalonHours`, and `WorkingHours`.
- **Booking Domain**: Manages transactional entities like `Appointment` and `Customer`. Includes the core availability engine (`availability.py`) and the GDPR retention logic (`retention.py`).

The OpenAPI schema is automatically exported to `backend/openapi.json`.
