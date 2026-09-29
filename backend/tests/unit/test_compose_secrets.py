"""docker-compose.yml must not carry a hardcoded value for the two required
security variables — an unset variable has to make `docker compose` fail
instead of silently starting with a known default (RETENTION_CRON_SECRET used
to be the literal 'dev-secret-change-in-prod')."""
import re
from pathlib import Path

import pytest

COMPOSE = Path(__file__).resolve().parents[3] / "docker-compose.yml"


@pytest.mark.skipif(not COMPOSE.exists(), reason="docker-compose.yml not present (tests run outside the repo checkout)")
@pytest.mark.parametrize("name", ["RETENTION_CRON_SECRET", "FORWARDED_ALLOW_IPS"])
def test_required_variable_is_referenced_with_fail_fast_syntax(name):
    lines = [ln.strip() for ln in COMPOSE.read_text(encoding="utf-8").splitlines() if ln.strip().startswith(f"- {name}=")]
    assert len(lines) == 1, f"expected exactly one {name} entry, got {lines}"
    assert re.fullmatch(rf"- {name}=\$\{{{name}:\?[^}}]+\}}", lines[0]), lines[0]
