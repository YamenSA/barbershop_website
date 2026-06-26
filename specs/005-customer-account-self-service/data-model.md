# Phase 1 — Data Model: Kundenkonto & Self-Service

Migration: `011_customer_account.py`. Erweitert `customers`, fügt `customer_tokens` hinzu. Keine Änderung an `appointments`/`notification_logs`.

---

## Entity: `Customer` (erweitert, Domäne `booking`)

Bestehende Tabelle `customers` — neue Felder fett.

| Feld | Typ | Constraints | Beschreibung |
|---|---|---|---|
| `id` | UUID | PK | (bestehend) |
| `name` | str | not null | (bestehend) |
| `email` | str | **unique, index, not null** | (bestehend) Login-Identität |
| `phone` | str? | nullable | (bestehend) optional, Datenminimierung |
| `last_active_at` | datetime(tz) | not null | (bestehend) Retention-Anker |
| `anonymized_at` | datetime(tz)? | nullable | (bestehend) Anonymisierungs-Marke |
| **`hashed_password`** | str? | nullable | bcrypt-Hash; `NULL` ⇒ Gast ohne Konto |
| **`email_verified_at`** | datetime(tz)? | nullable | gesetzt bei Double-Opt-in; `NULL` ⇒ unverifiziert, kein Login |
| `created_at` / `updated_at` | datetime | — | (bestehend, `TimestampModel`) |

**Abgeleitete Zustände / Invarianten**
- *Gast*: `hashed_password IS NULL`.
- *Konto, unverifiziert*: `hashed_password` gesetzt, `email_verified_at IS NULL` → Login abgelehnt (FR-002).
- *Konto, aktiv*: `hashed_password` gesetzt, `email_verified_at` gesetzt.
- *Anonymisiert*: `anonymized_at` gesetzt; `hashed_password`/`email_verified_at` werden bei Löschung geleert → kein Login (FR-011).
- Passwort: nur bcrypt-Hash, nie Klartext (FR-003).

**Lifecycle**
```
Gast (kein Passwort)
  └─ register ─▶ Konto unverifiziert ─ verify(token) ─▶ Konto aktiv
                                                          │
                          update_profile / book / cancel / reschedule
                                                          │
                                   delete_account ─▶ Anonymisiert (Login unmöglich)
```

---

## Entity: `CustomerToken` (neu, Domäne `customer_account`)

Tabelle `customer_tokens` — single-use, ablaufende, zweckgebundene Token. Es wird nur der Hash gespeichert (D5).

| Feld | Typ | Constraints | Beschreibung |
|---|---|---|---|
| `id` | UUID | PK | |
| `customer_id` | UUID | FK → `customers.id`, index, not null | Besitzer |
| `token_hash` | str | unique, index, not null | SHA-256 des Klartext-Tokens (`secrets.token_urlsafe(32)`) |
| `purpose` | enum | not null | `email_verification` \| `password_reset` |
| `expires_at` | datetime(tz) | not null | Verifikation +24 h, Reset +1 h |
| `used_at` | datetime(tz)? | nullable | gesetzt beim Verbrauch (single-use) |
| `created_at` | datetime(tz) | not null | |

**Validierung beim Verbrauch**
1. `token_hash` finden → sonst `404 TOKEN_NOT_FOUND`.
2. `used_at IS NULL` → sonst `410 TOKEN_USED`.
3. `expires_at > now` → sonst `410 TOKEN_EXPIRED`.
4. Bei Erfolg `used_at = now` setzen (idempotenz-/replay-sicher).

**Hygiene**: Bei neuer Reset-/Verifikations-Anforderung werden offene Token desselben `purpose` für den Kunden invalidiert (used/gelöscht). Bei `delete_account` werden alle Token des Kunden gelöscht.

---

## Entity: `Appointment` (wiederverwendet, Domäne `booking`)

Keine Schemaänderung. Relevante Nutzung:
- Konto-Übersicht: `customer_id == current_customer.id`, Aufteilung kommend/vergangen nach `starts_at`.
- Storno/Umbuchung: nur eigene `confirmed`-Termine innerhalb `CANCELLATION_CUTOFF_HOURS`; wirken auf denselben Slot-Pool über die `EXCLUDE`-Constraint.
- Löschung: kommende `confirmed`-Termine → `cancelled` vor Anonymisierung.

---

## Autorisierungs-Regel (FR-007, SC-005)

Jeder kontogebundene Zugriff filtert strikt auf `current_customer.id` (aus `customer_session`-Token). Ein Termin/Profil, dessen `customer_id` ≠ `current_customer.id`, liefert `404` (nicht `403`, um Existenz nicht preiszugeben). Admin- und Kunden-Identitäten sind getrennt (D3).

---

## Migrationsschritte (`011_customer_account.py`)

1. `ALTER TABLE customers ADD COLUMN hashed_password VARCHAR NULL;`
2. `ALTER TABLE customers ADD COLUMN email_verified_at TIMESTAMPTZ NULL;`
3. `CREATE TABLE customer_tokens (…)` inkl. `UNIQUE(token_hash)`, Index auf `customer_id`.
4. Downgrade: Tabelle droppen, Spalten entfernen.

> Hinweis (SQLite-Tests): Spalten-Adds und die neue Tabelle sind portabel; keine PostgreSQL-spezifischen Constraints nötig. Die `EXCLUDE`-Doppelbuchungsgarantie stammt unverändert aus Phase 3.
