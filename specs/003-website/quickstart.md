# Quickstart & Validation: Öffentliche Website (Phase 2)

Validierungs-/Runbook für die öffentliche Website. Beweist die Feature-Funktion Ende-zu-Ende.
Implementierungsdetails gehören in `tasks.md` / die Umsetzung.

> ⚠️ **Vor jeglichem Frontend-Code**: `frontend/AGENTS.md` beachten und die gebündelten Next-16-Docs
> lesen — insbesondere `frontend/node_modules/next/dist/docs/01-app/01-getting-started/`:
> `09-revalidating.md`, `08-caching.md`, `13-fonts.md`, `14-metadata-and-og-images.md` sowie die
> Metadata-File-Conventions für `sitemap`/`robots`. Next 16 hat Breaking Changes ggü. älterem Wissen.

## Voraussetzungen

- Backend lauffähig (siehe `CLAUDE.md`): `docker compose up -d db`, `alembic upgrade head`,
  `uvicorn app.main:app --reload`.
- Neue Migration angewandt (`salon_profile` Tabelle + Seed-Zeile).
- Frontend: `cd frontend && npm install && npm run dev` (Next 16, Port 3000).
- Im Admin mindestens eine **aktive** Dienstleistung und ein **aktives** Teammitglied angelegt;
  SalonProfile mit echten/Test-Daten gepflegt.

## Backend-Validierung (öffentliche Endpunkte)

```sh
# Kein Auth nötig — alle müssen 200 liefern:
curl -s http://localhost:8000/api/v1/public/services      | jq
curl -s http://localhost:8000/api/v1/public/team          | jq
curl -s http://localhost:8000/api/v1/public/salon-hours   | jq
curl -s http://localhost:8000/api/v1/public/salon-profile | jq
```

**Erwartung**:
- `services`/`team` enthalten **nur aktive** Datensätze, **kein** `is_active`-Feld.
- Eine im Admin deaktivierte Dienstleistung verschwindet aus `/public/services`.
- `salon-hours` liefert 7 Einträge (Mo–So); `salon-profile` ein Objekt mit Adresse/Telefon.
- Schreibversuch ist unmöglich (nur GET definiert).

```sh
# Automatisierte Tests:
cd backend && pytest tests/integration/test_public_endpoints.py -v
```
**Erwartung**: Endpunkte ohne Auth erreichbar; nur aktive Daten; SalonProfile lesbar; PUT auf
SalonProfile ohne Admin → 401.

## Seiten-Validierung (FR-001 / SC-001)

Alle Routen erreichbar auf Mobil (375px) und Desktop:

| Route | Inhalt | Quelle |
|---|---|---|
| `/` | Hero + „Termin buchen"-CTA | statisch |
| `/dienstleistungen` | aktive Services (Name, Dauer, Preis, Beschreibung) | `/public/services` (ISR) |
| `/team` | aktive Mitglieder (Name, Foto, Bio, Services) | `/public/team` (ISR) |
| `/ueber-uns` | redaktioneller Text | `content/` |
| `/faq` | redaktionelle FAQ | `content/` |
| `/kontakt` | Adresse, Telefon, Öffnungszeiten | `/public/salon-profile` + `/public/salon-hours` |
| `/impressum` | Betreiber-Rechtsinhalt | Content |
| `/datenschutz` | Betreiber-Rechtsinhalt | Content |

## Akzeptanz-Szenarien (Auszug)

1. **Live-Daten (SC-002)**: Service im Admin deaktivieren → nach ≤ ~60 s nicht mehr auf
   `/dienstleistungen` (ISR-Revalidate). Gleiches für Teammitglied.
2. **Leerzustand (FR-014 / SC-008)**: Alle Services deaktivieren → `/dienstleistungen` zeigt
   sauberen Leerzustand statt leerer/kaputter Liste.
3. **CTA (FR-002)**: „Termin buchen" auf `/` verlinkt die (Phase-3-)Buchungsroute (Platzhalter).
4. **Footer-Pflichtlinks (FR-013)**: Impressum + Datenschutz auf jeder Seite über den Footer
   erreichbar; Kontakt/Öffnungszeiten im Footer vorhanden.
5. **Fehlendes Foto**: Teammitglied ohne `photo_url` → markenkonformer Platzhalter, kein
   gebrochenes Bild.

## Qualitäts-Gates

- **WCAG 2.1 AA (FR-009 / SC-003)**: Axe-/Lighthouse-Accessibility-Audit auf allen 8 Seiten ohne
  kritische Verstöße; Tastatur-Navigation + sichtbarer Fokus; Kontraste ≥ AA; Skip-Link.
- **Core Web Vitals (FR-011 / SC-004)**: Lighthouse-Mobile: LCP < 2,5 s, INP < 200 ms, CLS < 0,1.
- **Strukturdaten (FR-010 / SC-005)**: LocalBusiness-JSON-LD validiert (Rich-Results-Test) und
  enthält Name, Adresse, Öffnungszeiten, Telefon. `sitemap.xml` und `robots.txt` erreichbar.
- **Reduced Motion (SC-007)**: Mit `prefers-reduced-motion: reduce` keine aufdringliche Bewegung;
  gleichwertige ruhige Variante.
- **Cookies (FR-017)**: Im Browser-DevTools keine nicht-technischen Cookies; kein Consent-Banner.
- **Design (SC-006)**: Impeccable-Audit + Emil-Review bestätigen Palette/Typografie/Motion gemäß
  `DESIGN.md` (Midnight Black + Malachit + Brass, „One Identity Rule", Flat-At-Rest).
- **Sprache (FR-012)**: Alle Inhalte/UI auf Deutsch; `<html lang="de">`.
