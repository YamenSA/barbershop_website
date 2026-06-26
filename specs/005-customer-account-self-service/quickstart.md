# Quickstart & Validierung — Kundenkonto & Self-Service

Validierungsleitfaden für Phase 5. Referenziert [data-model.md](./data-model.md) und [contracts/customer-account-api.md](./contracts/customer-account-api.md). Keine Implementierungs-Bodies hier — die gehören in `tasks.md`/Implementierung.

## Voraussetzungen

- Backend-Setup wie in `CLAUDE.md` (venv, `pip install -e ".[dev]"`, `.env`).
- DB: `docker compose up -d db` und `alembic upgrade head` (führt Migration `011_customer_account` aus).
- Server: `uvicorn app.main:app --reload`. Ohne `SENDGRID_API_KEY` werden Verifikations-/Reset-Mails in die Konsole geloggt (`[EMAIL CONSOLE]`) — Links von dort kopieren.
- Frontend: `npm run dev` im `frontend/` (Route-Gruppe `(account)/konto`).

## Automatisierte Tests (Konstitution IX, test-zuerst)

```sh
cd backend
pytest tests/integration/test_customer_account.py -v
pytest tests/unit/test_account_reschedule.py -v
```

Abdeckung der kritischen Pfade:
- Registrierung → Verifikation → Login (US1) inkl. Login-Sperre vor Verifikation.
- Cross-Account: Kunde A erreicht Termin/Profil von B nicht (`404`) — SC-005.
- Atomare Umbuchung mit belegtem Zielslot: `409`, Originaltermin bleibt `confirmed` — SC-003.
- Storno/Umbuchung außerhalb `CANCELLATION_CUTOFF_HOURS`: `410`.
- Löschung: kommende Termine `cancelled`, Kundendaten anonymisiert, Login danach unmöglich — SC-004.
- Keine Enumeration: `register`/`forgot` antworten generisch für existierende und unbekannte Emails.
- Rollentrennung: Kunden-Cookie erreicht keinen Admin-Endpunkt und umgekehrt (FR-016).

## Manuelle End-to-End-Szenarien

### US1 — Konto anlegen, verifizieren, Termine sehen
1. `POST /api/v1/account/register` (Name, Email, Passwort ≥ 10) → `202` generisch.
2. `POST /api/v1/account/login` vor Verifikation → `403 EMAIL_NOT_VERIFIED`.
3. Verifikations-Link aus Konsole/Mail → `POST /account/verify/{token}` → `{ "verified": true }`.
4. `POST /account/login` → `200` + `customer_session`-Cookie.
5. `GET /account/appointments` → `upcoming`/`past`; nur eigene Termine.

### US4 — Gast-Übernahme (nahezu automatisch)
1. Als Gast über den Phase-3-Flow buchen (`POST /api/v1/public/booking/appointments`) mit Email X.
2. Mit Email X registrieren + verifizieren.
3. `GET /account/appointments` zeigt die frühere Gast-Buchung (über `customer_id` bereits verknüpft). Anonymisierte Alttermine erscheinen nicht.

### US2 — Stornieren & Umbuchen
1. Termin in der Zukunft (> 24 h) buchen.
2. `POST /account/appointments/{id}/cancel` → Status `cancelled`, Slot wieder frei (über `GET /public/booking/availability` prüfbar).
3. Neuen Termin buchen, dann `POST /account/appointments/{id}/reschedule` mit freiem Zielslot → neuer Termin bestätigt, alter freigegeben, Bestätigungs-Mail.
4. Negativtest: Zielslot zwischen Anzeige und Bestätigung belegen → `409 BOOKING_CONFLICT`, Originaltermin unverändert.

### US3 — Profil, Export, Löschung
1. `PATCH /account/profile` (Name/Telefon) → aktualisiert.
2. `GET /account/export` → JSON-Download mit Profil + Terminhistorie.
3. `DELETE /account` → `204`; danach `POST /account/login` → `401`; `GET /account/me` → `401`. Kundendaten in DB anonymisiert, kommende Termine `cancelled`.

## OpenAPI-Schema aktualisieren

Nach Backend-Änderungen `backend/openapi.json` neu exportieren (Konstitution VII); Frontend-Typen in `frontend/src/lib/types.ts` daraus ableiten.

## Erfolgskriterien-Zuordnung

| Szenario | Success Criterion |
|---|---|
| US1 Flow in wenigen Minuten | SC-001 |
| Nur eigene Termine sichtbar | SC-002 |
| Umbuchung ohne Slot-Verlust | SC-003 |
| Nach Löschung keine PII | SC-004 |
| Null Cross-Account-Zugriffe | SC-005 |
| Rückgang Telefon-/Admin-Stornos ≥ 30 % in 3 Monaten | SC-006 (Betriebsmessung nach Launch) |
