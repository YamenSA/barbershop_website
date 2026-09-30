"""Migration 017 (wall-clock-as-UTC -> real UTC) against a REAL PostgreSQL (timezone hotfix, B-1).

Runs only in PG mode: `bash scripts/run_pg_tests.sh` (throwaway container, seed/test data only).
The tests drive Alembic themselves: they downgrade to 016, seed rows, run 017 and inspect the
result, and always restore the database to `head` afterwards.

These are plain (sync) tests on purpose: Alembic's async env.py needs to own the event loop.
"""
import asyncio
import json
import os
import subprocess
import sys
import uuid
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

pytestmark = pytest.mark.postgres

BACKEND = Path(__file__).resolve().parents[2]
DECISIONS_FILE = BACKEND / "alembic" / "tz_decisions.json"
URL = os.environ.get("TEST_DATABASE_URL", "")
UTC = timezone.utc
CREATED = datetime(2026, 9, 1, 10, 0, tzinfo=UTC)


def utc(y, m, d, hh, mm=0):
    return datetime(y, m, d, hh, mm, tzinfo=UTC)


# ---------------------------------------------------------------------------------------------
# plumbing
# ---------------------------------------------------------------------------------------------


def _cfg() -> Config:
    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    return cfg


def sql(statement: str, params: dict | None = None, *, fetch: bool = False):
    async def _run():
        engine = create_async_engine(URL, poolclass=NullPool)
        try:
            async with engine.begin() as conn:
                result = await conn.execute(text(statement), params or {})
                return [dict(r) for r in result.mappings().all()] if fetch else None
        finally:
            await engine.dispose()

    return asyncio.run(_run())


def _truncate():
    tables = sql(
        "SELECT quote_ident(tablename) AS t FROM pg_tables WHERE schemaname='public' AND tablename <> 'alembic_version'",
        fetch=True,
    )
    if tables:
        sql("TRUNCATE " + ", ".join(t["t"] for t in tables) + " RESTART IDENTITY CASCADE")


@pytest.fixture
def db016():
    """Database at revision 016 with empty tables; restored to head afterwards."""
    cfg = _cfg()
    command.downgrade(cfg, "016")
    _truncate()
    yield cfg
    try:
        _truncate()
        command.upgrade(cfg, "head")
    finally:
        _truncate()


@contextmanager
def decisions(content: dict):
    original = DECISIONS_FILE.read_text(encoding="utf-8")
    DECISIONS_FILE.write_text(json.dumps(content), encoding="utf-8")
    try:
        yield
    finally:
        DECISIONS_FILE.write_text(original, encoding="utf-8")


def new_id() -> str:
    return str(uuid.uuid4())


def seed_base() -> dict:
    ids = dict(team1=new_id(), team2=new_id(), service=new_id(), customer=new_id())
    sql(
        "INSERT INTO team_members (created_at, updated_at, id, name, is_active) VALUES (:c,:c,:t1,'A',true),(:c,:c,:t2,'B',true)",
        dict(c=CREATED, t1=ids["team1"], t2=ids["team2"]),
    )
    sql(
        "INSERT INTO services (created_at, updated_at, id, name, duration_minutes, price_cents, price_is_from, is_active, target_group, service_kind) "
        "VALUES (:c,:c,:s,'Svc',30,1000,false,true,CAST('HERREN' AS targetgroup),CAST('SCHNITT' AS servicekind))",
        dict(c=CREATED, s=ids["service"]),
    )
    sql(
        "INSERT INTO customers (created_at, updated_at, id, name, email, last_active_at) VALUES (:c,:c,:id,'K','k@example.com',:c)",
        dict(c=CREATED, id=ids["customer"]),
    )
    return ids


def add_appt(base: dict, *, starts, minutes=30, origin="online", status="confirmed", log=True, modified=False,
             team="team1", created=CREATED, updated=None) -> str:
    appt_id = new_id()
    updated = updated or (created + timedelta(days=3) if modified else created)
    online = origin == "online"
    sql(
        "INSERT INTO appointments (created_at, updated_at, id, team_member_id, service_id, customer_id, guest_name, guest_phone,"
        " starts_at, ends_at, status, origin, cancellation_token) VALUES (:c,:u,:id,:t,:s,:cust,:gn,:gp,:st,:en,"
        " CAST(:status AS appointmentstatus), CAST(:origin AS appointmentorigin), :tok)",
        dict(c=created, u=updated, id=appt_id, t=base[team], s=base["service"],
             cust=base["customer"] if online else None, gn=None if online else "Gast", gp=None if online else "0",
             st=starts, en=starts + timedelta(minutes=minutes), status=status, origin=origin,
             tok=new_id() if online else None),
    )
    if log:
        sql(
            "INSERT INTO notification_logs (id, appointment_id, kind, channel, status, created_at) VALUES "
            "(:id,:a,CAST('confirmation' AS notificationkind),CAST('email' AS notificationchannel),CAST('sent' AS notificationstatus),:c)",
            dict(id=new_id(), a=appt_id, c=created),
        )
    return appt_id


