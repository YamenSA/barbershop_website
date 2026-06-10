# API Contract: Öffentliche Read-Endpunkte + SalonProfile (Phase 2)

Alle öffentlichen Endpunkte sind **unauthentifiziert**, **read-only** und liefern nur **aktive**
Datensätze über schlanke `Public*Read`-Schemas. Gemountet unter `/api/v1/public/`. Admin-Pflege
des SalonProfile läuft über den bestehenden geschützten Router.

Basis-URL: `/api/v1`

---

## Öffentlich (kein Auth)

### GET /public/services

Aktive Dienstleistungen für die Dienstleistungsseite.

**Response 200** — `PublicServiceRead[]`
```json
[
  {
    "id": "uuid",
    "name": "Herrenhaarschnitt",
    "duration_minutes": 30,
    "price_cents": 2900,
    "description": "Waschen, Schneiden, Styling."
  }
]
```
- Sortierung: nach `name` (stabil). Leeres Array, wenn keine aktiven Services → Frontend-Leerzustand (FR-014).
- `is_active` wird NICHT exponiert (nur aktive sind enthalten).

### GET /public/team

Aktive Teammitglieder inkl. ihrer aktiven Dienstleistungen.

**Response 200** — `PublicTeamMemberRead[]`
```json
[
  {
    "id": "uuid",
    "name": "Marco",
    "bio": "10 Jahre Erfahrung in klassischen Cuts.",
    "photo_url": "https://.../marco.jpg",
    "services": [{ "id": "uuid", "name": "Herrenhaarschnitt" }]
  }
]
```
- `photo_url` kann `null` sein → Frontend zeigt markenkonformen Platzhalter.
- Leeres Array → Frontend-Leerzustand (FR-014).

### GET /public/salon-hours

Wöchentliche Öffnungszeiten für Kontaktseite, Footer und Strukturdaten.

**Response 200** — `PublicSalonHoursRead[]`
```json
[
  { "day_of_week": 0, "is_open": true, "open_time": "09:00:00", "close_time": "18:00:00" },
  { "day_of_week": 6, "is_open": false, "open_time": null, "close_time": null }
]
```
- `day_of_week`: 0 = Montag … 6 = Sonntag. Immer 7 Einträge.

### GET /public/salon-profile

Adresse/Telefon des Salons (FR-015).

**Response 200** — `SalonProfileRead`
```json
{
  "name": "Precision Cut Barbershop",
  "street": "Beispielstraße 1",
  "postal_code": "10115",
  "city": "Berlin",
  "country": "DE",
  "phone": "+49 30 1234567",
  "email": "hallo@example.de"
}
```
- Genau ein Objekt (Single-Row). `email` optional/`null`.

---

## Admin (Auth: `get_current_admin`)

### GET /salon-profile
Liefert das SalonProfile zur Bearbeitung. **Response 200** — `SalonProfileRead`.

### PUT /salon-profile
Aktualisiert das SalonProfile.

**Request** — `SalonProfileUpdate` (alle Felder optional, Teil-Update)
```json
{ "street": "Neue Straße 5", "phone": "+49 30 7654321" }
```
**Response 200** — `SalonProfileRead`.
**Errors**: `401` (kein Admin), `422` (Validierung).

---

## Caching / Frische (FR-016)

- Frontend liest die `/public/*`-Endpunkte server-side mit ISR (`revalidate = 60`).
- Änderungen (Aktivieren/Deaktivieren, geänderte Zeiten/Profil) werden spätestens nach ~60 s
  öffentlich sichtbar (SC-002).
- Endpunkte selbst sind zustandslos; HTTP-Caching-Header optional (`Cache-Control: public, max-age=0`),
  die Frische wird durch ISR im Frontend gesteuert.

## Sicherheits-/DSGVO-Hinweise

- Öffentliche Endpunkte geben **keine** `is_active`-Flags, internen Audit-Felder oder
  personenbezogenen Daten zurück (Datenminimierung, Prinzip II).
- Keine Mutationen über `/public/*` — ausschließlich GET.
- CORS bereits global aktiv (`main.py`).
