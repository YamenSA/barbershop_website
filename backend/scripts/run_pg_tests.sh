#!/usr/bin/env bash
# Runs the PostgreSQL-only tests (pytest marker `postgres`) against a throwaway
# Postgres from docker-compose. Only seed/test data — never a real database.
#
#   source .venv/Scripts/activate      # (Windows/Git Bash; Linux/macOS: .venv/bin/activate)
#   bash scripts/run_pg_tests.sh
#
# What it does: starts ONLY the `db` service under its own compose project name
# (own volume, your dev database is untouched), creates database barbershop_test,
# applies `alembic upgrade head` (needed: the EXCLUDE constraint comes from the
# migrations, not from create_all), runs `pytest -m postgres`, then removes the
# container and its volume. Needs Docker running and host port 5432 free.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PROJECT="barbershop-pgtest"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-pgtest_local_only}"
# The compose file interpolates ALL services, so the required backend variables must
# exist even though only `db` is started. Dummy values, unused by this run.
export RETENTION_CRON_SECRET="${RETENTION_CRON_SECRET:-pgtest-unused}"
export FORWARDED_ALLOW_IPS="${FORWARDED_ALLOW_IPS:-127.0.0.1}"

cleanup() { (cd "$ROOT" && docker compose -p "$PROJECT" down -v >/dev/null 2>&1) || true; }
trap cleanup EXIT

cd "$ROOT"
docker compose -p "$PROJECT" up -d --wait db
docker compose -p "$PROJECT" exec -T db psql -U postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS barbershop_test" -c "CREATE DATABASE barbershop_test"

export DATABASE_URL="postgresql+asyncpg://postgres:${POSTGRES_PASSWORD}@127.0.0.1:5432/barbershop_test"
export TEST_DATABASE_URL="$DATABASE_URL"

cd "$ROOT/backend"
python -m alembic upgrade head
python -m pytest -m postgres -v -p no:cacheprovider -W ignore "$@"
