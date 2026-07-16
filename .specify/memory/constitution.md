# Konstitution — Digitale Salon-Plattform

> Diese Datei gehört im Projekt nach `.specify/memory/constitution.md`.
> Sie ist das nicht verhandelbare Fundament. Jede Spec, jeder Plan und jede
> Implementierung MUSS ihr entsprechen. Bei Konflikt gewinnt die Konstitution.

**Version:** 1.2.0
**Ratifiziert:** 2026-06-07
**Zuletzt geändert:** 2026-06-08

---

## Zweck

Diese Konstitution legt die verbindlichen Prinzipien für Entwurf und Implementierung
der digitalen Salon-Plattform fest. Sie übersetzt die Vision in technische und
prozessuale Leitplanken, an die sich jeder KI-Agent und jeder Mensch im Projekt hält.

---

## Grundprinzipien

### I. Spec-First, keine stillen Annahmen
Jede Implementierung folgt einer freigegebenen Spezifikation. Fehlt eine fachliche
Entscheidung, wird sie **nicht geraten**, sondern explizit mit `[NEEDS CLARIFICATION: <Frage>]`
markiert und vor der Umsetzung geklärt. Eine offene Frage zu kennzeichnen ist immer
besser, als eine plausible, aber falsche Annahme einzubauen.

### II. Datenschutz by Design & by Default (DSGVO) — NICHT VERHANDELBAR
Die Plattform unterliegt deutschem Recht und der DSGVO.
- **Datenminimierung:** Es werden nur Daten erhoben, die für den jeweiligen Zweck nötig sind.
- **Rechtsgrundlage:** Jede Verarbeitung personenbezogener Daten muss einer Rechtsgrundlage
  (Art. 6 DSGVO) zuordenbar sein; diese wird in der jeweiligen Spec benannt.
- **Lösch- & Aufbewahrungskonzept:** Da die Plattform KEINE Zahlungs-/Rechnungsdaten
  verarbeitet, entfällt der GoBD-Aufbewahrungskonflikt. Termin- und Kontaktdaten werden
  nach einer definierten Frist gelöscht oder anonymisiert.
- **Verschlüsselung:** Personenbezogene Daten werden verschlüsselt übertragen (TLS) und
  ruhend geschützt.
- **Drittlandtransfer:** Keine personenbezogenen Daten an Drittländer ohne gültige Grundlage.
  Externe Dienstleister (Brevo, Twilio) erfordern einen AV-Vertrag.
- **Betroffenenrechte:** Auskunft, Berichtigung, Löschung und Datenexport müssen technisch
  umsetzbar sein.

### III. Eine Quelle der Wahrheit für Termine
Die Webplattform ist der **alleinige** Schreib-Ort für Termine. Online-Buchungen und vom
Admin eingetragene Vor-Ort-Termine teilen sich denselben Kalender und dieselbe Datenbasis.
Doppelbuchungen werden auf Datenbankebene strukturell verhindert (Constraints und/oder
optimistisches Locking auf Zeit-Slots), nicht allein durch Anwendungslogik.

### IV. Modulare Architektur mit klaren Domänen-Grenzen
Das System wird als **Modular Monolith** gebaut: ein deploybares Backend, intern aber
klar in Domänen geschnitten (z.B. `auth`, `stammdaten`, `booking`,
`notifications`). Domänen kommunizieren über definierte Schnittstellen, nicht durch
Zugriff auf fremde Interna. Diese Grenzen halten den Weg zu späteren Services offen,
ohne ihn jetzt zu erzwingen.

### V. Strikte Trennung der Verantwortlichkeiten (Separation of Concerns)
UI-Logik, Geschäftslogik und Datenzugriff sind strikt getrennt.
- Keine Geschäftslogik im Frontend.
- Keine direkten Datenbank-Queries in API-Routen-Handlern; Zugriff läuft über eine
  Service-/Repository-Schicht.
- Das Frontend kennt nur die API, nie das Datenbankschema.

### VI. Durchgängige Typsicherheit
- Backend: alle Ein- und Ausgaben über **Pydantic-Models**. Kein untypisiertes `dict`
  als API-Contract.
- Frontend: **TypeScript-Interfaces/Types** für alle API-Daten. Kein `any`.
- API-Typen sind die Quelle; das Frontend leitet seine Typen idealerweise aus dem
  OpenAPI-Schema ab.

### VII. Die API ist ein dokumentierter Vertrag
Das FastAPI-Backend stellt automatisch ein vollständiges **OpenAPI/Swagger**-Schema
bereit. Routen sind sauber benannt und versionierbar (`/api/v1/...`). Das Backend trifft
keine Frontend-spezifischen Annahmen — es bleibt integrationsoffen, falls später eine
weitere Anbindung gewünscht wird.

### VIII. Auslieferbare Qualität
Ausgelieferter Code ist vollständig und lauffähig: mit Fehlerbehandlung, Eingabe-
Validierung und sinnvollem Logging. Es werden keine `// TODO`-Lücken im fertigen Code
hinterlassen. (Abgrenzung zu Prinzip I: Fehlt eine *fachliche Entscheidung*, wird sie als
`[NEEDS CLARIFICATION]` markiert und nicht durch eine erfundene Implementierung kaschiert.)

