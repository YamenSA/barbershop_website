# Phase 0 — Research: Kundenkonto & Self-Service

Alle `[NEEDS CLARIFICATION]` wurden in der Clarify-Session (2026-06-10) aufgelöst. Diese Datei dokumentiert die daraus folgenden technischen Entscheidungen sowie Best-Practice-Recherche für die wiederverwendeten Phase-1/3-Muster.

---

## D1 — Kontomodell: `customers` erweitern statt neue Tabelle

- **Decision**: Die bestehende `customers`-Tabelle wird um `hashed_password` (nullable) und `email_verified_at` (nullable, tz) erweitert. Ein **Gast** ist ein `Customer` ohne Passwort; ein **Konto** ein `Customer` mit Passwort. `email` ist bereits `unique`/`index`.
- **Rationale**: Datenminimierung (Konstitution II) und „erweitert/verknüpft den bestehenden Kunden-Datensatz" (Spec, Key Entities). Vermeidet eine parallele Identitätstabelle und doppelte Email-Wahrheit. Der bestehende Anonymisierungspfad (`delete_customer`, `run_retention_job`) bleibt unverändert Träger der Löschung (FR-011).
- **Alternatives considered**: Separate `customer_accounts`-Tabelle mit FK auf `customers` — verworfen, weil sie eine zweite Email-Quelle, Join-Aufwand und Anonymisierungs-Sonderfälle erzeugt, ohne Mehrwert bei einem Email-pro-Kunde-Modell.

## D2 — Gast-Übernahme (US4/FR-013) ist nahezu automatisch

- **Decision**: Keine separate Migrations-/Matching-Logik nötig. Bei Registrierung wird per Email der bestehende, nicht-anonymisierte `Customer` gesucht; existiert er (durch frühere Gast-Buchung via `_upsert_customer` angelegt), werden nur `hashed_password` + Verifikation gesetzt. Die zugehörigen `appointments` sind über `customer_id` bereits verknüpft und damit nach Login sichtbar.
- **Rationale**: `create_public_appointment` ruft heute schon `_upsert_customer` und setzt `customer_id`; Online-Buchungen hängen also bereits am `Customer`. „Verifizierte exakte Email-Übereinstimmung" (FR-013) ist durch das `unique`-Email-Modell + Double-Opt-in strukturell erfüllt.
- **Edge**: Anonymisierte Altkunden tragen eine verfremdete Email (`[anonymisiert]-{id}@…`/`[anonymisiert]@[anonymisiert]`) → kein Match, korrekt (nur nicht-anonymisierte zuordnen). Reine Walk-in/Admin-Termine mit `guest_name` und `customer_id = NULL` tragen keine Email und sind nicht zuordenbar — dokumentierte Grenze.
- **Alternatives considered**: Nachgelagerter Batch-Job zum Email-Matching von Terminen — unnötig, da Verknüpfung schon beim Buchen geschieht.

## D3 — Rollentrennung Admin vs. Kunde (FR-016)

- **Decision**: Separates Cookie `customer_session` (zusätzlich zum Admin-`session`) und ein JWT mit `{"sub": str(customer_id), "typ": "customer", "exp": …}`. Neue Helfer in `auth.service`: `create_customer_token(customer_id, remember)` und `validate_customer_token(token)` (prüft `typ == "customer"`). `get_current_customer`-Dependency liest ausschließlich `customer_session`. Die Admin-Dependency liest weiter nur `session`.
- **Rationale**: Ein Kunden-Token erreicht keinen Admin-Endpunkt und umgekehrt (getrennte Cookie-Namen + `typ`-Claim + unterschiedliche Subjekt-Semantik: Username vs. Customer-UUID). Wiederverwendung von `jwt`/`JWT_SECRET_KEY`/`ALGORITHM` aus Phase 1.
- **Alternatives considered**: Gemeinsames Cookie mit Rollen-Claim — verworfen, da fehleranfälliger bei der strikten Trennung (SC-005) und weniger explizit.

## D4 — Sitzungsdauer & „Angemeldet bleiben" (FR-004)

