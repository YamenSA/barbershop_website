# Feature Specification: Admin & Stammdaten (Phase 1)

**Feature Branch**: `002-admin-stammdaten`

**Created**: 2026-06-09

**Status**: Draft

**Input**: Admin-Login, Pflege aller Stammdaten (Dienstleistungen, Team, Öffnungszeiten, Arbeitspläne) und manuelle Termin-/Walk-in-Eingabe für die interne Team-Oberfläche.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin-Authentifizierung (Priority: P1)

Der Inhaber öffnet die Admin-Oberfläche und meldet sich mit seinen Zugangsdaten an. Nach erfolgreicher Anmeldung gelangt er zur Tages-Übersicht. Ohne gültige Anmeldung ist kein Admin-Bereich erreichbar.

**Why this priority**: Alle anderen Admin-Funktionen setzen eine erfolgreiche Authentifizierung voraus — kein Login, kein Zugang. Grundlage für SC-001.

**Independent Test**: (a) Ohne Login auf Admin-Seite zugreifen → Weiterleitung auf Login. (b) Mit korrekten Daten einloggen → Tages-Übersicht erscheint. (c) Mit falschen Daten → Fehlermeldung.

**Acceptance Scenarios**:

1. **Given** ein unauthentifizierter Nutzer, **When** er die Admin-Oberfläche aufruft, **Then** wird er auf die Login-Seite weitergeleitet.
2. **Given** ein Admin auf der Login-Seite mit korrekten Zugangsdaten, **When** er das Formular absendet, **Then** wird er zur Tages-Übersicht weitergeleitet.
3. **Given** ein Admin auf der Login-Seite mit falschen Zugangsdaten, **When** er das Formular absendet, **Then** erscheint eine Fehlermeldung und kein Zugang wird gewährt.
4. **Given** ein eingeloggter Admin, **When** er sich abmeldet, **Then** wird seine Sitzung beendet und er wird auf die Login-Seite geleitet.

---

### User Story 2 - Stammdaten: Dienstleistungen & Teammitglieder (Priority: P2)

Der Admin legt alle angebotenen Dienstleistungen (Name, Dauer, Preis, Beschreibung) und alle Teammitglieder (Name, Foto, Kurzprofil) an und verknüpft, welche Stylisten welche Dienstleistungen erbringen. Deaktivierte Einträge werden aus der künftigen Auswahl entfernt, bestehende Termine bleiben erhalten.

**Why this priority**: Ohne Dienstleistungen und Teammitglieder können keine Termine angelegt werden — sie sind das Fundament aller Buchungsvorgänge (SC-002).

**Independent Test**: Dienstleistung anlegen, Teammitglied anlegen, beide verknüpfen, persistieren und in der Liste prüfen.

**Acceptance Scenarios**:

1. **Given** der Admin ist eingeloggt, **When** er eine neue Dienstleistung mit allen Pflichtfeldern speichert, **Then** erscheint sie in der Dienstleistungsliste und ist bei der Terminerstellung wählbar.
2. **Given** eine Dienstleistung mit bestehenden Zukunftsterminen, **When** der Admin sie deaktiviert, **Then** ist sie für neue Termine nicht mehr wählbar; bestehende Termine bleiben unberührt.
3. **Given** der Admin ist eingeloggt, **When** er ein neues Teammitglied anlegt und ihm Dienstleistungen zuordnet, **Then** ist das Mitglied im System sichtbar und die Zuordnung gespeichert.
4. **Given** ein Teammitglied mit Zukunftsterminen, **When** der Admin es deaktiviert, **Then** wird es deaktiviert; bestehende Termine bleiben unberührt.

---

### User Story 3 - Salon-Öffnungszeiten & Schließungen (Priority: P3)

Der Admin legt die wöchentlichen Salon-Öffnungszeiten (je Wochentag: Von–Bis oder geschlossen) und ganztägige Schließungen (Feiertage, Urlaub) fest. Diese bilden den äußeren Rahmen für alle Verfügbarkeitsberechnungen.

**Why this priority**: Öffnungszeiten sind die Rahmenbedingung für alle Slot-Berechnungen; ohne sie können keine korrekten Verfügbarkeiten ermittelt werden.

**Independent Test**: Öffnungszeiten eintragen; prüfen, dass ein Terminversuch an einem Schließungstag korrekt behandelt wird.

**Acceptance Scenarios**:

1. **Given** der Admin setzt Öffnungszeiten für alle Wochentage, **When** er speichert, **Then** werden die Zeiten persistiert und gelten als Rahmenbedingung.
2. **Given** eine ganztägige Schließung am Datum X ist eingetragen, **When** der Admin einen Termin für Datum X anlegt, **Then** ist der Tag als gesperrt erkennbar.
3. **Given** bereits eine Schließung für Datum X, **When** der Admin eine zweite Schließung für Datum X einträgt, **Then** wird der zweite Eintrag als Duplikat abgewiesen.

---

### User Story 4 - Wochen-Arbeitsplan & Tages-Überschreibungen (Priority: P4)

Der Admin legt für jeden Stylisten seinen regulären Wochenrhythmus fest (z. B. Mo–Fr 09:00–17:00) und kann einzelne Tage abweichend markieren: zusätzlich da, freier Tag oder Blocker. Die resultierende Verfügbarkeit ergibt sich aus Salon-Öffnungszeiten ∩ Arbeitsplan (inkl. Überschreibungen) abzüglich belegter Termine.

**Why this priority**: Erst mit korrekt gepflegten Arbeitsplänen berechnet das System verlässliche Verfügbarkeiten (SC-005).

**Independent Test**: Standard-Wochenplan anlegen, einen Tag als „frei" überschreiben, Verfügbarkeit für diesen Tag abrufen und prüfen.

**Acceptance Scenarios**:

1. **Given** ein Stylist mit gespeichertem Wochen-Standard Mo–Fr 09:00–17:00, **Then** gilt dieser Plan als Basis für Verfügbarkeitsberechnungen.
2. **Given** ein Stylist mit Wochenplan, **When** der Admin für einen konkreten Montag „frei" einträgt, **Then** ist der Stylist an diesem Montag nicht verfügbar.
3. **Given** ein Stylist, dessen Arbeitszeiten über die Salon-Öffnungszeiten hinausgehen, **Then** wird seine Verfügbarkeit auf die Salon-Öffnungszeiten beschränkt.
4. **Given** eine Tages-Überschreibung für Tag X, **When** die Verfügbarkeit für Tag X abgefragt wird, **Then** gilt die Überschreibung; alle anderen Tage sind unverändert.

---

### User Story 5 - Kalender & manuelle Terminerfassung (Walk-in) (Priority: P5)

Der Admin sieht einen Kalender (Tag- und Wochenansicht, filterbar nach Stylist) mit allen bestehenden Terminen und kann direkt dort neue Termine anlegen — für Stammkunden oder als Gast. Das System prüft auf Doppelbuchungen. Ein Admin darf Termine auch außerhalb des regulären Arbeitsplans eines Stylisten anlegen (Override); der Doppelbuchungsschutz gilt trotzdem immer.

**Why this priority**: Die manuelle Terminerfassung ist der Kern-Use-Case dieser Phase — sie macht den Kalender zur einzigen Wahrheitsquelle (SC-003).

**Independent Test**: Zwei Termine im gleichen Slot für denselben Stylisten anlegen: erster gelingt, zweiter wird abgewiesen.

**Acceptance Scenarios**:

1. **Given** der Admin öffnet den Kalender, **When** er einen freien Slot anklickt, **Then** öffnet sich ein Formular mit Feldern für Dienstleistung, Stylist, Zeit und Kundenzuordnung.
2. **Given** Termin A für Stylist X um 10:00 Uhr ist bestätigt, **When** ein zweiter Termin für Stylist X um 10:00 Uhr angelegt werden soll, **Then** wird der Konflikt abgewiesen.
3. **Given** der Admin legt einen Walk-in außerhalb des regulären Arbeitsplans eines Stylisten an, **When** er bestätigt, **Then** wird der Termin gespeichert (Admin-Override); der Doppelbuchungsschutz bleibt unberührt.
4. **Given** der Admin sucht beim Anlegen einen bestehenden Kunden, **When** er den Namen eingibt, **Then** werden passende Stammkunden vorgeschlagen und auswählbar.
5. **Given** kein bestehender Kunde ausgewählt, **When** der Admin Gast-Kontaktdaten (Name, Telefon) eingibt und speichert, **Then** wird der Termin als Gast-Buchung angelegt.

---

### User Story 6 - Terminverwaltung (Priority: P6)

Der Admin kann bestehende Termine verschieben (Zeit und/oder Stylist ändern), ihren Status ändern (bestätigt, storniert, No-Show, erledigt) und eine interne Notiz hinterlegen.

**Why this priority**: Walk-ins müssen im Tagesverlauf angepasst werden; ohne diese Funktion kann der Kalender nicht als lebende Wahrheitsquelle gepflegt werden.

**Independent Test**: Einen Termin in einen anderen freien Slot verschieben, Status auf „erledigt" setzen, Notiz hinterlegen — alles prüfen.

**Acceptance Scenarios**:

