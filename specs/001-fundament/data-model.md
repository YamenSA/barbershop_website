# Data Model: Fundament & Domänen-Modell

**Branch**: `001-fundament-domain` | **Date**: 2026-06-08

Alle Entitäten verwenden `UUID` als Primärschlüssel und tragen `created_at` / `updated_at` Timestamps. Soft-Delete über `is_active`-Flag wo anwendbar.

---

## Entität: Service (Dienstleistung)

**Zweck**: Was der Salon anbietet — jede Leistung mit fixer Dauer und fixem Preis.

| Feld | Typ | Constraints | Beschreibung |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Primärschlüssel |
| `name` | VARCHAR(200) | NOT NULL, UNIQUE | Anzeigename (z.B. „Herrenschnitt") |
| `duration_minutes` | INTEGER | NOT NULL, > 0 | Feste Dauer in Minuten, für alle Teammitglieder identisch |
| `price_cents` | INTEGER | NOT NULL, >= 0 | Preis in Cent (2500 = 25,00 €) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Soft-Delete — inaktive Services sind nicht buchbar |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Validierungsregeln**:
- `name` darf nicht leer sein.
- `duration_minutes` muss > 0 sein (mind. 1 Minute).
- `price_cents` muss >= 0 sein (kostenlose Services sind erlaubt).

---

## Entität: TeamMember (Teammitglied)

**Zweck**: Wer eine Leistung erbringt — Profilangaben und Dienst-Zuordnung.

| Feld | Typ | Constraints | Beschreibung |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | Primärschlüssel |
| `name` | VARCHAR(200) | NOT NULL | Vollständiger Anzeigename |
| `bio` | TEXT | NULLABLE | Kurzbeschreibung für die öffentliche Website |
| `photo_url` | TEXT | NULLABLE | URL zum Profilbild |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Inaktive Mitglieder sind nicht buchbar |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Validierungsregeln**:
- `name` darf nicht leer sein.

---

## Verknüpfungstabelle: TeamMemberService (n:m)

**Zweck**: Welche Dienstleistungen ein Teammitglied erbringt (FR-002).

| Feld | Typ | Constraints | Beschreibung |
|---|---|---|---|
| `team_member_id` | UUID | FK → team_members.id, ON DELETE CASCADE | |
| `service_id` | UUID | FK → services.id, ON DELETE CASCADE | |

**Primary Key**: (`team_member_id`, `service_id`)

---

## Entität: SalonHours (Öffnungszeiten)

**Zweck**: Äußerer Rahmen — wann der Salon offen ist (FR-003, reguläre Wochentage).

| Feld | Typ | Constraints | Beschreibung |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | |
| `day_of_week` | SMALLINT | NOT NULL, 0–6, UNIQUE (0=Mo, 6=So) | Wochentag |
| `is_open` | BOOLEAN | NOT NULL, DEFAULT TRUE | FALSE = Salon an diesem Wochentag generell geschlossen |
| `open_time` | TIME | NULLABLE | Öffnungszeit (NULL wenn is_open=FALSE) |
| `close_time` | TIME | NULLABLE | Schließzeit (NULL wenn is_open=FALSE) |

**Validierungsregeln**:
- Wenn `is_open=TRUE`: `open_time` und `close_time` müssen gesetzt sein.
- `open_time` muss vor `close_time` liegen.
- Genau 7 Zeilen (eine pro Wochentag) — als Seed-Daten beim ersten Setup.

---

## Entität: SalonClosure (Ganztägige Schließung)

**Zweck**: Feiertage, Betriebsurlaub — Tage, an denen kein Betrieb stattfindet (FR-003).

| Feld | Typ | Constraints | Beschreibung |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | |
| `date` | DATE | NOT NULL, UNIQUE | Datum der Schließung |
| `reason` | VARCHAR(500) | NULLABLE | Grund (z.B. „Weihnachten", „Betriebsurlaub") |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

---

## Entität: WorkingHours (Individuelle Arbeitszeiten)

**Zweck**: Wann ein Teammitglied innerhalb der Öffnungszeiten verfügbar ist (FR-003).

| Feld | Typ | Constraints | Beschreibung |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | |
| `team_member_id` | UUID | FK → team_members.id, NOT NULL | |
| `day_of_week` | SMALLINT | NOT NULL, 0–6 | Wochentag |
| `start_time` | TIME | NOT NULL | Arbeitsbeginn |
| `end_time` | TIME | NOT NULL | Arbeitsende |

**Validierungsregeln**:
- `start_time` muss vor `end_time` liegen.
- Ein Teammitglied kann pro Wochentag max. einen Eintrag haben (UNIQUE auf `team_member_id`, `day_of_week`).
- Muss innerhalb der Salon-Öffnungszeiten liegen (Service-Layer-Validierung, nicht DB-Constraint).

---

## Entität: WorkingException (Ausnahme)

**Zweck**: Zeiträume, in denen ein Teammitglied ausnahmsweise nicht verfügbar ist (Urlaub, Blocker) (FR-003).

| Feld | Typ | Constraints | Beschreibung |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | |
| `team_member_id` | UUID | FK → team_members.id, NOT NULL | |
| `starts_at` | TIMESTAMPTZ | NOT NULL | Beginn der Ausnahme |
| `ends_at` | TIMESTAMPTZ | NOT NULL | Ende der Ausnahme |
| `reason` | VARCHAR(500) | NULLABLE | z.B. „Urlaub", „Krankheit" |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Validierungsregeln**:
- `starts_at` muss vor `ends_at` liegen.

---

## Entität: Customer (Kunde)

**Zweck**: Registriertes Kundenkonto mit DSGVO-Metadaten (FR-005, FR-008).

| Feld | Typ | Constraints | Beschreibung |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | |
| `name` | VARCHAR(200) | NOT NULL | Vollständiger Name |
| `email` | VARCHAR(320) | NOT NULL, UNIQUE | E-Mail-Adresse |
| `phone` | VARCHAR(50) | NULLABLE | Telefonnummer |
| `last_active_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Wird bei jeder Buchung aktualisiert |
| `anonymized_at` | TIMESTAMPTZ | NULLABLE | Gesetzt wenn Konto anonymisiert wurde |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Anonymisierungsregeln** (DSGVO, FR-008):
- Bei Inaktivität > `RETENTION_CUSTOMER_MONTHS` (Standard: 24): `name` → `"[anonymisiert]"`, `email` → `"[anonymisiert]@[anonymisiert]"`, `phone` → `"[anonymisiert]"`.
- Bei Konto-Löschung: sofortige Anonymisierung.
- `anonymized_at` wird bei Anonymisierung gesetzt.

---

## Entität: Appointment (Termin) — Zentrale Buchungseinheit

**Zweck**: Verbindet Service, Teammitglied, Zeitfenster, Status und Kunden-/Gastdaten (FR-004, FR-005, FR-007).

| Feld | Typ | Constraints | Beschreibung |
|---|---|---|---|
| `id` | UUID | PK, NOT NULL | |
| `team_member_id` | UUID | FK → team_members.id, NOT NULL | Ausführendes Teammitglied |
| `service_id` | UUID | FK → services.id, NOT NULL | Gebuchte Dienstleistung |
| `customer_id` | UUID | FK → customers.id, NULLABLE | Verknüpftes Kundenkonto (oder NULL für Gast) |
| `guest_name` | VARCHAR(200) | NULLABLE | Gast-Name (wenn kein Kundenkonto) |
| `guest_phone` | VARCHAR(50) | NULLABLE | Gast-Telefon (wenn kein Kundenkonto) |
| `starts_at` | TIMESTAMPTZ | NOT NULL | Startzeit des Termins |
| `ends_at` | TIMESTAMPTZ | NOT NULL | Endzeit (= starts_at + service.duration_minutes) |
| `status` | ENUM | NOT NULL, DEFAULT 'confirmed' | `confirmed` / `completed` / `cancelled` / `no_show` |
| `notes` | TEXT | NULLABLE | Interne Notizen (Admin) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | |

**Status-Übergänge**:
```
confirmed → completed   (nach Erscheinen)
confirmed → cancelled   (Stornierung durch Kunden oder Admin)
confirmed → no_show     (nach ausgebliebenem Erscheinen)
```
Nur `confirmed`-Termine blockieren Slots (relevant für EXCLUDE-Constraint und Verfügbarkeitsberechnung).

**Constraints**:
```sql
-- Entweder Kundenkonto ODER Gastdaten (beides oder keins ist ungültig)
CHECK (
    (customer_id IS NOT NULL AND guest_name IS NULL AND guest_phone IS NULL)
    OR
    (customer_id IS NULL AND guest_name IS NOT NULL AND guest_phone IS NOT NULL)
)

-- Zeitreihenfolge
CHECK (ends_at > starts_at)

-- Doppelbuchungsschutz (btree_gist Extension erforderlich)
EXCLUDE USING GIST (
    team_member_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (status = 'confirmed')
```

**Anonymisierungsregeln** (DSGVO, FR-008):
- Gast-Termine ohne `customer_id`: nach `RETENTION_GUEST_MONTHS` (Standard: 12) Monaten → `guest_name` und `guest_phone` werden auf `"[anonymisiert]"` gesetzt.
- Der Termin selbst (Datum, Service, Teammitglied) bleibt für statistische Auswertung erhalten.

---

## Entity-Relationship-Übersicht

```
services ──── team_member_services ──── team_members
                                              │
                                    ┌─────────┼──────────┐
                               working_hours  │   working_exceptions
                                              │
salon_hours ─── [Verfügbarkeitsberechnung] ───┤
salon_closures ─────────────────────────────── │
                                              │
appointments ──────────────────────────────────┘
    │
    ├── customer_id → customers
    └── (guest_name, guest_phone) → Gast ohne Konto
```

---

## Enum-Definitionen

**AppointmentStatus**:
- `confirmed` — Termin ist bestätigt und belegt den Slot
- `completed` — Kunde ist erschienen, Termin abgeschlossen
- `cancelled` — Termin wurde storniert (gibt Slot frei)
- `no_show` — Kunde nicht erschienen (gibt Slot frei für Historik)
