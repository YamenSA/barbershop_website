# Research: Öffentliche Website (Phase 2)

Phase-0-Ausgabe. Löst die offenen technischen Fragen aus dem Technical Context auf. Keine
`[NEEDS CLARIFICATION]` mehr offen (3 fachliche Clarifications bereits in der Spec aufgelöst).

## R1 — Öffentlicher Datenzugriff: bestehende Stammdaten-Routen sind admin-geschützt

- **Decision**: Neuer **unauthentifizierter** Read-Router `public_router.py` im `stammdaten`-Domain,
  gemountet unter `/api/v1/public/`. Liefert nur **aktive** Datensätze über schlanke
  `Public*Read`-Schemas (keine `is_active`-Flags, keine internen Felder).
- **Rationale**: `backend/app/domains/stammdaten/router.py` ist global mit
  `APIRouter(dependencies=[Depends(get_current_admin)])` geschützt — die öffentliche Website
  kann diese Endpunkte nicht aufrufen. Ein separater Router hält die Grenze klar (Prinzip IV/V)
  und vermeidet, Auth auf einzelnen Routen aufzuweichen. Datenminimierung (Prinzip II): nur die
  öffentlich nötigen Felder werden serialisiert.
- **Alternatives considered**:
  - *`active_only`-Query auf bestehenden Routen + Auth lockern*: verwässert die Auth-Grenze,
    riskiert versehentliche Datenfreigabe interner Felder. Verworfen.
  - *Frontend liest direkt aus der DB*: verletzt Prinzip V (Frontend kennt nur die API). Verworfen.

## R2 — Quelle für Adresse/Telefon: neue SalonProfile-Entität

- **Decision**: Single-Row-Tabelle `salon_profile` (admin-verwaltet) mit Adresse, Telefon,
  optional E-Mail. Admin-CRUD (GET/PUT) im geschützten `router.py`; öffentliches Lesen im
  `public_router.py`. Öffnungszeiten bleiben in `salon_hours`.
- **Rationale**: Clarification Q1 → „Neue Admin-Einstellung". Im bestehenden Datenmodell/Config
  existiert keine Quelle für Adresse/Telefon (geprüft: `config.py` hat keine, kein Profil-Entity).
  Single-Row-Settings-Pattern ist die einfachste konsistente Lösung und speist FR-006 + die
  LocalBusiness-Strukturdaten (FR-010).
- **Alternatives considered**: ENV-Konstanten (keine redaktionelle Pflege, Redeploy nötig) und
  hartkodierter Content (nicht admin-pflegbar) — beide vom Nutzer in der Clarification verworfen.

## R3 — Datenfrische ~60 s vs. Performance-Budget

- **Decision**: Incremental Static Regeneration pro dynamischer Seite mit
  `export const revalidate = 60`. Server-side `fetch` mit `next: { revalidate: 60 }`.
- **Rationale**: Clarification Q2 → „nahezu aktuell (~60 s), Performance hat Vorrang". ISR liefert
  statisch vorgerenderte Seiten (bestes LCP/CLS, CWV-Budget eingehalten, SC-004) und revalidiert
  spätestens nach 60 s im Hintergrund → deaktivierte Dienstleistung/Team verschwindet innerhalb
  des Fensters (SC-002, FR-016). **Vor Implementierung** `frontend/node_modules/next/dist/docs/01-app/01-getting-started/09-revalidating.md` + `08-caching.md` lesen (Next 16 Caching-Semantik weicht von älteren Versionen ab).
- **Alternatives considered**: SSR pro Request (höhere Latenz/Last, CWV-Risiko) und reines SSG mit
  manuellem Rebuild (Änderungen nicht zeitnah sichtbar) — beide verworfen.

## R4 — Next.js 16 / App Router: SEO-Bausteine

- **Decision**:
  - **Metadata** pro Seite über `export const metadata` bzw. `generateMetadata` (Title/Description, FR-010).
  - **Sitemap** über `app/sitemap.ts` (MetadataRoute.Sitemap); **robots** über `app/robots.ts`.
  - **LocalBusiness-Strukturdaten** als JSON-LD `<script type="application/ld+json">` (eigene `JsonLd`-Komponente), gespeist aus SalonProfile + SalonHours (FR-010, SC-005).
  - **Fonts** über `next/font` (Display + Body, self-hosted → keine externen Requests, gut für CWV & Cookie-Freiheit).
