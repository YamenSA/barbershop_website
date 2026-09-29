"""Classification + conversion logic for the timezone data migration (B-1).

Used by alembic migration 017, scripts/tz_dry_run.py and scripts/tz_sweep.py —
ONE implementation, so the dry-run prints exactly what the migration will do.

Deliberately stdlib-only (no imports from ``app``): the dry-run script must be
runnable inside the production container *before* this release is deployed, by
copying just this file and the script (``docker cp``).

Background: until this hotfix the booking engine produced slot times as
"wall-clock as UTC" (**W**: Berlin clock reading stored as if it were UTC),
while every admin write path stored real UTC (**R**). Target state: every
timestamptz column holds real UTC. W rows are converted per row with
zoneinfo (summer −2 h, winter −1 h); R rows are left alone.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable, Optional
from zoneinfo import ZoneInfo

UTC = timezone.utc
BERLIN = ZoneInfo("Europe/Berlin")

# An UPDATE within this many seconds of creation is not a later modification.
UNMODIFIED_SECONDS = 5

# Columns whose VALUE is converted (per row, by class).
CONVERTED_COLUMNS: dict[str, tuple[str, ...]] = {
    "appointments": ("starts_at", "ends_at"),
    "working_exceptions": ("starts_at", "ends_at"),
}

# Every other timestamptz column is real UTC by construction (datetime.now(UTC)) and
# must NOT be converted. A schema test fails if a timestamptz column is in neither map.
REAL_UTC_COLUMNS: dict[str, tuple[str, ...]] = {
    "admin_accounts": ("created_at", "updated_at"),
    "appointments": ("created_at", "updated_at"),
    "customers": ("created_at", "updated_at", "last_active_at", "anonymized_at", "email_verified_at"),
    "day_overrides": ("created_at",),
    "salon_closures": ("created_at", "updated_at"),
    "salon_profile": ("created_at", "updated_at"),
    "services": ("created_at", "updated_at"),
    "team_members": ("created_at", "updated_at"),
    "working_exceptions": ("created_at", "updated_at"),
    "notification_logs": ("created_at",),
    "customer_tokens": ("expires_at", "used_at", "created_at"),
    "promotions": ("created_at", "updated_at"),
}

SELECT_APPOINTMENTS_SQL = """
SELECT a.id, a.origin::text AS origin, a.status::text AS status,
       a.starts_at, a.ends_at, a.created_at, a.updated_at,
       a.team_member_id, a.customer_id,
       EXISTS (SELECT 1 FROM notification_logs n
                WHERE n.appointment_id = a.id AND n.kind::text = 'confirmation') AS has_confirm_log
  FROM appointments a
 ORDER BY a.team_member_id, a.starts_at, a.id
"""

SELECT_WORKING_EXCEPTIONS_SQL = """
SELECT id, team_member_id, starts_at, ends_at, created_at, updated_at
  FROM working_exceptions ORDER BY team_member_id, starts_at, id
