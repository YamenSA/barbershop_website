# API-Contract: Stammdaten

**Branch**: `001-fundament-domain` | **Date**: 2026-06-08
**Base URL**: `/api/v1`
**Auth**: Admin-Auth erforderlich (Details in Phase 1). Alle Endpunkte hier intern/admin.
**Format**: JSON (Content-Type: application/json)

---

## Services (Dienstleistungen)

### GET /services
Liste aller Dienstleistungen.

**Query-Parameter**:
- `active_only` (bool, optional, default: `true`) — nur aktive Services

**Response 200**:
```json
[
  {
    "id": "uuid",
    "name": "Herrenschnitt",
    "duration_minutes": 45,
    "price_cents": 2500,
    "is_active": true,
    "created_at": "2026-06-08T10:00:00Z",
    "updated_at": "2026-06-08T10:00:00Z"
  }
]
```

---

### POST /services
Neue Dienstleistung anlegen.

**Request Body**:
```json
{
  "name": "Herrenschnitt",
  "duration_minutes": 45,
  "price_cents": 2500
}
```

**Response 201**: Erstellter Service (vollständiges Objekt wie GET).

**Response 422**: Validierungsfehler (z.B. `duration_minutes` ≤ 0).

---

### GET /services/{id}
Einzelnen Service abrufen.

**Response 200**: Vollständiges Service-Objekt.
**Response 404**: Service nicht gefunden.

---

### PUT /services/{id}
Service aktualisieren (vollständige Ersetzung).

**Request Body**: Gleich wie POST (alle Felder erforderlich).

**Response 200**: Aktualisiertes Objekt.
**Response 404**: Service nicht gefunden.

---

### DELETE /services/{id}
Service deaktivieren (Soft-Delete, `is_active = false`).

**Response 204**: Kein Inhalt.
**Response 404**: Service nicht gefunden.

---

## Team Members (Teammitglieder)

### GET /team-members
Liste aller Teammitglieder.

**Query-Parameter**:
- `active_only` (bool, optional, default: `true`)

**Response 200**:
```json
[
  {
    "id": "uuid",
    "name": "Max Mustermann",
    "bio": "Spezialist für moderne Schnitte.",
    "photo_url": "https://...",
    "is_active": true,
    "services": ["uuid-service-1", "uuid-service-2"],
    "created_at": "2026-06-08T10:00:00Z",
    "updated_at": "2026-06-08T10:00:00Z"
  }
]
```

---

### POST /team-members
Neues Teammitglied anlegen.

**Request Body**:
```json
{
  "name": "Max Mustermann",
  "bio": "Spezialist für moderne Schnitte.",
  "photo_url": "https://..."
}
```

**Response 201**: Erstelltes Objekt.

---

### GET /team-members/{id}
Einzelnes Teammitglied abrufen (inkl. zugeordneter Services).

**Response 200**: Vollständiges Objekt.
**Response 404**: Nicht gefunden.

---

### PUT /team-members/{id}
Teammitglied aktualisieren.

**Response 200**: Aktualisiertes Objekt.
**Response 404**: Nicht gefunden.

---

### DELETE /team-members/{id}
Teammitglied deaktivieren (Soft-Delete).

**Response 204**: Kein Inhalt.
**Response 404**: Nicht gefunden.

---

### PUT /team-members/{id}/services
Service-Zuordnung ersetzen (alle bisherigen Zuordnungen werden ersetzt).

**Request Body**:
```json
{
  "service_ids": ["uuid-1", "uuid-2"]
}
```

**Response 200**:
```json
{ "assigned": ["uuid-1", "uuid-2"] }
```

**Response 404**: Teammitglied oder ein Service nicht gefunden.

---

### GET /team-members/{id}/services
Zugeordnete Services abrufen.

**Response 200**: Array von Service-Objekten.

---

## Salon Hours (Öffnungszeiten)

### GET /salon-hours
Aktuelle Öffnungszeiten (7 Einträge, einer pro Wochentag).

**Response 200**:
```json
[
  {
    "id": "uuid",
    "day_of_week": 0,
    "is_open": true,
    "open_time": "09:00",
    "close_time": "18:00"
  },
  {
    "id": "uuid",
    "day_of_week": 6,
    "is_open": false,
    "open_time": null,
    "close_time": null
  }
]
```

---

### PUT /salon-hours
Öffnungszeiten aktualisieren (alle 7 Wochentage auf einmal).

**Request Body**:
```json
[
  { "day_of_week": 0, "is_open": true, "open_time": "09:00", "close_time": "18:00" },
  { "day_of_week": 6, "is_open": false, "open_time": null, "close_time": null }
]
```

**Response 200**: Aktualisiertes Array.
**Response 422**: Validierungsfehler.

---

## Salon Closures (Ganztägige Schließungen)

### GET /salon-closures
Liste aller eingetragenen Schließungstage.

**Query-Parameter**:
- `from` (date, optional) — von Datum
- `to` (date, optional) — bis Datum

**Response 200**:
```json
[
  {
    "id": "uuid",
    "date": "2026-12-25",
    "reason": "Weihnachten",
    "created_at": "2026-06-08T10:00:00Z"
  }
]
```

---

### POST /salon-closures
Schließungstag eintragen.

**Request Body**:
```json
{ "date": "2026-12-25", "reason": "Weihnachten" }
```

**Response 201**: Erstellter Eintrag.
**Response 409**: Datum bereits eingetragen.

---

### DELETE /salon-closures/{id}
Schließungstag entfernen.

**Response 204**: Kein Inhalt.
**Response 404**: Nicht gefunden.

---

## Working Hours (Individuelle Arbeitszeiten)

### GET /team-members/{id}/working-hours
Arbeitszeiten eines Teammitglieds (bis zu 7 Einträge).

**Response 200**:
```json
[
  {
    "id": "uuid",
    "day_of_week": 0,
    "start_time": "09:00",
    "end_time": "17:00"
  }
]
```

---

### PUT /team-members/{id}/working-hours
Arbeitszeiten vollständig ersetzen.

**Request Body**:
```json
[
  { "day_of_week": 0, "start_time": "09:00", "end_time": "17:00" },
  { "day_of_week": 1, "start_time": "09:00", "end_time": "17:00" }
]
```

**Response 200**: Aktualisiertes Array.
**Response 422**: Zeiten außerhalb Salon-Öffnungszeiten.

---

## Working Exceptions (Ausnahmen)

### GET /team-members/{id}/exceptions
Ausnahmen eines Teammitglieds.

**Query-Parameter**:
- `from` (datetime, optional)
- `to` (datetime, optional)

**Response 200**:
```json
[
  {
    "id": "uuid",
    "starts_at": "2026-07-01T00:00:00Z",
    "ends_at": "2026-07-15T00:00:00Z",
    "reason": "Urlaub"
  }
]
```

---

### POST /team-members/{id}/exceptions
Ausnahme eintragen.

**Request Body**:
```json
{
  "starts_at": "2026-07-01T00:00:00Z",
  "ends_at": "2026-07-15T00:00:00Z",
  "reason": "Urlaub"
}
```

**Response 201**: Erstellte Ausnahme.
**Response 422**: `ends_at` ≤ `starts_at`.

---

### DELETE /team-members/{id}/exceptions/{exception_id}
Ausnahme entfernen.

**Response 204**: Kein Inhalt.
**Response 404**: Nicht gefunden.
