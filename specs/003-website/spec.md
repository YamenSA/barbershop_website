# Feature Specification: Öffentliche Website (Phase 2)

**Feature Branch**: `003-website`

**Created**: 2026-06-09

**Status**: Draft

**Input**: User description: "Phase 2 baut den vollwertigen öffentlichen Außenauftritt des Salons: alle Inhalts- und Pflichtseiten, mobil-first und im vollen Markenlook. Überwiegend ein lesender Auftritt über bestehende Stammdaten plus redaktionelle Inhalte; keine Buchungen (Phase 3) und keine Zahlungen."

## Zweck

Phase 2 liefert den öffentlichen Außenauftritt des Salons: Startseite, Inhalts- und
Pflichtseiten, durchgängig mobil-first und im verbindlichen Markenlook der `DESIGN.md`
(Midnight Black + Malachit-Grün + Blade Brass, Display+Sans, responsive Motion). Die Seite
liest überwiegend bestehende Daten (Dienstleistungen, Team, Öffnungszeiten aus Phase 0/1)
und ergänzt redaktionelle Inhalte. Sie verarbeitet **keine** Buchungen (Phase 3) und **keine**
Zahlungen. Die Website geht erst live, wenn das gesamte MVP fertig ist — in Phase 2 sind
daher keine Interimszustände nötig.

## Clarifications

### Session 2026-06-09

- Q: Woher stammen Salon-Adresse und Telefonnummer für Kontaktseite, Footer und
  LocalBusiness-Strukturdaten? → A: Über eine neue, admin-verwaltete Salon-Profil-Einstellung
  (Adresse, Telefon). Diese Phase ergänzt dafür minimal das Datenmodell und die Admin-Pflege;
  Öffnungszeiten bleiben in den bestehenden Stammdaten (SalonHours).
- Q: Wie aktuell müssen die live aus den Stammdaten gelesenen Inhalte sein? → A: Nahezu
  aktuell — Änderungen (Aktivieren/Deaktivieren, geänderte Öffnungszeiten) erscheinen
  spätestens innerhalb von ~60 Sekunden; Performance (CWV-Budget) hat Vorrang vor
  Echtzeit-Frische.
- Q: Setzt die öffentliche Website in Phase 2 zustimmungspflichtige Cookies, die ein
  Consent-Banner erfordern? → A: Nein — nur technisch notwendige Cookies, kein Tracking/
  Analytics, kein Consent-Banner in dieser Phase.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Markenkonforme Shell & einladende Startseite (Priority: P1)

Ein Besucher öffnet die Website und sieht eine Startseite, die den Salon im vollen
Markenlook repräsentiert, mit konsistenter Navigation und Footer auf allen Seiten und einem
prominenten „Termin buchen"-Aufruf, der ihn zum Buchen einlädt.

**Why this priority**: Ohne die globale Shell (Navigation, Footer, Markenlook) und eine
Startseite existiert keine Website. Dies ist das Grundgerüst, in das alle weiteren Seiten
eingehängt werden, und der erste Eindruck, der zum Buchen führen soll.

**Independent Test**: Startseite aufrufen und über Navigation/Footer zu Platzhalter-Routen
navigieren; prüfen, dass Markenlook (Palette, Typografie, Motion) der `DESIGN.md` entspricht
und der „Termin buchen"-CTA prominent sichtbar ist und auf die (Phase-3-)Buchungsroute zeigt.

**Acceptance Scenarios**:

1. **Given** ein Besucher auf einem Smartphone, **When** er die Startseite öffnet, **Then**
   sieht er den Salon im Markenlook mit konsistenter Navigation und Footer sowie einem
   prominenten „Termin buchen"-Aufruf.
2. **Given** die Startseite ist geladen, **When** der Besucher den „Termin buchen"-CTA
   aktiviert, **Then** wird er zur Buchungs-Route geleitet (in dieser Phase ein Platzhalter).
3. **Given** ein Besucher mit aktiviertem `prefers-reduced-motion`, **When** er die Seite
   lädt, **Then** wird eine ruhige, gleichwertige Variante ohne aufdringliche Bewegung
   ausgeliefert.
4. **Given** ein Besucher auf einer beliebigen Unterseite, **When** er Navigation und Footer
   betrachtet, **Then** sind sie über alle Seiten konsistent und der Footer enthält die
   Pflichtlinks (Impressum, Datenschutzerklärung) sowie Kontakt/Öffnungszeiten.

---

### User Story 2 - Dienstleistungen mit Preisen ansehen (Priority: P1)

