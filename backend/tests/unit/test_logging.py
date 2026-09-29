import logging
from unittest.mock import patch

from app.core.logging import (
    TruncateClientIPFilter,
    truncate_ip,
    warn_if_forwarded_allow_ips_mismatches_network,
)


def test_truncate_ipv4_zeroes_last_octet():
    assert truncate_ip("203.0.113.45") == "203.0.113.0"


def test_truncate_ipv6_zeroes_last_80_bits():
    assert truncate_ip("2001:db8:85a3:8d3:1319:8a2e:370:7348") == "2001:db8:85a3::"


def test_truncate_ip_leaves_non_ip_input_unchanged():
    # e.g. a unix-socket path or an empty client address from get_client_addr()
    assert truncate_ip("") == ""
    assert truncate_ip("some-unix-socket") == "some-unix-socket"


def test_filter_rewrites_record_args_ipv4():
    record = logging.LogRecord(
        name="uvicorn.access",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg='%s - "%s %s HTTP/%s" %d',
        args=("203.0.113.45:54321", "GET", "/api/v1/customers", "1.1", 200),
        exc_info=None,
    )
    assert TruncateClientIPFilter().filter(record) is True
    assert record.args[0] == "203.0.113.0:54321"
    # Only the client address changes — everything else is untouched.
    assert record.args[1:] == ("GET", "/api/v1/customers", "1.1", 200)


def test_filter_rewrites_record_args_ipv6():
    record = logging.LogRecord(
        name="uvicorn.access",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg='%s - "%s %s HTTP/%s" %d',
        args=("2001:db8:85a3:8d3:1319:8a2e:370:7348:54321", "GET", "/", "1.1", 200),
        exc_info=None,
    )
    assert TruncateClientIPFilter().filter(record) is True
    # Bracketed (standard host:port notation) — "2001:db8:85a3::" already ends
    # in "::", so appending ":54321" unbracketed would read "...:::54321".
    assert record.args[0] == "[2001:db8:85a3::]:54321"


def test_full_ip_never_reaches_the_formatted_log_line():
    """Regression guard (AK-M19.4): render an access-log line the way uvicorn's
    AccessFormatter does and confirm the original, full client IP is absent."""
    full_ip = "203.0.113.45"
    record = logging.LogRecord(
        name="uvicorn.access",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg='%s - "%s %s HTTP/%s" %d',
        args=(f"{full_ip}:54321", "GET", "/api/v1/customers", "1.1", 200),
        exc_info=None,
    )
    TruncateClientIPFilter().filter(record)
    formatted = record.getMessage()

    assert full_ip not in formatted
    assert "203.0.113.0:54321" in formatted


def test_no_warning_when_own_ip_is_inside_configured_range(caplog):
    """M20: FORWARDED_ALLOW_IPS covering this container's own address is the
    expected, healthy state — no warning."""
    with patch("app.core.logging._own_container_ip", return_value="10.0.2.5"):
        with caplog.at_level(logging.WARNING):
            warn_if_forwarded_allow_ips_mismatches_network("10.0.0.0/8")
    assert caplog.records == []


def test_warns_when_own_ip_is_outside_configured_range(caplog):
    """M20: the actual drift scenario this check exists for — e.g. Coolify
    recreated the Docker network on a different subnet than what's
    configured."""
    with patch("app.core.logging._own_container_ip", return_value="10.0.2.5"):
        with caplog.at_level(logging.WARNING):
            warn_if_forwarded_allow_ips_mismatches_network("172.28.238.0/24")
    assert len(caplog.records) == 1
    assert "172.28.238.0/24" in caplog.records[0].message
    assert "10.0.2.5" in caplog.records[0].message


def test_no_warning_for_wildcard_trust():
    """FORWARDED_ALLOW_IPS=* trusts everyone — there is nothing to compare
    against, and it must never be flagged as "wrong"."""
    with patch("app.core.logging._own_container_ip", return_value="10.0.2.5"):
        warn_if_forwarded_allow_ips_mismatches_network("*")  # must not raise


def test_no_warning_when_own_ip_cannot_be_resolved(caplog):
    """Local dev outside Docker, or any environment where the container can't
    resolve its own hostname — degrade silently, don't false-positive."""
    with patch("app.core.logging._own_container_ip", return_value=None):
        with caplog.at_level(logging.WARNING):
            warn_if_forwarded_allow_ips_mismatches_network("10.0.0.0/8")
    assert caplog.records == []


def test_matches_literal_address_not_only_cidr(caplog):
    """FORWARDED_ALLOW_IPS may be a bare literal address, not just a CIDR
    range (matches uvicorn's own _TrustedHosts parsing) — must not false-positive."""
    with patch("app.core.logging._own_container_ip", return_value="127.0.0.1"):
        with caplog.at_level(logging.WARNING):
            warn_if_forwarded_allow_ips_mismatches_network("127.0.0.1")
    assert caplog.records == []
