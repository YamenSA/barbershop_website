# Feature Specification: Smart Booking Engine

**Feature Branch**: `004-smart-booking-engine`

**Created**: 2026-06-10

**Status**: Draft

**Input**: User description: "Öffentlicher Online-Buchungs-Flow für Salon-Termine (Dienstleistung → Stylist → Zeit → Kontaktdaten → Bestätigung). Keine Online-Zahlung — Zahlung bar vor Ort. Der Web-Kalender ist die alleinige Quelle der Wahrheit für alle Termine. Bestätigung und Erinnerung per E-Mail/SMS. Self-Service-Konto ist nicht Teil dieser Phase."

## Clarifications

### Session 2026-06-10

- Q: Erfolgt Bestätigung und Erinnerung per E-Mail, SMS oder beidem? → A: Nur E-Mail (E-Mail Pflichtfeld, Telefon optional, keine SMS-Einwilligung)
- Q: Gehört Gast-Stornierung/-Umbuchung in Phase 3 (Token-Link) oder Phase 4? → A: In Phase 3 nur Stornierung über tokenisierten Link; Umbuchung erst Phase 4
- Q: Werden Online-Buchungen sofort automatisch bestätigt oder erst nach Admin-Freigabe? → A: Sofort automatisch bestätigt (Slot direkt verbindlich belegt)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Termin online buchen und Bestätigung erhalten (Priority: P1)

Ein Kunde möchte außerhalb der Öffnungszeiten und ohne Anruf einen Termin buchen. Er wählt eine Dienstleistung, sieht die verfügbaren Stylisten und Zeiten, wählt einen freien Slot, gibt seine Kontaktdaten ein und erhält eine verbindliche Bestätigung mit dem Hinweis, dass vor Ort bar gezahlt wird.

**Why this priority**: Das ist das Herzstück des gesamten Projekts und der eigentliche Grund für die Plattform. Ohne diesen Flow liefert nichts in dieser Phase Wert. Er ist allein lauffähig — alle anderen Stories bauen darauf auf.

**Independent Test**: Vollständig testbar, indem ein Tester ohne Konto eine vorhandene Dienstleistung auswählt, einen freien Slot bucht und die Bestätigung erhält; der gebuchte Slot erscheint danach belegt im Kalender und ist für andere nicht mehr wählbar.

**Acceptance Scenarios**:

1. **Given** ein Stylist hat am Dienstag 14:00 einen freien, zur Dienstleistungsdauer passenden Slot, **When** der Kunde diese Dienstleistung, diesen Stylisten und 14:00 wählt und seine Kontaktdaten bestätigt, **Then** wird der Termin angelegt, der Slot ist danach nicht mehr buchbar, und der Kunde erhält eine Bestätigung mit Datum, Uhrzeit, Stylist, Dienstleistung und dem Hinweis „Zahlung bar vor Ort".
2. **Given** ein Slot ist durch einen vom Admin manuell eingetragenen Walk-in (Phase 1) belegt, **When** ein Online-Kunde verfügbare Zeiten für denselben Stylisten ansieht, **Then** wird dieser Slot nicht als verfügbar angezeigt.
3. **Given** die gewählte Dienstleistung dauert 45 Minuten, **When** das System Slots berechnet, **Then** werden nur Startzeiten angeboten, bei denen 45 zusammenhängende Minuten innerhalb des Stylist-Zeitplans und der Salon-Öffnungszeiten frei sind.
4. **Given** zwei Kunden öffnen gleichzeitig denselben letzten freien Slot, **When** beide nahezu zeitgleich bestätigen, **Then** gelingt genau eine Buchung; die zweite erhält eine klare Meldung, dass der Slot inzwischen vergeben ist.
5. **Given** die gewählte Dienstleistung würde über die Salon-Schließzeit oder das Ende des Stylist-Zeitplans hinausragen, **When** das System Slots berechnet, **Then** wird keine Startzeit angeboten, deren Dauer nicht vollständig in das offene Fenster passt.

---

### User Story 2 — Erinnerung vor dem Termin (Priority: P2)

Der Kunde erhält vor seinem Termin automatisch eine Erinnerung, um No-Shows zu reduzieren — der zentrale Trade-off der Bar-vor-Ort-Entscheidung.

**Why this priority**: Wichtigste Gegenmaßnahme gegen No-Shows, da keine Anzahlung als Bindung wirkt. Setzt eine funktionierende Buchung (P1) voraus, liefert aber eigenständigen Wert und ist separat testbar.

