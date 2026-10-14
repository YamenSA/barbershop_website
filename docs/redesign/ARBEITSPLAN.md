# Redesign „Bogen & Linie“ – Arbeitsplan

## Arbeitsweise (verbindlich)
- Zusammengehörige Aufgaben dürfen gebündelt umgesetzt und gemeinsam geprüft werden. Nach dem vereinbarten Aufgabenpaket stoppen und kurz berichten. Erklärungen kurz, erst Gesamtbild, dann Detail. Keine Termin-/Zeitplan-Diskussionen.
- Du (Codex) implementierst und prüfst selbst kritisch und übernimmst Dev-Server, Build und Git-Befehle. Nach erfolgreicher Browserprüfung und Yamens Freigabe darfst du das geprüfte Paket mit expliziten Dateipfaden stagen und committen. Nie `git add -A`.
- Bei jedem Befehl sagen, wo er läuft: RECHNER, SERVER oder COOLIFY.
- Kein Merge, kein Push ohne Yamens ausdrückliche Freigabe in dem Moment.
- Nach jeder Änderung: `npm run build` grün. Neue Komponenten zuerst auf `/design-vorschau` zeigen; Yamen prüft im Browser (Dev-Server läuft oft auf Port 3001).
- Keine Secrets, keine Kundendaten im Chat.

## Stand
- Branch `redesign` basiert auf `hotfix/timezone` (Zeitzonen-Hotfix, noch nicht live). Der Hotfix geht zuerst live (Ablauf: docs/deploy/TIMEZONE_HOTFIX_LIVEGANG.md). `redesign` wird erst danach gemergt.
- Fertig: Design-Tokens (additiv in globals.css), lokale Schriften (fonts.ts, Klassen font-brand/font-text), Button, Vorschau-Seite, SiteHeader inkl. Handy-Menü (<dialog>), BottomBar.
- Lokal sind die freigegebenen Designs jetzt auf den echten öffentlichen URLs eingebaut (Schritt 9, von Yamen im Browser geprüft und freigegeben). Live unverändert; kein Merge/Push erfolgt.
- Design-Referenz: design_handoff_azzam_salon/ (git-ignored). README + .dc.html-Dateien.

