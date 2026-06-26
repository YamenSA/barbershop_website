# Feature Specification: Kundenkonto & Self-Service

**Feature Branch**: `005-customer-account-self-service`

**Created**: 2026-06-10

**Status**: Draft

**Input**: User description: "Registrierte Kunden können sich ein Konto anlegen (mit E-Mail-Verifikation), einloggen, ihre kommenden und vergangenen Termine sehen und ihre Termine selbst stornieren oder umbuchen — ohne Anruf. Sie verwalten ihr Basisprofil, können ihre Daten exportieren und ihr Konto selbst löschen (DSGVO). Frühere Gast-Buchungen mit derselben verifizierten E-Mail werden dem Konto zugeordnet. Kein Marketing, keine Zahlungsdaten."

## Clarifications

### Session 2026-06-10

- Q: Verhalten bei Konto-Löschung mit kommendem Termin? → A: Kommende Termine werden automatisch storniert (Slot über die Buchungs-Engine freigegeben), anschließend werden die personenbezogenen Daten anonymisiert.
- Q: Mindest-Passwortstärke (FR-017)? → A: ≥ 10 Zeichen, keine erzwungenen Zeichenklassen (NIST-orientiert: Länge vor Komplexität).
- Q: Sitzungsdauer und „Angemeldet bleiben" (FR-004)? → A: Standard ~8h JWT-Cookie wie Phase 1; optionale „Angemeldet bleiben"-Option verlängert auf ~30 Tage.
- Q: Messbarer Zielwert für SC-006? → A: ≥ 30 % Rückgang telefonisch/per Admin abgewickelter Stornos & Umbuchungen innerhalb von 3 Monaten nach Launch.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Konto anlegen, verifizieren und eigene Termine sehen (Priority: P1)

Ein Kunde, der schon einmal gebucht hat oder neu bucht, möchte seine Termine an einem Ort sehen, statt sich auf Bestätigungs-E-Mails zu verlassen. Er legt mit E-Mail und Passwort ein Konto an, bestätigt seine E-Mail über einen Link, loggt sich ein und sieht seine kommenden und vergangenen Termine.

**Why this priority**: Das Fundament der gesamten Phase — ohne Registrierung, Verifikation, Login und die Termin-Übersicht hat kein weiteres Self-Service-Feature einen Anker. Liefert für sich genommen bereits Wert (zentrale Termin-Übersicht) und ist eigenständig testbar.

**Independent Test**: Ein Tester legt ein Konto an, verifiziert die E-Mail über den Link, loggt sich ein und sieht genau die mit seiner Adresse verknüpften Termine — und keine fremden.

**Acceptance Scenarios**:

1. **Given** ein Besucher ohne Konto, **When** er sich mit E-Mail und Passwort registriert, **Then** wird das Konto als unverifiziert angelegt und eine Verifikations-E-Mail mit tokenisiertem Link versendet; ein Login ist noch nicht möglich.
2. **Given** ein unverifiziertes Konto, **When** der Kunde den gültigen Verifikationslink aufruft, **Then** wird das Konto aktiviert und der Login ist möglich.
3. **Given** ein eingeloggter Kunde, **When** er seine Übersicht öffnet, **Then** sieht er seine kommenden und vergangenen Termine mit Datum, Uhrzeit, Stylist und Dienstleistung.
4. **Given** ein eingeloggter Kunde A, **When** er versucht, auf einen Termin oder ein Profil von Kunde B zuzugreifen, **Then** wird der Zugriff abgewiesen.

---

### User Story 2 — Termine selbst stornieren und umbuchen (Priority: P2)

Der eingeloggte Kunde kann einen eigenen Termin ohne Anruf stornieren oder auf eine andere freie Zeit umbuchen. Das ist die in Phase 3 bewusst vertagte Umbuchung und zugleich der stärkste No-Show-Hebel der Self-Service-Phase.

**Why this priority**: Headline-Nutzen des Kontos und Entlastung des Salons. Setzt P1 (Login + Übersicht) voraus, liefert aber eigenständigen, testbaren Wert.

**Independent Test**: Ein eingeloggter Kunde storniert einen Termin (Slot wird wieder frei) und bucht einen anderen auf eine neue freie Zeit um, ohne dass der ursprüngliche Slot verloren geht, falls die Neureservierung scheitert.

**Acceptance Scenarios**:

