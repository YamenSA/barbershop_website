# Phase 1 — Data Model: Marketing & Content

Quelle: [spec.md](./spec.md) (Key Entities + FR), Entscheidungen aus [research.md](./research.md). Bestehende Phasen-1/2-Entitäten werden **wiederverwendet**; hier nur Erweiterungen und Neuanlagen.

## Enums (Backend, `stammdaten/models.py`)

### `TargetGroup` (Zielgruppe)
`str, Enum` — Werte: `HERREN`, `DAMEN`, `KINDER`.

### `ServiceKind` (Leistungsart)
`str, Enum` — Werte: `SCHNITT`, `BART`, `FARBE`, `STYLING`, `SONSTIGES`.
- `SONSTIGES` als Auffangwert, damit das Backfill keine Lücke hat (research D1).

## Erweiterte Entität: `Service` (bestehend, `stammdaten`)

Neue Felder zusätzlich zu `name, duration_minutes, price_cents, description, is_active`:

| Feld | Typ | Constraints | Quelle |
|---|---|---|---|
| `target_group` | `TargetGroup` | **NOT NULL** | FR-001, Clarify Q2 |
| `service_kind` | `ServiceKind` | **NOT NULL** | FR-001, Clarify Q2 |

- **Validierung**: genau eine Zielgruppe pro Leistung (durch Single-Enum-Spalte strukturell garantiert). `create`/`update` verlangen beide Felder beim Anlegen.
- **Migration `012_service_categorization.py`** (`down_revision = "011"`): Spalten nullable + temp-Default → kuratiertes `UPDATE` **je bestehender Leistung** (fachlich korrekte Werte per Name, **kein Blanket-`HERREN`-Default**) → Default entfernen → `SET NOT NULL`. Kein „uncategorized"-Zustand (research D2).
- **Öffentliche Ausgabe**: `PublicServiceRead` um `target_group`, `service_kind` erweitert; Gruppierung nach Zielgruppe erfolgt im Frontend.

## Neue Entität: `Promotion` (Aktion/Angebot, neue Domäne `marketing`)

Tabelle `promotions` (erbt `UUIDModel` + `TimestampModel` wie übrige Modelle).

| Feld | Typ | Constraints | Quelle |
|---|---|---|---|
| `id` | UUID | PK | — |
| `title` | str | NOT NULL | FR-009 |
| `description` | str | NOT NULL | FR-009 |
| `starts_on` | date | NOT NULL | FR-009, Clarify Q4 |
| `ends_on` | date | NOT NULL, `>= starts_on` | FR-009, Clarify Q4 |
| `is_active` | bool | NOT NULL, default `true` | Clarify Q4 |
| `created_at` / `updated_at` | datetime (tz) | NOT NULL | TimestampModel |

### Abgeleitetes Feld: `effective_status` (berechnet, nicht persistiert)
Wertebereich (EN-Identifier im API-Vertrag) `{ visible, scheduled, expired, hidden }`; im Admin-`Read`-Schema enthalten (Konstitution V — Berechnung im Backend). Die **Lokalisierung** (sichtbar/geplant/abgelaufen/versteckt) erfolgt in der Admin-UI-Schicht (M1).

Berechnung (mit `today` = aktuelles Datum in **Europe/Berlin** — verbindlich, siehe unten):
```
if not is_active:            effective_status = "hidden"
elif today < starts_on:      effective_status = "scheduled"
elif today > ends_on:        effective_status = "expired"
else:                        effective_status = "visible"
```

### ⚠️ Zeitzone (verbindlich, I2)
`today` MUSS in **Europe/Berlin** ermittelt werden (gleiche tz-Disziplin wie Buchung Phase 3 / Anonymisierung Phase 4). Eine UTC-Off-by-one ließe ein abgelaufenes Angebot bis zu einen Tag zu lange öffentlich stehen → UWG-Irreführung. Test deckt den Tagesgrenzen-Fall ab.

### Öffentliche Sichtbarkeitsregel
Eine Promotion ist öffentlich sichtbar **genau dann**, wenn `is_active AND starts_on <= today <= ends_on` (entspricht `effective_status == "visible"`). Abgelaufene Aktionen werden durch das Datum **erzwungen** ausgeblendet (FR-009, UWG).

### Validierungsregeln
- `ends_on >= starts_on` → sonst `422`.
- `title`, `description` nicht leer.