**Independent Test**: Testbar, indem eine Buchung angelegt und geprüft wird, dass zum definierten Vorlauf (24 Stunden vor Terminbeginn) eine Erinnerung über den festgelegten Kanal ausgelöst wird.

**Acceptance Scenarios**:

1. **Given** ein bestätigter Termin liegt in der Zukunft, **When** der Erinnerungs-Vorlauf von 24 Stunden vor Terminbeginn erreicht ist, **Then** erhält der Kunde eine Erinnerung mit den Termindetails.
2. **Given** ein Termin wurde storniert, **When** der Erinnerungs-Zeitpunkt erreicht würde, **Then** wird keine Erinnerung versendet.
3. **Given** eine Buchung wird weniger als 24 Stunden vor Terminbeginn angelegt, **When** die Bestätigung versendet wird, **Then** entfällt die separate Erinnerung (der Erinnerungs-Zeitpunkt liegt bereits in der Vergangenheit).

---

### User Story 3 — Termin selbst stornieren ohne Konto (Priority: P3)

Der Kunde kann seinen Termin über einen sicheren, tokenisierten Link in der Bestätigung stornieren, ohne ein Konto anzulegen — damit ein verhinderter Kunde den Slot freigibt, statt nicht zu erscheinen. Das Verschieben (Umbuchen) eines Termins ist in dieser Phase **nicht** enthalten und folgt mit dem Self-Service-Konto in Phase 4; wer umbuchen möchte, storniert und bucht neu.

**Why this priority**: Reduziert No-Shows zusätzlich und gibt Slots an den Pool zurück. Grenzt an Phase 4 (Self-Service), ist hier aber bewusst leichtgewichtig (tokenisierter Link, kein Login) gehalten.

**Independent Test**: Testbar, indem aus einer Bestätigung heraus der Storno-Link aufgerufen wird und der zugehörige Slot danach wieder buchbar ist.

**Acceptance Scenarios**:

1. **Given** ein Kunde hat eine Bestätigung mit Storno-Link, **When** er den Link aufruft und storniert, **Then** wird der Termin als storniert markiert und der Slot wieder freigegeben.
2. **Given** die Stornofrist (bis 24 Stunden vor Terminbeginn) ist bereits überschritten, **When** der Kunde stornieren möchte, **Then** wird die Online-Stornierung abgelehnt und er auf den telefonischen Kontakt verwiesen.
3. **Given** ein Kunde ruft den Storno-Link erneut auf, nachdem der Termin bereits storniert wurde, **When** der Link geöffnet wird, **Then** wird der bereits stornierte Zustand angezeigt, ohne dass eine erneute Aktion etwas verändert.

---

### Edge Cases