Ein Besucher öffnet die Dienstleistungsseite und sieht die aktuell angebotenen Leistungen mit
Name, Dauer, festem Preis und Beschreibung — live aus den Stammdaten.

**Why this priority**: Das Leistungs- und Preisangebot ist die zentrale Entscheidungsgrundlage
eines Besuchers vor einer Buchung. Live-Daten stellen sicher, dass keine veralteten Preise
gezeigt werden.

**Independent Test**: Im Admin eine Dienstleistung aktivieren/deaktivieren und prüfen, dass
sie auf der öffentlichen Dienstleistungsseite erscheint bzw. verschwindet; bei keinen aktiven
Leistungen erscheint ein sauberer Leerzustand.

**Acceptance Scenarios**:

1. **Given** es existieren aktive Dienstleistungen in den Stammdaten, **When** der Besucher
   die Dienstleistungsseite öffnet, **Then** sieht er alle aktiven Leistungen mit Name, Dauer,
   festem Preis und Beschreibung.
2. **Given** eine Dienstleistung wird im Admin deaktiviert, **When** der Besucher die Seite
   (erneut) aufruft, **Then** erscheint diese Leistung nicht mehr.
3. **Given** es existieren keine aktiven Dienstleistungen, **When** der Besucher die Seite
   öffnet, **Then** sieht er einen sauberen Leerzustand statt einer leeren/kaputten Liste.

---

### User Story 3 - Pflicht-Rechtsseiten aufrufen (Priority: P1)

Ein Besucher kann das gesetzlich vorgeschriebene Impressum (§ 5 DDG) und die
Datenschutzerklärung als eigene Seiten aufrufen, jederzeit über den Footer erreichbar.

**Why this priority**: Impressum und Datenschutzerklärung sind rechtliche Startvoraussetzung —
die Website darf ohne sie nicht live gehen. Die Seitenstruktur ist Teil dieser Phase (der
geprüfte rechtliche Inhalt wird vom Betreiber bereitgestellt).

**Independent Test**: Über den Footer Impressum und Datenschutzerklärung aufrufen; prüfen,
dass beide als eigene, erreichbare Seiten existieren und der Footer-Pflichtlink auf jeder
Seite vorhanden ist.

**Acceptance Scenarios**:

1. **Given** ein Besucher auf einer beliebigen Seite, **When** er im Footer „Impressum"
   aktiviert, **Then** öffnet sich die Impressums-Seite.
2. **Given** ein Besucher auf einer beliebigen Seite, **When** er im Footer
   „Datenschutzerklärung" aktiviert, **Then** öffnet sich die Datenschutz-Seite.
3. **Given** die Rechtsseiten, **When** sie ausgeliefert werden, **Then** enthalten sie den
   echten, geprüften Betreiber-Inhalt (keine Platzhaltertexte beim Live-Gang).

---

### User Story 4 - Team kennenlernen (Priority: P2)

Ein Besucher öffnet die Team-Seite und lernt die aktiven Teammitglieder kennen — mit Name,
Foto, Kurzprofil und den angebotenen Dienstleistungen, live aus den Stammdaten.

**Why this priority**: Das Team schafft Vertrauen und Persönlichkeit, ist aber für eine erste
Buchungsentscheidung weniger kritisch als Angebot und Preise.

**Independent Test**: Im Admin ein Teammitglied aktivieren/deaktivieren und prüfen, dass es
auf der öffentlichen Team-Seite erscheint bzw. verschwindet; bei keinen aktiven Mitgliedern
erscheint ein sauberer Leerzustand.

**Acceptance Scenarios**:

1. **Given** es existieren aktive Teammitglieder, **When** der Besucher die Team-Seite öffnet,
   **Then** sieht er Name, Foto, Kurzprofil und angebotene Dienstleistungen je Mitglied.
2. **Given** ein Teammitglied wird im Admin deaktiviert, **When** der Besucher die Seite
   (erneut) aufruft, **Then** erscheint dieses Mitglied nicht mehr.
3. **Given** es existieren keine aktiven Teammitglieder, **When** der Besucher die Seite
   öffnet, **Then** sieht er einen sauberen Leerzustand.

---

### User Story 5 - Kontakt & Öffnungszeiten finden (Priority: P2)

Ein Besucher öffnet die Kontaktseite und findet Adresse, Telefonnummer und die aktuellen
Öffnungszeiten (live aus den Stammdaten).

**Why this priority**: Kontaktinformationen und Öffnungszeiten sind für den physischen Besuch
und für Rückfragen wichtig, folgen aber dem Kern aus Angebot und Startseite.