- **Decision**: Standard-Sitzung ~8 h (`CUSTOMER_SESSION_EXPIRE_HOURS = 8`, gespiegelt zu Phase-1-`SESSION_EXPIRE_HOURS`); bei `remember_me = true` läuft Token + Cookie ~30 Tage (`CUSTOMER_REMEMBER_EXPIRE_DAYS = 30`). Cookie `httponly`, `samesite=lax`, `secure=COOKIE_SECURE`.
- **Rationale**: Clarify-Entscheid; konsistent mit dem vorhandenen Cookie-Mechanismus, minimaler neuer Code.
- **Alternatives considered**: Access-+Refresh-Token-Rotation — verworfen für den MVP (neuer Mechanismus, Mehrkomplexität ohne Bedarf bei dieser Skala).

## D5 — Verifikations-/Reset-Token: `customer_tokens`, nur als Hash gespeichert

- **Decision**: Neue Tabelle `customer_tokens` (`customer_id` FK, `token_hash` SHA-256 unique, `purpose` ∈ {`email_verification`, `password_reset`}, `expires_at` tz, `used_at` tz nullable, `created_at` tz). Der Klartext-Token (`secrets.token_urlsafe(32)`) geht nur in die Email; gespeichert wird ausschließlich der SHA-256-Hash. Verifikations-Token 24 h gültig, Reset-Token 1 h (Assumptions). Token ist single-use (`used_at` setzen) und beim Verbrauch geprüft auf Ablauf/Verwendung.
- **Rationale**: Konstitution II/XI — ein DB-Leak darf keine gültigen Links preisgeben. SHA-256 genügt für hochentropische Zufallstoken (kein langsames Hashing nötig, da nicht brute-force-bar). Muster „tokenisierte, einmalige, ablaufende Links" aus Phase 3 wird übernommen und um at-rest-Hashing gehärtet.
- **Alternatives considered**: Klartext-Token wie beim Phase-3-`cancellation_token` — bewusst abweichend, weil Konto-Verifikation/Reset höheres Schutzniveau als ein einzelner Storno-Link erfordert. Signierte JWT-Token ohne DB-Zeile — verworfen, weil Single-Use/Invalidierung eine Serverzustands-Zeile braucht.

## D6 — Atomare Umbuchung (FR-009, SC-003)

- **Decision**: `reschedule_appointment()` läuft in **einer** DB-Transaktion: (1) den bestehenden Termin auf `cancelled` setzen (entfernt ihn aus dem `confirmed`-Partial-Index der `EXCLUDE`-Constraint und vermeidet Selbst-Konflikt bei überlappender Verschiebung), (2) neuen `confirmed`-Termin mit denselben Guardrails wie die Erstbuchung (Vorlauf, Horizont, 15-min-Raster, Working-Schedule, Overlap-Check) anlegen, (3) `commit`. Bei Konflikt (`IntegrityError`/Overlap) → `rollback` → ursprünglicher Termin bleibt unverändert `confirmed`; Antwort `409 BOOKING_CONFLICT`.
- **Rationale**: Die DB-Transaktion garantiert „alles oder nichts": Es gibt kein Zeitfenster, in dem der Slot frei ist und von Dritten belegt werden könnte, und bei Fehlschlag ist der Originaltermin vollständig erhalten (null verlorene Slots). Die `EXCLUDE`-Constraint bleibt die harte Doppelbuchungs-Garantie.
- **Alternatives considered**: „Erst neu anlegen, dann alt stornieren" als getrennte Schritte — verworfen, weil ein überlappendes Reschedule am Selbst-Konflikt der Constraint scheitern würde und zwei Commits ein inkonsistentes Zwischenfenster erzeugen.
- **Hinweis**: Es gilt dieselbe Stornofrist (`CANCELLATION_CUTOFF_HOURS`, 24 h) wie beim Phase-3-Token-Storno (FR-008); außerhalb der Frist → `410 CANCELLATION_WINDOW_CLOSED`.

## D7 — Konto-Löschung mit kommenden Terminen (FR-011, Clarify)