- **Nachträgliche Stylist-Abwesenheit**: Wird ein Stylist nach einer Buchung für den betreffenden Tag krank/abwesend gesetzt (Tages-Override aus Phase 1), bleibt der bereits gebuchte Termin bestehen und wird dem Admin im Kalender als Konflikt sichtbar gemacht; die Kontaktaufnahme mit dem Kunden zur Verlegung erfolgt manuell durch den Admin (kein automatischer Massen-Versand in dieser Phase).
- **Nicht zustellbare Benachrichtigung**: Schlägt der Versand über den gewählten Kanal fehl (z.B. ungültige Adresse), wird der Fehlversand protokolliert und dem Admin sichtbar gemacht; die Buchung selbst bleibt gültig.
- **Dauer überragt Schließzeit**: Startzeiten, deren Dienstleistungsdauer über Salon-Schließzeit oder Stylist-Zeitplan-Ende hinausragt, werden gar nicht erst als verfügbar angeboten (siehe US1, Szenario 5).
- **Doppelbuchung durch denselben Kunden**: Versucht derselbe Kunde überlappende Termine zu buchen, wird die zweite überlappende Buchung mit Hinweis abgelehnt.
- **Slots am Rand der Öffnungszeiten**: Ohne konfigurierte Puffer-/Rüstzeit (nicht Teil des MVP) werden Slots bis exakt an die Fenstergrenze angeboten.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Das System MUSS verfügbare Slots aus der Schnittmenge von Stylist-Zeitplan und Salon-Öffnungszeiten berechnen, abzüglich bereits belegter Zeiten und unter Berücksichtigung der festen Dauer der gewählten Dienstleistung.
- **FR-002**: Nutzer MÜSSEN einen Termin ohne Konto buchen können, in der Reihenfolge Dienstleistung → Stylist → Zeit → Kontaktdaten → Bestätigung.
- **FR-003**: Das System MUSS Doppelbuchungen verhindern: Bei nebenläufigen Buchungsversuchen auf denselben Slot darf höchstens einer erfolgreich sein; der unterlegene Versuch erhält eine klare Meldung, dass der Slot inzwischen vergeben ist.
- **FR-004**: Der Web-Kalender MUSS die alleinige Quelle der Wahrheit für alle Termine sein; online gebuchte Termine und vom Admin manuell eingetragene Walk-ins (Phase 1) teilen denselben Slot-Pool und blockieren sich gegenseitig.
- **FR-005**: Das System MUSS nach erfolgreicher Buchung eine Bestätigung mit allen Termindetails (Datum, Uhrzeit, Stylist, Dienstleistung, Barzahlungs-Hinweis) per E-Mail versenden. E-Mail ist der einzige Benachrichtigungskanal dieser Phase; SMS ist nicht Teil des MVP.
- **FR-006**: Das System DARF KEINE Zahlungen verarbeiten; jede Bestätigung MUSS klar ausweisen, dass die Zahlung bar vor Ort erfolgt.
- **FR-007**: Das System MUSS vor jedem zukünftigen Termin automatisch eine Erinnerung per E-Mail mit 24 Stunden Vorlauf auslösen; liegt der Erinnerungs-Zeitpunkt zum Buchungszeitpunkt bereits in der Vergangenheit, entfällt die separate Erinnerung.
- **FR-008**: Das System MUSS dem Kunden ermöglichen, einen Termin bis 24 Stunden vor Terminbeginn über einen sicheren, tokenisierten Link (kein Konto) zu stornieren; nach Ablauf der Frist wird die Online-Stornierung abgelehnt und auf den telefonischen Kontakt verwiesen. Eine Online-Umbuchung (Verschieben) ist in dieser Phase nicht enthalten und erfolgt mit dem Self-Service-Konto in Phase 4.
- **FR-009**: Das System MUSS bei der Buchung nur die für Durchführung und Benachrichtigung minimal nötigen Kundendaten erheben (Datenminimierung): Name und E-Mail-Adresse als Pflichtfelder; eine Telefonnummer ist optional (z.B. für telefonische Rückfragen des Salons) und nicht Versandvoraussetzung.
- **FR-010**: Das System MUSS die Verarbeitung der Buchungsdaten auf die Vertragserfüllung (Art. 6 (1) b DSGVO) stützen und im Buchungs-Flow auf die Datenschutzerklärung verweisen. Da nur E-Mail (Bestätigung/Erinnerung als Vertragskommunikation) genutzt wird, ist keine separate Einwilligung erforderlich.
- **FR-011**: Das System MUSS eine definierte Aufbewahrungs- und Löschregel für Termin- und Kontaktdaten umsetzen, indem es den bestehenden Anonymisierungs-/Retention-Mechanismus aus Phase 1 (`run_retention_job`) wiederverwendet; eine Rechnungs-Aufbewahrungspflicht entfällt mangels Online-Zahlung.
- **FR-012**: Das System MUSS Buchungen nur innerhalb eines erlaubten Zeitfensters zulassen: minimale Vorlaufzeit von 2 Stunden vor Terminbeginn und maximaler Buchungshorizont von 60 Tagen im Voraus.
- **FR-013**: Das System MUSS Startzeiten in einem festen Raster von 15 Minuten anbieten.
- **FR-014**: Das System MUSS eine Option „beliebiger verfügbarer Stylist" anbieten, die einen Termin bei einem geeigneten, freien Stylisten zuweist.
- **FR-015**: Das System MUSS im MVP genau eine Dienstleistung pro Buchung zulassen; die Kombination mehrerer Dienstleistungen in einer Buchung ist nicht Teil dieser Phase.
- **FR-016**: Online-Buchungen MÜSSEN sofort automatisch bestätigt werden (Slot direkt verbindlich belegt, ohne manuelle Admin-Freigabe) und für den Admin im selben Kalender sichtbar und verwaltbar sein.
- **FR-017**: Das System MUSS den Buchungsstatus eines Termins abbilden (z.B. bestätigt, storniert, wahrgenommen, nicht erschienen), um No-Show-Auswertung und eine spätere optionale Anzahlung ohne Umbau zu ermöglichen.

### Key Entities *(include if feature involves data)*

