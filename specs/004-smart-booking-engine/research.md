# Phase 0 Research: Smart Booking Engine

**Branch**: `004-smart-booking-engine` | **Date**: 2026-06-10

Alle offenen fachlichen Entscheidungen wurden in der `/speckit-clarify`-Session (2026-06-10) bzw. über dokumentierte Defaults (spec `## Assumptions`) aufgelöst. Dieses Dokument klärt die verbleibenden **technischen** Unbekannten, die der Tech-Stack-Wechsel von „admin-intern" zu „öffentlich" aufwirft.

---

## R1 — Concurrency-sichere Doppelbuchungs-Abwehr im Public-Flow

- **Decision**: Auf die bereits existierende PostgreSQL-`EXCLUDE USING GIST`-Constraint `no_overlapping_confirmed_appointments` (Migration 005) als alleinige Wahrheit setzen. Der Public-Service fängt die beim `commit()` ausgelöste `sqlalchemy.exc.IntegrityError` ab und übersetzt sie in `409 BOOKING_CONFLICT`. Der vorgelagerte App-seitige Overlap-`SELECT` bleibt als schnelle, freundliche Vorabprüfung erhalten, ist aber **nicht** die Sicherung.
- **Rationale**: Konstitution III verlangt strukturelle (DB-Ebene) Verhinderung, nicht App-Logik. Der reine `SELECT`-Check in `create_appointment` ist bei echter Nebenläufigkeit (US1 Szenario 4) racy; nur die Constraint garantiert „genau eine gewinnt". SQLite-Tests können die GIST-Constraint nicht abbilden → Concurrency wird dort per App-Logik/Test-Doubles geprüft (bestehendes Muster, CLAUDE.md).
- **Alternatives considered**: (a) `SELECT ... FOR UPDATE`-Locking auf einen Slot — kein natürlicher Zeilen-Lock-Kandidat, komplexer; (b) Advisory Locks — Zusatzkomplexität ohne Mehrwert gegenüber vorhandener Constraint. Verworfen.

## R2 — E-Mail-Versand (Bestätigung & Erinnerung)

