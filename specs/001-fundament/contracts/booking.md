# API-Contract: Booking (Verfügbarkeit & Termine)

**Branch**: `001-fundament-domain` | **Date**: 2026-06-08
**Base URL**: `/api/v1`
**Auth**: Availability-Endpunkt ist öffentlich (Phase 2+); Appointment-Endpunkte sind admin-geschützt (Details Phase 1).
**Format**: JSON (Content-Type: application/json)

---

## Availability (Verfügbarkeit)

### GET /availability
Berechnet verfügbare Zeitslots für eine Dienstleistung an einem Datum.

Kein Slot wird gespeichert — Ergebnis ist immer live berechnet (FR-006).

**Query-Parameter**:

| Parameter | Typ | Pflicht | Beschreibung |
|---|---|---|---|
| `service_id` | UUID | Ja | Gewünschte Dienstleistung |
| `date` | DATE (YYYY-MM-DD) | Ja | Gewünschtes Datum |
| `team_member_id` | UUID | Nein | Filter auf bestimmtes Teammitglied |

**Response 200**:
```json
{
  "date": "2026-07-15",
  "service_id": "uuid",
  "service_duration_minutes": 45,
  "slots": [
    {
      "team_member_id": "uuid",
      "team_member_name": "Max Mustermann",
      "starts_at": "2026-07-15T09:00:00Z",
      "ends_at": "2026-07-15T09:45:00Z"
    },
    {
      "team_member_id": "uuid",
      "team_member_name": "Max Mustermann",
      "starts_at": "2026-07-15T09:45:00Z",
      "ends_at": "2026-07-15T10:30:00Z"
    }
  ]
}
```

**Response 200** (keine Slots verfügbar):
```json
{
  "date": "2026-12-25",
  "service_id": "uuid",
  "service_duration_minutes": 45,
  "slots": []
}
```

**Response 404**: `service_id` oder `team_member_id` nicht gefunden.
**Response 422**: Ungültiges Datum (Vergangenheit oder Format).

**Fehlerformat** (gilt für alle Endpunkte):
```json
{
  "detail": "Service not found",
  "code": "NOT_FOUND"
}
```

---

## Appointments (Termine)

### GET /appointments
Liste von Terminen (Admin-Ansicht).

**Query-Parameter**:

| Parameter | Typ | Beschreibung |
|---|---|---|
| `date` | DATE | Filter auf Datum (Priorität vor from/to) |
| `from` | DATETIME | Von-Datum |
| `to` | DATETIME | Bis-Datum |
| `team_member_id` | UUID | Filter auf Teammitglied |
| `status` | STRING | Filter auf Status (confirmed/completed/cancelled/no_show) |
| `page` | INT (default: 1) | Seitennummer |
| `page_size` | INT (default: 50, max: 200) | Einträge pro Seite |

**Response 200**:
```json
{
  "items": [
    {
      "id": "uuid",
      "team_member_id": "uuid",
      "team_member_name": "Max Mustermann",
      "service_id": "uuid",
      "service_name": "Herrenschnitt",
      "customer_id": "uuid",
      "customer_name": "Hans Müller",
      "guest_name": null,
      "guest_phone": null,
      "starts_at": "2026-07-15T10:00:00Z",
      "ends_at": "2026-07-15T10:45:00Z",
      "status": "confirmed",
      "notes": null,
      "created_at": "2026-07-10T12:00:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "page_size": 50
}
```

---

### POST /appointments
Neuen Termin anlegen (Online-Buchung oder Admin-Eintrag).

**Request Body** (Kundenkonto):
```json
{
  "team_member_id": "uuid",
  "service_id": "uuid",
  "customer_id": "uuid",
  "starts_at": "2026-07-15T10:00:00Z",
  "notes": null
}
```