**Independent Test**: Kontaktseite aufrufen; prüfen, dass Adresse, Telefonnummer und die aus
den Stammdaten gelesenen Öffnungszeiten korrekt angezeigt werden.

**Acceptance Scenarios**:

1. **Given** ein Besucher, **When** er die Kontaktseite öffnet, **Then** sieht er Adresse,
   Telefonnummer und die aktuellen Öffnungszeiten.
2. **Given** die Öffnungszeiten werden im Admin geändert, **When** der Besucher die
   Kontaktseite (erneut) aufruft, **Then** spiegeln die angezeigten Zeiten den neuen Stand.

---

### User Story 6 - Über uns & FAQ lesen (Priority: P3)

Ein Besucher liest die redaktionellen Inhalte „Über uns" und „FAQ", um den Salon und häufige
Fragen besser zu verstehen.

**Why this priority**: Redaktionelle Inhalte vertiefen das Vertrauen, sind aber für die
Kernfunktion (Angebot ansehen, buchen, kontaktieren) am wenigsten kritisch.

**Independent Test**: „Über uns"- und „FAQ"-Seite aufrufen; prüfen, dass die fest gepflegten
redaktionellen Inhalte vollständig und markenkonform dargestellt werden.

**Acceptance Scenarios**:

1. **Given** ein Besucher, **When** er „Über uns" öffnet, **Then** sieht er den redaktionellen
   Über-uns-Text im Markenlook.
2. **Given** ein Besucher, **When** er „FAQ" öffnet, **Then** sieht er die häufigen Fragen und
   Antworten als statischen, lesbaren Inhalt.

---

### Edge Cases

- **Keine aktiven Daten:** Sind (noch) keine aktiven Dienstleistungen oder Teammitglieder
  vorhanden, zeigt die jeweilige Seite einen sauberen Leerzustand statt einer leeren oder
  kaputten Liste.
- **Buchungs-Route:** Der „Termin buchen"-CTA zeigt in dieser Phase auf den Platzhalter-Pfad
  `/termin`; Phase 3 implementiert die Route. Ein Interim-Fallback ist nicht erforderlich.
- **Reduzierte Bewegung:** Bei `prefers-reduced-motion` wird eine ruhige, gleichwertige
  Variante ausgeliefert (Konstitution Prinzip XII).
- **Rechtsinhalte:** Impressum und Datenschutzerklärung dürfen nicht mit Platzhaltertexten
  live gehen — der echte, geprüfte Inhalt ist Startvoraussetzung.
- **Fehlendes Team-Foto:** Hat ein aktives Teammitglied (noch) kein Foto, wird ein
  markenkonformer Platzhalter angezeigt, statt ein gebrochenes Bild darzustellen.
- **Lange Inhalte / Sonderzeichen:** Lange Dienstleistungs- oder Profiltexte brechen sauber um
  und sprengen das Layout nicht (mobil wie Desktop).
- **Geänderte Öffnungszeiten / Schließtage:** Die Anzeige spiegelt den jeweils aktuellen Stand
  der Stammdaten beim Seitenaufruf.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Die Website MUSS folgende Seiten bereitstellen: Startseite, Dienstleistungen,
  Team, Über uns, FAQ, Kontakt, Impressum, Datenschutzerklärung — durchgängig mobil-first.
- **FR-002**: Die Startseite MUSS einen prominenten „Termin buchen"-Aufruf enthalten, der auf
  die (in Phase 3 implementierte) Buchungs-Route **`/termin`** zeigt. In dieser Phase ist diese
  Route ein Platzhalter; ein Interim-Fallback ist nicht erforderlich.
- **FR-003**: Die Dienstleistungsseite MUSS die **aktiven** Dienstleistungen live aus den
  Stammdaten anzeigen (Name, Dauer, fester Preis, Beschreibung).
- **FR-004**: Die Team-Seite MUSS die **aktiven** Teammitglieder live aus den Stammdaten
  anzeigen (Name, Foto, Kurzprofil, angebotene Dienstleistungen).
- **FR-005**: „Über uns" und „FAQ" MÜSSEN als redaktionelle Inhalte bereitgestellt werden,
  die fest im Projekt gepflegt werden (keine Admin-Editierbarkeit in dieser Phase).
- **FR-006**: Die Kontaktseite MUSS Adresse und Telefonnummer (aus dem admin-verwalteten
  Salon-Profil, siehe FR-015) sowie die Öffnungszeiten (aus den Stammdaten/SalonHours)
  anzeigen.
