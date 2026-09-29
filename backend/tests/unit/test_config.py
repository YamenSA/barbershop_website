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