def snapshot():
    return [
        (r["id"], r["starts_at"], r["ends_at"], r["updated_at"], r["status"])
        for r in sql("SELECT id::text AS id, starts_at, ends_at, updated_at, status::text AS status FROM appointments ORDER BY id", fetch=True)
    ]


def times(appt_id):
    row = sql("SELECT starts_at, ends_at FROM appointments WHERE id = :id", dict(id=appt_id), fetch=True)[0]
    return row["starts_at"], row["ends_at"]


def version():
    return sql("SELECT version_num FROM alembic_version", fetch=True)[0]["version_num"]


def has_constraint():
    return sql("SELECT count(*) AS n FROM pg_constraint WHERE conname='no_overlapping_confirmed_appointments'", fetch=True)[0]["n"] == 1


def has_log_table():
    return sql("SELECT to_regclass('public.tz_migration_log') IS NOT NULL AS x", fetch=True)[0]["x"]


def seed_mixed(base):
    """One row per case the production data contains, across the DST switch."""
    rows = {
        "w_summer": add_appt(base, starts=utc(2026, 10, 13, 9)),                                 # -> 07:00Z
        "w_winter": add_appt(base, starts=utc(2026, 10, 27, 9)),                                 # -> 08:00Z
        "w_sat_before_switch": add_appt(base, starts=utc(2026, 10, 24, 17, 30)),                 # -> 15:30Z
        "w_mon_after_switch": add_appt(base, starts=utc(2026, 10, 26, 17, 30)),                  # -> 16:30Z
        "w_cancelled": add_appt(base, starts=utc(2026, 10, 14, 10), status="cancelled", modified=True),  # -> 08:00Z
        "r_admin": add_appt(base, origin="walk_in", log=False, starts=utc(2026, 10, 13, 8), team="team2"),  # unchanged
    }
    return rows


EXPECTED_NEW = {
    "w_summer": (utc(2026, 10, 13, 7), utc(2026, 10, 13, 7, 30)),
    "w_winter": (utc(2026, 10, 27, 8), utc(2026, 10, 27, 8, 30)),
    "w_sat_before_switch": (utc(2026, 10, 24, 15, 30), utc(2026, 10, 24, 16)),
    "w_mon_after_switch": (utc(2026, 10, 26, 16, 30), utc(2026, 10, 26, 17)),
    "w_cancelled": (utc(2026, 10, 14, 8), utc(2026, 10, 14, 8, 30)),
    "r_admin": (utc(2026, 10, 13, 8), utc(2026, 10, 13, 8, 30)),
}


# ---------------------------------------------------------------------------------------------
# upgrade
# ---------------------------------------------------------------------------------------------


def test_upgrade_converts_w_rows_per_row_with_correct_dst_and_leaves_r_rows(db016):
    base = seed_base()
    rows = seed_mixed(base)
    before = {r[0]: r for r in snapshot()}

    command.upgrade(db016, "017")

    assert version() == "017" and has_constraint()
    for name, appt_id in rows.items():
        assert times(appt_id) == EXPECTED_NEW[name], name
    # updated_at is NOT bumped by the data migration
    after = {r[0]: r for r in snapshot()}
    assert all(after[i][3] == before[i][3] for i in before)

    log = sql("SELECT row_id::text AS rid, column_name, klass, rule, old_value, new_value FROM tz_migration_log", fetch=True)
    assert len(log) == 2 * len(rows)  # starts_at + ends_at per row, R rows included (old == new)
    by_row = {}
    for entry in log:
        by_row.setdefault(entry["rid"], []).append(entry)
    assert {e["klass"] for e in by_row[rows["r_admin"]]} == {"R"}
    assert {e["rule"] for e in by_row[rows["r_admin"]]} == {"R-A"}
    assert {e["rule"] for e in by_row[rows["w_summer"]]} == {"W-B"}
    assert {e["rule"] for e in by_row[rows["w_cancelled"]]} == {"W-B2"}
    assert all(e["old_value"] == e["new_value"] for e in by_row[rows["r_admin"]])