1. **Given** ein eingeloggter Kunde mit einem kommenden Termin innerhalb der Stornofrist, **When** er storniert, **Then** wird der Termin als storniert markiert und der Slot wieder freigegeben.
2. **Given** ein eingeloggter Kunde will umbuchen, **When** er einen neuen freien Slot wählt und bestätigt, **Then** wird der neue Slot verbindlich reserviert und erst danach der alte freigegeben; der Kunde erhält eine aktualisierte Bestätigung.
3. **Given** der gewünschte neue Slot wird zwischen Anzeige und Bestätigung anderweitig belegt, **When** der Kunde bestätigt, **Then** bleibt der ursprüngliche Termin bestehen und der Kunde erhält eine klare Meldung, dass die Zeit nicht mehr frei ist.
4. **Given** die Stornofrist ist überschritten, **When** der Kunde stornieren oder umbuchen will, **Then** wird die Aktion abgelehnt und auf den telefonischen Kontakt verwiesen.

---

### User Story 3 — Profil verwalten, Daten exportieren, Konto löschen (Priority: P3)

Der eingeloggte Kunde kann sein Basisprofil bearbeiten, seine Daten exportieren (DSGVO-Auskunft/Übertragbarkeit) und sein Konto selbst löschen (DSGVO-Löschrecht).

**Why this priority**: Erfüllt Betroffenenrechte. Die Selbst-Löschung ist faktisch verpflichtend (Art. 17) und damit nicht streichbar, auch wenn sie in der Bau-Reihenfolge nach den Kern-Flows kommt.

**Independent Test**: Ein eingeloggter Kunde ändert seinen Namen, lädt einen Datenexport herunter und löscht sein Konto; danach ist kein identifizierbarer personenbezogener Datenpunkt mehr vorhanden.

**Acceptance Scenarios**:

1. **Given** ein eingeloggter Kunde, **When** er Name/Kontaktdaten ändert, **Then** werden die Profildaten aktualisiert (im Rahmen der Datenminimierung).
2. **Given** ein eingeloggter Kunde, **When** er den Datenexport anfordert, **Then** erhält er Profil und Terminhistorie in maschinenlesbarer Form.
3. **Given** ein eingeloggter Kunde, **When** er sein Konto löscht, **Then** werden seine personenbezogenen Daten über den bestehenden Anonymisierungspfad unkenntlich gemacht und ein erneuter Login ist nicht mehr möglich.

---

### User Story 4 — Frühere Gast-Buchungen übernehmen (Priority: P3, MVP-optional)

Hat der Kunde zuvor als Gast mit derselben E-Mail gebucht, werden diese Termine nach der Verifikation seinem Konto zugeordnet, sodass er eine durchgängige Historie sieht.

**Why this priority**: Erhöht den Nutzen des Kontos, ist aber sauber abtrennbar. Bewusst niedrigste Priorität — der Punkt, an dem der MVP-Umfang gedreht werden kann.

**Independent Test**: Ein Gast bucht mit einer E-Mail, registriert später ein Konto mit derselben E-Mail, verifiziert — und sieht die frühere Gast-Buchung in seiner Übersicht.

**Acceptance Scenarios**:

1. **Given** eine frühere, nicht anonymisierte Gast-Buchung mit E-Mail X, **When** ein Konto mit E-Mail X erfolgreich verifiziert wird, **Then** wird die Gast-Buchung dem Konto zugeordnet.
2. **Given** eine E-Mail ist nicht verifiziert, **When** eine Zuordnung versucht würde, **Then** findet keine Zuordnung statt.

---

### Edge Cases

