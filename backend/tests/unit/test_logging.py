import logging

from app.core.logging import TruncateClientIPFilter, truncate_ip


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