- **Decision**: SendGrid (Konstitution-Stack) über das offizielle `sendgrid`-Python-Paket, gekapselt in `notifications/email.py`. In Entwicklung/Tests ohne `SENDGRID_API_KEY` fällt der Versand auf einen Konsolen-/No-Op-Adapter zurück und protokolliert in `notification_logs`. Versand erfolgt asynchron via FastAPI `BackgroundTasks`, damit die Buchungsantwort < 2 s bleibt (SC-001).
- **Rationale**: Konstitution schreibt SendGrid für E-Mail fest und fordert AV-Vertrag + TLS (II). Hintergrundversand entkoppelt die Zustellung (SC-003: < 5 min) vom synchronen Request. Der Log macht Fehlversand für den Admin sichtbar (Edge Case „nicht zustellbar").
- **Alternatives considered**: SMTP/`aiosmtplib` direkt — keine Zustell-Reputation, mehr Betrieb; verworfen. Synchroner Versand im Request — verletzt Latenzziel; verworfen.

## R3 — Erinnerungs-Auslösung (24-h-Job)

- **Decision**: Service-Funktion `run_reminder_job(session)` in `notifications/reminders.py` plus dünnes CLI-Skript `scripts/run_reminders.py` — exakt das Muster von `run_retention_job` / `scripts/run_retention.py`. Der Job wählt **alle** bestätigten, noch nicht erinnerten Termine mit Start in `(jetzt, jetzt + REMINDER_LEAD_HOURS]` (keine untere `−Δ`-Grenze) und versendet je Termin genau einmal. `REMINDER_SCAN_INTERVAL_HOURS` (Default 1 h) ist allein die Cron-Kadenz; ein verpasster Lauf heilt sich beim nächsten selbst, da der Termin weiter im Fenster liegt, bis er erinnert wurde. Optional eine Last-Minute-Marge (`Start > jetzt + 30 min`). Externe Periodizität (cron / Scheduled Task) liegt außerhalb des Codes.
- **Rationale**: Wiederverwendung eines erprobten, getesteten Musters; keine neue Scheduler-Abhängigkeit. **Idempotenz** wird DB-seitig durch den partiellen Unique-Index `uq_reminder_sent` (`notification_logs`, je `appointment_id` für `kind='reminder' AND status='sent'`) erzwungen — selbst ein verspäteter oder doppelter Job-Lauf kann keine zweite Erinnerung schreiben; der App-`has_sent`-Check ist nur die freundliche Vorabprüfung. Testbar (Konstitution IX, T022).
- **Alternatives considered**: In-Prozess-Scheduler (APScheduler/Celery-Beat) — neue Laufzeit-/Infra-Abhängigkeit, im MVP unnötig; verworfen. Verschieben auf einen späteren „Worker" — würde US2 blockieren; verworfen.

## R4 — Storno-Token (kontolose Stornierung)

- **Decision**: Pro Termin ein `cancellation_token` = `secrets.token_urlsafe(32)`, unique & indexiert auf `appointments`. Storno-Endpoint `POST /public/booking/cancel/{token}` setzt Status auf `cancelled`, sofern Termin bestätigt **und** Start > `jetzt + CANCELLATION_CUTOFF_HOURS`. `GET /public/booking/cancel/{token}` liefert eine schreibgeschützte Ansicht (für die Bestätigungsseite, US3 Szenario 3 = idempotent). Unbekannter Token → `404`; Frist überschritten → `409`/`410` mit Hinweis auf Telefon.
- **Rationale**: `secrets.token_urlsafe` ist kryptografisch zufällig und unerratbar (Konstitution XI). Token am Termin (statt separater Tabelle) ist im MVP einfachst und genügt, da kein Login. Ein `GET`, das nichts verändert, erfüllt das idempotente Wiederöffnen.
- **Alternatives considered**: Signiertes JWT mit Ablauf — kein Server-State, aber nicht widerrufbar und schwerer zu prüfen/zu loggen; verworfen. Separate `cancellation_tokens`-Tabelle — Überengineering für 1 Token/Termin; verworfen.

## R5 — „Beliebiger verfügbarer Stylist" (FR-014)

- **Decision**: Bei `team_member_id = null`/`"any"` berechnet der Service die Verfügbarkeit über alle aktiven Teammitglieder, die die gewählte Dienstleistung anbieten, und mappt jeden angebotenen Slot auf den/die fähigen, freien Stylisten. Bei der Bestätigung wird genau ein konkretes Teammitglied deterministisch zugewiesen (z.B. der mit der geringsten Tagesauslastung; bei Gleichstand stabil nach ID). Die Buchung wird **immer** mit einem konkreten `team_member_id` persistiert.
- **Rationale**: FR-014 ist MUSS. Die Auflösung auf ein konkretes Teammitglied vor dem `INSERT` hält die `EXCLUDE`-Constraint (die pro `team_member_id` greift) wirksam und den Kalender eindeutig.
- **Alternatives considered**: Persistieren von „any" und späteres Zuweisen durch Admin — bricht Auto-Bestätigung (FR-016) und Doppelbuchungs-Garantie; verworfen.

## R6 — Buchungsfenster-Guardrails (FR-012/FR-013)

- **Decision**: Validierung im Service vor dem Schreiben: `starts_at >= jetzt + BOOKING_MIN_LEAD_HOURS` (2 h) und `starts_at <= jetzt + BOOKING_MAX_HORIZON_DAYS` (60 Tage); Startzeit muss auf dem 15-min-Raster liegen (bereits Raster der `availability`-Generierung). Verletzung → `422` mit klarer Meldung. Verfügbarkeits-Query blendet Slots außerhalb des Fensters serverseitig aus, damit die UI sie gar nicht anbietet.
- **Rationale**: Doppelte Absicherung (UI blendet aus, Server validiert) verhindert Umgehung über direkte API-Aufrufe (Konstitution XI). Werte als ENV-Settings konfigurierbar.
- **Alternatives considered**: Nur clientseitige Prüfung — unsicher; verworfen.

## R7 — Online-Buchung erzeugt Customer vs. Gast-Felder

- **Decision**: Öffentliche Buchungen legen einen `Customer` (Name + E-Mail, optional Telefon) an bzw. verknüpfen einen bestehenden über die E-Mail und setzen `Appointment.customer_id`; `Appointment.origin = "online"`. Walk-ins (Admin) nutzen weiterhin die Gast-Felder mit `origin = "walk_in"`. Die bestehende CHECK-Constraint (`customer_id` XOR Gast-Felder) bleibt erfüllt.
- **Rationale**: Ein stabiler `Customer`-Datensatz ist Voraussetzung für E-Mail-Versand, Retention (`last_active_at`) und die spätere Konto-Verknüpfung (Phase 4, Key Entity „Kunde"). `origin` macht die in der Spec geforderte Herkunfts-Unterscheidung explizit (statt sie aus `customer_id` zu erraten).
- **Alternatives considered**: Online-Buchung in Gast-Feldern ohne Customer — keine E-Mail/Retention-Bindung, kein Phase-4-Pfad; verworfen.

## R8 — DSGVO-Umsetzung im Flow

- **Decision**: Pflicht-Hinweis + Link auf die bestehende Datenschutzerklärung (`(public)/datenschutz`) im Kontaktdaten-Schritt; keine Einwilligungs-Checkbox nötig (nur E-Mail als Vertragskommunikation, Art. 6 (1) b). Datenschutzerklärung wird um „Online-Terminbuchung" und „SendGrid (E-Mail-Versand, AV-Vertrag)" ergänzt. Retention läuft unverändert über `run_retention_job`.
- **Rationale**: Direkte Umsetzung von FR-010/FR-011 und Konstitution II ohne überflüssige Einwilligung.
- **Alternatives considered**: Opt-in-Checkbox — bei reiner Vertragskommunikation rechtlich nicht erforderlich und reibungserhöhend; verworfen.

---

**Status**: Alle technischen Unbekannten aufgelöst — keine offenen `NEEDS CLARIFICATION`. Bereit für Phase 1.
