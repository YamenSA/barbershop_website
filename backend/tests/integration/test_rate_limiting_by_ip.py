"""M20: rate limits and the login-backoff cache must key off the actual
client IP, not a single shared value — otherwise every visitor drains the
same quota and one attacker can lock everyone else out.

AK-M20.1 (slowapi rate limiter) and AK-M20.2 (login backoff cache) are
covered here. AK-M20.4 (ProxyHeadersMiddleware trust boundary) is NOT
testable this way — see test_forwarded_for_trust_boundary.py for why and
how it's actually verified.
"""
from unittest.mock import patch

import pytest
from httpx import AsyncClient, ASGITransport
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.core.limiter import limiter
from app.domains.auth.service import failed_attempts_cache, compute_delay, record_failed_attempt
from app.main import app


def _client_for(session: AsyncSession, ip: str) -> AsyncClient:
    def override_session():
        return session

    app.dependency_overrides[get_session] = override_session
    return AsyncClient(
        transport=ASGITransport(app=app, client=(ip, 12345)),
        base_url="http://test",
    )


@pytest.mark.asyncio
async def test_rate_limit_is_keyed_per_client_ip(session: AsyncSession):
    """AK-M20.1: exhausting the quota from one IP must not affect another."""
    limiter.reset()
    limit = 10  # RATE_LIMIT_ACCOUNT_PER_MINUTE default

    with patch("app.domains.notifications.email.send_email", return_value=None):
        async with _client_for(session, "203.0.113.10") as attacker:
            responses = [
                await attacker.post("/api/v1/account/password/forgot", json={"email": f"x{i}@example.com"})
                for i in range(limit)
            ]
            assert all(r.status_code == 202 for r in responses)

            # One more from the SAME ip must now be throttled.
            blocked = await attacker.post("/api/v1/account/password/forgot", json={"email": "one-too-many@example.com"})
            assert blocked.status_code == 429

        # A different IP must be completely unaffected by the attacker's quota.
        async with _client_for(session, "203.0.113.20") as victim:
            resp = await victim.post("/api/v1/account/password/forgot", json={"email": "victim@example.com"})
            assert resp.status_code == 202

    app.dependency_overrides.clear()


def test_login_backoff_is_keyed_per_client_ip():
    """AK-M20.2: the exponential-backoff cache (auth/service.py) must not
    pool failed attempts from different visitors into one counter."""
    failed_attempts_cache.clear()

    for _ in range(5):
        record_failed_attempt("203.0.113.30")

    attacker_delay = compute_delay("203.0.113.30")
    victim_delay = compute_delay("203.0.113.40")

    assert attacker_delay > 0
    assert victim_delay == 0
