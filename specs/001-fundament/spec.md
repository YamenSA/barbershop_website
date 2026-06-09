# Feature Specification: Fundament & Domänen-Modell

**Feature Branch**: `001-fundament-domain`

**Created**: 2026-06-08

**Status**: Draft

**Input**: Phase 0 — gemeinsame Domänendefinition: Dienstleistungen, Team, Termine, Kunden.

---

## Zweck

Diese Phase legt die gemeinsame Domäne fest, auf der alle späteren Features aufbauen: die Dienstleistungen des Salons, das Team mit seinen Arbeitszeiten, das Konzept eines Termins sowie Kunden. Es entsteht in dieser Phase **keine endnutzerseitige Oberfläche** — sie definiert das Daten-Fundament und die geteilten Begriffe. Wenn dieses Fundament falsch sitzt, erbt jede Folge-Phase den Fehler.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Salon-Dienstleistungen und Teamzuordnung pflegen (Priority: P1)

Der Salon-Betreiber kann Dienstleistungen anlegen (z.B. „Herrenschnitt", Dauer 45 min, Preis 25 €) und einem oder mehreren Teammitgliedern zuweisen. Jedes Teammitglied weiß dadurch, welche Leistungen es anbietet.

**Why this priority**: Ohne dieses Fundament gibt es keine buchbaren Leistungen. Alle Folge-Phasen (Buchungs-Flow, Admin-Oberfläche) hängen davon ab.

**Independent Test**: Ein Datenbanktest legt eine Dienstleistung an und ordnet ihr zwei Teammitglieder zu. Die Abfrage muss beide zurückliefern — ohne weitere Infrastruktur.

**Acceptance Scenarios**:

1. **Given** eine neue Dienstleistung mit Name, Dauer und Preis, **When** sie gespeichert wird, **Then** ist sie abrufbar mit exakt diesen Werten.
2. **Given** eine Dienstleistung und zwei Teammitglieder, **When** beide zugeordnet werden, **Then** liefert die Abfrage „Wer erbringt Dienstleistung X?" beide zurück.
3. **Given** eine Dienstleistung ohne zugeordnete Teammitglieder, **When** nach verfügbaren Ausführenden gefragt wird, **Then** liefert das System eine leere Menge (kein stiller Fehler).

---

### User Story 2 — Verfügbarkeit korrekt berechnen (Priority: P1)

Das System kann für eine gewünschte Dienstleistung und einen Zeitraum berechnen, welche Teammitglieder wann buchbar sind. Die Berechnung berücksichtigt: Salon-Öffnungszeiten, individuelle Arbeitszeiten der Teammitglieder, Ausnahmen (Urlaub, Feiertage, Blocker) und bereits bestätigte Termine.

**Why this priority**: Die Verfügbarkeitsberechnung ist das Herzstück des gesamten Buchungssystems. Ist sie fehlerhaft, werden falsche Zeiten angeboten.

**Independent Test**: Testdaten (Öffnungszeiten, Arbeitszeiten, ein bestehender Termin) werden angelegt, die Verfügbarkeitsabfrage direkt gegen die Geschäftslogik aufgerufen und das Ergebnis geprüft — kein HTTP, kein UI.

**Acceptance Scenarios**:

1. **Given** ein Teammitglied arbeitet Mo–Fr 9–18 Uhr, und es hat heute 10:00–10:45 Uhr einen Termin, **When** Verfügbarkeit für heute abgefragt wird, **Then** ist 10:00–10:45 Uhr nicht verfügbar, alle anderen Slots innerhalb der Arbeitszeit schon.
2. **Given** ein Feiertag ist als ganztägige Salon-Schließung eingetragen, **When** Verfügbarkeit für diesen Tag abgefragt wird, **Then** liefert das System für alle Teammitglieder keine Slots.
3. **Given** ein Teammitglied hat Urlaub eingetragen, **When** Verfügbarkeit in diesem Zeitraum abgefragt wird, **Then** wird das Mitglied nicht als verfügbar ausgewiesen — auch wenn der Salon offen hat.
4. **Given** keine gespeicherte Slot-Tabelle, **When** Verfügbarkeit abgefragt wird, **Then** wird das Ergebnis live aus den Rohdaten berechnet (keine vorberechneten Slot-Listen).

---

### User Story 3 — Termin anlegen und Doppelbuchung strukturell verhindern (Priority: P1)

Ein Termin kann für ein Teammitglied, eine Dienstleistung und ein Zeitfenster angelegt werden — entweder mit Verweis auf ein Kundenkonto oder mit eigenständigen Gast-Kontaktdaten. Das System verhindert auf Datenbankebene, dass dasselbe Teammitglied zwei überlappende bestätigte Termine hat.

**Why this priority**: Doppelbuchungen sind betriebskritisch. Sie müssen strukturell — nicht nur durch Anwendungslogik — ausgeschlossen werden (Konstitution, Prinzip III).

**Independent Test**: Zwei gleichzeitige Buchungsversuche für dasselbe Teammitglied und denselben Zeitraum werden direkt gegen die Datenbank ausgeführt. Genau einer muss erfolgreich sein; der andere muss mit einem Datenbankfehler (Constraint) abgelehnt werden.

**Acceptance Scenarios**:

1. **Given** ein Teammitglied hat Termin A von 10:00–10:45 Uhr, **When** Termin B von 10:30–11:15 Uhr für dasselbe Mitglied angelegt wird, **Then** schlägt die Datenbanktransaktion fehl.
2. **Given** eine Laufkunden-Buchung ohne Kundenkonto, **When** der Termin mit Name und Telefon (statt Kundenkonto) angelegt wird, **Then** wird er korrekt gespeichert.
3. **Given** ein stornierter Termin A von 10:00–10:45 Uhr, **When** Termin B für denselben Slot und dasselbe Mitglied angelegt wird, **Then** wird Termin B akzeptiert (stornierte Termine blockieren keine Slots).

---

### User Story 4 — DSGVO-konforme Datenhaltung und Anonymisierung (Priority: P2)

Das System verwaltet personenbezogene Daten nach einem konfigurierbaren Aufbewahrungskonzept: Gast-Termine werden 12 Monate nach dem Termin anonymisiert; kontogebundene Kundendaten werden bei Konto-Löschung sowie nach 24 Monaten Inaktivität **unwiderruflich anonymisiert**. Die Anonymisierung ist nicht umkehrbar. Die Fristen sind konfigurierbar.

**Why this priority**: Gesetzliche Pflicht nach DSGVO/deutschem Recht (Konstitution, Prinzip II). Baut auf den Fundament-Entitäten auf, ist aber nicht für den täglichen Buchungsbetrieb notwendig.

**Independent Test**: Ein Hintergrundjob wird mit Testdaten (abgelaufene Fristen) aufgerufen. Danach sind personenbezogene Felder anonymisiert — keine echten Namen oder Telefonnummern mehr vorhanden.

**Acceptance Scenarios**:

1. **Given** ein Gast-Termin, der vor mehr als 12 Monaten stattfand, **When** der Anonymisierungslauf ausgeführt wird, **Then** sind Name und Telefon des Gastes nicht mehr lesbar (ersetzt durch Platzhalter).
2. **Given** ein Kundenkonto, das seit 24 Monaten nicht genutzt wurde, **When** der Anonymisierungslauf ausgeführt wird, **Then** sind alle personenbezogenen Felder anonymisiert.
3. **Given** eine konfigurierte Frist von 6 Monaten (Testumgebung), **When** ein Gast-Termin 6 Monate alt ist, **Then** greift die Anonymisierung nach dieser Konfiguration — nicht nach dem Produktions-Standard.

---

### Edge Cases

- Ein Teammitglied hat keine Arbeitszeiten hinterlegt → System behandelt es als nicht verfügbar (kein Fehler, leere Antwort).
- Eine Dienstleistung ist keinem Teammitglied zugeordnet → buchbar in der Konfiguration, liefert aber keine verfügbaren Slots.
- Überlappende Ausnahmen (z.B. Urlaub + Feiertag am gleichen Tag) → System behandelt den Tag korrekt als nicht verfügbar (keine Fehler bei Mehrfach-Ausnahmen).
- Individuelle Arbeitszeiten sind breiter als die Salon-Öffnungszeiten → Salon-Öffnungszeiten gewinnen; nur die Schnittmenge ist buchbar.
- Aufbewahrungsfristen werden im laufenden Betrieb geändert → neue Frist gilt ab nächstem Lauf; Anonymisierung ist **unwiderruflich** — bereits anonymisierte Daten können nicht wiederhergestellt werden.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001:** Das System MUSS Dienstleistungen mit Name sowie **fester** Dauer und **festem** Preis abbilden (identisch für alle Teammitglieder).
- **FR-002:** Das System MUSS Dienstleistungen mit Teammitgliedern verknüpfen können (n:m-Beziehung).
- **FR-003:** Das System MUSS **Salon-Öffnungszeiten** als äußeren Rahmen abbilden (inkl. ganztägiger Schließungen) sowie je Teammitglied individuelle Arbeitszeiten und Ausnahmen *innerhalb* dieses Rahmens.
- **FR-004:** Das System MUSS Termine abbilden, die auf Dienstleistung, Teammitglied, Zeitfenster und einen Status verweisen.
- **FR-005:** Ein Termin MUSS wahlweise mit einem Kundenkonto verknüpft sein ODER eigenständige Gast-Kontaktdaten (Name, Telefon) tragen können.
- **FR-006:** Verfügbarkeit MUSS **berechnet** werden aus der Schnittmenge von Salon-Öffnungszeiten und individuellen Arbeitszeiten, abzüglich Ausnahmen und belegter Termine. Es darf keine vorab gespeicherte Slot-Tabelle geben.
- **FR-007:** Das System MUSS strukturell verhindern, dass ein Teammitglied zwei einander überlappende bestätigte Termine hat (Konfliktschutz auf Datenbankebene, nicht nur in der Anwendungslogik).
- **FR-008:** Personenbezogene Daten MÜSSEN einem **konfigurierbaren** Aufbewahrungskonzept unterliegen: Gast-Termine werden 12 Monate nach dem Termin anonymisiert; kontogebundene Daten bleiben solange das Konto aktiv ist, werden bei Konto-Löschung sowie nach 24 Monaten Inaktivität **unwiderruflich anonymisiert** (keine physische Löschung — Anonymisierung nach Art. 4 Nr. 1 DSGVO). Die Fristen sind als Konfigurationswerte zu führen.

### Key Entities *(include if feature involves data)*

- **Dienstleistung:** Was der Salon anbietet. Trägt Name, feste Dauer und festen Preis. Wird einem oder mehreren Teammitgliedern zugeordnet.
- **Teammitglied:** Wer die Leistung erbringt. Trägt Profilangaben (mindestens Name), die angebotenen Dienstleistungen und individuelle Arbeitszeiten.
- **Salon-Öffnungszeit:** Der äußere Rahmen, wann der Laden offen ist. Enthält reguläre Wochentag-Zeiten sowie ganztägige Schließungen (Feiertage, Betriebsurlaub).
- **Arbeitszeit:** Wann ein bestimmtes Teammitglied innerhalb der Salon-Öffnungszeiten verfügbar ist (regulärer Wochenplan).
- **Ausnahme:** Ein abweichender Zeitraum für ein Teammitglied — z.B. Urlaub, freier Tag oder ein Blocker.
- **Termin:** Die zentrale Buchungs-Einheit. Verbindet Dienstleistung, Teammitglied, Startzeitpunkt und Dauer sowie Status (`bestätigt` / `erschienen` / `storniert` / `nicht erschienen`) und entweder einen Kunden oder Gast-Kontaktdaten.
- **Kunde:** Eine Person mit registriertem Konto. Trägt Kontaktdaten (Name, E-Mail, Telefon) und Aktivitäts-Metadaten (für DSGVO-Fristen).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001:** Alle definierten Domänen-Entitäten sind persistierbar und über die Service-Schicht korrekt abrufbar — nachweisbar durch eine vollständige automatisierte Testsuite für jede Entität.
- **SC-002:** Die Verfügbarkeitsberechnung liefert für einen gegebenen Zeitraum und eine Dienstleistung in unter 500 ms eine korrekte Antwort (gemessen auf einem einzelnen Dev-Server, ohne Cache).
- **SC-003:** Der Doppelbuchungsschutz hält 100 % der gleichzeitigen Buchungsversuche stand: kein paralleler Schreibversuch führt zu zwei überlappenden bestätigten Terminen (nachweisbar durch Lasttests mit gleichzeitigen Datenbank-Writes).
- **SC-004:** Der Anonymisierungslauf verarbeitet 10.000 abgelaufene Datensätze in unter 5 Minuten und hinterlässt keine personenbezogenen Daten in betroffenen Feldern.
- **SC-005:** Aufbewahrungsfristen sind ohne Code-Änderung konfigurierbar und wirken sich beim nächsten Lauf korrekt aus — nachweisbar durch einen Konfigurationstest in der Testumgebung.

---

## Assumptions

- Dienstleistungspreise und -dauern sind fix und gelten einheitlich für alle Teammitglieder (keine mitgliedsabhängigen Preise im MVP).
- Öffnungszeiten und Arbeitszeiten folgen einem wöchentlichen Wiederholungsmuster; unregelmäßige Sonderschichten werden über Ausnahmen abgebildet.
- Doppelbuchungsschutz gilt ausschließlich für Termine im Status „bestätigt" — stornierte oder vergangene Termine blockieren keine Slots.
- Das Kunden-Authentifizierungssystem (Login, Passwort-Reset) ist nicht Teil dieser Phase; die Kunden-Entität trägt nur Kontaktdaten und Aktivitäts-Metadaten.
- Der Anonymisierungsjob läuft als Hintergrundprozess (z.B. Cronjob); der genaue Auslösemechanismus wird in Phase 1 (Admin-Backend) festgelegt.
- Die Aufbewahrungsfristen (12 / 24 Monate) bedürfen noch der rechtlichen Abnahme durch einen Datenschutzbeauftragten oder die IHK. Sie sind konfigurierbar, damit eine Anpassung keine Code-Änderung erfordert.

---

## Außerhalb des Geltungsbereichs

- Buchungs-Oberfläche und Buchungs-Flow (Phase 3).
- Admin-Oberfläche zur Pflege dieser Daten (Phase 1).
- Öffentliche Website (Phase 2), Kundenkonto/Self-Service (Phase 4).
- Jegliche Zahlungsabwicklung (im MVP generell nicht vorgesehen).
- Kunden-Authentifizierung (Login, Registrierung, Passwort-Reset) — spätere Phase.
