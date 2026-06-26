<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at `specs/006-marketing-content/plan.md`.
<!-- SPECKIT END -->

## UI-/Theme-Konventionen

**`DESIGN.md` ist die Single Source of Truth.** Details + Ratios dort; Kurzfassung
(symmetrisch zu `CLAUDE.md`):

- **Public-Text-Tiers (Tokens, gegen echtes BG `oklch(0.10 0 0)`):** `text-ink` `#F5F5F5` (~18.9:1, Primär) · `text-secondary` `#B8B8B8` (~10.4:1, Fließtext/Bios/Sublines) · `text-tertiary`/`text-ash` `#999999` (~7.2:1, Meta/Chips/„Mein Konto"). Keine Ad-hoc-`text-gray-*`/Opacity-Tricks. `#999999` ist die Untergrenze für kleinen Text.
- **Button-Label-Regel:** Label auf Malachite-**Flächen** ist dunkel (`text-midnight`, ~6.8:1) — niemals weiß (~2.8:1, reißt AA). Weißes Label nur auf dunklerem Grün (Admin `#15803D`, ~4.7:1). Malachite als **Text** auf Dunkel ist ok.
- **Admin = gepinntes HELLES Theme:** `.admin-shell` setzt `color-scheme: light` + eigene Tokens (`--admin-page/-surface/-border/-text/-text-muted/-primary`). Jede Fläche setzt BG **und** Text explizit; erbt nichts von den umschaltenden Public-Tokens. Akzent grün (`#15803D`), **kein Indigo**. Jedes Paar ≥ 4.5:1.
- **Skip-Link (WCAG 2.4.1):** in `app/layout.tsx`, Ruhezustand `sr-only`, bei `focus-visible` Malachite-Pill **oben-zentriert** (`z-[9999]`) — nicht oben-links, damit das Logo nicht überlagert wird.
- **Startseite (`app/page.tsx`):** rendert eigenes `Nav`+`Footer`; feste 8-Sektionen-Reihenfolge (Hero → Leistungs-Highlights → Team-Teaser → Galerie-Vorschau → Warum wir → Öffnungszeiten+Standort → finaler CTA → Footer); vorhandene Daten/Komponenten wiederverwenden, kein neuer Content; Karte consent-frei als statisches Bild.
- **Header-Aktionshierarchie**: *Primär* „Termin buchen“ (Malachite-Solid-Button); *Sekundär* „Mein Konto“ untergeordnet mit `User`-Icon, `text-tertiary`, Brass nur im `:hover`/active, `focus-visible:ring-brass/60`.
