# Research: Fundament & Domänen-Modell

**Branch**: `001-fundament-domain` | **Date**: 2026-06-08

---

## Forschungsfrage 1: Doppelbuchungsschutz auf Datenbankebene

**Entscheidung**: PostgreSQL EXCLUDE USING GIST mit `btree_gist`-Extension und `tstzrange`-Typ.

**Rationale**: Ein reiner Anwendungsschicht-Check (SELECT → INSERT) ist unter Last race-condition-anfällig. PostgreSQL's EXCLUDE-Constraint prüft bei jeder INSERT/UPDATE-Transaktion atomar ob ein überlappender bestätigter Termin für dasselbe Teammitglied existiert. `btree_gist` ermöglicht die Kombination von UUID-Gleichheit (team_member_id) und Bereichsüberlappung (&&) in einem einzigen GiST-Index.

**Konkrete Migration**:
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE appointments
ADD CONSTRAINT no_overlapping_confirmed_appointments
EXCLUDE USING GIST (
    team_member_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (status = 'confirmed');
```

**Halboffenes Intervall `[)`**: Zwei aufeinanderfolgende Termine (10:00–10:45 und 10:45–11:30) dürfen sich nicht gegenseitig blockieren. `[)` bedeutet: Startzeit inklusive, Endzeit exklusive — korrekt für Buchungen.

**Alternativen geprüft**:
- Trigger-basierter Check: fehleranfällig, schlechte Performance unter Last, wartungsintensiv. Abgelehnt.
- Optimistisches Locking (Version-Spalte): verhindert lost updates, nicht Überlappungen. Abgelehnt als alleinige Maßnahme.
- Slot-Tabelle mit Locks: widerspricht FR-006 (keine gespeicherte Slot-Tabelle). Abgelehnt.

---

## Forschungsfrage 2: Verfügbarkeitsberechnung ohne Slot-Tabelle

**Entscheidung**: Pure Python-Berechnung in `availability.py` als Set-Algebra über Zeitintervalle.

**Algorithmus** (ohne DB-Implementierungsdetails):

```
get_available_slots(team_member_id, service_id, date):
  1. Lade service.duration_minutes
  2. Lade salon_hours für weekday(date) → gibt open_time/close_time oder "geschlossen"
  3. Prüfe salon_closures für date → falls vorhanden: return []
  4. Lade working_hours des Teammitglieds für weekday(date)
  5. Falls keine Arbeitszeiten: return []
  6. Berechne verfügbares Fenster = Schnittmenge(salon_hours, working_hours)
  7. Lade working_exceptions des Mitglieds, die date überlappen
  8. Ziehe Ausnahmen vom verfügbaren Fenster ab
  9. Lade bestätigte Appointments des Mitglieds an diesem Tag
  10. Ziehe belegte Intervalle ab
  11. Slice restliche Fenster in service.duration_minutes-Slots
  12. return slots
```

**Zeitkomplexität**: O(n) mit n = Anzahl der Termine an diesem Tag (typisch < 20). Weit unter dem 500-ms-Ziel (SC-002).

**Bibliothek**: `portion` (Python interval arithmetic) oder manuelle Implementierung mit `datetime` — letzteres bevorzugt (keine externe Abhängigkeit für einfache Interval-Subtraktion).

**Alternativen geprüft**:
- Materialisierte Slot-Tabelle: würde FR-006 verletzen. Abgelehnt.
- PostgreSQL-seitige Berechnung (PL/pgSQL): schwerer testbar, schlechtere Lesbarkeit. Abgelehnt.

---

## Forschungsfrage 3: DSGVO-Anonymisierungsjob

**Entscheidung**: Separater Hintergrundjob (`retention.py`) mit konfigurierbaren Fristen aus `config.py`. Ausführung via Cron (konkrete Scheduling-Lösung kommt in Phase 1).

**Anonymisierungsstrategie**:
- Gast-Termine (kein customer_id): nach `RETENTION_GUEST_MONTHS` (Standard: 12) wird `guest_name` → `"[anonymisiert]"` und `guest_phone` → `"[anonymisiert]"` gesetzt. Der Termin selbst (Datum, Service, Teammitglied) bleibt für statistische Zwecke erhalten (Datenminimierung, Art. 5 DSGVO).
- Kunden-Accounts: nach `RETENTION_CUSTOMER_MONTHS` Inaktivität (Standard: 24) werden `name`, `email`, `phone` anonymisiert; `last_active_at` und `anonymized_at` bleiben.
- Bei Konto-Löschung: sofortige Anonymisierung aller verknüpften Daten.

**Konfiguration** (in `config.py` / `.env`):
```
RETENTION_GUEST_MONTHS=12
RETENTION_CUSTOMER_MONTHS=24
```

**Alternativen geprüft**:
- Physisches Löschen statt Anonymisierung: verliert statistische Auswertbarkeit (Termine/Tag); Anonymisierung nach Art. 4 Nr. 1 DSGVO ist datenschutzkonform. Beides möglich — Anonymisierung gewählt.
- Kaskadierendes DELETE: löscht zu viel (Terminhistorie für Planung verloren). Abgelehnt.

---

## Forschungsfrage 4: Preise als Integer vs. Decimal

**Entscheidung**: Preise als `INTEGER` (Cent-Beträge), nicht als `DECIMAL`/`FLOAT`.

**Rationale**: Floating-Point-Arithmetik erzeugt Rundungsfehler bei Geldbeträgen. `DECIMAL(10,2)` wäre korrekt, aber komplexer im ORM. Da die Plattform keine Zahlungsabwicklung hat (MVP), genügt Integer-Cent-Speicherung. Anzeige (z.B. 2500 → "25,00 €") ist Präsentationsschicht-Aufgabe.

---

## Offene Punkte (kein Blocker für Phase 1)

- Rechtliche Abnahme der Aufbewahrungsfristen (12/24 Monate) durch Datenschutzbeauftragten/IHK steht aus — Fristen sind konfigurierbar, daher kein Code-Blocker.
- Cron-Mechanismus für Anonymisierungsjob wird in Phase 1 (Admin-Backend) festgelegt.