**Request Body** (Gast / Laufkundschaft):
```json
{
  "team_member_id": "uuid",
  "service_id": "uuid",
  "guest_name": "Hans Müller",
  "guest_phone": "+49 170 1234567",
  "starts_at": "2026-07-15T10:00:00Z",
  "notes": "Erstbesuch"
}
```

`ends_at` wird vom Backend aus `starts_at + service.duration_minutes` berechnet.

**Response 201**: Erstellter Termin (vollständiges Objekt).

**Response 409**: Doppelbuchungs-Konflikt (EXCLUDE-Constraint verletzt):
```json
{
  "detail": "Team member has an overlapping confirmed appointment at the requested time.",
  "code": "BOOKING_CONFLICT",
  "conflicting_slot": {
    "starts_at": "2026-07-15T09:45:00Z",
    "ends_at": "2026-07-15T10:30:00Z"
  }
}
```

**Response 422**: Validierungsfehler (z.B. `starts_at` in der Vergangenheit, Service nicht vom Teammitglied angeboten).

---

### GET /appointments/{id}
Einzelnen Termin abrufen.

**Response 200**: Vollständiges Termin-Objekt.
**Response 404**: Nicht gefunden.

---

### PATCH /appointments/{id}/status
Status eines Termins ändern.

**Request Body**:
```json
{ "status": "completed" }
```

Erlaubte Übergänge:
- `confirmed` → `completed`
- `confirmed` → `cancelled`
- `confirmed` → `no_show`

**Response 200**: Aktualisiertes Termin-Objekt.
**Response 409**: Ungültiger Status-Übergang.
**Response 404**: Nicht gefunden.

---

## Customers (Kunden)

### GET /customers
Kundenliste (Admin).

**Query-Parameter**:
- `search` (string) — Suche in Name und E-Mail
- `page`, `page_size`

**Response 200**:
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Hans Müller",
      "email": "hans@example.com",
      "phone": "+49 170 1234567",
      "last_active_at": "2026-06-01T10:00:00Z",
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 127,
  "page": 1,
  "page_size": 50
}
```

Anonymisierte Kunden werden nicht in der Liste angezeigt (`anonymized_at IS NOT NULL` werden gefiltert).

---

### POST /customers
Neuen Kunden anlegen (Registrierung oder Admin-Anlage).

**Request Body**:
```json
{
  "name": "Hans Müller",
  "email": "hans@example.com",
  "phone": "+49 170 1234567"
}
```

**Response 201**: Erstelltes Kunden-Objekt.
**Response 409**: E-Mail bereits registriert.

---

### GET /customers/{id}
Einzelnen Kunden abrufen.

**Response 200**: Vollständiges Kunden-Objekt.
**Response 404**: Nicht gefunden oder bereits anonymisiert.

---

### DELETE /customers/{id}
Kunden-Konto löschen — löst sofortige DSGVO-Anonymisierung aus.

**Response 204**: Kein Inhalt. Alle verknüpften Termine sind anonymisiert.
**Response 404**: Nicht gefunden.

---

## Retention (DSGVO-Anonymisierung)

Der Anonymisierungslauf ist **kein HTTP-Endpunkt**, sondern ein CLI-Verwaltungsskript. Dies vermeidet einen ungeschützten Admin-Endpunkt in Phase 0 und ermöglicht die Ausführung via Cron-Job ohne Netzwerk-Zugriff.

```bash
python backend/scripts/run_retention.py
```

**Stdout-Output** (JSON):
```json
{
  "anonymized_guest_appointments": 42,
  "anonymized_customers": 3,
  "duration_seconds": 1.2
}
```

Der Lauf wird in Phase 1 (Admin-Backend) über einen Cron-Job oder Task-Queue gesteuert.

**Sofortige Anonymisierung** bei Kunden-Löschung erfolgt im `CustomerService` direkt (kein separater CLI-Aufruf nötig):
- `DELETE /customers/{id}` → löst `anonymize_immediately()` im Service-Layer aus
- Ergebnis: Response 204; Kundendaten in DB anonymisiert