- **FR-007**: Die Seite MUSS ein **Impressum** (§ 5 DDG) und eine **Datenschutzerklärung** als
  eigene Seiten bereitstellen. Die Seitenstruktur wird gebaut; der rechtliche **Inhalt** ist
  vom Betreiber bereitzustellen und muss zu den tatsächlich genutzten Diensten (SendGrid,
  Twilio, Hosting, Cookies) passen — er wird nicht durch die Spec erfunden.
- **FR-008**: Alle Seiten MÜSSEN den verbindlichen Markenlook aus `DESIGN.md` umsetzen
  (Palette, Typografie, Motion). `DESIGN.md` und Konstitution Prinzip XII sind die Quelle der
  Wahrheit.
- **FR-009**: Alle öffentlichen Seiten MÜSSEN WCAG 2.1 AA erfüllen (Kontrast, Tastatur,
  semantisches Markup).
- **FR-010**: Die Seite MUSS Basis-SEO umsetzen: pro Seite eigene Meta-Titel/-Beschreibungen,
  „LocalBusiness"-Strukturdaten (Name, Adresse, Öffnungszeiten, Telefon), eine Sitemap und
  semantisches HTML.
- **FR-011**: Die Seite MUSS das Performance-Budget der Konstitution einhalten (Core Web
  Vitals), besonders auf Mobilgeräten. Motion bleibt „responsive" (Übergänge/Feedback) und
  respektiert `prefers-reduced-motion`.
- **FR-012**: Inhalte und Oberfläche MÜSSEN ausschließlich auf **Deutsch** sein.
- **FR-013**: Navigation und Footer MÜSSEN über alle Seiten konsistent sein; der Footer MUSS
  die Pflichtlinks (Impressum, Datenschutzerklärung) sowie Kontakt/Öffnungszeiten enthalten.
- **FR-014**: Seiten, die auf nicht vorhandene aktive Daten treffen (Dienstleistungen, Team),
  MÜSSEN einen sauberen, markenkonformen Leerzustand anzeigen.
- **FR-015**: Es MUSS ein admin-verwaltetes **Salon-Profil** geben, das mindestens Adresse und
  Telefonnummer des Salons hält; Kontaktseite, Footer und die LocalBusiness-Strukturdaten
  (FR-010) lesen Adresse und Telefon aus dieser Quelle. Die Öffnungszeiten stammen weiterhin
  aus den bestehenden Stammdaten (SalonHours).
- **FR-016**: Änderungen an den gelesenen Daten (Aktivieren/Deaktivieren von Dienstleistungen
  oder Teammitgliedern, geänderte Öffnungszeiten, geändertes Salon-Profil) MÜSSEN auf den
  öffentlichen Seiten spätestens innerhalb von ~60 Sekunden sichtbar werden. Echtzeit-Frische
  ist nicht erforderlich; das Performance-Budget (FR-011) hat Vorrang.
- **FR-017**: Die öffentliche Website DARF in dieser Phase ausschließlich technisch notwendige
  Cookies setzen (kein Tracking, keine Analytics); ein Cookie-Consent-Banner ist daher NICHT
  erforderlich. Die Datenschutzerklärung (FR-007) muss diesen Zustand korrekt widerspiegeln.

### Key Entities *(include if feature involves data)*

Die dynamischen Seiten lesen überwiegend bestehende Daten aus Phase 0/1. Neu hinzu kommt ein
admin-verwaltetes **Salon-Profil** für Adresse/Telefon (siehe FR-015):

- **Dienstleistung (Service)**: Angebotene Leistung mit Name, Dauer, festem Preis,
  Beschreibung und Aktiv-Status. Nur aktive werden öffentlich angezeigt.
- **Teammitglied (TeamMember)**: Mitarbeiter mit Name, Foto (optionales Foto-Feld),
  Kurzprofil, angebotenen Dienstleistungen und Aktiv-Status. Nur aktive werden öffentlich
  angezeigt.
- **Salon-Öffnungszeit (SalonHours)**: Öffnungszeiten des Salons, gelesen für Kontaktseite,
  Footer und Strukturdaten.
- **Salon-Profil (SalonProfile)** *(neu in dieser Phase)*: Admin-verwaltete Salon-Stammdaten
  mit mindestens Adresse und Telefonnummer; Quelle für Kontaktseite, Footer und
  LocalBusiness-Strukturdaten.

Weitere neue Inhalte in dieser Phase (kein Kern-Datenmodell):

