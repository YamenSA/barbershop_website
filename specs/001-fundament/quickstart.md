# Quickstart & Validation Guide: Fundament & Domänen-Modell

**Branch**: `001-fundament-domain` | **Date**: 2026-06-08

Dieser Leitfaden beschreibt, wie Phase 0 nach der Implementierung validiert wird. Er enthält keine Implementierungsdetails — die gehören in `tasks.md` und die Implementierungsphase.

---

## Voraussetzungen

- Docker + Docker Compose installiert
- Python 3.11 und `pyproject.toml`-Abhängigkeiten installiert (`pip install -e ".[dev]"`)
- PostgreSQL 15+ laufend (lokal oder via Docker) mit `btree_gist`-Extension aktiviert
- `.env`-Datei mit `DATABASE_URL`, `RETENTION_GUEST_MONTHS=12`, `RETENTION_CUSTOMER_MONTHS=24`

**Datenbank starten**:
```bash
docker compose up -d db
```

**Migrationen ausführen**:
```bash
alembic upgrade head
```

---

## Validierungsszenarien

### S1 — Datenbank-Schema und Extension prüfen

**Ziel**: Bestätigen, dass alle Tabellen und der GiST-Constraint korrekt angelegt sind.

```bash
# Prüfe btree_gist Extension
psql $DATABASE_URL -c "SELECT extname FROM pg_extension WHERE extname = 'btree_gist';"
# Erwartet: 1 Zeile mit "btree_gist"

# Prüfe EXCLUDE-Constraint
psql $DATABASE_URL -c "\d appointments"
# Erwartet: Constraint "no_overlapping_confirmed_appointments" im Output
```

**Erwartetes Ergebnis**: Extension vorhanden, Constraint sichtbar.

---

### S2 — Kritischer Pfad: Doppelbuchungsschutz

**Ziel**: Bestätigen, dass zwei überlappende bestätigte Termine für dasselbe Teammitglied strukturell verhindert werden.

```bash
cd backend && pytest tests/integration/test_booking_integrity.py -v
```

**Erwartetes Ergebnis**:
- `test_no_overlap_same_member` → PASSED (zweiter Insert wirft IntegrityError)
- `test_adjacent_slots_allowed` → PASSED (10:00–10:45 und 10:45–11:30 können beide `confirmed` sein)
- `test_cancelled_doesnt_block` → PASSED (stornierter Termin blockiert Slot nicht)

---

### S3 — Kritischer Pfad: Verfügbarkeitsberechnung

**Ziel**: Bestätigen, dass die Berechnung alle Einschränkungen korrekt berücksichtigt.

```bash
cd backend && pytest tests/unit/test_availability.py -v
```

**Erwartetes Ergebnis**:
- `test_basic_slot_generation` → PASSED
- `test_salon_closed_day` → PASSED (kein Slot an Schließungstagen)
- `test_exception_blocks_slots` → PASSED (Urlaub entfernt Slots)
- `test_existing_appointment_blocks` → PASSED (bestätigte Termine blockieren)
- `test_performance_under_200ms` → PASSED (Berechnung < 200ms, weit unter SC-002-Limit)

---

### S4 — Kritischer Pfad: DSGVO-Anonymisierung

**Ziel**: Bestätigen, dass Anonymisierungsfristen korrekt greifen.

```bash
cd backend && pytest tests/unit/test_retention.py -v
```

**Erwartetes Ergebnis**:
- `test_guest_anonymization_after_12_months` → PASSED
- `test_customer_anonymization_after_24_months_inactivity` → PASSED
- `test_configurable_retention_period` → PASSED (6-Monats-Config in Testenv greift)
- `test_immediate_anonymization_on_deletion` → PASSED

---

### S5 — Entitäten-CRUD via API

**Ziel**: Bestätigen, dass alle CRUD-Endpunkte korrekt arbeiten.

**Vorbedingung**: Backend-Server lokal starten:
```bash
uvicorn app.main:app --reload
```

**Validation via pytest**:
```bash
cd backend && pytest tests/integration/test_entities.py -v
```

**Oder manuell via curl**:

Service anlegen:
```bash
curl -X POST http://localhost:8000/api/v1/services \
  -H "Content-Type: application/json" \
  -d '{"name": "Herrenschnitt", "duration_minutes": 45, "price_cents": 2500}'
# Erwartet: 201 mit id, name, duration_minutes, price_cents, is_active=true
```

Verfügbarkeit abfragen (nach Anlage von Teammitglied + Öffnungszeiten + Arbeitszeiten):
```bash
curl "http://localhost:8000/api/v1/availability?service_id=UUID&date=2026-07-15"
# Erwartet: 200 mit slots-Array; mindestens ein Slot wenn Teammitglied verfügbar
```

Doppelbuchungs-Test:
```bash
# Erster Termin — sollte 201 liefern
curl -X POST http://localhost:8000/api/v1/appointments \
  -H "Content-Type: application/json" \
  -d '{"team_member_id": "UUID", "service_id": "UUID", "guest_name": "Hans", "guest_phone": "+49170", "starts_at": "2026-07-15T10:00:00Z"}'

# Zweiter Termin, überlappend — sollte 409 liefern
curl -X POST http://localhost:8000/api/v1/appointments \
  -H "Content-Type: application/json" \
  -d '{"team_member_id": "UUID", "service_id": "UUID", "guest_name": "Klaus", "guest_phone": "+49171", "starts_at": "2026-07-15T10:30:00Z"}'
# Erwartet: 409 mit code "BOOKING_CONFLICT"
```

---

### S6 — Anonymisierungslauf manuell auslösen

Der Lauf erfolgt als CLI-Befehl (kein HTTP-Endpunkt in Phase 0):

```bash
cd backend && python scripts/run_retention.py
# Erwartet: JSON mit anonymized_guest_appointments, anonymized_customers, duration_seconds
# Beispiel: {"anonymized_guest_appointments": 0, "anonymized_customers": 0, "duration_seconds": 0.05}
```

**Sofortiger Anonymisierungs-Test** (via API):

```bash
# Kunden anlegen
curl -X POST http://localhost:8000/api/v1/customers \
  -H "Content-Type: application/json" \
  -d '{"name": "Test User", "email": "test@example.com", "phone": "+49170"}'
# Erwartet: 201

# Kunden-Löschung → sofortige Anonymisierung
curl -X DELETE http://localhost:8000/api/v1/customers/{id}
# Erwartet: 204; Kundendaten in DB jetzt anonymisiert (unwiderruflich)
```

---

## Vollständige Testsuite

```bash
cd backend && pytest --tb=short -q
```

**Erwartetes Ergebnis**: Alle Tests grün. Besonders kritisch:
- `test_booking_integrity.py` — Doppelbuchungsschutz
- `test_availability.py` — Verfügbarkeitsberechnung
- `test_retention.py` — DSGVO-Anonymisierung

---

## Referenzen

- Entitäten-Details: [data-model.md](data-model.md)
- API-Endpunkte Stammdaten: [contracts/stammdaten.md](contracts/stammdaten.md)
- API-Endpunkte Booking: [contracts/booking.md](contracts/booking.md)
- Research-Entscheidungen: [research.md](research.md)
