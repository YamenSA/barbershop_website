"""Single source of truth for time handling (timezone hotfix, B-1).

Convention — the whole application follows it:

* The database stores REAL UTC instants (timestamptz).
* Everything the salon *means* by a clock time ("open 09:00", "appointment at
  10:00", "24 h before") is Europe/Berlin wall time and is converted here,
  explicitly, per date via zoneinfo — never with a fixed offset and never with
  the server's or the browser's local time zone.
* Naive datetimes coming from the outside (API input, tests) are Berlin wall
  time. Naive datetimes coming *from the database driver* (SQLite returns them)
  are UTC — use ``as_utc`` for those.

Stdlib only, so it can be reused by scripts that must not import the app.
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

UTC = timezone.utc
SALON_TZ = ZoneInfo("Europe/Berlin")


def salon_now() -> datetime:
    """Current instant, expressed in salon time (aware)."""
    return datetime.now(SALON_TZ)


def salon_today() -> date:
    return salon_now().date()


def as_utc(dt: datetime) -> datetime:
    """A value read from the database → aware UTC (naive means UTC there)."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def to_utc(dt: datetime, naive_is=SALON_TZ) -> datetime:
    """External input → aware UTC. Naive input is salon (Berlin) wall time."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=naive_is)
    return dt.astimezone(UTC)


def to_salon(dt: datetime) -> datetime:
    """Instant (aware, or naive-from-database = UTC) → salon wall time (aware)."""
    return as_utc(dt).astimezone(SALON_TZ)


def combine_local(d: date, t: time) -> datetime:
    """Berlin wall time ``t`` on date ``d`` → aware UTC instant.

    Ambiguous wall times (25 Oct 2026, 02:00–02:59) resolve to the first
    occurrence (fold=0); non-existent ones (28 Mar 2027, 02:00–02:59) move
    forward — zoneinfo semantics (PEP 495).
    """
    return datetime.combine(d, t.replace(tzinfo=None), tzinfo=SALON_TZ).astimezone(UTC)


def salon_day_bounds(d: date) -> tuple[datetime, datetime]:
    """[start, end) of the Berlin calendar day ``d`` as UTC instants (23/25 h on DST days)."""
    return combine_local(d, time.min), combine_local(d + timedelta(days=1), time.min)


def format_salon(dt: datetime, fmt: str = "%d.%m.%Y um %H:%M Uhr") -> str:
    return to_salon(dt).strftime(fmt)
