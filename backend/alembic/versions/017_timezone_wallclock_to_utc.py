"""appointment/exception times: wall-clock-as-UTC -> real UTC (timezone hotfix, B-1)

Revision ID: 017
Revises: 016

Until now the booking engine stored Berlin clock readings as if they were UTC ("W")
while the admin UI stored real UTC ("R"). This converts every W row to real UTC per
row via zoneinfo(Europe/Berlin) (summer -2 h, winter -1 h) and leaves R rows alone.
Classification is deterministic (app/core/tz_migration.py); rows it cannot classify
abort the migration unless tz_decisions.json decides them — nothing is guessed.

Safety:
* one transaction (PostgreSQL DDL is transactional) — any problem rolls everything back;
* the EXCLUDE constraint is dropped and re-created inside it, because a uniform shift
  can create TRANSIENT overlaps (e.g. 09:00-11:00 followed by 11:00-11:30 shifted by
  -2 h) and the constraint is neither deferrable nor per-statement; re-creating it
  validates the WHOLE final state, so genuine overlaps abort the migration;
* every changed value is recorded in tz_migration_log (ids + timestamps, no PII);
  downgrade() restores from the log, and handles rows created after the upgrade.
"""
import uuid
from datetime import datetime, timezone
from pathlib import Path

import sqlalchemy as sa
from alembic import op

from app.core import tz_migration as tzm

revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None

DECISIONS_FILE = Path(__file__).resolve().parents[1] / "tz_decisions.json"
MIGRATION_RUN = "017"


def _fetch_appointments(conn):
    rows = conn.execute(sa.text(tzm.SELECT_APPOINTMENTS_SQL)).mappings().all()
    return [tzm.ApptRow(**{k: r[k] for k in tzm.ApptRow.__dataclass_fields__}) for r in rows]


def _fetch_working_exceptions(conn):
    return [dict(r) for r in conn.execute(sa.text(tzm.SELECT_WORKING_EXCEPTIONS_SQL)).mappings().all()]


def upgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name != "postgresql":
        return  # SQLite (tests) has no legacy data and no EXCLUDE constraint

    conn.execute(sa.text("SET LOCAL lock_timeout = '10s'"))
    decisions = tzm.load_decisions(DECISIONS_FILE)
    now = datetime.now(timezone.utc)

    a_changes, a_problems = tzm.plan_appointments(_fetch_appointments(conn), decisions, now)
    e_changes, e_problems = tzm.plan_working_exceptions(_fetch_working_exceptions(conn), decisions)
    problems = a_problems + e_problems
    if problems:
        lines = "\n".join(f"  {p.code}: {p.row_id} — {p.message}" for p in problems)
        raise RuntimeError(
            "Migration 017 aborted before touching any data — rows the rules cannot classify safely:\n"
            f"{lines}\nDecide them in backend/alembic/tz_decisions.json (see TIMEZONE_HOTFIX_SPEC.md §2.4)."
        )

    op.create_table(
        "tz_migration_log",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("migration_run", sa.String(), nullable=False),
        sa.Column("table_name", sa.String(), nullable=False),
        sa.Column("row_id", sa.UUID(), nullable=False),
        sa.Column("column_name", sa.String(), nullable=False),
        sa.Column("old_value", sa.DateTime(timezone=True), nullable=False),
        sa.Column("new_value", sa.DateTime(timezone=True), nullable=False),
        sa.Column("klass", sa.String(), nullable=False),
        sa.Column("rule", sa.String(), nullable=False),
        sa.Column("confidence", sa.String(), nullable=False),
        sa.Column("migrated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("table_name", "row_id", "column_name", name="uq_tz_migration_log_row"),
    )

    conn.execute(sa.text(tzm.DROP_EXCLUDE_CONSTRAINT_SQL))

    log_rows = []
    # Ascending start per member (extra safety on top of dropping the constraint).
    for c in sorted(a_changes + e_changes, key=lambda c: (str(c.team_member_id), c.new_starts)):
        table = c.table
        for col, old, new in (("starts_at", c.old_starts, c.new_starts), ("ends_at", c.old_ends, c.new_ends)):
            log_rows.append(dict(
                id=uuid.uuid4(), run=MIGRATION_RUN, t=table, r=c.row_id, col=col, old=old, new=new,
                klass=c.klass, rule=c.rule, conf=c.confidence,
            ))
        if (c.new_starts, c.new_ends) != (c.old_starts, c.old_ends):
            conn.execute(
                sa.text(f"UPDATE {table} SET starts_at = :s, ends_at = :e WHERE id = :id"),
                dict(s=c.new_starts, e=c.new_ends, id=c.row_id),
            )
    if log_rows:
        conn.execute(
            sa.text(
                "INSERT INTO tz_migration_log (id, migration_run, table_name, row_id, column_name, old_value, new_value, klass, rule, confidence) "
                "VALUES (:id, :run, :t, :r, :col, :old, :new, :klass, :rule, :conf)"
            ),
            log_rows,
        )

    # Re-creating the constraint validates the entire final state.
    conn.execute(sa.text(tzm.ADD_EXCLUDE_CONSTRAINT_SQL))


def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name != "postgresql":
        return

    conn.execute(sa.text("SET LOCAL lock_timeout = '10s'"))
    conn.execute(sa.text(tzm.DROP_EXCLUDE_CONSTRAINT_SQL))

    # 1) Rows recorded by the upgrade: restore the exact old values -- but ONLY if the row still holds the
    #    value the upgrade wrote. A row that was edited after the upgrade (admin move, patch) keeps its
    #    edit: the rollback must not silently undo real work done in the meantime.
    for table in ("appointments", "working_exceptions"):
        alias = "a"
        conn.execute(sa.text(f"""
            UPDATE {table} {alias} SET
                starts_at = (SELECT old_value FROM tz_migration_log l WHERE l.table_name='{table}' AND l.row_id={alias}.id AND l.column_name='starts_at'),
                ends_at   = (SELECT old_value FROM tz_migration_log l WHERE l.table_name='{table}' AND l.row_id={alias}.id AND l.column_name='ends_at')
             WHERE EXISTS (SELECT 1 FROM tz_migration_log l WHERE l.table_name='{table}' AND l.row_id={alias}.id
                              AND l.column_name='starts_at' AND l.new_value = {alias}.starts_at)
               AND EXISTS (SELECT 1 FROM tz_migration_log l WHERE l.table_name='{table}' AND l.row_id={alias}.id
                              AND l.column_name='ends_at' AND l.new_value = {alias}.ends_at)
        """))
        edited = conn.execute(sa.text(f"""
            SELECT a.id::text FROM {table} a
             WHERE EXISTS (SELECT 1 FROM tz_migration_log l WHERE l.table_name='{table}' AND l.row_id=a.id)
               AND (a.starts_at <> (SELECT new_value FROM tz_migration_log l WHERE l.table_name='{table}' AND l.row_id=a.id AND l.column_name='starts_at')
                 OR a.ends_at   <> (SELECT new_value FROM tz_migration_log l WHERE l.table_name='{table}' AND l.row_id=a.id AND l.column_name='ends_at'))
        """)).scalars().all()
        if edited:
            print(f"[017 downgrade] {len(edited)} {table} row(s) were edited after the upgrade and keep their "
                  f"current value (not rolled back): {', '.join(edited)}")

    # 2) Rows created AFTER the upgrade hold real UTC. The old code expects wall-clock-as-UTC only for
    #    rows its public booking path wrote (W-B/W-B2); everything else was R there and stays.
    logged = {r[0] for r in conn.execute(sa.text("SELECT row_id FROM tz_migration_log WHERE table_name='appointments'"))}
    rows = _fetch_appointments(conn)
    predecessors = tzm.cancelled_predecessor_ids(rows)
    ambiguous = []
    for r in rows:
        if r.id in logged:
            continue
        new = tzm.downgrade_new_value(r, r.id in predecessors, r.starts_at, r.ends_at)
        verdict = tzm.classify(r, has_cancelled_predecessor=r.id in predecessors)
        if verdict.klass == "REVIEW":
            ambiguous.append(str(r.id))
        if new is not None:
            conn.execute(sa.text("UPDATE appointments SET starts_at = :s, ends_at = :e WHERE id = :id"),
                         dict(s=new[0], e=new[1], id=r.id))
    if ambiguous:
        print(f"[017 downgrade] {len(ambiguous)} post-upgrade appointment(s) could not be classified and were left "
              f"untouched (real UTC): {', '.join(ambiguous)}")

    conn.execute(sa.text(tzm.ADD_EXCLUDE_CONSTRAINT_SQL))
    op.drop_table("tz_migration_log")