- **Rationale**: Diese App-Router-Konventionen sind die idiomatische, build-integrierte Lösung in
  Next 16; self-hosted Fonts vermeiden Drittanfragen (FR-017, CWV). `frontend/AGENTS.md` warnt vor
  Breaking Changes — die gebündelten Docs (`14-metadata-and-og-images.md`, `13-fonts.md`,
  Metadata-File-Conventions für `sitemap`/`robots`) sind **vor** der Umsetzung zu konsultieren.
- **Alternatives considered**: `react-helmet`/manuelle `<head>`-Tags (nicht idiomatisch, schlechter
  für SSR/Streaming) — verworfen.

## R5 — DESIGN.md-Tokens in Tailwind v4

- **Decision**: OKLCH-Palette aus `DESIGN.md` als CSS-Variablen im `@theme`-Block in `globals.css`
  (Tailwind v4 CSS-first config). Zwei Schriftfamilien via `next/font` (Display: bold condensed
  Grotesk; Body: neutraler Sans) — finale Auswahl bei Implementierung mit Impeccable, dokumentiert
  zurück in `DESIGN.md`.
- **Rationale**: Tailwind v4 nutzt CSS-`@theme` statt `tailwind.config.js`. Tokens als Variablen
  halten `DESIGN.md` als Single Source of Truth (Prinzip XII). „One Identity Rule" (Malachit ≤2
  Elemente/Viewport) und „Flat-At-Rest" werden in Komponenten umgesetzt, von Emil reviewt.
- **Alternatives considered**: Legacy `tailwind.config.ts` mit JS-Tokens — nicht v4-idiomatisch.
  Inline-Styles — nicht wartbar, kein Token-System.

## R6 — Motion & Barrierefreiheit

- **Decision**: Motion ausschließlich über `transform`/`opacity` (CSS-Transitions; `motion`/Framer
  nur wo zweckgebunden). Globaler `@media (prefers-reduced-motion: reduce)`-Fallback (ruhige,
  gleichwertige Variante). Semantisches HTML, Skip-Link, sichtbarer Fokus (Malachit-Ring),
  Kontraste ≥ AA (Palette erfüllt laut DESIGN.md), Alt-Texte für Team-Fotos.
- **Rationale**: Konstitution Prinzip X/XII + FR-009/FR-011. Layout-auslösende Animationen sind
  verboten (DESIGN.md). Emil reviewt Feel/Micro-Interactions in dieser Phase.
- **Alternatives considered**: Scroll-Storytelling (GSAP) — Overkill, CWV-Risiko, nicht nötig.

## R7 — Redaktionelle Inhalte (Über uns, FAQ) & Leerzustände

- **Decision**: „Über uns" und „FAQ" als versionierter Content unter `frontend/src/content/`
  (TS/MDX-Module), im Projekt gepflegt, keine Admin-Editierbarkeit (FR-005). Dynamische Seiten mit
  null aktiven Daten rendern eine `EmptyState`-Komponente (FR-014).
- **Rationale**: Einfachste konsistente Lösung ohne CMS; Admin-Editierbarkeit ist explizit
  out-of-scope. FAQ als zugängliches Accordion (oder Definition-List) — Detailentscheidung bei
  Impeccable/Emil.
- **Alternatives considered**: Headless-CMS — über-engineered für eine Phase ohne Redaktionsbedarf.

## R8 — Rechtsinhalte (Impressum, Datenschutz)

- **Decision**: Seitenstruktur + Layout in dieser Phase; der **geprüfte rechtliche Text** ist
  Betreiber-Input und Live-Voraussetzung (kein Platzhalter beim Go-Live, FR-007). Datenschutztext
  spiegelt FR-017 (nur technisch notwendige Cookies) und die tatsächlich genutzten Dienste
  (SendGrid/Twilio betreffen Phase 3, Hosting).
- **Rationale**: Konstitution + Spec verbieten erfundenen Rechtsinhalt. Strukturarbeit ist
  unabhängig vom finalen Text umsetzbar.
- **Alternatives considered**: Generierter Mustertext live — durch Spec/Edge-Case ausgeschlossen.