def test_upgrade_is_idempotent(db016):
    base = seed_base()
    rows = seed_mixed(base)
    command.upgrade(db016, "017")
    once = snapshot()
    command.upgrade(db016, "017")  # already at 017: no-op
    assert snapshot() == once
    assert sql("SELECT count(*) AS n FROM tz_migration_log", fetch=True)[0]["n"] == 2 * len(rows)


def test_downgrade_roundtrip_restores_every_row_bit_exact(db016, capfd):
    base = seed_base()
    seed_mixed(base)
    snap0 = snapshot()

    command.upgrade(db016, "017")
    snap1 = snapshot()
    assert snap1 != snap0

    capfd.readouterr()
    command.downgrade(db016, "016")
    assert "edited after the upgrade" not in capfd.readouterr().out   # nothing was edited: nothing to report
    assert snapshot() == snap0                       # bit-exact, including updated_at
    assert version() == "016" and has_constraint() and not has_log_table()

    command.upgrade(db016, "017")
    assert snapshot() == snap1                       # and re-upgrading gives the same result


def test_downgrade_keeps_rows_that_were_edited_after_the_upgrade(db016, capfd):
    """A rollback must not silently undo work done after go-live: only rows that still hold the value
    the upgrade wrote are restored; edited rows keep their current value."""
    base = seed_base()
    rows = seed_mixed(base)
    command.upgrade(db016, "017")

    # After go-live the admin moves a migrated walk-in and a migrated online booking (real UTC, as the new code writes).
    sql("UPDATE appointments SET starts_at = :s, ends_at = :e WHERE id = :id",
        dict(s=utc(2026, 10, 13, 12), e=utc(2026, 10, 13, 12, 30), id=rows["r_admin"]))
    sql("UPDATE appointments SET starts_at = :s, ends_at = :e WHERE id = :id",
        dict(s=utc(2026, 10, 13, 13), e=utc(2026, 10, 13, 13, 30), id=rows["w_summer"]))

    capfd.readouterr()
    command.downgrade(db016, "016")
    report = "".join(l for l in capfd.readouterr().out.splitlines() if "edited after the upgrade" in l)
    assert "2 appointments row(s)" in report                                                 # exactly the two edited rows are reported
    assert rows["r_admin"] in report and rows["w_summer"] in report
    assert rows["w_winter"] not in report and rows["w_cancelled"] not in report

    assert times(rows["r_admin"]) == (utc(2026, 10, 13, 12), utc(2026, 10, 13, 12, 30))    # edit kept
    assert times(rows["w_summer"]) == (utc(2026, 10, 13, 13), utc(2026, 10, 13, 13, 30))   # edit kept
    # untouched rows are restored to their exact old (wall-clock-as-UTC) values
    assert times(rows["w_winter"]) == (utc(2026, 10, 27, 9), utc(2026, 10, 27, 9, 30))
    assert times(rows["w_sat_before_switch"]) == (utc(2026, 10, 24, 17, 30), utc(2026, 10, 24, 18))
    assert times(rows["w_mon_after_switch"]) == (utc(2026, 10, 26, 17, 30), utc(2026, 10, 26, 18))
    assert times(rows["w_cancelled"]) == (utc(2026, 10, 14, 10), utc(2026, 10, 14, 10, 30))
    assert version() == "016" and has_constraint() and not has_log_table()


# ---------------------------------------------------------------------------------------------
# constraint handling
# ---------------------------------------------------------------------------------------------


def test_transient_overlap_during_the_bulk_update_is_handled_by_dropping_the_constraint(db016):
    base = seed_base()
    a = add_appt(base, starts=utc(2026, 10, 20, 9), minutes=120)   # 09:00-11:00 (W)  -> 07:00-09:00Z
    b = add_appt(base, starts=utc(2026, 10, 20, 11), minutes=30)   # 11:00-11:30 (W)  -> 09:00-09:30Z

    # Proof of WHY the constraint has to be dropped: moving B first (as any row-by-row update may do)
    # collides with A's not-yet-moved slot although the FINAL state is clean.
    with pytest.raises(Exception, match="no_overlapping_confirmed_appointments"):
        sql("UPDATE appointments SET starts_at = :s, ends_at = :e WHERE id = :id",
            dict(s=utc(2026, 10, 20, 9), e=utc(2026, 10, 20, 9, 30), id=b))

    command.upgrade(db016, "017")
    assert times(a) == (utc(2026, 10, 20, 7), utc(2026, 10, 20, 9))
    assert times(b) == (utc(2026, 10, 20, 9), utc(2026, 10, 20, 9, 30))
    assert has_constraint()
    # ...and the re-created constraint is effective:
    with pytest.raises(Exception, match="no_overlapping_confirmed_appointments"):
        add_appt(base, starts=utc(2026, 10, 20, 8), log=False, origin="walk_in")


