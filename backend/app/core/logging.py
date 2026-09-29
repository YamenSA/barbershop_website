"""Access-log IP truncation (M19) and FORWARDED_ALLOW_IPS drift detection (M20).

M19 removes the personal-data element from uvicorn's access log at the source
(zeroes the last IPv4 octet / last 80 IPv6 bits before the record is
formatted) instead of only bounding how long the otherwise-complete IP is
kept in the log file.

M20 makes FORWARDED_ALLOW_IPS a required Settings field, which catches a
*missing* value loudly (Pydantic ValidationError) — but a *wrong* value
(e.g. after Coolify recreates the Docker network with a different subnet)
fails silently: uvicorn just never trusts anything, rate limits quietly key
off the internal container IP again, with no error anywhere. There's no way
to validate "is this CIDR still correct" against an external source of
truth at startup, but there IS a cheap, real signal available: this
container's own IP is on the exact same Docker network as the peer
FORWARDED_ALLOW_IPS is meant to cover (both are attached to the same Compose
network). If our own address isn't inside the configured range, the range
is stale — log a warning.
"""
import ipaddress
import logging
import socket

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


def _own_container_ip() -> str | None:
    try:
        return socket.gethostbyname(socket.gethostname())
    except socket.gaierror:
        # Can't resolve our own hostname — e.g. local dev outside Docker on a
        # machine where that doesn't resolve. Nothing reliable to check against.
        return None


def warn_if_forwarded_allow_ips_mismatches_network(forwarded_allow_ips: str) -> None:
    """M20: log a warning if FORWARDED_ALLOW_IPS doesn't cover this
    container's own address — a cheap, real signal that the configured trust
    range no longer matches the actual Docker network (see module docstring).
    Never raises and never blocks startup — this is a diagnostic, not a gate;
    unlike a missing value, a wrong one can't be told apart from "correct but
    this particular check has a false positive" with full confidence, so it
    stays a warning that a human reads, not a startup failure.
    """
    if forwarded_allow_ips == "*":
        return  # explicit trust-everyone — nothing meaningful to compare

    own_ip = _own_container_ip()
    if own_ip is None:
        return

    try:
        own_addr = ipaddress.ip_address(own_ip)
    except ValueError:
        return

    for entry in forwarded_allow_ips.split(","):
        entry = entry.strip()
        if not entry:
            continue
        try:
            if "/" in entry:
                if own_addr in ipaddress.ip_network(entry, strict=False):
                    return
            elif own_addr == ipaddress.ip_address(entry):
                return
        except ValueError:
            continue  # not a parseable IP/network (matches uvicorn's own literal fallback) — nothing to compare

    logging.getLogger(__name__).warning(
        "FORWARDED_ALLOW_IPS=%s does not cover this container's own address "
        "(%s). The configured trust range likely no longer matches the actual "
        "Docker network (e.g. after Coolify recreated it with a different "
        "subnet) — X-Forwarded-For may silently stop being trusted, and rate "
        "limits / brute-force protection would key off the internal container "
        "IP again with no error. Run `docker network inspect` on the current "
        "network and update FORWARDED_ALLOW_IPS.",
        forwarded_allow_ips,
        own_ip,
    )