- **Decision**: `delete_account()` storniert zuerst alle kommenden `confirmed`-Termine des Kunden (Status `cancelled` → Slot über die Engine frei), ruft dann den bestehenden Anonymisierungspfad (`delete_customer`: Name/Email/Telefon ersetzen, `anonymized_at` setzen) und entfernt `hashed_password` + `email_verified_at`, sodass kein erneuter Login möglich ist. Offene `customer_tokens` werden gelöscht/invalidiert.
- **Rationale**: Clarify-Entscheid „Auto-stornieren, Slot frei, dann anonymisieren"; saubere Art-17-Umsetzung, gibt Salon-Kapazität zurück, keine verwaisten anonymen Belegungen.
- **Alternatives considered**: Termine als anonyme Buchung behalten / Löschung blockieren — beide in Clarify verworfen.

## D8 — Passwortstärke (FR-017)

- **Decision**: Mindestens 10 Zeichen, keine erzwungenen Zeichenklassen; Validierung als Pydantic-Feldvalidator im Register-/Reset-Schema. Hashing mit dem vorhandenen `pwd_context` (bcrypt) aus `auth.service`.
- **Rationale**: NIST SP 800-63B (Länge vor Komplexität); konsistent mit Clarify-Entscheid; maximale Usability bei solidem Schutz.
- **Alternatives considered**: Erzwungene Zeichenklassen / Leak-Listen-Abgleich — verworfen (nutzerfeindlich bzw. externe Abhängigkeit, nicht MVP).

## D9 — Account-Enumeration & Rate-Limiting (FR-014)

- **Decision**: Registrierung und Passwort-Reset antworten **immer** generisch (z. B. `202 Accepted` „Falls die Adresse gültig ist, wurde eine E-Mail gesendet."), unabhängig davon, ob die Email existiert; bei bereits registrierter Email wird intern keine zweite Identität angelegt, sondern ggf. eine Hinweis-Mail an die bestehende Adresse versandt. Login auf unverifiziertem Konto → generische Ablehnung. slowapi-`@limiter.limit(RATE_LIMIT_ACCOUNT_PER_MINUTE)` auf register/login/reset-request/verify; zusätzlich der vorhandene IP-Failed-Attempt-Backoff (`compute_delay`) beim Login.
- **Rationale**: Konstitution XI; verhindert Existenz-Orakel und Brute-Force.
- **Alternatives considered**: Direkte „Email bereits vergeben"-Fehlermeldung — verworfen (Enumeration).

## D10 — Versand der Auth-Mails über `notifications`

- **Decision**: Neue Templates `render_verification`, `render_password_reset`, `render_reschedule_confirmation` in `notifications/templates.py`; Versand über den bestehenden `send_email`/SendGrid-Wrapper (mit Konsolen-Fallback in Dev). Auth-Mails sind nicht an einen `appointment` gebunden und nutzen daher einen schlanken `send_account_email`-Pfad ohne `NotificationLog`-Appointment-FK (Idempotenz hier über Token-Single-Use statt Log).
- **Rationale**: Wiederverwendung des Phase-3-Versandpfads (Konstitution IV); `NotificationLog` ist appointment-zentriert und für Auth-Mails nicht passend.
- **Alternatives considered**: `NotificationLog` um nullable `customer_id` erweitern — verworfen als unnötige Schema-Aufweichung; Token-Tabelle deckt Nachvollziehbarkeit/Single-Use bereits ab.

---

## Zusammenfassung der neuen Konfiguration (config.py)

| Setting | Default | Zweck |
|---|---|---|
| `CUSTOMER_SESSION_EXPIRE_HOURS` | 8 | Standard-Sitzungsdauer Kunde |
| `CUSTOMER_REMEMBER_EXPIRE_DAYS` | 30 | „Angemeldet bleiben" |
| `CUSTOMER_VERIFY_TOKEN_HOURS` | 24 | Gültigkeit Verifikations-Link |
| `CUSTOMER_RESET_TOKEN_HOURS` | 1 | Gültigkeit Reset-Link |
| `RATE_LIMIT_ACCOUNT_PER_MINUTE` | 10 | Rate-Limit Auth-Endpunkte |

Wiederverwendet (unverändert): `JWT_SECRET_KEY`, `COOKIE_SECURE`, `CANCELLATION_CUTOFF_HOURS`, `BOOKING_MIN_LEAD_HOURS`, `BOOKING_MAX_HORIZON_DAYS`, `PUBLIC_BASE_URL`, `EMAIL_FROM`, `SENDGRID_API_KEY`.
