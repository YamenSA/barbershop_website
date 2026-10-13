# Redesign „Bogen & Linie“ – Arbeitsplan

## Arbeitsweise (verbindlich)
- Yamen ist Student und arbeitet in kleinen Schritten. Immer nur EIN kleiner Schritt, dann stoppen und kurz berichten. Erklärungen kurz, erst Gesamtbild, dann Detail. Keine Termin-/Zeitplan-Diskussionen.
- Du (Codex) implementierst und prüfst selbst kritisch. Du darfst nicht in .git schreiben: Commits macht Yamen selbst, immer mit expliziten Pfaden (nie `git add -A`). Gib ihm dafür die fertigen Befehle (einzeln, kurz).
- Bei jedem Befehl sagen, wo er läuft: RECHNER, SERVER oder COOLIFY.
- Kein Merge, kein Push ohne Yamens ausdrückliche Freigabe in dem Moment.
- Nach jeder Änderung: `npm run build` grün. Neue Komponenten zuerst auf `/design-vorschau` zeigen; Yamen prüft im Browser (Dev-Server läuft oft auf Port 3001).
- Keine Secrets, keine Kundendaten im Chat.

## Stand
- Branch `redesign` basiert auf `hotfix/timezone` (Zeitzonen-Hotfix, noch nicht live). Der Hotfix geht zuerst live (Ablauf: docs/deploy/TIMEZONE_HOTFIX_LIVEGANG.md). `redesign` wird erst danach gemergt.
- Fertig: Design-Tokens (additiv in globals.css), lokale Schriften (fonts.ts, Klassen font-brand/font-text), Button, Vorschau-Seite, SiteHeader inkl. Handy-Menü (<dialog>), BottomBar.
- Design-Referenz: design_handoff_azzam_salon/ (git-ignored). README + .dc.html-Dateien.

## Entscheidungen
- Name „Azzam Salon“. Öffnungszeiten Mo–Sa 09:00–18:00, So zu, online buchbar bis 18:00. Laufkundschaft willkommen („mit oder ohne Termin“). Zahlung NUR bar – nirgends „Karte“.
- Telefon/Adresse/Öffnungszeiten kommen aus dem Backend (Admin → Salon-Profil, salon_hours), nie hartkodiert.
- URLs bleiben (/dienstleistungen, /ueber-uns, /kontakt, /faq, /termin). Nur Beschriftungen aus dem Design.
- „Mein Konto“ bleibt als kleiner sekundärer Link (Design hat es nicht).
- Tokens nur additiv; alter Token `ink` (#F5F5F5) bleibt bis die alten Seiten weg sind. Admin (/admin) und Konto (/konto) behalten ihren Look.
- Schriften: nur Latin-Subset. Google-Fonts (Inter, Barlow 700/800) erst entfernen, wenn alle öffentlichen Seiten umgestellt sind.
- Fotos: neue Salonfotos (hohe Auflösung) liegen bei Yamen. Bevorzugt Bilder ohne erkennbare Personen; erkennbare Personen nur mit schriftlicher Einwilligung. Keine Nahaufnahmen der Umhänge mit Schlangen-/Streifenmuster. Team-Porträts fehlen noch → Monogramm im Bogen als Platzhalter, keine erfundenen Namen.
- Keine erfundenen Inhalte: Bewertungen, „4,9 aus 180“, Parken/ÖPNV, „Heute frei ab“ nur mit echten Daten, sonst ausblenden.

## Fallen im Handoff (nicht übernehmen)
- code/tailwind.config.ts ist Tailwind v3 → nicht verwenden (wir haben v4 mit @theme).
- Globale `a { … }`-Regel aus globals.css → nicht übernehmen (zerstört Button-Farben).
- Checkbox als `<button role="checkbox">` mit Link darin → stattdessen natives `<input type="checkbox">` im `<label>`.
- Rahmen von Eingabefeldern/Slots: `border-line-control` (Kontrast ≥ 3:1), nicht line-strong.
- Texte korrigieren: FAQ „Karte?“ → „Nein, bezahlt wird bar vor Ort.“; „absagen oder verschieben“ → nur „absagen“; Impressum/Datenschutz: bestehende Texte behalten, nur neu gestalten (Vorlagen aus dem Handoff nicht verwenden).

## Nächste Schritte (Reihenfolge)
1. Footer (Daten als Props, Links Impressum/Datenschutz/Cookie-Einstellungen)
2. Kleine Bausteine: Container, Section, Badge, TextLink, Karte
3. Startseite
4. Leistungen & Preise (Daten aus API)
5. Über uns / Team
6. Kontakt (Karte erst nach Einwilligung)
7. FAQ (Akkordeon)
8. Impressum, Datenschutz (Bestandstexte), 404
9. Öffentliches Layout auf neuen Header/Footer/BottomBar umstellen, alte Komponenten und Google-Fonts entfernen
10. Teil B: neue Buchungsstrecke (mehrere Leistungen, „egal wer“) – braucht eigene Spec und Backend-Arbeit; erst planen, wenn Hotfix live ist.
