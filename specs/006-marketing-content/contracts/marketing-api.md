# API Contract — Marketing & Content

Basis-Präfix: `/api/v1`. Neue/erweiterte Endpunkte. Admin-Routen sind durch `get_current_admin` geschützt (Cookie + Admin-JWT, Phase 1). Öffentliche Routen unter `/api/v1/public` ohne Auth. Alle I/O über Pydantic-Schemas; `backend/openapi.json` wird nach Implementierung neu exportiert.

## Enums

```
TargetGroup = "HERREN" | "DAMEN" | "KINDER"
ServiceKind = "SCHNITT" | "BART" | "FARBE" | "STYLING" | "SONSTIGES"
PromotionStatus = "visible" | "scheduled" | "expired" | "hidden"
```

> `PromotionStatus` nutzt **englische Identifier** (Glossar-Konvention: Code = EN). Die Anzeige-Lokalisierung (sichtbar/geplant/abgelaufen/versteckt) erfolgt in der Admin-UI-Schicht, nicht im API-Vertrag (M1).

## 1. Erweiterte Service-Endpunkte (Domäne `stammdaten`)

Bestehende Endpunkte; Schemas um `target_group` + `service_kind` erweitert (beide Pflicht beim Anlegen).

### `POST /services` (admin) — erweitert
Request `ServiceCreate`:
```json
{
  "name": "Herrenhaarschnitt",
  "duration_minutes": 30,
  "price_cents": 2500,
  "description": "…",
  "is_active": true,
  "target_group": "HERREN",
  "service_kind": "SCHNITT"
}
```
- `422` wenn `target_group`/`service_kind` fehlen oder kein gültiger Enum-Wert.

### `PUT /services/{id}` (admin) — erweitert
`ServiceUpdate`: `target_group?`, `service_kind?` zusätzlich optional (Partial-Update).

### `GET /services`, `GET /services/{id}` (admin) — `ServiceRead`
Enthält nun `target_group`, `service_kind`.

### `GET /public/services` — `PublicServiceRead[]` — erweitert
```json
[
  {
    "id": "uuid",
    "name": "Herrenhaarschnitt",
    "duration_minutes": 30,
    "price_cents": 2500,
    "description": "…",
    "target_group": "HERREN",
    "service_kind": "SCHNITT"
  }
]
```
- Nur aktive Leistungen (bestehendes Verhalten). Gruppierung nach Zielgruppe erfolgt clientseitig.

## 2. Aktionen/Angebote (neue Domäne `marketing`)

### `POST /promotions` (admin) — `PromotionCreate` → `201 PromotionRead`
Request:
```json
{
  "title": "Sommer-Special",
  "description": "10% auf alle Farbbehandlungen",
  "starts_on": "2026-07-01",
  "ends_on": "2026-08-31",
  "is_active": true
}
```
Responses:
- `201` `PromotionRead` (inkl. `effective_status`).
- `422` wenn `ends_on < starts_on` oder Pflichtfelder leer.

### `GET /promotions` (admin) — `PromotionRead[]`
Alle Aktionen (unabhängig vom Status), jeweils mit berechnetem `effective_status` für die Admin-Anzeige.
```json
[
  {
    "id": "uuid",
    "title": "Sommer-Special",
    "description": "…",
    "starts_on": "2026-07-01",
    "ends_on": "2026-08-31",
    "is_active": true,
    "effective_status": "scheduled",
    "created_at": "…",
    "updated_at": "…"
  }
]
```

### `GET /promotions/{id}` (admin) — `PromotionRead`
- `404` wenn nicht vorhanden.

### `PUT /promotions/{id}` (admin) — `PromotionUpdate` → `PromotionRead`
Partial: `title?`, `description?`, `starts_on?`, `ends_on?`, `is_active?`.
- `422` wenn resultierend `ends_on < starts_on`.
- `404` wenn nicht vorhanden.

### `DELETE /promotions/{id}` (admin) → `204`
- `404` wenn nicht vorhanden.

### `GET /public/promotions` — `PublicPromotionRead[]`
Nur **öffentlich sichtbare** Aktionen: `is_active AND starts_on <= today <= ends_on`, wobei `today` in **Europe/Berlin** ermittelt wird (verbindlich, I2). Abgelaufene/geplante/versteckte werden **nicht** ausgeliefert (FR-009, UWG).
```json
[
  {
    "id": "uuid",
    "title": "Sommer-Special",
    "description": "10% auf alle Farbbehandlungen",
    "starts_on": "2026-07-01",
    "ends_on": "2026-08-31"
  }
]
```
- Leeres Array, wenn keine aktive Aktion → Frontend blendet den Bereich aus (FR-009).

## Fehlerschema (einheitlich, Phase-1-Konvention)
- `401` fehlende/ungültige Admin-Session (admin-Routen).
- `404` Ressource nicht vorhanden.
- `422` Validierungsfehler (Pydantic / `ends_on < starts_on`).

## Nicht Teil des API-Vertrags (statische Frontend-Inhalte)
Galerie-Manifest, Bewertungs-Snapshot, Kontakt-/Site-Config, Consent-Status und das LocalBusiness-JSON-LD sind **kein** Backend-API-Vertrag (research D4/D5/D6/D7/D8) — sie liegen als versionierte Repo-Dateien bzw. clientseitiger Zustand vor und werden in [data-model.md](../data-model.md) beschrieben.