- Registrierung mit einer E-Mail, zu der bereits ein Konto existiert: generische Rückmeldung ohne Preisgabe, ob die Adresse registriert ist (keine Account-Enumeration).
- Verifikations- oder Reset-Link abgelaufen oder bereits verwendet: klare Meldung, erneute Anforderung möglich.
- Login-Versuch auf einem noch unverifizierten Konto: Login wird abgelehnt mit einem Hinweis, die E-Mail zuerst zu bestätigen (ohne preiszugeben, ob das Konto existiert).
- Konto-Löschung, während ein kommender Termin existiert: kommende Termine werden automatisch storniert (Slot über die Buchungs-Engine freigegeben), erst danach werden die personenbezogenen Daten anonymisiert.
- Gast-Übernahme, wenn frühere Gast-Buchungen durch die Retention bereits anonymisiert wurden: nur nicht-anonymisierte zuordnen.
- Wiederholte fehlgeschlagene Login-Versuche (Brute-Force): Rate-Limiting greift; nach einer definierten Schwelle werden weitere Versuche temporär gedrosselt.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Das System MUSS Kunden ermöglichen, ein Konto mit E-Mail und Passwort zu erstellen.
- **FR-002**: Das System MUSS die E-Mail vor Aktivierung per Double-Opt-in (tokenisierter Link, Muster aus Phase 3) verifizieren; ein unverifiziertes Konto erlaubt keinen Login.
- **FR-003**: Das System MUSS Anmeldedaten ausschließlich als sicheren Einweg-Hash speichern; Klartext-Passwörter werden nie gespeichert oder protokolliert.
- **FR-004**: Das System MUSS eingeloggten Kunden Login und Logout über das bestehende Token-Verfahren (Phase 1, erweitert um die Kunden-Rolle) bereitstellen. Eine Standard-Sitzung läuft nach ~8 Stunden ab (wie Phase 1); wählt der Kunde beim Login „Angemeldet bleiben", verlängert sich die Sitzung auf ~30 Tage.
- **FR-005**: Das System MUSS Passwort-Zurücksetzen per tokenisiertem, einmaligem und ablaufendem E-Mail-Link ermöglichen (Muster aus Phase 3). Standardmäßig läuft der Reset-Token nach 1 Stunde ab (siehe Assumptions).
- **FR-006**: Das System MUSS einem eingeloggten Kunden seine kommenden und vergangenen Termine anzeigen.
- **FR-007**: Das System MUSS sicherstellen, dass ein Kunde ausschließlich auf seine eigenen Konto-, Profil- und Termindaten zugreift; jeder Zugriff auf fremde Datensätze MUSS abgewiesen werden.
- **FR-008**: Das System MUSS einem eingeloggten Kunden ermöglichen, einen eigenen Termin zu stornieren (Slot wird freigegeben), unter Beachtung der Stornofrist. Es gilt dieselbe Frist wie der Phase-3-Token-Storno (`CANCELLATION_CUTOFF_HOURS`); siehe Assumptions.
- **FR-009**: Das System MUSS Umbuchung ermöglichen und sie atomar ausführen: der neue Slot wird verbindlich reserviert, bevor der alte freigegeben wird; schlägt die Reservierung fehl, bleibt der ursprüngliche Termin bestehen. Wiederverwendung der Buchungs-Engine und der `tstzrange`-EXCLUDE-Constraint aus Phase 3 zur Konfliktsicherung; es gelten dieselben Buchungs-Guardrails (Vorlauf/Horizont) wie bei der Erstbuchung.
- **FR-010**: Das System MUSS einem eingeloggten Kunden ermöglichen, sein Basisprofil (Name, Kontakt) zu bearbeiten, im Rahmen der Datenminimierung aus Phase 3.
- **FR-011**: Das System MUSS Selbst-Löschung des Kontos ermöglichen (Art. 17 DSGVO). Existieren beim Löschen noch kommende Termine, MUSS das System diese zuerst automatisch stornieren und die Slots über die Buchungs-Engine freigeben; anschließend MUSS die Löschung personenbezogene Daten über den bestehenden Anonymisierungspfad (Phase 3: `anonymized_at`, Felder ersetzen) unkenntlich machen statt Datensätze hart zu löschen.
- **FR-012**: Das System MUSS einem eingeloggten Kunden den Export seiner Daten (Profil + Terminhistorie) in maschinenlesbarer Form ermöglichen (Art. 15/20 DSGVO). Standardformat ist JSON (siehe Assumptions).
- **FR-013**: Das System MUSS — nach erfolgreicher E-Mail-Verifikation — frühere Gast-Buchungen mit exakt passender E-Mail-Adresse dem Konto zuordnen können. Ohne verifizierte Übereinstimmung DARF keine Zuordnung erfolgen. (Niedrigste Priorität, MVP-optional.)
- **FR-014**: Das System MUSS Authentifizierungs-Endpunkte (Registrierung, Login, Reset, Verifikation) ratenbegrenzen und DARF bei Registrierung und Reset NICHT preisgeben, ob eine E-Mail bereits existiert (generische Rückmeldung, keine Account-Enumeration).
- **FR-015**: Das System MUSS die Konto-Verarbeitung auf Vertragserfüllung/-anbahnung (Art. 6 (1) b DSGVO) stützen. Es findet kein Marketing statt, daher ist keine gesonderte Einwilligung erforderlich; die Datenschutzerklärung wird um die Konto-Verarbeitung ergänzt.
- **FR-016**: Das System MUSS Admin (Phase 1) und Kunde als getrennte Rollen und Identitäten behandeln; ein Kunden-Token DARF keinen Admin-Zugriff gewähren und umgekehrt.
- **FR-017**: Das System MUSS eine Mindest-Passwortstärke von mindestens 10 Zeichen durchsetzen, ohne erzwungene Zeichenklassen (NIST-orientiert: Länge vor Komplexität).

