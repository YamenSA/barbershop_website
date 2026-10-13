"""Unit tests for the W/R classification and conversion (migration 017 logic, B-1)."""
import uuid
from datetime import date, datetime, time, timedelta, timezone

import pytest
import sqlalchemy as sa
from sqlmodel import SQLModel

import app.main  # noqa: F401  (registers every model in SQLModel.metadata)
from app.core import tz_migration as tzm
from app.core.time import combine_local

UTC = timezone.utc
NOW = datetime(2026, 10, 13, 12, 0, tzinfo=UTC)
CREATED = datetime(2026, 9, 1, 10, 0, tzinfo=UTC)


def row(*, origin="online", status="confirmed", starts=None, minutes=30, log=True, modified=False,
        team="T1", customer=None, created=CREATED, updated=None):
    starts = starts or datetime(2026, 10, 20, 9, 0, tzinfo=UTC)
    if updated is None:
        updated = created + timedelta(days=3) if modified else created
    return tzm.ApptRow(
        id=uuid.uuid4(), origin=origin, status=status, starts_at=starts,
        ends_at=starts + timedelta(minutes=minutes), created_at=created, updated_at=updated,
        team_member_id=team, customer_id=customer or uuid.uuid4(), has_confirm_log=log,
    )


# ---- conversion --------------------------------------------------------------------------


def test_wall_to_utc_is_per_date_not_a_fixed_offset():
    assert tzm.wall_to_utc(datetime(2026, 10, 13, 9, 0, tzinfo=UTC)) == datetime(2026, 10, 13, 7, 0, tzinfo=UTC)
    assert tzm.wall_to_utc(datetime(2026, 10, 24, 9, 0, tzinfo=UTC)) == datetime(2026, 10, 24, 7, 0, tzinfo=UTC)  # last CEST day
    assert tzm.wall_to_utc(datetime(2026, 10, 26, 9, 0, tzinfo=UTC)) == datetime(2026, 10, 26, 8, 0, tzinfo=UTC)  # first CET day
    assert tzm.wall_to_utc(datetime(2027, 3, 27, 9, 0, tzinfo=UTC)) == datetime(2027, 3, 27, 8, 0, tzinfo=UTC)
    assert tzm.wall_to_utc(datetime(2027, 3, 29, 9, 0, tzinfo=UTC)) == datetime(2027, 3, 29, 7, 0, tzinfo=UTC)


def test_wall_to_utc_matches_the_runtime_conversion():
    for d in (date(2026, 10, 13), date(2026, 10, 25), date(2026, 10, 27), date(2027, 3, 28), date(2027, 3, 29)):
        for hh, mm in ((9, 0), (13, 45), (17, 30)):
            stored = datetime(d.year, d.month, d.day, hh, mm, tzinfo=UTC)
            assert tzm.wall_to_utc(stored) == combine_local(d, time(hh, mm))


