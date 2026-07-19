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
- **Theme-Grenze & Admin-Bereich:**
  - **Public & Kundenseite (`/`, `/konto/*`):** Dark-Theme-only (`oklch(0.12 0.000 0)` Basis).
  - **Admin (`/admin/*`):** Gepinntes HELLES Theme. `.admin-shell` setzt `color-scheme: light` + eigene Tokens (`--admin-page/-surface/-border/-text/-text-muted/-primary`). Jede Fläche setzt BG **und** Text explizit; erbt nichts von den umschaltenden Public-Tokens. Akzent grün (`#15803D`), **kein Indigo**. Jedes Paar ≥ 4.5:1.
  - **Semantische Status-Farben (Admin):** Für dynamische UI-Zustände (Erfolg, Fehler, Warnungen) nutzt der Code bewusst native Tailwind-Klassen zur Erweiterung des hellen Themes: `text-red-600`/`bg-red-50` (Fehler), `text-green-700` oder `#15803D`/`bg-green-50` (Erfolg), `text-amber-700`/`bg-gray-50` (Ungespeichert), sowie `bg-malachite/10 text-malachite` (Status: Aktiv) und `bg-brass/10 text-brass` (Status: Geplant).
- **Skip-Link (WCAG 2.4.1):** in `app/layout.tsx`, Ruhezustand `sr-only`, bei `focus-visible` Malachite-Pill **oben-zentriert** (`z-[9999]`) — nicht oben-links, damit das Logo nicht überlagert wird.
- **Startseite (`app/page.tsx`):** rendert eigenes `Nav`+`Footer`; feste 8-Sektionen-Reihenfolge (Hero → Leistungs-Highlights → Team-Teaser → Galerie-Vorschau → Warum wir → Öffnungszeiten+Standort → finaler CTA → Footer); vorhandene Daten/Komponenten wiederverwenden, kein neuer Content; Karte consent-frei als statisches Bild.
- **Header-Aktionshierarchie**: *Primär* „Termin buchen“ (Malachite-Solid-Button); *Sekundär* „Mein Konto“ untergeordnet mit `User`-Icon, `text-tertiary`, Brass nur im `:hover`/active, `focus-visible:ring-brass/60`.

## Offene Befunde (Architektur / DSGVO)
Es gibt derzeit folgende dokumentierte Befunde (siehe `docs/analysis/ADMIN_FIX_SPEC.md` für Details):
- **M10:** DSGVO: PII in `appointments` (Gastdaten/Notes) wird bei Anonymisierung eines Kunden nicht mit gelöscht. **Entscheidung:** Das Feld `notes` wird immer zwingend geleert, da Freitext nicht sicher auf Personenbezug prüfbar ist (Namen, Orte). Diese Notizen dürfen später nicht als "Feature" gerettet werden.
- **M11:** DSGVO: Fehlender Datenexport (Art. 15) für Admins.
- **M12:** Security/Audit: Fehlendes `anonymized_by` und Audit-Log bei Löschungen.
- **M13:** DSGVO: Retention-Logik für inaktive Kunden (Fokus: passwortlose Online-Bucher).
- **M14:** Admin-Tabellen (`customers`, `hours`, `services`, `team`) überlaufen horizontal bei <700px und verdecken Aktionen.
- **M15:** Admin-Kalender: Fehlende Kontaktdaten (Telefon) und Kundenlink im Termin-Modal.
- **M16:** Admin-Kalender: Neues Datum & Uhrzeit im Termin-Modal unschön (leer) vorbelegt.
- **M17:** Admin-Kalender: Inkonsistente Akzentfarbe (Violett in Modal und Events statt Malachite).