- **Termin (Buchung)**: Repräsentiert eine vereinbarte Terminzeit. Attribute: Datum/Startzeit, abgeleitete Endzeit (aus Dienstleistungsdauer), Status, Herkunft (online / Walk-in), Bezug zu Dienstleistung, Stylist und Kunde. Zentrale Entität dieser Phase, baut auf der Phase-1-Entität auf.
- **Kunde (Kontakt)**: Minimaler Gast-Datensatz für Durchführung und Benachrichtigung (Name, E-Mail-Adresse als Benachrichtigungskanal, optional Telefonnummer). Kein Login/Konto in dieser Phase; der Datensatz wird jedoch als stabiler, später mit einem Konto (Phase 4) verknüpfbarer Eintrag geführt.
- **Verfügbarkeit / Slot**: Abgeleitetes Konzept aus Stylist-Zeitplan ∩ Öffnungszeiten − Belegung − Dauer; in der Regel berechnet, nicht zwingend persistiert.
- **Benachrichtigung**: Bestätigung oder Erinnerung; Bezug zum Termin, Kanal, Versandstatus (inkl. Fehlversand für Admin-Sichtbarkeit).
- **Storno-Token**: Sicherer, nicht erratbarer Verweis, der einen Termin eindeutig adressiert und die kontolose Stornierung autorisiert (Umbuchung erst Phase 4).
- **Dienstleistung**, **Stylist/Team**, **Öffnungszeiten**, **Stylist-Zeitplan (inkl. Tages-Overrides)**: Stammdaten aus Phase 1; werden referenziert, nicht in dieser Phase erzeugt.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ein Kunde kann eine Buchung von Start bis Bestätigung in unter 2 Minuten abschließen.
- **SC-002**: Es entstehen keine Doppelbuchungen — null kollidierende Termine pro Stylist im Kalender.
- **SC-003**: Die Bestätigung erreicht den Kunden innerhalb von 5 Minuten nach der Buchung.
- **SC-004**: Mindestens 90 % der Nutzer schließen die Buchung beim ersten Versuch ohne fremde Hilfe ab.
- **SC-005**: Telefonische Terminanfragen sinken innerhalb von drei Monaten nach Einführung um mindestens 30 %.
- **SC-006**: Die No-Show-Rate bleibt mit aktiver Erinnerung unter 10 % der bestätigten Online-Termine.

---

## Assumptions

- Die Phase-1-Stammdaten existieren und sind die Datenquelle: Dienstleistungen mit fester Dauer und festem Preis, Team/Stylisten, Salon-Öffnungszeiten sowie Stylist-Zeitpläne inkl. Tages-Overrides.
- Der Web-Kalender ist die alleinige Quelle der Wahrheit; Walk-ins werden vom Admin manuell eingetragen (Phase 1) und blockieren reguläre Slots.
- Es findet keine Online-Zahlung statt; gezahlt wird bar vor Ort. Eine optionale Anzahlung kann später ohne Architektur-Umbau ergänzt werden (FR-017 hält den Status dafür offen).
- Das Kundenkonto und der volle Self-Service sind Phase 4; Phase 3 erlaubt daher Gast-Buchungen ohne Konto.
- Die BarberKasse-App bleibt lokal und eigenständig, ohne Anbindung an die Plattform.
- Inhalte und Oberfläche sind deutschsprachig.
- Impressum und Datenschutzerklärung existieren aus Phase 2; die Datenschutzerklärung wird um die in dieser Phase genutzten Verarbeitungen und Dienstleister ergänzt, sobald `/speckit.plan` den Tech-Stack festlegt.
- **Erinnerungs-Vorlauf**: 24 Stunden vor Terminbeginn (Standard-Default; in `/speckit.clarify` bestätigt/justiert).
- **Stornofrist**: bis 24 Stunden vor Terminbeginn; danach nur noch telefonisch.
- **Buchungsfenster**: minimale Vorlaufzeit 2 Stunden, maximaler Horizont 60 Tage.
- **Slot-Raster**: feste 15-Minuten-Granularität.
- **Eine Dienstleistung pro Buchung** im MVP; Mehrfach-/Kombi-Buchung später.
- **„Beliebiger Stylist"-Option** ist im MVP enthalten.
- **Keine Puffer-/Rüstzeit** zwischen Terminen im MVP; die feste Dienstleistungsdauer ist die einzige Belegung.
- **Aufbewahrung/Löschung** nutzt den bestehenden Retention-Mechanismus aus Phase 1 statt einer neuen Frist.
- **Nachträgliche Stylist-Abwesenheit** wird in dieser Phase manuell durch den Admin gehandhabt (Konfliktanzeige im Kalender, manuelle Kundenkontaktaufnahme), nicht automatisch aufgelöst.