def test_roundtrip_is_lossless_for_every_15_minute_wall_time_in_salon_hours():
    day = date(2026, 10, 1)
    while day <= date(2027, 4, 5):
        for minutes in range(9 * 60, 18 * 60, 15):
            stored = datetime(day.year, day.month, day.day, minutes // 60, minutes % 60, tzinfo=UTC)
            assert tzm.utc_to_wall(tzm.wall_to_utc(stored)) == stored
        day += timedelta(days=1)


def test_dst_edges_are_detected():
    assert tzm.dst_edge(datetime(2026, 10, 25, 2, 30, tzinfo=UTC)) == "ambiguous"
    assert tzm.dst_edge(datetime(2027, 3, 28, 2, 30, tzinfo=UTC)) == "gap"
    assert tzm.dst_edge(datetime(2026, 10, 25, 9, 0, tzinfo=UTC)) is None
    assert tzm.dst_edge(datetime(2026, 10, 13, 9, 0, tzinfo=UTC)) is None


# ---- classification ----------------------------------------------------------------------


@pytest.mark.parametrize(
    "kwargs, klass, rule",
    [
        (dict(origin="walk_in", log=False), "R", "R-A"),
        (dict(origin="online", log=True), "W", "W-B"),
        (dict(origin="online", log=True, modified=True, status="cancelled"), "W", "W-B2"),
        (dict(origin="online", log=True, modified=True, status="completed"), "W", "W-B2"),
        (dict(origin="online", log=True, modified=True, status="confirmed"), "REVIEW", "U-confirmed-modified"),
        (dict(origin="online", log=False), "REVIEW", "X-online-no-log"),
        (dict(origin="walk_in", log=True), "REVIEW", "X-walkin-with-confirmation-log"),
        (dict(origin="import", log=False), "REVIEW", "X-unknown-origin"),
    ],
)
def test_classification_rules(kwargs, klass, rule):
    verdict = tzm.classify(row(**kwargs))
    assert (verdict.klass, verdict.rule) == (klass, rule)


def test_update_within_five_seconds_is_not_a_modification():
    r = row(log=True, updated=CREATED + timedelta(seconds=3))
    assert tzm.classify(r).rule == "W-B"
    r = row(log=True, updated=CREATED + timedelta(seconds=6))
    assert tzm.classify(r).rule == "U-confirmed-modified"


def test_reschedule_successor_is_recognised_as_R_C():
    customer = uuid.uuid4()
    old = row(status="cancelled", customer=customer, log=True, updated=CREATED + timedelta(days=5))
    successor = row(log=False, customer=customer, created=CREATED + timedelta(days=5, seconds=1))
    unrelated = row(log=False, customer=uuid.uuid4(), created=CREATED + timedelta(days=5, seconds=1))
    preds = tzm.cancelled_predecessor_ids([old, successor, unrelated])
    assert preds == {successor.id}
    assert tzm.classify(successor, has_cancelled_predecessor=True).rule == "R-C"
    assert tzm.classify(unrelated).rule == "X-online-no-log"


# ---- plan --------------------------------------------------------------------------------


def test_production_shape_all_22_rows_are_W_and_nothing_needs_a_decision():
    """The production facts (queries a-e): 22 online rows with confirmation log; 13 confirmed
    (11 past, 2 future) unmodified; 9 cancelled (4 past, 5 future) with updated_at moved by the cancellation."""
    rows = []
    for i in range(11):
        rows.append(row(status="confirmed", starts=datetime(2026, 8, 3, 9, 0, tzinfo=UTC) + timedelta(days=i, hours=i % 8)))
    for i in range(2):
        rows.append(row(status="confirmed", starts=datetime(2026, 10, 20, 9, 0, tzinfo=UTC) + timedelta(days=i, hours=i)))
    for i in range(4):
        rows.append(row(status="cancelled", modified=True, starts=datetime(2026, 9, 1, 9, 0, tzinfo=UTC) + timedelta(days=i)))
    for i in range(5):
        rows.append(row(status="cancelled", modified=True, team=f"T{i}", starts=datetime(2026, 10, 27, 9, 0, tzinfo=UTC) + timedelta(days=i)))
    assert len(rows) == 22

    changes, problems = tzm.plan_appointments(rows, tzm.load_decisions(None), NOW)
    assert problems == []
    assert {c.klass for c in changes} == {"W"}
    assert {c.rule for c in changes} == {"W-B", "W-B2"}
    assert all(c.new_starts - c.old_starts in (timedelta(hours=-1), timedelta(hours=-2)) for c in changes)
    # 2026-10-20 (CEST) shifts by -2 h, 2026-10-27 (CET) by -1 h
    by_day = {c.old_starts.date(): c.new_starts - c.old_starts for c in changes}
    assert by_day[date(2026, 10, 20)] == timedelta(hours=-2)
    assert by_day[date(2026, 10, 27)] == timedelta(hours=-1)


def test_R_rows_are_left_alone():
    r = row(origin="walk_in", log=False, starts=datetime(2026, 10, 20, 8, 0, tzinfo=UTC))
    (change,), problems = tzm.plan_appointments([r], tzm.load_decisions(None), NOW)
    assert problems == [] and change.klass == "R"
    assert (change.new_starts, change.new_ends) == (r.starts_at, r.ends_at)


def test_undecided_future_review_row_aborts_but_history_defaults_with_low_confidence():
    future = row(log=False, status="confirmed", starts=datetime(2099, 1, 5, 9, 0, tzinfo=UTC))
    past = row(log=False, status="completed", starts=datetime(2025, 1, 5, 9, 0, tzinfo=UTC))
    changes, problems = tzm.plan_appointments([future, past], tzm.load_decisions(None), NOW)
    assert [p.code for p in problems] == ["REVIEW_UNDECIDED"] and problems[0].row_id == future.id
    (past_change,) = changes
    assert (past_change.klass, past_change.confidence, past_change.rule) == ("W", "niedrig", "default(X-online-no-log)")


def test_decision_resolves_a_review_row_in_either_direction():
    r = row(log=False, status="confirmed", starts=datetime(2099, 1, 5, 9, 0, tzinfo=UTC))
    as_w, p1 = tzm.plan_appointments([r], {"appointments": {str(r.id): "W"}, "working_exceptions": {}, "dst_edge": {}}, NOW)
    as_r, p2 = tzm.plan_appointments([r], {"appointments": {str(r.id): {"klass": "R", "by": "Azzam"}}, "working_exceptions": {}, "dst_edge": {}}, NOW)
    assert p1 == [] and p2 == []
    assert as_w[0].new_starts == datetime(2099, 1, 5, 8, 0, tzinfo=UTC) and as_w[0].rule.startswith("decision(")
    assert as_r[0].new_starts == r.starts_at
    with pytest.raises(ValueError):
        tzm.plan_appointments([r], {"appointments": {str(r.id): "maybe"}, "working_exceptions": {}, "dst_edge": {}}, NOW)


def test_dst_edge_w_row_needs_a_decision():
    r = row(starts=datetime(2027, 3, 28, 2, 30, tzinfo=UTC))
    changes, problems = tzm.plan_appointments([r], tzm.load_decisions(None), NOW)
    assert [p.code for p in problems] == ["DST_EDGE_UNDECIDED"] and changes == []
    changes, problems = tzm.plan_appointments([r], {"appointments": {}, "working_exceptions": {}, "dst_edge": {str(r.id): "W"}}, NOW)
    assert problems == [] and "DST_EDGE:gap" in changes[0].flags


def test_working_exceptions_always_need_a_decision():
    exc = {"id": uuid.uuid4(), "team_member_id": "T1",
           "starts_at": datetime(2026, 10, 20, 12, 0, tzinfo=UTC), "ends_at": datetime(2026, 10, 20, 13, 0, tzinfo=UTC)}
    changes, problems = tzm.plan_working_exceptions([exc], tzm.load_decisions(None))
    assert changes == [] and problems[0].code == "WORKING_EXCEPTION_UNDECIDED"
    changes, problems = tzm.plan_working_exceptions([exc], {"appointments": {}, "working_exceptions": {str(exc["id"]): "W"}, "dst_edge": {}})
    assert problems == [] and changes[0].new_starts == datetime(2026, 10, 20, 10, 0, tzinfo=UTC)


def test_overlap_in_the_final_state_is_reported_but_a_transient_one_is_not():
    # A 09:00-11:00 followed by B 11:00-11:30, both W: shifting B alone onto A's old slot is only a
    # TRANSIENT overlap; the final state (07:00-09:00, 09:00-09:30) is clean.
    a = row(starts=datetime(2026, 10, 20, 9, 0, tzinfo=UTC), minutes=120)
    b = row(starts=datetime(2026, 10, 20, 11, 0, tzinfo=UTC), minutes=30)
    _, problems = tzm.plan_appointments([a, b], tzm.load_decisions(None), NOW)
    assert problems == []
    # A real one: W row lands on top of an R row of the same stylist.
    w = row(starts=datetime(2026, 10, 20, 10, 0, tzinfo=UTC))                                  # -> 08:00-08:30Z
    r = row(origin="walk_in", log=False, starts=datetime(2026, 10, 20, 8, 15, tzinfo=UTC))    # 08:15-08:45Z
    _, problems = tzm.plan_appointments([w, r], tzm.load_decisions(None), NOW)
    assert [p.code for p in problems] == ["OVERLAP_AFTER"]
    # Cancelled rows never count as overlaps.
    c = row(status="cancelled", modified=True, starts=datetime(2026, 10, 20, 10, 0, tzinfo=UTC))
    _, problems = tzm.plan_appointments([c, r], tzm.load_decisions(None), NOW)
    assert problems == []


def test_downgrade_only_shifts_rows_the_old_code_wrote_as_W():
    real_start = datetime(2026, 10, 20, 7, 0, tzinfo=UTC)  # 09:00 CEST written by the NEW code
    w_row = row(log=True, starts=real_start)
    assert tzm.downgrade_new_value(w_row, False, w_row.starts_at, w_row.ends_at) == (
        datetime(2026, 10, 20, 9, 0, tzinfo=UTC), datetime(2026, 10, 20, 9, 30, tzinfo=UTC))
    r_row = row(origin="walk_in", log=False, starts=real_start)
    assert tzm.downgrade_new_value(r_row, False, r_row.starts_at, r_row.ends_at) is None
    assert tzm.downgrade_new_value(row(log=False, starts=real_start), False, real_start, real_start) is None  # ambiguous: untouched


# ---- nothing forgotten -----------------------------------------------------------------


def test_every_timestamptz_column_is_classified_as_converted_or_real_utc():
    """A new timestamptz column must be consciously assigned — otherwise it could silently keep
    the wall-clock-as-UTC convention."""
    actual = {
        (table.name, col.name)
        for table in SQLModel.metadata.tables.values()
        for col in table.columns
        if isinstance(col.type, sa.DateTime)
    }
    declared = {(t, c) for t, cols in tzm.CONVERTED_COLUMNS.items() for c in cols}
    declared |= {(t, c) for t, cols in tzm.REAL_UTC_COLUMNS.items() for c in cols}
    assert actual - declared == set(), f"unclassified timestamp columns: {sorted(actual - declared)}"
    assert declared - actual == set(), f"stale entries in tz_migration column maps: {sorted(declared - actual)}"