def test_real_overlap_in_the_final_state_aborts_and_changes_nothing(db016):
    base = seed_base()
    add_appt(base, starts=utc(2026, 10, 20, 10))                                       # W -> 08:00-08:30Z
    add_appt(base, origin="walk_in", log=False, starts=utc(2026, 10, 20, 8, 15))       # R  08:15-08:45Z
    snap0 = snapshot()

    with pytest.raises(Exception, match="OVERLAP_AFTER"):
        command.upgrade(db016, "017")

    assert snapshot() == snap0 and version() == "016" and has_constraint() and not has_log_table()


def test_overlap_that_only_the_recreated_constraint_can_see_rolls_back_everything(db016, monkeypatch):
    """Belt and braces: even if the Python plan missed an overlap, ADD CONSTRAINT validates the final
    state and the whole transaction (data + DDL) rolls back."""
    base = seed_base()
    add_appt(base, starts=utc(2026, 10, 20, 10))
    add_appt(base, origin="walk_in", log=False, starts=utc(2026, 10, 20, 8, 15))
    snap0 = snapshot()
    from app.core import tz_migration

    monkeypatch.setattr(tz_migration, "find_overlaps", lambda changes: [])  # blind the Python check
    with pytest.raises(Exception, match="no_overlapping_confirmed_appointments"):
        command.upgrade(db016, "017")
    assert snapshot() == snap0 and version() == "016" and has_constraint() and not has_log_table()


# ---------------------------------------------------------------------------------------------
# "never guess"
# ---------------------------------------------------------------------------------------------


def test_unclassifiable_future_row_aborts_and_a_decision_resolves_it(db016):
    base = seed_base()
    ok = add_appt(base, starts=utc(2099, 1, 5, 9))
    odd = add_appt(base, starts=utc(2099, 1, 6, 9), log=False)   # online, no confirmation log, no predecessor
    snap0 = snapshot()

    with pytest.raises(Exception, match=f"REVIEW_UNDECIDED: {odd}"):
        command.upgrade(db016, "017")
    assert snapshot() == snap0 and version() == "016"

    with decisions({"appointments": {odd: {"klass": "R", "by": "test"}}, "working_exceptions": {}, "dst_edge": {}}):
        command.upgrade(db016, "017")
    assert times(ok)[0] == utc(2099, 1, 5, 8)   # W: winter, -1 h
    assert times(odd)[0] == utc(2099, 1, 6, 9)  # decided R: untouched
    assert {r["rule"] for r in sql("SELECT rule FROM tz_migration_log WHERE row_id = :i", dict(i=odd), fetch=True)} == {"decision(X-online-no-log)"}


def test_dst_edge_row_needs_a_decision(db016):
    base = seed_base()
    edge = add_appt(base, starts=utc(2026, 10, 25, 2, 30))  # 02:30 exists twice on 25 Oct 2026
    with pytest.raises(Exception, match=f"DST_EDGE_UNDECIDED: {edge}"):
        command.upgrade(db016, "017")
    assert version() == "016"


def test_working_exceptions_require_a_decision_and_are_converted_only_if_decided(db016):
    base = seed_base()
    exc_id = new_id()
    sql("INSERT INTO working_exceptions (created_at, updated_at, id, team_member_id, starts_at, ends_at, reason) "
        "VALUES (:c,:c,:id,:t,:s,:e,'Pause')", dict(c=CREATED, id=exc_id, t=base["team1"], s=utc(2026, 10, 20, 12), e=utc(2026, 10, 20, 13)))
    with pytest.raises(Exception, match="WORKING_EXCEPTION_UNDECIDED"):
        command.upgrade(db016, "017")
    with decisions({"appointments": {}, "working_exceptions": {exc_id: "W"}, "dst_edge": {}}):
        command.upgrade(db016, "017")
    row = sql("SELECT starts_at, ends_at FROM working_exceptions WHERE id = :i", dict(i=exc_id), fetch=True)[0]
    assert (row["starts_at"], row["ends_at"]) == (utc(2026, 10, 20, 10), utc(2026, 10, 20, 11))
    command.downgrade(db016, "016")
    row = sql("SELECT starts_at, ends_at FROM working_exceptions WHERE id = :i", dict(i=exc_id), fetch=True)[0]
    assert (row["starts_at"], row["ends_at"]) == (utc(2026, 10, 20, 12), utc(2026, 10, 20, 13))


