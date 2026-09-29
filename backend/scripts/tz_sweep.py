"""Straggler check/repair for migration 017 (timezone hotfix, B-1).

Appointments that the OLD code wrote while migration 017 was running (rolling
deploy) are wall-clock-as-UTC but were created BEFORE the migration committed, and
are therefore missing from tz_migration_log. Rows written by the NEW code after the
migration are real UTC and are never touched (their created_at is later).

    python scripts/tz_sweep.py            # --check (default): read-only, expect "stragglers: 0"
    python scripts/tz_sweep.py --apply    # convert stragglers (same classification, logged)
"""
import argparse
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text  # noqa: E402
from sqlalchemy.ext.asyncio import create_async_engine  # noqa: E402

from app.core import tz_migration as tzm  # noqa: E402

STRAGGLERS_SQL = tzm.SELECT_APPOINTMENTS_SQL.replace(
    "  FROM appointments a",
    "  FROM appointments a"
    " WHERE a.created_at < (SELECT max(migrated_at) FROM tz_migration_log)"
    "   AND NOT EXISTS (SELECT 1 FROM tz_migration_log l"
    " WHERE l.table_name = 'appointments' AND l.row_id = a.id)",
)

INSERT_LOG_SQL = (
    "INSERT INTO tz_migration_log (id, migration_run, table_name, row_id, column_name, old_value,"
    " new_value, klass, rule, confidence) VALUES (:id, 'sweep', 'appointments', :r, :col, :old, :new,"
    " :klass, :rule, :conf)"
)


async def main(apply: bool) -> int:
    engine = create_async_engine(os.environ["DATABASE_URL"])
    async with engine.begin() as conn:
        if not apply:
            await conn.execute(text("SET TRANSACTION READ ONLY"))
        result = (await conn.execute(text(STRAGGLERS_SQL))).mappings().all()
        rows = [tzm.ApptRow(**{k: r[k] for k in tzm.ApptRow.__dataclass_fields__}) for r in result]
        print(f"stragglers: {len(rows)}")
        if not apply or not rows:
            return 0 if not rows else 1
        changes, problems = tzm.plan_appointments(rows, tzm.load_decisions(None), datetime.now(timezone.utc))
        if problems:
            for p in problems:
                print(f"  {p.code}: {p.row_id} - {p.message}")
            raise SystemExit("aborted: undecided stragglers")
        for c in changes:
            await conn.execute(
                text("UPDATE appointments SET starts_at = :s, ends_at = :e WHERE id = :id"),
                dict(s=c.new_starts, e=c.new_ends, id=c.row_id),
            )
            for col, old, new in (("starts_at", c.old_starts, c.new_starts), ("ends_at", c.old_ends, c.new_ends)):
                await conn.execute(
                    text(INSERT_LOG_SQL),
                    dict(id=uuid.uuid4(), r=c.row_id, col=col, old=old, new=new,
                         klass=c.klass, rule=c.rule, conf=c.confidence),
                )
        print(f"converted: {len(changes)}")
    await engine.dispose()
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    sys.exit(asyncio.run(main(parser.parse_args().apply)))
