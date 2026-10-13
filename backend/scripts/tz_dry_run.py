"""READ-ONLY dry run of migration 017 (timezone hotfix, B-1).

Prints, without writing anything: counts per rule/class, offsets, problems that would
abort the migration (undecided rows, DST edge rows, overlaps after conversion), the list
of all FUTURE appointments (ids only) and an anonymous random sample.
No names, e-mails, phone numbers or notes are ever selected.

Run inside the production container BEFORE the release is deployed (the script and the
module are not in the image yet, so copy both next to each other):

    docker cp backend/app/core/tz_migration.py  BACKEND:/tmp/tz_migration.py
    docker cp backend/scripts/tz_dry_run.py     BACKEND:/tmp/tz_dry_run.py
    docker exec BACKEND python /tmp/tz_dry_run.py > tz_dry_run.txt

Options: --decisions FILE   decisions json (default: alembic/tz_decisions.json if found)
         --sample N         anonymous sample size (default 15)
         --csv              print only the future-appointment list as CSV
"""
import argparse
import asyncio
import importlib.util
import os
import random
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine


def _load_tzm():
    try:
        from app.core import tz_migration as module  # inside the repo / a deployed image
        return module
    except ImportError:
        path = Path(__file__).resolve().parent / "tz_migration.py"  # docker cp'd next to this script
        spec = importlib.util.spec_from_file_location("tz_migration", path)
        module = importlib.util.module_from_spec(spec)
        sys.modules["tz_migration"] = module
        spec.loader.exec_module(module)
        return module


tzm = _load_tzm()


def berlin(dt):
    return dt.astimezone(tzm.BERLIN).strftime("%Y-%m-%d %H:%M")


async def load(url):
    engine = create_async_engine(url)
    async with engine.connect() as conn:
        await conn.execute(text("SET TRANSACTION READ ONLY"))
        appts = (await conn.execute(text(tzm.SELECT_APPOINTMENTS_SQL))).mappings().all()
        excs = (await conn.execute(text(tzm.SELECT_WORKING_EXCEPTIONS_SQL))).mappings().all()
    await engine.dispose()
    rows = [tzm.ApptRow(**{k: r[k] for k in tzm.ApptRow.__dataclass_fields__}) for r in appts]
    return rows, [dict(r) for r in excs]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--decisions", default=None)
    ap.add_argument("--sample", type=int, default=15)
    ap.add_argument("--csv", action="store_true")
    args = ap.parse_args()

    url = os.environ["DATABASE_URL"]
    dec_path = args.decisions
    if dec_path is None:
        candidates = (
            Path(__file__).resolve().parents[1] / "alembic" / "tz_decisions.json",
            Path("/app/alembic/tz_decisions.json"),
        )
        for cand in candidates:
            if cand.exists():
                dec_path = cand
                break
    decisions = tzm.load_decisions(dec_path)

    rows, excs = asyncio.run(load(url))
    now = datetime.now(timezone.utc)
    a_changes, a_problems = tzm.plan_appointments(rows, decisions, now)
    e_changes, e_problems = tzm.plan_working_exceptions(excs, decisions)
    problems = a_problems + e_problems
    by_id = {r.id: r for r in rows}

    future = [c for c in a_changes if by_id[c.row_id].starts_at >= now]
    future.sort(key=lambda c: c.old_starts)
    header = ("appointment_id,regel,klasse,status,alt_utc,neu_utc,angezeigt_vorher_berlin,"
              "mail_vorher,angezeigt_nachher_berlin,delta_min,flags")

    def line(c):
        return ",".join(str(x) for x in (
            c.row_id, c.rule, c.klass, c.status, c.old_starts.isoformat(), c.new_starts.isoformat(),
            berlin(c.old_starts), c.old_starts.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M"),
            berlin(c.new_starts), int((c.new_starts - c.old_starts).total_seconds() // 60), "|".join(c.flags),
        ))

    if args.csv:
        print(header)
        for c in future:
            print(line(c))
        return

    print("=== TZ DRY-RUN (read-only; nothing was written) ===")
    print(f"database rows: appointments={len(rows)}  working_exceptions={len(excs)}")
    print("\n-- classification (rule x class x future) --")
    counter = Counter((c.rule, c.klass, by_id[c.row_id].starts_at >= now) for c in a_changes)
    for (rule, klass, fut), n in sorted(counter.items(), key=str):
        print(f"  {rule:32s} {klass:3s} {'future' if fut else 'past  '} {n}")
    print("\n-- offsets applied (minutes) --")
    deltas = Counter(int((c.new_starts - c.old_starts).total_seconds() // 60) for c in a_changes)
    for delta, n in sorted(deltas.items()):
        print(f"  {delta:5d}: {n}")
    print("\n-- problems that would ABORT the migration --")
    if not problems:
        print("  none")
    for p in problems:
        print(f"  {p.code}: {p.row_id} - {p.message}")
    print("\n-- check on W rows: mail_vorher must equal angezeigt_nachher_berlin --")
    bad = [c for c in a_changes if c.klass == "W" and c.old_starts.strftime("%Y-%m-%d %H:%M") != berlin(c.new_starts)]
    print(f"  mismatches: {len(bad)}")
    print(f"\n-- future appointments (ids only): {len(future)} --")
    print(header)
    for c in future:
        print(line(c))
    sample = random.Random().sample(a_changes, min(args.sample, len(a_changes)))
    print(f"\n-- anonymous sample ({len(sample)} rows, no ids) --")
    print("regel,klasse,wochentag,alt_lokal(Anzeige heute),neu_lokal(nach Migration)")
    for c in sample:
        print(",".join([c.rule, c.klass, c.old_starts.astimezone(tzm.BERLIN).strftime("%a"),
                        berlin(c.old_starts), berlin(c.new_starts)]))


if __name__ == "__main__":
    main()