# ---------------------------------------------------------------------------------------------
# rows created after the upgrade, rollback with live data
# ---------------------------------------------------------------------------------------------


def test_downgrade_also_handles_rows_written_by_the_new_code(db016):
    base = seed_base()
    old = add_appt(base, starts=utc(2026, 10, 20, 9))
    command.upgrade(db016, "017")

    now = datetime.now(UTC)
    new_public = add_appt(base, starts=utc(2026, 10, 21, 7), created=now, team="team2")                     # 09:00 CEST, real UTC
    new_admin = add_appt(base, origin="walk_in", log=False, starts=utc(2026, 10, 21, 8), created=now)       # real UTC
    unclear = add_appt(base, starts=utc(2026, 10, 21, 12), log=False, created=now, team="team2")            # not classifiable

    command.downgrade(db016, "016")
    assert times(old)[0] == utc(2026, 10, 20, 9)            # from the log: exactly the old value
    assert times(new_public)[0] == utc(2026, 10, 21, 9)     # old code expects wall-clock-as-UTC for public bookings
    assert times(new_admin)[0] == utc(2026, 10, 21, 8)      # admin rows were real UTC in the old world too
    assert times(unclear)[0] == utc(2026, 10, 21, 12)       # ambiguous: left untouched (reported)


# ---------------------------------------------------------------------------------------------
# dry run + sweep scripts
# ---------------------------------------------------------------------------------------------


def _script(name, *args):
    env = dict(os.environ, DATABASE_URL=URL)
    return subprocess.run([sys.executable, str(BACKEND / "scripts" / name), *args], capture_output=True, text=True,
                          env=env, cwd=str(BACKEND), timeout=120)


def test_dry_run_is_read_only_and_predicts_exactly_what_the_migration_does(db016):
    from app.core import tz_migration as tzm

    base = seed_base()
    rows = seed_mixed(base)
    snap0 = snapshot()

    result = _script("tz_dry_run.py")
    assert result.returncode == 0, result.stderr
    out = result.stdout
    assert "nothing was written" in out and "mismatches: 0" in out
    assert "none" in out.split("problems that would ABORT the migration --")[1].split("--")[0]
    assert snapshot() == snap0 and not has_log_table()      # truly read-only

    # what the dry run computes == what the migration then does (same functions, verified end-to-end)
    async def _plan():
        engine = create_async_engine(URL, poolclass=NullPool)
        async with engine.connect() as conn:
            found = (await conn.execute(text(tzm.SELECT_APPOINTMENTS_SQL))).mappings().all()
        await engine.dispose()
        return [tzm.ApptRow(**{k: r[k] for k in tzm.ApptRow.__dataclass_fields__}) for r in found]

    changes, problems = tzm.plan_appointments(asyncio.run(_plan()), tzm.load_decisions(DECISIONS_FILE), datetime.now(UTC))
    assert problems == []
    planned = {str(c.row_id): (c.new_starts, c.new_ends) for c in changes}
    command.upgrade(db016, "017")
    for appt_id in rows.values():
        assert times(appt_id) == planned[appt_id]

    # csv mode lists future rows with ids only (no PII columns exist in the query at all)
    assert "appointment_id,regel,klasse" in _script("tz_dry_run.py", "--csv").stdout


def test_sweep_finds_and_converts_stragglers_written_by_the_old_code_during_the_deploy(db016):
    base = seed_base()
    seed_mixed(base)
    command.upgrade(db016, "017")
    assert _script("tz_sweep.py").stdout.strip() == "stragglers: 0"

    # An OLD-code booking that committed just before the migration transaction did (created_at earlier
    # than the migration, wall-clock-as-UTC, no log entry):
    straggler = add_appt(base, starts=utc(2026, 10, 22, 9), created=datetime.now(UTC) - timedelta(hours=1))
    check = _script("tz_sweep.py")
    assert check.stdout.strip() == "stragglers: 1" and check.returncode == 1

    applied = _script("tz_sweep.py", "--apply")
    assert applied.returncode == 0, applied.stderr + applied.stdout
    assert times(straggler)[0] == utc(2026, 10, 22, 7)
    assert _script("tz_sweep.py").stdout.strip() == "stragglers: 0"