### Key Entities *(include if feature involves data)*

- **Kundenkonto**: Erweitert/verknüpft den bestehenden Kunden-Datensatz aus Phase 3 um Anmeldedaten (gehashtes Passwort), E-Mail-Verifikationsstatus und die Rolle „Kunde". Bezug zu den Terminen des Kunden.
- **Kunde / Kontakt (bestehend, Phase 3)**: Profil- und Kontaktdaten, `last_active_at`, `anonymized_at`. Wird vom Konto referenziert; bleibt Träger der Anonymisierung.
- **Verifikations-/Reset-Token**: Zweckgebunden, einmalig, ablaufend; wiederverwendetes Muster der tokenisierten Links aus Phase 3.
- **Sitzung / Auth-Token**: Authentifizierter Zugriff eines Kunden; Lebensdauer.
- **Termin (bestehend, Phase 3)**: Wird vom Konto referenziert und in der Übersicht angezeigt; Storno/Umbuchung wirken auf denselben Slot-Pool.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ein Kunde kann Konto-Erstellung inklusive E-Mail-Verifikation in wenigen Minuten abschließen.
- **SC-002**: Ein eingeloggter Kunde sieht 100 % seiner eigenen und keinen einzigen fremden Termin.
- **SC-003**: Ein Kunde kann einen Termin ohne Anruf umbuchen; bei fehlgeschlagener Neureservierung bleibt der ursprüngliche Termin erhalten (null verlorene Slots).
- **SC-004**: Nach Konto-Löschung verbleibt kein identifizierbarer personenbezogener Datenpunkt.
- **SC-005**: Null Cross-Account-Zugriffe — kein Kunde erreicht fremde Daten (Autorisierung).
- **SC-006**: Telefonisch oder durch den Admin abgewickelte Stornos und Umbuchungen sinken innerhalb von 3 Monaten nach Launch um mindestens 30 %.

---

## Assumptions

- Phase 1 (Auth-Modul mit Token- und Hashing-Mustern) und Phase 3 (Buchungs-Engine, `tstzrange`-EXCLUDE-Constraint, Kunde-Entität, Anonymisierungs-/Retention-Job, tokenisierte Links, E-Mail-Versand) existieren und werden wiederverwendet — nicht neu gebaut.
- Es findet kein Marketing statt; es werden keine Zahlungsdaten verarbeitet (Zahlung weiterhin bar vor Ort).
- Inhalte und Oberfläche sind deutschsprachig.
- Umbuchung nutzt dieselbe Slot-Logik und dieselben Buchungs-Guardrails wie die Erstbuchung aus Phase 3.
- Gast-Übernahme verlangt eine exakte, verifizierte E-Mail-Übereinstimmung.
- **Storno-/Umbuchungsfrist (FR-008):** Es wird die Phase-3-Frist (`CANCELLATION_CUTOFF_HOURS`) übernommen, sofern `/speckit.clarify` nichts anderes festlegt.
- **Reset-Token-Gültigkeit (FR-005):** Reset-Links laufen standardmäßig nach 1 Stunde ab; Verifikations-Links nach 24 Stunden — abgeleitet aus dem tokenisierten-Link-Muster aus Phase 3, anpassbar in `/speckit.clarify`.
- **Export-Format (FR-012):** Der Datenexport erfolgt standardmäßig als JSON (maschinenlesbar im Sinne von Art. 20 DSGVO); ein zusätzliches PDF ist nicht Teil des MVP, sofern `/speckit.clarify` nichts anderes festlegt.
- Self-Service-Umfang ist bewusst begrenzt; Favoriten, Treuepunkte, Präferenzen und Benachrichtigungs-Einstellungen sind nicht Teil dieser Phase.
