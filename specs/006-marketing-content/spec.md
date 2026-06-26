# Feature Specification: Marketing & Content (Public-Site-Erweiterung)

**Feature Branch**: `006-marketing-content`

**Created**: 2026-06-11

**Status**: Draft

**Input**: User description: "Die öffentliche Website um die vom Inhaber gewünschten Marketing-, Inhalts- und Conversion-Elemente erweitern: kategorisierte Leistungen/Preise (Herren/Damen/Kinder), direkte Kontaktwege (WhatsApp, Telefon, Social-Links, Google-Bewertung schreiben), Team-Seite, Aktionen/Angebote, Vorher/Nachher-Galerie, Standort-Karte und Google-Bewertungen, lokale SEO. Drittinhalte (Karte, Bewertungen) erst nach Einwilligung laden. Buchungs-Engine bleibt unverändert; Zahlung weiterhin bar vor Ort."

> Baut auf Phase 1 (Stammdaten/Admin), Phase 2 (öffentliche Website, Impressum/Datenschutz-Gerüst, SEO-Basis mit LocalBusiness-Schema) und Phase 3/4 (Buchung/Konto) auf und verwendet diese wieder. Die Buchungs-Engine wird **nicht** verändert.

## Clarifications

### Session 2026-06-13

- Q: Wo lebt die Einwilligungs-Registratur der Galerie (FR-010/FR-016)? → A: Strukturierte Manifest-Datei im Repo (JSON/YAML) neben den Bildern; jeder Eintrag referenziert eine Einwilligungsnachweis-ID; Deploy bei Änderung (kein DB-Modell/Admin in dieser Phase).
- Q: Wie behandelt die Migration die neuen Pflichtfelder (`Zielgruppe`/`Leistungsart`) für bestehende Leistungen (FR-001)? → A: Explizites, korrektes Backfill je Leistung — kuratierte Daten-Migration, die jeder bestehenden Leistung die fachlich korrekte Zielgruppe und Leistungsart zuweist; Spalten direkt `NOT NULL`, keine „uncategorized"-Kategorie.
- Q: Woher stammen Kontakt-/Social-/WhatsApp-/Bewertungs-Links und die Salon-NAP-Daten (FR-005–FR-007, FR-013, FR-015)? → A: Bestehende Salon-/Stammdaten-Datensätze wiederverwenden, wo vorhanden (Telefon, Adresse, Öffnungszeiten); nur die wirklich neuen Werte (Instagram, TikTok, WhatsApp, Google-„Bewertung schreiben"-Link) als zentrale Frontend-Konfiguration (env-getrieben). Kein neues Admin-Settings-Modell in dieser Phase.
- Q: Was steuert die öffentliche Sichtbarkeit einer Aktion/eines Angebots (FR-009)? → A: Gültigkeitszeitraum **und** ein manueller `is_active`-Toggle (beide müssen erlauben). Der Gültigkeitszeitraum **erzwingt** die Auto-Expiry — abgelaufene Aktionen verschwinden zwingend, auch aus rechtlichen Gründen (irreführende Werbung/Preisangaben nach UWG). Pflicht-Bedingung: Die Admin-Liste MUSS je Aktion den berechneten Effektivstatus anzeigen (sichtbar / geplant / abgelaufen / versteckt); ohne diesen Indikator entfällt der Toggle zugunsten reiner Datumssteuerung. „Manueller Toggle, Datum nur beschreibend" ist ausgeschlossen.
- Q: Wo liegt der Google-Bewertungs-Snapshot (FR-013)? → A: Versionierte JSON-Datei im Repo (Edit + Deploy zum Aktualisieren), konsistent mit Galerie-Manifest und Config-Links; kein Admin-Modell (B) und keine Daten in der Komponente (C). Inhalt: **kuratierte, attribuierte Zitate + Link zum Google-Profil**, kein gespiegelter Komplett-Feed. **Keine statische Gesamtbewertung** („4,8 ★ aus N") darstellen, als wäre sie live (veraltete Werte = UWG-Irreführung) — die Live-Zahl holt der Kunde über den Link. Hinweis: Snapshots enthalten Rezensenten-Namen = **personenbezogene Daten Dritter**; nur öffentlich auf Google Vorhandenes republizieren (Vorname wie dort gezeigt), attribuiert und auf Wunsch entfernbar (NICHT „kein Personendatum").

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Leistungen, Preise und Buchung nach Zielgruppe finden (Priority: P1)

Ein Besucher kommt auf die Seite und will sofort sehen, welche Leistungen es für seine Zielgruppe (Herren / Damen / Kinder) gibt, was sie kosten und wie er bucht. Er sieht eine nach Zielgruppe gegliederte Preisliste, den Hinweis „Herren ohne Termin möglich / Damen nur mit Termin" und eine prominente „Jetzt Termin buchen"-Aktion.

**Why this priority**: Das ist die Conversion-Wirbelsäule — was wird angeboten, was kostet es, wie buche ich. Ohne diese Klarheit verpufft der restliche Marketing-Aufwand. Eigenständig wertvoll und testbar.

**Independent Test**: Ein Tester öffnet die Seite, filtert/findet die Leistungen seiner Zielgruppe mit Preisen, sieht das Terminhinweis-Messaging und gelangt mit einem Klick zur Buchung.

**Acceptance Scenarios**:

1. **Given** im Admin sind Leistungen mit Kategorie (Herren/Damen/Kinder) und Art (z.B. Schnitt, Bart, Farbe) gepflegt, **When** der Besucher die Preisliste öffnet, **Then** sind die Leistungen mit fixen Preisen nach Zielgruppe gegliedert dargestellt.
2. **Given** der Besucher liest die Startseite, **When** er die Terminhinweise sieht, **Then** ist klar kommuniziert, dass Herren ohne Termin möglich sind und Damen nur mit Termin — ohne dass dies die Buchungs-Engine verändert.
3. **Given** der Besucher will buchen, **When** er die „Jetzt Termin buchen"-Aktion auf einer beliebigen relevanten Seite anklickt, **Then** gelangt er zur bestehenden Buchung (`/termin`).

---

### User Story 2 — Direkte Kontakt- und Conversion-Wege (Priority: P2)

Der Besucher möchte ohne Umweg Kontakt aufnehmen oder eine Bewertung abgeben: WhatsApp, Anruf, Social-Media, Google-Bewertung schreiben.

**Why this priority**: Hoher Conversion-Wert bei minimalem Aufwand und ohne Datenschutz-Last — alle Elemente sind reine Links und laden keine Fremd-Skripte. Kann unabhängig von der Consent-Infrastruktur (US5) ausgeliefert werden.

**Independent Test**: Auf Mobil sind WhatsApp, Telefon, Buchung und „Bewertung schreiben" jeweils mit einem Tap erreichbar; vor dem Antippen wird kein Drittanbieter-Skript geladen.

**Acceptance Scenarios**:

1. **Given** der Besucher ist auf dem Smartphone, **When** er den WhatsApp-Button antippt, **Then** öffnet sich der WhatsApp-Chat mit dem Salon (Klick-zum-Chat-Link, kein vorab geladenes Skript).
2. **Given** der Besucher tippt die Telefonnummer an, **Then** startet der Anruf (`tel:`-Link).
3. **Given** der Besucher will eine Bewertung abgeben, **When** er „Bewertung schreiben" antippt, **Then** gelangt er direkt zum Google-Bewertungsformular des Salons; Instagram/TikTok sind als Links erreichbar.

---

### User Story 3 — Vertrauensinhalte: Team, Angebote, FAQ (Priority: P2)

Der Besucher will einschätzen, wem er sich anvertraut, ob es aktuelle Angebote gibt und Antworten auf typische Fragen.

**Why this priority**: Vertrauens- und Inhaltsschicht, die die Buchungsbereitschaft erhöht. Nutzt großteils vorhandene Daten (Team aus Stammdaten).

**Independent Test**: Eine öffentliche Team-Seite zeigt die Friseure aus den Stammdaten; ein Aktionen-Bereich ist sichtbar; die FAQ beantwortet Terminpflicht, Kartenzahlung und Parkplatz.

**Acceptance Scenarios**:

1. **Given** im Admin sind Friseure gepflegt, **When** der Besucher die Team-Seite öffnet, **Then** werden die Friseure dargestellt.
2. **Given** Aktionen sind hinterlegt, **When** der Besucher die Startseite/den Angebote-Bereich öffnet, **Then** werden aktuelle Aktionen angezeigt.
3. **Given** der Besucher öffnet die FAQ, **Then** findet er Antworten zu „Muss ich einen Termin machen?", „Kartenzahlung?" und „Parkplatz?".

---

### User Story 4 — Vorher/Nachher-Galerie (Priority: P3)

Der Besucher sieht Beispielarbeiten als Vorher/Nachher-Bilder.

**Why this priority**: Starkes Verkaufsargument, aber an eine Einwilligungspflicht gebunden und damit sauber abtrennbar.

**Independent Test**: Die Galerie zeigt ausschließlich Bilder, für die ein Einwilligungsnachweis hinterlegt ist.

**Acceptance Scenarios**:

1. **Given** ein Vorher/Nachher-Bild mit dokumentierter Einwilligung der abgebildeten Person, **When** die Galerie geladen wird, **Then** wird das Bild angezeigt.
2. **Given** ein Bild ohne Einwilligungsnachweis, **When** versucht wird es zu veröffentlichen, **Then** wird es nicht angezeigt/abgelehnt.

---

### User Story 5 — Standort-Karte und Google-Bewertungen mit Einwilligung (Priority: P3)

Der Besucher sieht den Standort auf einer Karte und liest Google-Bewertungen — eingebettete Drittinhalte, die seine Datenschutz-Einwilligung respektieren.

**Why this priority**: Liefert Vertrauen und Auffindbarkeit, bringt aber als einzige Story Third-Party-Tracking ins Spiel und damit die Consent-Pflicht. Bewusst niedrige Priorität: Entfällt diese Story, entfällt der gesamte Consent-Aufwand, da alles Übrige link- und inhaltsbasiert ist.

**Independent Test**: Vor aktiver Einwilligung wird kein Drittanbieter-Skript/-Cookie geladen; nach Einwilligung erscheinen Karte und Bewertungen.

**Acceptance Scenarios**:

1. **Given** ein Besucher ohne erteilte Einwilligung, **When** die Seite mit Karte/Bewertungen lädt, **Then** werden keine Drittanbieter-Skripte/Cookies geladen; stattdessen wird eine Vorschau mit „Klick zum Laden" angezeigt.
2. **Given** der Besucher willigt ein, **When** er die Inhalte aktiviert, **Then** werden Karte und Google-Bewertungen geladen und angezeigt.
3. **Given** der Besucher widerruft die Einwilligung, **Then** werden die Drittinhalte nicht mehr geladen.

---

### Edge Cases

- Leistung ohne zugeordnete Kategorie: strukturell ausgeschlossen — `Zielgruppe` und `Leistungsart` sind `NOT NULL` und werden für Bestandsdaten kuratiert befüllt (FR-001). Im Admin verhindert die Pflichtfeld-Validierung das Anlegen ohne Kategorie.
- Kein aktives Angebot hinterlegt: Der Aktionen-Bereich blendet sich sauber aus, statt leer zu wirken.
- Galerie-Bild, dessen Einwilligung später widerrufen wird: muss entfernbar sein.
- Besucher mit aktiviertem Tracking-Blocker: Karte/Bewertungen scheitern am Laden → klare Fallback-Anzeige (Adresse/Link).
- Performance-Budget droht durch Embeds zu kippen: Embeds müssen verzögert/nach Consent laden.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Leistungen MÜSSEN nach Zielgruppe (Herren/Damen/Kinder) und Leistungsart (z.B. Schnitt, Bart, Farbe) kategorisiert und öffentlich als gegliederte Preisliste mit fixen Preisen dargestellt werden. Die Kategorisierung erfolgt über **zwei feste Enum-Felder** an der Leistung: `Zielgruppe` (Pflichtfeld; Herren/Damen/Kinder; genau eine Zielgruppe pro Leistung) und `Leistungsart` (Schnitt/Bart/Farbe/…). Keine freien Tags. Beide Felder sind `NOT NULL`; bestehende Leistungen aus Phase 1 werden in der Migration durch ein **explizites, kuratiertes Backfill je Leistung** (fachlich korrekte Zielgruppe + Leistungsart pro Datensatz) befüllt — es gibt keine „uncategorized"-Kategorie.
- **FR-002**: Das System MUSS dem Admin (Phase 1) ermöglichen, jeder Leistung ihre Kategorie(n) zuzuordnen.
- **FR-003**: Die öffentliche Seite MUSS kommunizieren, dass Herren ohne Termin möglich sind und Damen nur mit Termin — als Hinweis/Messaging. Dies DARF die Buchungs-Engine nicht verändern; Walk-ins bleiben admin-seitig manuell (Phase 1/3).
- **FR-004**: Eine prominente „Jetzt Termin buchen"-Aktion MUSS auf allen relevanten Seiten zur bestehenden Buchung (`/termin`) führen.
- **FR-005**: Das System MUSS einen WhatsApp-Button als Klick-zum-Chat-Link bereitstellen, der vor dem Klick keine Drittanbieter-Skripte lädt.
- **FR-006**: Telefonnummer und E-Mail MÜSSEN als direkt anklickbare Links (`tel:` / `mailto:`) bereitstehen.
- **FR-007**: Instagram, TikTok und ein „Bewertung schreiben"-Google-Link MÜSSEN als reine Verlinkungen eingebunden sein (keine eingebetteten Feeds/Skripte). Diese neuen Werte (Instagram, TikTok, WhatsApp-Nummer, Bewertungs-Link) werden als zentrale, env-getriebene Frontend-Konfiguration gepflegt; bereits vorhandene Salon-/Stammdaten (Telefon, Adresse, Öffnungszeiten) werden wiederverwendet statt dupliziert (kein neues Admin-Settings-Modell in dieser Phase).
- **FR-008**: Eine öffentliche Team-Seite MUSS die Friseure aus den Stammdaten (Phase 1) darstellen.
- **FR-009**: Das System MUSS einen Bereich für Aktionen/Angebote bereitstellen, der sich bei fehlenden (aktiven) Aktionen sauber ausblendet. Aktionen/Angebote MÜSSEN **admin-pflegbar** sein (eigenes Datenmodell + Admin-Oberfläche; Anlegen/Bearbeiten/Befristen ohne Deployment), da sie sich häufig ändern und keine Personendaten enthalten. Die öffentliche Sichtbarkeit wird durch den **Gültigkeitszeitraum UND einen manuellen `is_active`-Toggle** gesteuert (beide müssen erlauben; öffentliche Abfrage: `is_active AND now ∈ [start, ende]`). Der Gültigkeitszeitraum MUSS die Auto-Expiry **erzwingen**: abgelaufene Aktionen DÜRFEN nicht weiter als aktuell angezeigt werden — dies ist auch eine rechtliche Anforderung (Vermeidung irreführender Werbung/Preisangaben nach UWG). Die **Admin-Oberfläche MUSS je Aktion den berechneten Effektivstatus anzeigen** (sichtbar / geplant / abgelaufen / versteckt), damit die Doppelbedingung (Datum + Toggle) für den Inhaber transparent ist.
- **FR-010**: Das System MUSS eine Vorher/Nachher-Galerie bereitstellen. Die Galerie-Bilder werden in dieser Phase **statisch/kuratiert im Repo** gepflegt (Deploy bei Änderung), MÜSSEN aber durch eine **strukturierte Einwilligungs-Registratur** abgesichert sein (FR-016): jede Bild-Veröffentlichung ist eindeutig einem dokumentierten Einwilligungsnachweis zugeordnet, sodass „Widerruf → Entfernung" nachvollziehbar abbildbar ist. Es DÜRFEN nur Bilder veröffentlicht werden, für die ein Einwilligungsnachweis vorliegt. Eine vollständige admin-pflegbare Upload-Galerie (Einwilligung an den Upload gebunden) ist als **Fast-Follow nach Launch** vorgesehen, nicht Teil dieser Phase.
- **FR-011**: Die FAQ-Seite (Phase 2) MUSS die Fragen zu Terminpflicht, Kartenzahlung und Parkplatz beantworten (statische Inhalte).
- **FR-012**: Sobald nicht-essentielle Drittinhalte eingebunden werden, MUSS ein Consent-Mechanismus (§25 TTDSG / DSGVO) vorhanden sein. Solche Inhalte DÜRFEN erst nach aktiver Einwilligung geladen werden (Consent-Gating / Click-to-load); ohne Einwilligung DÜRFEN keine Drittanbieter-Skripte oder -Cookies geladen werden. Die Einwilligung MUSS widerrufbar sein.
- **FR-013**: Das System MUSS den Standort als Karte und Google-Bewertungen anzeigen. Google-Bewertungen werden als **periodisch/manuell eingespielter statischer Snapshot** dargestellt (keine Live-Places-API, keine laufende Drittanbieter-Anbindung) und dürfen daher als reiner Text auch ohne Consent angezeigt werden. Der Snapshot wird als **versionierte JSON-Datei im Repo** geführt (Edit + Deploy zum Aktualisieren) und enthält **kuratierte, attribuierte Einzelzitate plus einen Link zum Google-Profil** — kein gespiegelter Komplett-Feed. Es DARF **keine statische Gesamtbewertung** („4,8 ★ aus N Bewertungen") so dargestellt werden, als wäre sie live; veraltete Aggregat-Werte wären irreführend (UWG) — die aktuelle Gesamtzahl ruft der Besucher über den Profil-Link ab. Da die Zitate **Rezensenten-Namen (personenbezogene Daten Dritter)** enthalten, DÜRFEN nur bereits öffentlich auf Google sichtbare Angaben (Vorname wie dort angezeigt) republiziert werden — attribuiert, mit Link und auf Wunsch entfernbar. Die **Karte** bleibt consent-gegated gemäß FR-012 (statische Vorschau mit Klick-zum-Laden).
- **FR-014**: Die Datenschutzerklärung MUSS um alle neu eingebundenen Dienste und Verlinkungen (WhatsApp/Meta, Google Maps, Google-Bewertungen, Instagram/TikTok) erweitert werden, inklusive Drittland-Hinweis.
- **FR-015**: Titel, Meta-Beschreibungen und Überschriften MÜSSEN auf die lokalen Suchbegriffe („Friseur Cottbus", „Barbershop Cottbus", „Damenfriseur Cottbus") ausgerichtet sein; das LocalBusiness-Structured-Data (Phase 2) MUSS echten Namen, Adresse, Telefon, Öffnungszeiten und Geo-Daten enthalten — bezogen aus den bestehenden Salon-/Stammdaten (FR-007-Quellenregel), nicht erneut hartkodiert.
- **FR-016**: Für jede in der Galerie erkennbar abgebildete Person MUSS ein dokumentierter Einwilligungsnachweis vorliegen; ohne Nachweis DARF das Bild nicht veröffentlicht werden, und ein Widerruf MUSS zur Entfernung führen. Eine **strukturierte Einwilligungs-Registratur** MUSS jede veröffentlichte Bild-Datei eindeutig ihrem Nachweis zuordnen (Bild ↔ Nachweis), sodass Veröffentlichung, Prüfbarkeit und Widerruf nachvollziehbar sind — auch wenn die Bilder selbst statisch im Repo liegen (FR-010). Die Registratur wird als **versionierte Manifest-Datei im Repo** (JSON/YAML) neben den Galerie-Bildern geführt; jeder Eintrag verweist eindeutig auf eine Einwilligungsnachweis-ID. Add/Remove-Historie und damit Widerrufs-Nachvollziehbarkeit ergeben sich aus der Git-Versionierung; kein DB-Modell/Admin-UI in dieser Phase (das ist Teil des Fast-Follow gemäß FR-010).
- **FR-017**: Nach Einbindung aller neuen Inhalte und Embeds MÜSSEN die Performance-Budgets aus `DESIGN.md` (LCP < 2,5 s, INP < 200 ms, CLS < 0,1) weiterhin eingehalten werden; Embeds MÜSSEN verzögert/nach Consent geladen werden.
- **FR-018**: Neue Komponenten MÜSSEN dem WCAG-2.1-AA-Standard (Projektprinzip) entsprechen und mobil-optimiert sein.

### Key Entities *(include if feature involves data)*

- **Leistung (bestehend, Phase 1)**: Erweitert um zwei feste Enum-Felder — `Zielgruppe` (Herren/Damen/Kinder, Pflicht, genau eine pro Leistung) und `Leistungsart` (Schnitt/Bart/Farbe/…); trägt weiterhin feste Dauer und festen Preis.
- **Aktion/Angebot**: Titel, Beschreibung, Gültigkeitszeitraum (Start/Ende), `is_active`-Toggle; **admin-gepflegtes Datenmodell** (Backend + Admin-Oberfläche). Effektivstatus (sichtbar/geplant/abgelaufen/versteckt) wird aus Datum + Toggle berechnet und im Admin angezeigt; öffentlich sichtbar nur bei `is_active AND now ∈ [Start, Ende]`.
- **Galerie-Bild**: Bild **statisch im Repo** kuratiert, plus eindeutige Referenz auf den Einwilligungsnachweis der abgebildeten Person über die Einwilligungs-Registratur.
- **Einwilligungs-Registratur (Galerie)**: Strukturierte Zuordnung Bild ↔ Einwilligungsnachweis; ermöglicht Prüfbarkeit der Veröffentlichung und nachvollziehbaren Widerruf/Entfernung (FR-016).
- **Google-Bewertungen (Snapshot)**: Periodisch/manuell eingespielte statische Bewertungs-Daten als versionierte JSON-Datei im Repo — kuratierte, attribuierte Einzelzitate (Vorname wie öffentlich auf Google, Bewertungstext) plus Link zum Google-Profil; keine Live-API-Anbindung, keine vorgetäuschte Live-Gesamtbewertung. Enthält personenbezogene Daten Dritter (Rezensenten-Namen) → nur öffentlich Vorhandenes, attribuiert, entfernbar. Consent-frei darstellbar (reiner Text).
- **Consent-Status**: Einwilligung des Besuchers in Drittinhalte (v.a. Karte); clientseitig im Browser gehalten, kein serverseitiges Personendatum nötig.
- **Team/Stylist (bestehend, Phase 1)**: Öffentliche Darstellung.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ein Besucher findet die Leistungen und Preise seiner Zielgruppe sowie die Buchungs- und Kontaktwege innerhalb weniger Sekunden ohne Umwege.
- **SC-002**: Vor aktiver Einwilligung wird nachweislich kein Drittanbieter-Cookie und kein Drittanbieter-Skript geladen.
- **SC-003**: Die Performance-Budgets (LCP < 2,5 s, INP < 200 ms, CLS < 0,1) bleiben mit allen neuen Inhalten und Embeds eingehalten.
- **SC-004**: WhatsApp, Telefon, „Jetzt Termin buchen" und „Bewertung schreiben" sind auf Mobil jeweils mit einem Tap erreichbar.
- **SC-005**: In der Galerie ist kein Bild ohne hinterlegten Einwilligungsnachweis veröffentlicht.

> Hinweis: Tatsächliche Suchplatzierungen für die Cottbus-Keywords sind ein Post-Launch-Ergebnis (nicht direkt baubar); FR-015 stellt die Optimierung sicher, nicht das Ranking selbst.

## Assumptions

- Phase 1 (Stammdaten/Admin), Phase 2 (öffentliche Website, Impressum/Datenschutz-Gerüst, SEO-Basis mit LocalBusiness-Schema) und Phase 3/4 (Buchung/Konto) existieren und werden wiederverwendet — nicht neu gebaut.
- Die Buchungs-Engine bleibt unverändert; „Herren ohne Termin / Damen nur mit Termin" ist reines Messaging.
- WhatsApp und Social-Media werden als Links eingebunden, nicht als eingebettete Feeds. Google-Bewertungen werden als statischer Snapshot (Text) ausgespielt — dadurch ist in dieser Phase **ausschließlich die Standort-Karte** consent-pflichtig.
- Entfällt die Standort-Karte aus User Story 5, entfällt auch der Consent-Mechanismus; der Rest ist link-, inhalts- und snapshot-basiert.
- Eine vollständige admin-pflegbare Upload-Galerie ist ein bewusster Fast-Follow nach Launch; diese Phase liefert die statische Galerie plus Einwilligungs-Registratur.
- Inhalte deutschsprachig; Zahlung weiterhin bar vor Ort.
- Der Inhaber liefert die realen Inhalte (Aktionstexte, FAQ-Antworten, Galerie-Bilder samt Einwilligungen, Social-/WhatsApp-/Bewertungs-Links).