### Persistenz & Migration
Tabelle `promotions` via Migration **`013_promotions.py`** mit `down_revision = "012"` (folgt auf die Service-Enums aus `012`).

### Zustandsübergänge (nur datums-/toggle-getrieben, keine manuelle Status-Spalte)
`scheduled → visible → expired` (durch Zeitablauf) und orthogonal `hidden` (durch `is_active=false`). Es gibt **keine** persistierte Status-Spalte; der Status ist stets eine reine Funktion aus `is_active`, `starts_on`, `ends_on`, `today`.

## Statische Repo-Inhalte (kein DB-Storage)

### Galerie-Manifest (`frontend/src/content/galerie/manifest.json`) — Einwilligungs-Registratur
Array von Einträgen:

| Feld | Typ | Constraints | Quelle |
|---|---|---|---|
| `id` | string | eindeutig | FR-016 |
| `beforeSrc` | string | Pfad unter `/galerie/` | FR-010 |
| `afterSrc` | string | Pfad unter `/galerie/` | FR-010 |
| `alt` | string | nicht leer (a11y) | FR-018 |
| `consentProofId` | string | **nicht leer** → sonst nicht veröffentlichbar | FR-016, SC-005 |
| `publishedAt` | string (ISO-Datum) | optional | — |

- **Guard (FR-016/SC-005)**: Loader rendert nur Einträge mit nicht-leerer `consentProofId`; ein Test schlägt fehl, wenn ein veröffentlichter Eintrag den Nachweis vermissen lässt.
- **Datenschutz**: `consentProofId` ist eine **interne Referenz** auf einen offline geführten Nachweis — keine Personendaten im Repo (research D4).

### Bewertungs-Snapshot (`frontend/src/content/reviews.json`)
Objekt:

| Feld | Typ | Hinweis |
|---|---|---|
| `profileUrl` | string | Link zum Google-Profil (Live-Gesamtbewertung dort) |
| `writeReviewUrl` | string | „Bewertung schreiben"-Link |
| `reviews` | Review[] | kuratierte Einzelzitate |

`Review`:

| Feld | Typ | Hinweis |
|---|---|---|
| `id` | string | eindeutig |
| `author` | string | **Vorname wie öffentlich auf Google** (Personendatum Dritter → nur öffentlich Vorhandenes, entfernbar) |
| `rating` | number (1–5) | Einzelbewertung des Zitats |
| `text` | string | Zitat |
| `date` | string (ISO) | Datum der Bewertung |
| `sourceUrl` | string | Attribution/Link zur Quelle |

- **Keine** aggregierte Gesamtbewertung als-live darstellen (FR-013, UWG — research D5). **Reiner First-Party-Text — kein eingebettetes Google-Bewertungs-Widget/-Skript** (sonst consent-pflichtig; Guard D5).

## Client-Zustand: Consent (kein Personendatum, kein Server)

| Schlüssel | Speicher | Werte | Zweck |
|---|---|---|---|
| `consent:maps` | `localStorage` | `"granted"` \| (absent) | Karte erst nach Einwilligung laden; widerrufbar (FR-012, SC-002) |

**⚠️ Guard (D6)**: Die Vorschau vor Consent MUSS ein **selbst gehostetes** Platzhalter-/Eigenbild sein — **kein** Google-Static-Maps-Bild/-Tile, sonst Drittanbieter-Request vor Einwilligung. Verifikation im Netzwerk-Tab.

## Frontend-Config (`site-config.ts`, env-getrieben — nur neue Werte)
`whatsappNumber`, `instagramUrl`, `tiktokUrl`, `writeReviewUrl`, `googleProfileUrl`, `geo { lat, lng }`, `mapEmbedUrl`. **NAP** (Name/Adresse/Telefon/Öffnungszeiten) NICHT hier — kommt aus `/public/salon-profile` + `/public/salon-hours` (Clarify Q3, research D7).

## Wiederverwendete Entitäten (unverändert)
- `TeamMember` (Phase 1) → öffentliche Team-Seite (FR-008).
- `SalonProfile`, `SalonHours` (Phase 2) → NAP + LocalBusiness-Schema (FR-015) + Map-Adresse.
- `Appointment`/Buchungs-Engine (Phase 3/4) → **unverändert**; CTAs verlinken auf `/termin` (FR-003/FR-004).