1. **Given** ein bestehender Termin, **When** der Admin Zeit oder Stylist ändert und speichert, **Then** erscheint der Termin an der neuen Position; der alte Slot ist freigegeben.
2. **Given** ein bestehender Termin, **When** der Admin den Status auf „storniert" setzt, **Then** ist der Slot freigegeben und der Termin als storniert markiert.
3. **Given** ein bestehender Termin, **When** der Admin eine interne Notiz hinterlegt, **Then** wird die Notiz gespeichert und beim Termin angezeigt.
4. **Given** der Admin verschiebt Termin A in einen Slot, der von Termin B belegt ist, **Then** wird der Verschiebeversuch abgewiesen.

---

### User Story 7 - Tages-Übersicht (Dashboard) (Priority: P7)

Nach dem Login sieht der Admin sofort eine Tages-Übersicht: heutige Termine (Uhrzeit, Dienstleistung, Stylist, Kundenname) und welche Stylisten heute arbeiten.

**Why this priority**: Praktischer Tages-Einstieg; nicht blockierend für die Kernfunktionalität, aber direkter Mehrwert ab Tag 1.

**Independent Test**: Nach Login erscheint das Dashboard mit korrekten heutigen Terminen und den heute arbeitenden Stylisten.

**Acceptance Scenarios**:

1. **Given** der Admin hat sich eingeloggt, **When** das Dashboard geladen ist, **Then** sind die heutigen Termine und die heute arbeitenden Stylisten aufgelistet.
2. **Given** ein Tag ohne Termine, **When** das Dashboard aufgerufen wird, **Then** wird eine leere Liste angezeigt (kein Fehler, kein leeres Weiß).

---

### User Story 8 - Tagesplan als PDF exportieren (Priority: P8)

Der Admin exportiert den Tagesplan für einen gewählten Tag als PDF — optional gefiltert nach Stylist. Die PDF enthält Uhrzeit, Dienstleistung, Stylist und Kundenname; sensible Notizen sind standardmäßig ausgeblendet und können explizit aktiviert werden. Die PDF wird nicht dauerhaft serverseitig gespeichert.

**Why this priority**: Nützlich für das Pult (Pultzettel), aber kein Kernfeature für die digitale Datenpflege.

**Independent Test**: PDF für einen Tag mit zwei Terminen exportieren: ohne Notizen (Standard) → Notizen fehlen; mit Notizen → Notizen enthalten.

**Acceptance Scenarios**:

1. **Given** mehrere Termine für Tag X, **When** der Admin den Tagesplan als PDF exportiert, **Then** enthält die PDF Uhrzeit, Dienstleistung, Stylist und Kundenname — ohne Notizen.
2. **Given** der Admin aktiviert „Notizen einschließen", **When** er die PDF exportiert, **Then** enthält die PDF auch die internen Notizen.
3. **Given** der Admin filtert nach Stylist B, **When** er exportiert, **Then** enthält die PDF ausschließlich Termine von Stylist B.
4. **Given** jeder PDF-Export, **Then** wird die erzeugte Datei nicht dauerhaft auf dem Server gespeichert.

---

### Edge Cases

