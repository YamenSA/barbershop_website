# Data Model: Öffentliche Website (Phase 2)

Phase-1-Ausgabe. Phase 2 liest überwiegend bestehende Entitäten und führt **eine** neue,
admin-verwaltete Entität ein: `SalonProfile`.

## Neue Entität

### SalonProfile *(neu)*

Admin-verwaltete Salon-Stammdaten als **Single-Row**-Settings-Tabelle. Quelle für Kontaktseite,
Footer und LocalBusiness-Strukturdaten (FR-015).

| Feld | Typ | Constraints | Beschreibung |
|---|---|---|---|
| `id` | UUID | PK | Identität (UUIDModel) |
| `name` | str | not null | Anzeigename des Salons (für Strukturdaten) |
| `street` | str | not null | Straße + Hausnummer |
| `postal_code` | str | not null | PLZ |
| `city` | str | not null | Ort |
| `country` | str | not null, default `"DE"` | Ländercode |
| `phone` | str | not null | Telefonnummer (E.164 oder Anzeigeformat) |
| `email` | str \| null | optional | Öffentliche Kontakt-E-Mail |
| `updated_at` | datetime (tz-aware) | not null | Letzte Änderung (TimestampModel) |

**Regeln**:
- Es existiert **genau eine** Zeile (Single-Row). Die Alembic-Migration seedet eine
  initiale Zeile mit Platzhalterwerten; der Betreiber pflegt die echten Daten vor Go-Live.
- Lesen ist öffentlich (kein Auth); Schreiben (PUT) ist admin-geschützt.
- Enthält **keine** personenbezogenen Kundendaten (DSGVO-Datenminimierung, Prinzip II).

**State**: kein Lebenszyklus — wird nur gelesen/aktualisiert.

## Bestehende Entitäten (nur gelesen)

Unverändert aus `backend/app/domains/stammdaten/models.py`. Öffentlich werden nur **aktive**
Datensätze und nur die öffentlich nötigen Felder exponiert (eigene `Public*Read`-Schemas).

### Service *(bestehend)*
- Öffentlich exponiert: `id`, `name`, `duration_minutes`, `price_cents`, `description`.
- Filter: nur `is_active = true`. `is_active` selbst wird **nicht** exponiert.

### TeamMember *(bestehend)*
- Öffentlich exponiert: `id`, `name`, `bio`, `photo_url`, zugeordnete aktive `services`
  (je `id`, `name`).
- Filter: nur `is_active = true`. Bei fehlendem `photo_url` greift im Frontend ein
  markenkonformer Platzhalter (Edge Case).

### SalonHours *(bestehend)*
- Öffentlich exponiert: `day_of_week` (0–6, Mo–So), `is_open`, `open_time`, `close_time`.
- Quelle für Kontaktseite, Footer und Strukturdaten (Öffnungszeiten).

### SalonClosure *(bestehend, optional)*
- Out-of-scope für Phase-2-Anzeige (Detailentscheidung). Falls genutzt: kommende Schließtage
  könnten ergänzend angezeigt werden — nicht verbindlich gefordert.

## Beziehungen

```text
SalonProfile (1 Zeile) ──> Kontaktseite / Footer / JSON-LD
Service (aktiv) ─────────> Dienstleistungsseite
TeamMember (aktiv) ──┬───> Team-Seite
                     └───> services (aktiv)  [n:m über team_member_services]
SalonHours (7 Zeilen) ──> Kontaktseite / Footer / JSON-LD
```

## Frontend-Inhalte (kein DB-Modell)

- **Redaktionelle Inhalte**: `ueber-uns`, `faq` als versionierte Content-Module unter
  `frontend/src/content/`.
- **SEO-Metadaten**: Pro Seite Titel/Beschreibung (Next-Metadata) + LocalBusiness-JSON-LD,
  abgeleitet aus SalonProfile + SalonHours.

## Migration

- Neue Alembic-Revision `xxxx_phase2_salon_profile`: erstellt Tabelle `salon_profile` und seedet
  eine Platzhalterzeile. Keine Änderung an bestehenden Tabellen.