## Entscheidungen
- Name „Azzam Salon“. Öffnungszeiten Mo–Sa 09:00–18:00, So zu, online buchbar bis 18:00. Laufkundschaft willkommen („mit oder ohne Termin“). Zahlung NUR bar – nirgends „Karte“.
- Telefon/Adresse/Öffnungszeiten kommen aus dem Backend (Admin → Salon-Profil, salon_hours), nie hartkodiert.
- URLs bleiben (/dienstleistungen, /ueber-uns, /kontakt, /faq, /termin). Nur Beschriftungen aus dem Design.
- „Mein Konto“ bleibt als kleiner sekundärer Link (Design hat es nicht).
- Tokens nur additiv; alter Token `ink` (#F5F5F5) bleibt bis die alten Seiten weg sind. Admin (/admin) und Konto (/konto) behalten ihren Look.
- Schriften: nur Latin-Subset. Google-Fonts (Inter, Barlow 700/800) erst entfernen, wenn alle öffentlichen Seiten umgestellt sind.
- Schritt 9: Google-Fonts durch lokale Latin-Dateien derselben Familien/Gewichte ersetzt. Admin/Konto und bestehende Buchungsformulare behalten Inter und Barlow 700/800; öffentliche Inhaltsseiten verwenden Manrope und Barlow 500/600.
- Die Buchungsstrecke erhält in Schritt 9 den neuen Header/Footer, bleibt innen vorerst im bisherigen Design und mit bisherigen Schritten (Leistung → Stylist → Termin → Kontakt → Bestätigung). Schnellnavigation bleibt auf `/termin…` ausgeblendet. Die vollständige Neugestaltung und mehrere Leistungen gehören zu Schritt 10; kein Backend-Umbau in Schritt 9.
- Fotos: neue Salonfotos (hohe Auflösung) liegen bei Yamen. Bevorzugt Bilder ohne erkennbare Personen; erkennbare Personen nur mit schriftlicher Einwilligung. Keine Nahaufnahmen der Umhänge mit Schlangen-/Streifenmuster. Team-Porträts fehlen noch → Monogramm im Bogen als Platzhalter, keine erfundenen Namen.
- Fotoauswahl und Freigabe liegen ausschließlich bei Yamen. Codex wählt keine Fotos oder Ausschnitte selbst aus. Bis zur ausdrücklichen Foto-Freigabe werden klar markierte Bildplatzhalter verwendet; Dateiliste und gewünschte Ausschnitte dienen Yamen zur Auswahl.
- Bildwirkung: Yamen hat eine dezente Abstimmung der ausgewählten Fotos autorisiert. Nur reversible CSS-Effekte: Helligkeit 94 %, Sättigung 88 %, Kontrast 102 %, leichte Wärme (6 % Sepia). Leistungskacheln vergrößern das Foto bei Hover/Tastaturfokus um 2,5 % in 200 ms, ausschließlich bei `prefers-reduced-motion: no-preference`. Originale und gewählte Ausschnitte bleiben erhalten; abschließende Browserfreigabe durch Yamen erteilt.
- Bildschattierung auf Yamens Wunsch: sichtbare Vignette an den Rändern (bis 35 %) und Abdunklung am unteren Bildrand (bis 56 %) in `surface-pitch`. Erste Abstimmung war zu dezent und wurde verstärkt. Rein dekorative, nicht interaktive CSS-Auflage; die Bildmitte bleibt heller, keine Kastenschatten.
- Keine erfundenen Inhalte: Bewertungen, „4,9 aus 180“, Parken/ÖPNV, „Heute frei ab“ nur mit echten Daten, sonst ausblenden.

## Fallen im Handoff (nicht übernehmen)
- code/tailwind.config.ts ist Tailwind v3 → nicht verwenden (wir haben v4 mit @theme).
- Globale `a { … }`-Regel aus globals.css → nicht übernehmen (zerstört Button-Farben).
- Checkbox als `<button role="checkbox">` mit Link darin → stattdessen natives `<input type="checkbox">` im `<label>`.
- Rahmen von Eingabefeldern/Slots: `border-line-control` (Kontrast ≥ 3:1), nicht line-strong.
- Texte korrigieren: FAQ „Karte?“ → „Nein, bezahlt wird bar vor Ort.“; „absagen oder verschieben“ → nur „absagen“; Impressum/Datenschutz: bestehende Texte behalten, nur neu gestalten (Vorlagen aus dem Handoff nicht verwenden).

## Nächste Schritte (Reihenfolge)
1. [x] Footer (Daten als Props, Links Impressum/Datenschutz/Cookie-Einstellungen; auf `/design-vorschau` mit Platzhalterdaten)
2. [x] Kleine Bausteine: Container, Section, Badge, TextLink, Karte
   - Alle Bausteine implementiert; `npm run build` grün. Gemeinsames beschriftetes Beispiel auf `/design-vorschau` im Browser geprüft und von Yamen freigegeben.
3. [x] Startseite
   - Als zusammenhängendes Paket auf `/design-vorschau` implementiert; bestehende `/` bleibt unverändert. Preise, Team, Profil und Öffnungszeiten aus öffentlichen APIs. Bewertungen/Verfügbarkeits-Badges ohne bestätigte Grundlage ausgeblendet. Kompakte Hero-Proportionen von Yamen im Browser freigegeben. Die vier von Yamen ausgewählten `.jpeg`-Fotos eingebaut; schriftliche Einwilligung für erkennbare Personen von Yamen bestätigt. Originaldateien unverändert, Darstellung mit zentriertem `object-cover`; Bilddarstellung in der Vorschau durch Yamen freigegeben. Team-Porträts bleiben Monogramme. Dev-Vorschau auf Port 3001. Abschließende Browserprüfung mit Fotos und Schattierungen durch Yamen freigegeben.
   - Proportionen bei 100 % Zoom geprüft: Hero vollständig sichtbar bei 1366×625, 1440×720, 1280×650 und 1024×600 px Inhaltsfläche. Nach Fotoeinbau erneut bei 1366×625, 1280×650, 1024×600, 768×900, 390×844 und 360×640 geprüft: kein horizontaler Überlauf, alle vier Fotos laden. Build und gezieltes ESLint grün.
4. [x] Leistungen & Preise (Daten aus API)
   - Vorschau unter `/design-vorschau?seite=preise`: mobil Segment-Tabs mit Tastaturbedienung, Desktop Gruppenspalten. Kategorien aus bestehendem Preislisten-Mapping; zusätzliche Admin-Leistungen bleiben unter „Weitere Leistungen“ sichtbar. Preise, Dauer und „ab“-Kennzeichnung aus API, Barzahlungshinweis. Buchungslinks übergeben eine gültige Service-ID an die bestehende Buchungsseite. Von Yamen im Browser geprüft und freigegeben.
   - Geprüft mit 34 API-Leistungen: Namen, Preise, Dauer und Links vollständig abgeglichen; 360/390/768/1024/1366 px ohne horizontalen Überlauf. Mobile Tabs und Pfeiltasten, Goldfokus ohne alten grünen Schatten, Buchungs-Vorauswahl und ungültige ID geprüft. Build und gezieltes ESLint grün. Lokaler Dev-API-Proxy über ignorierte `.env.local`; Next-Konfiguration nutzt in Entwicklung den lokalen Host, Produktions-Standard bleibt Docker.
5. [x] Über uns / Team
   - Vorschau unter `/design-vorschau?seite=team`: Handoff-Titel und vier Werte, bereits freigegebenes Salonfoto mit derselben Bildabstimmung. Echte Teamnamen und vorhandene Bios aus API, Monogramme bis zur Fotoauswahl; keine erfundenen Rollen. „Bei … buchen“ wählt das Teammitglied vor und zeigt nur dessen zugeordnete Leistungen. Von Yamen im Browser geprüft und freigegeben.
   - Build und gezieltes ESLint grün. Browserprüfung bei 360/390/768/1024/1366 px: Teamdaten mit API abgeglichen, keine defekten Bilder oder Überläufe. Mitarbeiter-Vorauswahl, zugeordnete Leistungen, Slot-Anfrage für den gewählten Mitarbeiter, Zurück-Navigation und ungültige Team-ID geprüft. Preis-Buchungslinks als Regression erneut grün. Dev-Vorschau läuft auf Port 3001; von Yamen im Browser freigegeben.
6. [x] Kontakt (Karte erst nach Einwilligung)
   - Vorschau unter `/design-vorschau?seite=kontakt`: Telefon, Adresse, E-Mail und Öffnungszeiten aus API; WhatsApp aus bestehender Konfiguration. Heutiger Öffnungstag in Europe/Berlin markiert. Statische Kartenvorschau vor Einwilligung, Google-Iframe erst nach Zustimmung, Widerruf direkt an der Karte und über Cookie-Einstellungen. Keine unbestätigten Park-/ÖPNV-Angaben. Von Yamen im Browser geprüft und freigegeben.
   - Build und gezieltes ESLint grün. Browserprüfung bei 360/390/768/1024/1366 px ohne Überlauf/defekte Bilder; Kontaktlinks und sieben Öffnungstage mit API abgeglichen. Europe/Berlin-Markierung unter Browser-Zeitzone New York geprüft. Keine Google-Anfragen vor Einwilligung, gespeicherte Zustimmung sowie beide Widerrufswege geprüft (Google-Iframe im Test abgefangen). Dev-Vorschau auf Port 3001; von Yamen im Browser freigegeben.
7. [x] FAQ (Akkordeon)
   - Vorschau unter `/design-vorschau?seite=faq`: zehn eindeutige Fragen mit nativ bedienbaren Buttons, `aria-expanded`/`aria-controls`, jeweils eine Antwort offen. Bestands-FAQ-Texte gemäß Entscheidungen bereinigt: mit/ohne Termin, nur Barzahlung, nur Absage, keine unbestätigten Parkangaben. Teamwahl und Anfahrt ergänzt, hilfreiche Links sowie echte Telefonnummer aus API. Von Yamen im Browser geprüft und freigegeben.
   - Build und gezieltes ESLint grün. Browserprüfung bei 360/390/768/1024/1366 px: alle zehn Antworten, Einzelauswahl, Enter/Leertaste, ARIA-Verknüpfungen, Goldfokus ohne grünen Schatten und Buchungslink geprüft; keine Überläufe, defekten sichtbaren Bilder oder Browserfehler. Mobile und Desktop-Darstellung visuell geprüft. Dev-Vorschau läuft auf Port 3001; von Yamen im Browser geprüft und freigegeben.
8. [x] Impressum, Datenschutz (Bestandstexte), 404
   - Implementiert unter `/design-vorschau?seite=impressum`, `?seite=datenschutz` und `?seite=404`. Rechtstexte in gemeinsame Inhaltskomponenten ausgelagert; bestehende Seiten verwenden sie weiter mit unveränderter Darstellung. Vorschau mit maximal 65ch Lesebreite, Goldlinks, Desktop-Inhaltsnavigation und mobil aufklappbarem Inhaltsverzeichnis. Keine Handoff-Rechtsvorlagen oder erfundenen Aktualisierungsdaten übernommen. 404 mit dekorativem Bogen und Links zu Buchung und Startseite; Anbindung als tatsächliche Fehlerseite folgt mit Schritt 9.
   - Build und gezieltes ESLint grün. Bestands-JSX beider Rechtseiten mit dem vorherigen Commit abgeglichen: unverändert. Browserprüfung bei 360/390/768/1024/1366 px: keine horizontalen Überläufe oder Browserfehler; Inhaltsverzeichnisse per Tastatur, Sprungziele, Goldfokus, externe Linkattribute und 404-Links geprüft. Darstellung visuell geprüft. Dev-Vorschau läuft auf Port 3001; Von Yamen im Browser geprüft und freigegeben.
9. [x] Öffentliches Layout auf neuen Header/Footer/BottomBar umstellen, alte Komponenten und Google-Fonts entfernen
   - Abschließender `npm run build` und gezieltes ESLint aller geänderten/neuen TypeScript-Dateien grün. Storno-Rücklink nutzt `next/link`. Von Yamen im Browser geprüft und freigegeben; kein Merge/Push.
   - Lokal umgesetzt: echte Startseite, Leistungen, Über uns/Team, Kontakt, FAQ und Rechtseiten verwenden die geprüften Ansichten. Gemeinsames öffentliches Layout mit Header/Footer/Schnellnavigation; Vorschau verwendet denselben Rahmen eigenständig. Salonprofil/Öffnungszeiten per Request gemeinsam geladen. `/team` bleibt als zusätzliche URL erreichbar; bestehende Galerie behält ihre Inhalte mit angepassten Farben und Buchungsbutton. Kontakt-JSON-LD erhalten. Root-404 und öffentliche 404 eingebaut; keine doppelten Hauptbereiche. Nicht mehr verwendete alte Komponenten entfernt, Google-Schriften lokal bereitgestellt; package.json/package-lock unverändert.
   - Buchung bleibt funktional unverändert, erhält den neuen Rahmen und behält innen ihre bisherigen Farben/Schriften. Zwei widersprüchliche Bestandstexte korrigiert: nur Barzahlung, nur Absage. Storno-Seite rendert außerhalb des API-try/catch (ESLint) und nutzt einen Abschnitt statt eines zweiten Hauptbereichs.
   - Browserprüfung: zwölf echte Routen bei 360/768/1366 px, jeweils ein Header/Footer/Hauptbereich und kein horizontaler Überlauf; aktive Navigation, mobiles Menü (Linkwechsel, ESC, Fokus, Scrolllock), echte HTTP-404 und Login-Weiterleitung geprüft. Team und Kontakt zusätzlich bei 360/390/768/1024/1366 px mit API-Daten, Buchungs-Vorauswahl und Karteneinwilligung/Widerruf geprüft. Buchungsdurchlauf bis Bestätigung mit abgefangener Verfügbarkeit/Buchungsantwort grün; keine echte Buchung oder E-Mail. Erste Test-Abfangregel hatte einen falschen Pfad; die ungültige Testadresse wird nachweislich vor einer Buchung abgewiesen. Dev-Server nach Neustart auf Port 3001; von Yamen im Browser geprüft und freigegeben.
10. [x] Teil B: neue Buchungsstrecke (mehrere Leistungen, „egal wer“)
   - Umgesetzt und von Yamen im Browser geprüft und freigegeben (13.10.2026). Backend 240 passed, PostgreSQL-Lauf 15 passed (Migration 018, EXCLUDE), Build/ESLint/test:time grün, Browserdurchlauf inkl. 409/keine Slots/Ladefehler. Spec: `docs/redesign/BUCHUNGSSTRECKE_SPEC.md`; fünf Schritte einschließlich gesonderter Prüfung vor dem Buchen, Gesamtdauer und vollständige Speicherung mehrerer Leistungen. Implementierung zuerst in der Vorschau. Livegang-Reihenfolge mit dem Zeitzonen-Hotfix wird separat geklärt; keine Freigabe zum sofortigen Merge/Push.

## Fotos für die Startseite (Auswahl durch Yamen)

Vier Fotos für die sichtbaren Bildflächen, Ablageordner jeweils `frontend/public/brand/home/`. Alle vier Dateien von Yamen bereitgestellt und ausgewählt; Einwilligung bestätigt. Team-Porträts sind optional und bleiben bis zur Auswahl Monogramme. Logo und Kartenvorschau sind keine zusätzlichen Salonfotos.

| Abschnitt | Motiv | Format / Dateiname | Vorgesehener Ausschnitt |
|---|---|---|---|
| Hero | Salon mit Bogenspiegel, Stuhl und Raumtiefe | Hochformat-Bildfläche 3:4, Original `hero-salon.jpeg` | Zentrales Motiv im mittleren Bereich; oben Luft für den Bogen, unten Stuhl/Spiegel erhalten. Mobil wird seitlich breiter, bei flacher Bildfläche ggf. oben/unten beschnitten. |
| Leistungen: Damen | Damenplatz, Styling-Bereich | Hochformat-Bildfläche 2:3, Original `leistungen-damen.jpeg` | Kleiner schmaler Bogen: ein klares Motiv mittig, keine wichtigen Details am Rand oder Text im Foto. |
| Leistungen: Herren | Herrenbereich mit Barbern bei der Arbeit | Hochformat-Bildfläche 2:3, Original `leistungen-herren.jpeg` | Kleiner schmaler Bogen: Motiv mittig, seitliche Reserven; oberer Rand wird durch den Bogen verdeckt. |
| Über uns | Innenraum mit Plätzen und Atmosphäre | Querformat-Bildfläche 4:3, Original `salon-innenraum.jpeg` | Breiter Raumausschnitt, zentrale Plätze/Spiegel erhalten, keine reine Decken-Nahaufnahme. Keine wichtigen Details direkt am Rand. |

Empfohlen: Originalfotos mit mindestens 1600 px an der langen Kante. Ausschnitt und etwaige Optimierung erst nach Yamens Fotoauswahl abstimmen.