- Walk-in außerhalb des regulären Arbeitsplans: Erlaubt per Admin-Override; der Doppelbuchungsschutz gilt trotzdem.
- Deaktivieren mit Zukunftsterminen: Dienstleistung oder Stylist wird deaktiviert (nicht gelöscht); bestehende Termine bleiben erhalten.
- Arbeitszeiten jenseits der Öffnungszeiten: Werden auf die Schnittmenge mit den Salon-Öffnungszeiten beschränkt; Salon-Öffnungszeiten gewinnen immer.
- Doppelte Schließung: Ein zweiter Eintrag für denselben Schließungstag wird als Konflikt abgewiesen.
- Schließung mit bestehenden Terminen: System zeigt Warnung und verlangt explizite Bestätigung; bestehende Termine werden nicht automatisch storniert.
- Wiederholte fehlgeschlagene Login-Versuche: Progressive Verzögerung (max. 30 s) und IP-Rate-Limiting greifen; keine harte Konto-Sperre; Fehlermeldung bleibt generisch.
- Termin verschieben in belegten Slot: Wird abgewiesen; ursprünglicher Termin bleibt unverändert.
- Kalender an einem Tag ohne Termine oder ohne arbeitende Stylisten: Leere Ansicht, kein Fehler.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Das System MUSS eine sichere Authentifizierung mit einer einzigen Admin-Rolle bereitstellen und alle nicht-öffentlichen Admin-Funktionen für unauthentifizierte Zugriffe vollständig sperren. Das Auth-Modul MUSS gekapselt implementiert werden, sodass Phase 4 (Kundenkonten) es erweitern oder ersetzen kann. Eine authentifizierte Sitzung MUSS nach 8 Stunden Inaktivität ablaufen; Aktivität setzt den Timer zurück. Bei aufeinanderfolgenden fehlgeschlagenen Login-Versuchen MUSS eine progressive Verzögerung greifen (gedeckelt auf max. 30 s), kombiniert mit IP-basiertem Rate-Limiting (gemäß Konstitution Prinzip XI). Fehlermeldungen MÜSSEN generisch sein (kein Hinweis, ob E-Mail oder Passwort falsch ist). Eine harte Konto-Sperre ist nicht zulässig, da sie bei einem Einzel-Admin-System einen DoS-Angriffspunkt erzeugt.
- **FR-002**: Der Admin MUSS Dienstleistungen anlegen, bearbeiten und deaktivieren können (Name, feste Dauer, fester Preis, Beschreibung) und je Dienstleistung festlegen, welche Teammitglieder sie erbringen (n:m-Beziehung). Deaktivierte Dienstleistungen dürfen nicht für neue Termine wählbar sein; bestehende Termine bleiben erhalten.
- **FR-003**: Der Admin MUSS Teammitglieder anlegen, bearbeiten und deaktivieren können (Name, Foto, Kurzprofil, Aktiv-Status) inkl. ihrer angebotenen Dienstleistungen. Deaktivierte Mitglieder dürfen nicht für neue Termine wählbar sein; bestehende Termine bleiben erhalten.
- **FR-004**: Der Admin MUSS wöchentliche Salon-Öffnungszeiten (je Wochentag: Von–Bis oder geschlossen) und ganztägige Schließungen pflegen können. Ein zweiter Eintrag für denselben Schließungstag MUSS als Duplikat-Konflikt abgewiesen werden.
- **FR-005**: Das System MUSS je Teammitglied einen wiederkehrenden Wochen-Arbeitsplan speichern und Pro-Tag-Überschreibungen (zusätzliche Verfügbarkeit, freier Tag, Blocker) ermöglichen. Die berechnete Verfügbarkeit ergibt sich aus: Salon-Öffnungszeiten ∩ Arbeitsplan (inkl. Überschreibungen) − Termine mit Status **bestätigt** (stornierte, No-Show- und erledigte Termine geben ihren Slot frei).
- **FR-006**: Der Admin MUSS einen Kalender der Termine in Tag- und Wochenansicht einsehen können, filterbar nach Stylist.
- **FR-007**: Der Admin MUSS Termine manuell anlegen können (Dienstleistung, Stylist, Zeitpunkt), wahlweise mit Zuordnung zu einem bestehenden Kunden oder mit reinen Gast-Kontaktdaten. Manuell angelegte Termine erhalten sofort den Status **bestätigt** — der Slot ist damit unmittelbar blockiert. Der Doppelbuchungsschutz MUSS greifen. Ein Admin-Override außerhalb des regulären Arbeitsplans MUSS möglich sein, ohne den Doppelbuchungsschutz aufzuheben.
- **FR-008**: Der Admin MUSS Termine verschieben (Zeit und/oder Stylist), ihren Status setzen (bestätigt, storniert, No-Show, erledigt) und eine interne Notiz hinterlegen können.
- **FR-009**: Der Admin MUSS beim Anlegen eines Termins nach bestehenden Kunden suchen und einen Stammkunden zuordnen können. Die Suche MUSS gegen **Name und Telefonnummer** als Präfix-Suche funktionieren (z. B. „Mar" findet „Marco", „017" findet „0171 …"). (Volle Kundenverwaltung bleibt Phase 4 vorbehalten.)
- **FR-010**: Der Admin MUSS den Tagesplan als PDF exportieren können, optional gefiltert nach Stylist. Die PDF MUSS die Mindestfelder enthalten (Uhrzeit, Dienstleistung, Stylist, Kundenname) und sensible Notizen standardmäßig ausschließen; die Aufnahme von Notizen ist nur per bewusst aktivierter Option zulässig. Die PDF wird on-demand erzeugt und DARF NICHT dauerhaft serverseitig gespeichert werden.
- **FR-011**: Der Admin MUSS nach dem Login eine Tages-Übersicht sehen (heutige Termine und heute arbeitende Stylisten).

### Key Entities *(include if feature involves data)*

