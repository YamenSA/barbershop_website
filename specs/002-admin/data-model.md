# Data Model: Admin & Stammdaten (Phase 1)

**Branch**: `002-admin-stammdaten` | **Date**: 2026-06-09

Extends the Phase 0 data model (`specs/001-fundament/data-model.md`). All Phase 0 entities are unchanged unless noted. New entities use UUID PKs and `created_at` / `updated_at` timestamps following Phase 0 conventions.

---

## Neue Entität: AdminAccount

**Zweck**: Einziges Admin-Konto — Zugangsdaten für die interne Admin-Oberfläche.

| Feld | Typ | Constraints | Beschreibung |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Primärschlüssel |
| `username` | VARCHAR(100) | NOT NULL, UNIQUE | Login-Name (z. B. E-Mail oder kurzer Name) |
| `hashed_password` | VARCHAR(255) | NOT NULL | bcrypt-Hash; Klartext wird nie gespeichert |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Validierungsregeln**:
- `username` darf nicht leer sein.
- Genau ein Datensatz — Einzigartigkeit wird durch UNIQUE + Seed-Migration erzwungen; kein Self-Service-Anlegen über die API.

**Sicherheit**:
- Passwort wird ausschließlich als bcrypt-Hash gespeichert (passlib, rounds ≥ 12).
- Der Hash wird niemals in einer API-Response zurückgegeben.
- Seed: AdminAccount wird via Alembic-Seed-Migration aus Umgebungsvariablen (`ADMIN_USERNAME`, `ADMIN_PASSWORD`) angelegt.

---

## Neue Entität: DayOverride (Tages-Überschreibung)

**Zweck**: Punktuelle Abweichung vom regulären Wochenarbeitsplan eines Teammitglieds für einen konkreten Kalendertag (FR-005).

| Feld | Typ | Constraints | Beschreibung |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Primärschlüssel |
| `team_member_id` | UUID | FK → team_members.id, NOT NULL | Betroffenes Teammitglied |
| `date` | DATE | NOT NULL | Konkreter Kalendertag der Überschreibung |
| `override_type` | VARCHAR(20) | NOT NULL | `day_off` oder `extra_hours` |
| `custom_start_time` | TIME | NULLABLE | Arbeitsbeginn (nur bei `extra_hours`) |
| `custom_end_time` | TIME | NULLABLE | Arbeitsende (nur bei `extra_hours`) |
| `reason` | VARCHAR(200) | NULLABLE | Freitext-Grund (z. B. „krank", „spontan da") |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Constraints**:
```sql
UNIQUE (team_member_id, date)  -- ein Override pro Tag und Mitglied

CHECK (
  override_type IN ('day_off', 'extra_hours')
)

CHECK (
  (override_type = 'day_off' AND custom_start_time IS NULL AND custom_end_time IS NULL)
  OR
  (override_type = 'extra_hours' AND custom_start_time IS NOT NULL AND custom_end_time IS NOT NULL
   AND custom_end_time > custom_start_time)
)
```

**Semantik & Verfügbarkeitsformel**:

```
effective_hours(team_member, date):
  1. Suche DayOverride für (team_member, date):
     - 'day_off'      → return [] (kein Arbeitstag)
     - 'extra_hours'  → return [(custom_start_time, custom_end_time)]
     - kein Eintrag   → return WorkingHours[date.weekday()]  (regulärer Plan)
  2. Schneide mit SalonHours[date.weekday()] (Salon-Öffnungszeiten gewinnen)
  3. Ziehe bestätigte Termine ab
```

**Abgrenzung zu WorkingException** (Phase 0):
`WorkingException` modelliert Zeitbereichs-Sperren (z. B. Urlaub 1.–14. Juli als TIMESTAMPTZ-Range). `DayOverride` modelliert tages-genaue Typ-Überschreibungen. Beide können für denselben Tag gelten; `DayOverride` hat Vorrang bei der `effective_hours`-Berechnung.

---

## Geänderte Entität: Appointment — Erweiterung

**Änderung gegenüber Phase 0**: Das Feld `status` DEFAULT ist bereits `'confirmed'` — dies war schon in Phase 0 so definiert und stimmt mit der Clarification (Q1) überein: manuell angelegte Termine starten sofort mit Status `confirmed`.

Das `POST /appointments`-Request-Schema erhält ein neues optionales Feld:

| Feld | Typ | Default | Beschreibung |
|---|---|---|---|
| `admin_override` | BOOLEAN | `false` | Wenn `true` (nur Admin): Arbeitsplan-Check wird übersprungen; EXCLUDE-Constraint gilt weiterhin |

`admin_override` wird **nicht** in der Datenbank gespeichert — es ist ein reines Request-Flag für die Service-Schicht.

---

## Keine weiteren Schemaänderungen

Alle übrigen Phase-0-Entitäten (`Service`, `TeamMember`, `SalonHours`, `SalonClosure`, `WorkingHours`, `Customer`, `WorkingException`) bleiben unverändert.

---

## Alembic-Migration (Phase 1)

Eine Migration `xxxx_phase1_auth_dayoverride.py` erstellt:
1. Tabelle `admin_accounts` mit allen Feldern oben.
2. Tabelle `day_overrides` mit allen Feldern oben.
3. B-Tree-Index auf `day_overrides(team_member_id, date)`.
4. B-Tree-Index auf `customers(phone)` — für die neue Prefix-Suche (FR-009).
5. Seed: Ein `AdminAccount`-Datensatz aus `ADMIN_USERNAME` + `ADMIN_PASSWORD` Umgebungsvariablen (Hash wird in der Migration berechnet).

---

## Aktualisierte Entity-Relationship-Übersicht

```
services ──── team_member_services ──── team_members
                                              │
                              ┌───────────────┼──────────────────┐
                         working_hours   day_overrides    working_exceptions
                                              │
salon_hours ─── [Verfügbarkeitsberechnung] ───┤
salon_closures ─────────────────────────────── │
                                              │
appointments ──────────────────────────────────┘
    │
    ├── customer_id → customers
    └── (guest_name, guest_phone) → Gast ohne Konto

admin_accounts  (eigenständig — keine FK-Beziehung zu anderen Entitäten)
```
