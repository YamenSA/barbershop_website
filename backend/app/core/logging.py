"""Access-log IP truncation (M19).

Removes the personal-data element from uvicorn's access log at the source
(zeroes the last IPv4 octet / last 80 IPv6 bits before the record is
formatted) instead of only bounding how long the otherwise-complete IP is
kept in the log file.
"""
import ipaddress
import logging

_IPV4_PREFIX = 24  # keeps the first 3 octets, zeroes the last one
_IPV6_PREFIX = 48  # keeps the first 48 bits, zeroes the last 80 bits


def truncate_ip(host: str) -> str:
    """Zero the last IPv4 octet / last 80 IPv6 bits of `host`.

    Returns `host` unchanged if it isn't a parseable IP address (e.g. a
    unix-socket path or an empty client address).
    """
    try:
        addr = ipaddress.ip_address(host)
    except ValueError:
        return host
    prefix = _IPV4_PREFIX if addr.version == 4 else _IPV6_PREFIX
    network = ipaddress.ip_network(f"{host}/{prefix}", strict=False)
    return str(network.network_address)


class TruncateClientIPFilter(logging.Filter):
    """Rewrites the client address in uvicorn.access LogRecords before they
    are formatted, so the full IP never reaches the formatted log line.

    uvicorn's access logger calls `logger.info('%s - "%s %s HTTP/%s" %d',
    client_addr, method, path, http_version, status)` — record.args is a
    5-tuple with the "host:port" client address as the first element.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        args = record.args
        if isinstance(args, tuple) and args and isinstance(args[0], str) and ":" in args[0]:
            host, _, port = args[0].rpartition(":")
            truncated = truncate_ip(host)
            # Truncated IPv6 network addresses commonly end in "::" (trailing
            # zero groups compressed) — appending ":<port>" directly would
            # produce an ambiguous/malformed "...:::<port>". Bracket IPv6
            # addresses (standard host:port notation, e.g. "[::1]:8080")
            # instead; IPv4 never contains a colon, so it stays unbracketed.
            client_addr = f"[{truncated}]:{port}" if ":" in truncated else f"{truncated}:{port}"
            record.args = (client_addr, *args[1:])
        return True


def setup_access_log_ip_truncation() -> None:
    """Attach the IP-truncation filter to uvicorn's access logger (M19)."""
    logging.getLogger("uvicorn.access").addFilter(TruncateClientIPFilter())
