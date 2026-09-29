import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_forwarded_allow_ips_is_required():
    """AK-M20.6: a missing FORWARDED_ALLOW_IPS must fail startup loudly, not
    silently fall back to uvicorn's own default (127.0.0.1) — same pattern
    as RETENTION_CRON_SECRET."""
    with pytest.raises(ValidationError) as exc_info:
        Settings(_env_file=None, DATABASE_URL="sqlite:///:memory:", RETENTION_CRON_SECRET="x", JWT_SECRET_KEY="x", ADMIN_USERNAME="x", ADMIN_PASSWORD="x", EMAIL_FROM="x@example.com", EMAIL_REPLY_TO="x@example.com", PUBLIC_BASE_URL="http://localhost")
    assert "FORWARDED_ALLOW_IPS" in str(exc_info.value)


_BASE = dict(
    DATABASE_URL="sqlite:///:memory:",
    JWT_SECRET_KEY="x",
    ADMIN_USERNAME="x",
    ADMIN_PASSWORD="x",
    EMAIL_FROM="x@example.com",
    EMAIL_REPLY_TO="x@example.com",
    PUBLIC_BASE_URL="http://localhost",
)


@pytest.mark.parametrize("field", ["FORWARDED_ALLOW_IPS", "RETENTION_CRON_SECRET"])
def test_empty_string_aborts_startup(field):
    """docker-compose renders a variable that is unset in Coolify as an EMPTY
    string. A bare `str` field accepts that, so the 'required' guard would never
    fire — an empty value must abort startup exactly like a missing one."""
    values = {"FORWARDED_ALLOW_IPS": "10.0.2.0/24", "RETENTION_CRON_SECRET": "s3cret", **_BASE}
    values[field] = ""
    with pytest.raises(ValidationError) as exc_info:
        Settings(_env_file=None, **values)
    assert field in str(exc_info.value)


def test_non_empty_values_are_accepted():
    s = Settings(_env_file=None, FORWARDED_ALLOW_IPS="10.0.2.0/24", RETENTION_CRON_SECRET="s3cret", **_BASE)
    assert s.FORWARDED_ALLOW_IPS == "10.0.2.0/24"