"""

# Same instant-of-truth wording everywhere: the mail time of a W row is its stored UTC clock.
CONFIDENCE_HIGH = "hoch"
CONFIDENCE_OPERATOR = "hoch (Betreiber: keine Admin-Verschiebung von Online-Terminen)"

# Constraint DDL identical to migration 007 (tstzrange, confirmed only).
EXCLUDE_CONSTRAINT_NAME = "no_overlapping_confirmed_appointments"
ADD_EXCLUDE_CONSTRAINT_SQL = f"""
ALTER TABLE appointments
ADD CONSTRAINT {EXCLUDE_CONSTRAINT_NAME}
EXCLUDE USING GIST (
    team_member_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (status = 'confirmed')
"""
DROP_EXCLUDE_CONSTRAINT_SQL = f"ALTER TABLE appointments DROP CONSTRAINT IF EXISTS {EXCLUDE_CONSTRAINT_NAME}"


# ---------------------------------------------------------------------------
# Time conversion (per row, per date — never a fixed offset)
# ---------------------------------------------------------------------------


def wall_to_utc(stored: datetime) -> datetime:
    """W → R. ``stored`` holds a Berlin clock reading labelled UTC; return the real instant."""
    wall = stored.astimezone(UTC).replace(tzinfo=None)
    return wall.replace(tzinfo=BERLIN).astimezone(UTC)


def utc_to_wall(real: datetime) -> datetime:
    """R → W (downgrade): the Berlin clock reading of ``real``, labelled UTC."""
    return real.astimezone(BERLIN).replace(tzinfo=UTC)


def dst_edge(stored: datetime) -> Optional[str]:
    """'ambiguous' (clock reading occurs twice), 'gap' (does not exist) or None."""
    wall = stored.astimezone(UTC).replace(tzinfo=None)
    first = wall.replace(tzinfo=BERLIN, fold=0)
    second = wall.replace(tzinfo=BERLIN, fold=1)
    if first.utcoffset() != second.utcoffset():
        # fold=0 carries the offset in force BEFORE the transition, fold=1 the one AFTER it.
        # Clocks going back (25 Oct): before(+02:00) > after(+01:00) -> the reading occurs twice.
        # Clocks going forward (28 Mar): before(+01:00) < after(+02:00) -> the reading never occurs.
        return "ambiguous" if first.utcoffset() > second.utcoffset() else "gap"
    return None


# ---------------------------------------------------------------------------
# Rows, verdicts, plan
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class ApptRow:
    id: object
    origin: str
    status: str
    starts_at: datetime
    ends_at: datetime
    created_at: datetime
    updated_at: datetime
    team_member_id: object
    customer_id: object
    has_confirm_log: bool


@dataclass(frozen=True)
class Verdict:
    klass: str  # 'W' | 'R' | 'REVIEW'
    rule: str
    confidence: str


@dataclass
class Change:
    table: str
    row_id: object
    klass: str  # 'W' | 'R' (+ '-decision' / '?' suffixes for decided/low-confidence rows)
    rule: str
    confidence: str
    old_starts: datetime
    old_ends: datetime
    new_starts: datetime
    new_ends: datetime
    status: str = ""
    team_member_id: object = None
    flags: list = field(default_factory=list)


@dataclass
class Problem:
    row_id: object
    code: str
    message: str


def cancelled_predecessor_ids(rows: Iterable[ApptRow]) -> set:
    """Rows that are the successor of a customer-side reschedule (rule R-C).

    reschedule_appointment() cancels the old row and creates the new one in ONE
    transaction: cancelled predecessor of the same customer whose ``updated_at``
    is within seconds of the successor's ``created_at``.
    """
    rows = list(rows)
    cancelled_by_customer: dict = {}
    for r in rows:
        if r.status == "cancelled" and r.customer_id is not None:
            cancelled_by_customer.setdefault(r.customer_id, []).append(r)
    result = set()
    for r in rows:
        for old in cancelled_by_customer.get(r.customer_id, []) if r.customer_id is not None else []:
            if old.id != r.id and abs((old.updated_at - r.created_at).total_seconds()) <= UNMODIFIED_SECONDS:
                result.add(r.id)
                break
    return result


def classify(row: ApptRow, *, has_cancelled_predecessor: bool = False) -> Verdict:
    """Deterministic W/R classification from the three creation paths in the code.

    (A) admin create_appointment  → origin 'walk_in', no confirmation log      → R
    (B) public booking            → origin 'online', confirmation log written  → W
    (C) account reschedule        → origin copied, NO confirmation log, cancelled
                                    predecessor created in the same transaction → R
    Only patch_appointment changes a time afterwards (writes R). Anything that does
    not fit one of these patterns is REVIEW — never guessed.
    """
    modified_later = (row.updated_at - row.created_at).total_seconds() > UNMODIFIED_SECONDS
    if row.origin == "walk_in":
        if row.has_confirm_log:
            return Verdict("REVIEW", "X-walkin-with-confirmation-log", "-")
        return Verdict("R", "R-A", CONFIDENCE_HIGH)
    if row.origin == "online":
        if row.has_confirm_log:
            if not modified_later:
                return Verdict("W", "W-B", CONFIDENCE_HIGH)
            if row.status != "confirmed":
                # updated_at moved because the status changed (customer/admin cancellation,
                # completed, no_show). Operator confirmed: online appointments were never
                # moved in the admin, so the time is untouched → still W.
                return Verdict("W", "W-B2", CONFIDENCE_OPERATOR)
            return Verdict("REVIEW", "U-confirmed-modified", "-")
        if has_cancelled_predecessor:
            return Verdict("R", "R-C", CONFIDENCE_HIGH)
        return Verdict("REVIEW", "X-online-no-log", "-")
    return Verdict("REVIEW", "X-unknown-origin", "-")


# ---------------------------------------------------------------------------
# Decisions file (only for rows the rules cannot classify)
# ---------------------------------------------------------------------------


def load_decisions(path: Path | str | None) -> dict:
    empty = {"appointments": {}, "working_exceptions": {}, "dst_edge": {}}
    if path is None or not Path(path).exists():
        return empty
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    for key in empty:
        data.setdefault(key, {})
    return data


def _decision_klass(decisions: dict, section: str, row_id) -> Optional[str]:
    entry = decisions.get(section, {}).get(str(row_id))
    if entry is None:
        return None
    klass = entry["klass"] if isinstance(entry, dict) else entry
    if klass not in ("W", "R"):
        raise ValueError(f"decision for {row_id} must be 'W' or 'R', got {klass!r}")
    return klass


def _convert(klass: str, stored: datetime) -> datetime:
    return wall_to_utc(stored) if klass == "W" else stored


def plan_appointments(rows: Iterable[ApptRow], decisions: dict, now: datetime) -> tuple[list[Change], list[Problem]]:
    rows = list(rows)
    predecessors = cancelled_predecessor_ids(rows)
    changes: list[Change] = []
    problems: list[Problem] = []
    for r in rows:
        verdict = classify(r, has_cancelled_predecessor=r.id in predecessors)
        klass, rule, conf = verdict.klass, verdict.rule, verdict.confidence
        if klass == "REVIEW":
            decided = _decision_klass(decisions, "appointments", r.id)
            future_confirmed = r.status == "confirmed" and r.starts_at >= now
            if decided is not None:
                klass, rule, conf = decided, f"decision({rule})", "Entscheidung"
            elif future_confirmed:
                problems.append(Problem(r.id, "REVIEW_UNDECIDED", f"{rule}: zukünftiger bestätigter Termin ohne Entscheidung"))
                continue
            else:
                # History only, no operational effect: default W (status-only changes are the most common
                # reason), recorded with low confidence and revertible per row from the log.
                klass, rule, conf = "W", f"default({rule})", "niedrig"
        flags: list = []
        edge = dst_edge(r.starts_at) if klass == "W" else None
        if edge:
            flags.append(f"DST_EDGE:{edge}")
            if _decision_klass(decisions, "dst_edge", r.id) is None:
                problems.append(Problem(r.id, "DST_EDGE_UNDECIDED", f"Wandzeit {edge} an einer Umstellung — Entscheidung nötig"))
                continue
        new_s, new_e = _convert(klass, r.starts_at), _convert(klass, r.ends_at)
        changes.append(
            Change("appointments", r.id, klass, rule, conf, r.starts_at, r.ends_at, new_s, new_e,
                   status=r.status, team_member_id=r.team_member_id, flags=flags)
        )
    problems.extend(find_overlaps(changes))
    return changes, problems


def plan_working_exceptions(rows: Iterable[dict], decisions: dict) -> tuple[list[Change], list[Problem]]:
    changes: list[Change] = []
    problems: list[Problem] = []
    for r in rows:
        klass = _decision_klass(decisions, "working_exceptions", r["id"])
        if klass is None:
            problems.append(Problem(r["id"], "WORKING_EXCEPTION_UNDECIDED",
                                    "working_exceptions hat keinen Erzeugungsweg im UI — Entscheidung nötig"))
            continue
        changes.append(
            Change("working_exceptions", r["id"], klass, "decision", "Entscheidung",
                   r["starts_at"], r["ends_at"], _convert(klass, r["starts_at"]), _convert(klass, r["ends_at"]),
                   team_member_id=r["team_member_id"])
        )
    return changes, problems


def find_overlaps(changes: Iterable[Change]) -> list[Problem]:
    """Overlapping CONFIRMED appointments per team member in the planned final state."""
    per_member: dict = {}
    for c in changes:
        if c.table == "appointments" and c.status == "confirmed":
            per_member.setdefault(c.team_member_id, []).append(c)
    problems: list[Problem] = []
    for member_rows in per_member.values():
        member_rows.sort(key=lambda c: (c.new_starts, c.new_ends))
        latest_end = None
        latest = None
        for c in member_rows:
            if latest_end is not None and c.new_starts < latest_end:
                problems.append(Problem(c.row_id, "OVERLAP_AFTER", f"überlappt nach Umrechnung mit {latest.row_id}"))
            if latest_end is None or c.new_ends > latest_end:
                latest_end, latest = c.new_ends, c
    return problems


def downgrade_new_value(row: ApptRow, has_cancelled_predecessor: bool, real_starts: datetime, real_ends: datetime):
    """Rows created AFTER the upgrade (not in the log) hold real UTC. Return the (starts, ends)
    the OLD code expects, or None to leave the row untouched.

    Only rows the old code would have written as W (public booking path: W-B / W-B2) go back to
    wall-clock-as-UTC; everything else was R in the old world and stays.
    """
    verdict = classify(row, has_cancelled_predecessor=has_cancelled_predecessor)
    if verdict.klass == "W":
        return utc_to_wall(real_starts), utc_to_wall(real_ends)
    return None