### IX. Getestete kritische Pfade
Die geschäftskritische Logik MUSS automatisiert getestet sein — insbesondere die
Verfügbarkeits-/Slot-Berechnung, die Buchungs-Integrität (keine Doppelbuchung) und die
Aufbewahrungs-/Anonymisierungslogik. Für diese Pfade gilt Test-zuerst (TDD), wo sinnvoll.

### X. Mobile-First & zugänglich
Das Kunden-Frontend wird zuerst für das Smartphone entworfen und nach oben skaliert.
Grundlegende Barrierefreiheit (semantisches HTML, Tastaturbedienbarkeit, Kontraste,
Alt-Texte) ist Pflicht, kein Extra.

### XI. Sicherheit als Standard
- Secrets ausschließlich über Umgebungsvariablen/Secret-Management, niemals im Code.
- Sichere Authentifizierung; Schutz aller nicht-öffentlichen Endpunkte.
- Eingabevalidierung an der API-Grenze; Rate-Limiting auf sensiblen Endpunkten
  (Login, Buchung).

### XII. Design-System & bewusste Motion
Das Frontend soll modern, lebendig und schnell wirken — diese drei Ziele werden über ein
gemeinsames Design-System diszipliniert, nicht über Effekt-Häufung.
- **Ein geteiltes Token-System** (Typografie, Farbe, Spacing, Easing) ist die verbindliche
  Quelle für *beide* KI-Agenten (Claude Code, Gemini CLI) und wird in einer `DESIGN.md`
  im Repo dokumentiert. So entsteht ein einheitlicher Look, egal welcher Agent baut.
- **Motion ist zweckgebunden** (Orientierung, Feedback, Delight), nie Selbstzweck. Animationen
  laufen ausschließlich über performante Eigenschaften (`transform`, `opacity`); Layout-
  auslösende Animationen werden vermieden.
- **`prefers-reduced-motion` wird respektiert** (knüpft an Artikel X an): Wer reduzierte
  Bewegung wünscht, bekommt eine ruhige, gleichwertige Variante.
- **Ein KI-Design-Skill** (Impeccable) unterstützt die Implementierung und die Qualitäts-
  prüfung (Anti-Pattern-Erkennung), ersetzt aber weder Spec noch Token-System. Die
  `.specify/`-Artefakte und die `DESIGN.md` bleiben übergeordnet.

---

## Technologie-Stack

Verbindlich für alle Phasen. Abweichungen erfordern eine Änderung dieser Konstitution.

- **Frontend (Web & Kundenportal):** Next.js (React), TypeScript, Tailwind CSS, Mobile-First.
- **Motion:** Motion (Framer Motion) für React-Komponenten-Animationen, ergänzt durch schlichte
  CSS-Transitions. GSAP optional für aufwendiges Scroll-Storytelling.
- **Backend:** FastAPI (Python), asynchron, Pydantic für strikte Validierung.
- **Datenbank:** PostgreSQL, angesteuert über SQLModel/SQLAlchemy; Schema-Migrationen über Alembic.
- **Zahlungen:** Keine Online-Zahlung im MVP. Die Bezahlung erfolgt vor Ort im Salon über
  das bestehende lokale Kassensystem; die Plattform verarbeitet keine Zahlungsdaten. Eine
  spätere Anzahlungs-/No-Show-Schutz-Funktion würde einen Zahlungsanbieter erfordern und
  diese Konstitution ändern.
- **E-Mail:** Brevo (EU, HTTP-API). **SMS:** Twilio.
- **Performance-Budget:** Messbare Ziele statt Gefühl — Core Web Vitals: LCP < 2,5 s,
  INP < 200 ms, CLS < 0,1. Gilt besonders für die öffentliche Website. Schnelligkeit hat
  bei Konflikten Vorrang vor zusätzlichem visuellen Effekt.
- **Nicht im MVP:** OpenAI/KI-Concierge ist bewusst ausgeschlossen und kein Teil dieser
  Stack-Festlegung, bis er separat spezifiziert wird (mit eigener DSGVO-Prüfung wegen
  Drittlandtransfer).

---

## Ausdrücklich außerhalb des Geltungsbereichs (MVP)

- Anbindung der lokalen BarberKasse-App an die API.
- KI-Chatbot / AI-Concierge (FAQ bleibt eine statische Seite).
- Warenwirtschaft, Online-Produktverkauf, Lohn-/Personalabrechnung.
- Mehr-Filialen-/Mandanten- oder Marktplatz-Funktionalität.

---

## Governance

- Diese Konstitution hat Vorrang vor allen Specs, Plänen und Tasks. Bei Widerspruch
  wird zugunsten der Konstitution entschieden oder die Konstitution bewusst geändert.
- **Änderungen** werden dokumentiert und versioniert (Semantic Versioning: MAJOR für
  inkompatible Prinzipienänderungen, MINOR für neue Prinzipien, PATCH für Klarstellungen).
- Vor jeder Implementierung wird der `analyze`-Schritt ausgeführt, um Verstöße gegen
  diese Konstitution sowie Lücken und Widersprüche in den Artefakten zu finden.
- Jede `[NEEDS CLARIFICATION]`-Markierung muss aufgelöst sein, bevor der zugehörige
  Task implementiert wird.