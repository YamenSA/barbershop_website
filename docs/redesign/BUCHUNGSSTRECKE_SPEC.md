# Neue Buchungsstrecke, Schritt 10

## Auftrag und Grenzen

Yamen hat am 13.10.2026 die Umsetzung von Schritt 10 vor dem geplanten Hotfix-Livegang beauftragt. Umsetzung und Tests laufen auf RECHNER; die Reihenfolge des späteren Livegangs wird gesondert geklärt. Kein Merge/Push ohne ausdrückliche Freigabe des fertigen Pakets. Browserprüfung vor dem Commit. Referenzen: Handoff README und `Azzam Buchung*.dc.html`; bestehende Buchungs- und Zeitzonenregeln haben Vorrang vor Demo-Inhalten.

## Verhalten

- Fünf Schritte: Leistungen → Mitarbeiter → Datum/Uhrzeit → Kontakt → Bestätigen. Erst der letzte Button legt einen Termin an. Kein Online-Payment; ausschließlich Barzahlung vor Ort.
- Mehrere unterschiedliche Leistungen für denselben Besuch, ein Mitarbeiter führt alle Leistungen aus. Dauer und angezeigter Preis sind die Summen der ausgewählten API-Leistungen; bei mindestens einem ab-Preis ist auch die Summe als ab-Preis gekennzeichnet. Keine erfundenen Zeiten, Mitarbeiter, Rollen oder Verfügbarkeits-Badges.
- Damen/Herren und Kinder, sofern aus API vorhanden. Auswahl in der Zusammenfassung sichtbar. Änderungen an Leistungen/Mitarbeiter löschen eine unpassende Uhrzeit. Kategorie-Wechsel zeigt die andere Liste, entfernt keine Auswahl heimlich.
- Mitarbeiter werden nur angeboten, wenn sie alle gewählten Leistungen ausführen können. „Egal, wer zuerst frei ist“ ist Standard. Uhrzeiten sind die Vereinigung tatsächlich verfügbarer Mitarbeiter; gleiche Startzeiten werden einmal angezeigt. Der Server weist beim Buchen einen tatsächlich verfügbaren Mitarbeiter zu.
- Verfügbarkeit berücksichtigt Gesamtdauer, Öffnungszeiten, echte Arbeitsintervalle, Pausen/Ausnahmen, Schließtage, bestehende Termine, Vorlauf und Buchungshorizont. Berlin-Zeit ausschließlich über bestehende Zeitfunktionen, einschließlich Sommer-/Winterzeit. Keine pauschal erfundenen Feiertage/„belegt“-Slots.
- Datumsauswahl beginnt am nächsten Tag wie die bestehende Buchung; 14 Tage navigierbar. Vormittag/Nachmittag werden nach Berliner Uhrzeit gruppiert. Kein freier Slot: verständlicher Hinweis, Suche nach dem nächsten tatsächlich freien Tag und echte Telefonnummer. Laden/Fehler/Erneut versuchen behalten die Auswahl.
- Kontakt: Name und gültige E-Mail Pflicht, Telefon optional; natives Datenschutz-Checkboxfeld. Prüfung beim Weiter-Klick, verständliche Fehlermeldungen, Fokus auf erstes fehlerhaftes Feld. Persönliche Angaben erscheinen nur in der eigenen Zusammenfassung, nicht in URLs oder LocalStorage.
- Prüfschritt zeigt alle Leistungen, Mitarbeiterwahl, Datum/Uhrzeit, Dauer, Gesamt und Kontakt mit Ändern-Aktionen. Doppelklickschutz; bei 409 zurück zur Uhrzeitwahl mit erhaltener Auswahl und verständlichem Hinweis. Keine automatische zweite Buchung bei Netzwerkfehler.
- Erfolg erst nach echter 201-Antwort: tatsächliche Buchungsnummer, Leistungen, Mitarbeiter, Berliner Zeitpunkt, Kalenderdownload (.ics), Anfahrt und 24-Stunden-Absagehinweis. Demo-/Vorschau-Buchungen dürfen keine echten Termine oder Mails erzeugen.
- Direktlinks `?service=` und `?team=` bleiben erhalten; ungültige IDs werden ignoriert. Zurück/Ändern erhalten Kontaktdaten. Mobile Sticky-Leiste berücksichtigt Safe Area und verdeckt keine Inhalte; Desktop sticky Zusammenfassung. Goldfokus und reduzierte Bewegung.

## Datenvertrag und Speicherung

- Bestehende Einzelleistungs-Aufrufe bleiben gültig. Neue Aufrufe übergeben `service_ids`, keine vom Browser vorgegebenen Preise/Dauern. Leere, doppelte, unbekannte oder inaktive IDs werden abgewiesen; missbräuchlich große Listen werden begrenzt.
- Ein kombinierter Besuch bleibt genau ein `Appointment`, ein Zeitraum und ein Storno-Token. Der bestehende PostgreSQL-EXCLUDE-Schutz schützt den gesamten Zeitraum.
- Additive Migration 018: nullable JSON-Spalte `service_selection` auf `appointments` mit serverseitigen Leistungs-Snapshots (ID, Name, Dauer, Preis, ab-Kennzeichnung). Keine Personen-/Zeitdaten darin. `service_id` bleibt die erste Leistung für Rückwärtskompatibilität. Bestehende Termine mit NULL behalten ihr Verhalten; keine Umrechnung bestehender Zeiten.
- Admin-Kalender/Termin-Details, Kundenkonto, PDF, Bestätigungs- und Erinnerungsmail sowie Storno verwenden bei Kombinationen alle Leistungsnamen. Verschieben über bestehende Admin/Konto-Funktionen muss die Gesamtdauer und Auswahl erhalten und die Eignung des Mitarbeiters prüfen. Ihr Layout bleibt bestehen.
- Preise/Dauer werden vom Server erneut berechnet. Snapshot verhindert, dass spätere Stammdatenänderungen einen vorhandenen kombinierten Termin verkürzen oder seine Leistungsbeschreibung verlieren.

## Abnahme

- Tests zuerst für Kombinationen: Summendauer, gemeinsame Mitarbeiter-Eignung, Schließzeit/Pausen, Konkurrenz, veraltete Auswahl, Validierung und Legacy-Kompatibilität. Storno und Verschieben erhalten alle Leistungen; E-Mail/PDF/Admin zeigen die Kombination.
- SQLite-Integration mit Testdaten und abgefangenem Mailversand; PostgreSQL prüft Migration und EXCLUDE. Laufender Container `tzvis-db-1` wird nicht ohne Yamens Freigabe gestoppt. Testdatenbanken müssen auf `_test` enden; keine Migration auf SERVER durch Codex.
- Frontend: Build, ESLint, Zeitzonentests; Browserprüfung mobiler/Desktop-Ablauf einschließlich Formularfehlern, leerer/fehlerhafter Verfügbarkeit, 409 und Erfolg. Schreibanfragen der UI-Prüfung vollständig abfangen.
- Zuerst `/design-vorschau?seite=buchung`, danach Yamens Freigabe. Neues Paket erst anschließend committen. Schritt 10 erst nach vollständiger Umsetzung/Prüfung abhaken.