- **Redaktionelle Inhalte**: Über-uns- und FAQ-Texte, fest im Projekt gepflegt (nicht
  admin-editierbar in dieser Phase).
- **SEO-Metadaten**: Pro Seite Titel/Beschreibung sowie „LocalBusiness"-Strukturdaten.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Alle Seiten aus FR-001 (Startseite, Dienstleistungen, Team, Über uns, FAQ,
  Kontakt, Impressum, Datenschutzerklärung) sind erreichbar und stellen sich auf Mobil und
  Desktop korrekt dar.
- **SC-002**: Eine im Admin angelegte/aktivierte Dienstleistung bzw. ein Teammitglied
  erscheint spätestens innerhalb von ~60 Sekunden auf der jeweiligen öffentlichen Seite;
  deaktivierte verschwinden innerhalb desselben Fensters.
- **SC-003**: Alle öffentlichen Seiten bestehen einen WCAG-2.1-AA-Audit (Kontrast, Tastatur,
  semantisches Markup) ohne kritische Verstöße.
- **SC-004**: Die öffentlichen Seiten halten das Core-Web-Vitals-Budget ein (LCP < 2,5 s,
  INP < 200 ms, CLS < 0,1) auf einem repräsentativen Mobilprofil.
- **SC-005**: Die „LocalBusiness"-Strukturdaten validieren erfolgreich und enthalten Name,
  Adresse, Öffnungszeiten und Telefon.
- **SC-006**: Der visuelle Output entspricht der `DESIGN.md` (Palette/Typografie/Motion),
  nachweisbar über Impeccable-Audit / Emil-Review.
- **SC-007**: Bei `prefers-reduced-motion` wird auf jeder Seite eine ruhige, gleichwertige
  Variante ohne aufdringliche Bewegung ausgeliefert.
- **SC-008**: Sind keine aktiven Dienstleistungen oder Teammitglieder vorhanden, zeigt die
  betroffene Seite einen sauberen Leerzustand statt einer leeren oder kaputten Liste.

## Assumptions

- **Bestehende Daten verfügbar:** Dienstleistungen, Teammitglieder und Öffnungszeiten existieren
  als Stammdaten aus Phase 0/1 und sind lesend abrufbar; das Teammitglied umfasst bereits ein
  optionales Foto-Feld (bei fehlendem Foto greift ein markenkonformer Platzhalter).
- **Markenlook verbindlich:** `DESIGN.md` und Konstitution Prinzip XII sind die alleinige
  Quelle für Palette, Typografie und Motion; visuelle Detailentscheidungen werden dort
  getroffen, nicht in dieser Spec.
- **Rechtsinhalte vom Betreiber:** Der geprüfte Text für Impressum und Datenschutzerklärung
  wird vom Betreiber/Anwalt bereitgestellt und ist Voraussetzung für den Live-Gang; diese
  Phase baut die Seitenstruktur.
- **Kein Live-Gang in Phase 2:** Die Website geht erst mit dem fertigen MVP live; Interim-
  oder Wartungszustände sind nicht nötig.
- **Buchung ist Platzhalter:** Die Buchungs-Route wird in Phase 3 implementiert; in dieser
  Phase verweist der CTA auf einen Platzhalter.
- **Adresse & Telefonnummer:** Salon-Adresse und Telefonnummer stammen aus einem neuen,
  admin-verwalteten Salon-Profil (FR-015); diese Phase ergänzt dafür minimal Datenmodell und
  Admin-Pflege. Öffnungszeiten bleiben in den bestehenden Stammdaten (SalonHours).
- **Cookies:** In Phase 2 werden nur technisch notwendige Cookies gesetzt (kein Tracking/
  Analytics), daher ist kein Consent-Banner erforderlich (FR-017).

## Außerhalb des Geltungsbereichs (diese Phase)

- Der eigentliche Online-Buchungs-Flow (Phase 3) und Kundenkonten/Self-Service (Phase 4).
- Admin-Oberfläche (Phase 1, abgeschlossen) — mit Ausnahme der minimalen Admin-Pflege des
  neuen Salon-Profils (Adresse/Telefon), die diese Phase ergänzt (FR-015).
- Cookie-Consent-/Tracking-Mechanik (FR-017: in dieser Phase keine zustimmungspflichtigen
  Cookies).
- Admin-Editierbarkeit der redaktionellen Inhalte (späteres Feature).
- Mehrsprachigkeit.
- Jegliche Zahlungsabwicklung (im MVP generell nicht vorgesehen).