- **AdminAccount**: Zugang mit einer einzigen Admin-Rolle; gekapseltes Auth-Modul, in Phase 4 erweiterbar.
- **Service (Dienstleistung)**: Name, feste Dauer, fester Preis, Beschreibung, Aktiv-Status; n:m zu TeamMember.
- **TeamMember (Teammitglied)**: Name, Foto, Kurzprofil, Aktiv-Status; n:m zu Service.
- **SalonHours (Salon-Öffnungszeit)**: Wöchentlich wiederkehrender Rahmen (Wochentag, Von, Bis).
- **SalonClosure (Ganztägige Schließung)**: Einzelnes Datum; Duplikate werden abgewiesen.
- **WorkingHours (Arbeitszeit)**: Wöchentlicher Standard-Arbeitsplan je Teammitglied (Wochentag, Von, Bis).
- **WorkingException (Tages-Überschreibung)**: Abweichung vom Standard für ein konkretes Datum je Teammitglied (Typen: zusätzlich da, frei, Blocker).
- **Appointment (Termin)**: Dienstleistung, Stylist, Zeitpunkt, Status, interne Notiz; verknüpft mit Customer oder Gast-Kontaktdaten.
- **Customer (Kunde)**: Beim Termin-Anlegen suchbar und zuordenbar; vollständige Kundenverwaltung in Phase 4.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Unauthentifizierte Zugriffe auf Admin-Funktionen werden in 100 % der Fälle abgewiesen; nach erfolgreicher Anmeldung ist der volle Zugang erreichbar.
- **SC-002**: Ein vollständiger Stammdaten-Satz (Dienstleistungen, Teammitglieder, Öffnungszeiten, Arbeitspläne) lässt sich anlegen und wird nach dem Speichern unverändert zurückgegeben.
- **SC-003**: Ein manuell angelegter Walk-in blockiert sofort den entsprechenden Slot für denselben Stylisten; ein Termin im selben Slot wird abgewiesen — nachweisbar per automatisiertem Test.
- **SC-004**: Die exportierte Tagesplan-PDF enthält die Pflichtfelder (Uhrzeit, Dienstleistung, Stylist, Kundenname) und schließt Notizen standardmäßig aus; mit aktivierter Option sind Notizen enthalten — nachweisbar per Test.
- **SC-005**: Eine Pro-Tag-Überschreibung der Stylist-Verfügbarkeit ändert die berechnete Verfügbarkeit für genau diesen Tag korrekt; alle anderen Tage bleiben unverändert — nachweisbar per automatisiertem Test.

## Assumptions

- Die Admin-Oberfläche ist intern (nicht öffentlich erreichbar); ein nüchternes, funktionales Design genügt (Funktion vor Show, gemäß Spec-Vorgabe).
- Es gibt genau einen Admin-Account; ein Self-Service-Passwort-Reset-Flow für den Admin ist außerhalb des Geltungsbereichs dieser Phase.
- Gast-Kontaktdaten bei Walk-ins: Name und Telefonnummer sind ausreichend; eine E-Mail-Adresse ist optional, da in dieser Phase kein automatischer E-Mail-Versand stattfindet.
- Der Doppelbuchungsschutz gilt nur für Termine mit Status „bestätigt"; stornierte, No-Show- und erledigte Termine geben ihren Slot sofort frei. Manuell angelegte Termine starten immer mit Status „bestätigt".
- Wenn der Admin eine Schließung einträgt und bereits bestätigte Termine an diesem Tag bestehen, MUSS das System eine Warnung anzeigen und eine **explizite Bestätigung** verlangen, bevor die Schließung gespeichert wird. Bestehende Termine werden nicht automatisch storniert — der Admin ist verantwortlich, betroffene Kunden manuell zu kontaktieren und Termine umzubuchen.
- Foto bei Teammitgliedern: Die technische Form (URL vs. Datei-Upload) wird im Planungsschritt entschieden.
- Die PDF-Erzeugung erfolgt vollständig serverseitig on-demand und wird als Download an den Browser ausgeliefert; keine Zwischenspeicherung auf dem Server.

## Clarifications

### Session 2026-06-09

- Q: What is the default status of an appointment created manually by the admin? → A: `confirmed` — slot is blocked immediately on creation; no separate confirmation step required.
- Q: What happens after repeated failed login attempts? → A: Progressive delay (capped at 30 s) + IP rate-limiting per Prinzip XI; generic error message; no hard account lockout (single-admin DoS risk).
- Q: How long should an admin session remain active before requiring re-login? → A: 8 hours, activity-based reset; session expires naturally overnight.
- Q: Which fields does the customer search match against when creating an appointment? → A: Name + Telefonnummer, Präfix-Suche.
- Q: What does the system do when saving a closure for a day with existing confirmed appointments? → A: Show warning, require explicit confirmation; existing appointments unchanged (admin handles manually).
