"""Unit tests for app.core.time and the API datetime types (timezone hotfix, B-1)."""
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest
from pydantic import BaseModel

from app.core.schema_types import SalonDatetimeIn, SalonDatetimeOut
from app.core.time import (
    SALON_TZ,
    as_utc,
    combine_local,
    format_salon,
    salon_day_bounds,
    to_salon,
    to_utc,
)

UTC = timezone.utc


@pytest.mark.parametrize(
    "d, expected_utc",
    [
        (date(2026, 10, 13), datetime(2026, 10, 13, 7, 0, tzinfo=UTC)),   # CEST: -2 h
        (date(2026, 10, 24), datetime(2026, 10, 24, 7, 0, tzinfo=UTC)),   # last CEST day
        (date(2026, 10, 25), datetime(2026, 10, 25, 8, 0, tzinfo=UTC)),   # switch day, 09:00 is already CET
        (date(2026, 10, 26), datetime(2026, 10, 26, 8, 0, tzinfo=UTC)),   # CET: -1 h
        (date(2027, 3, 27), datetime(2027, 3, 27, 8, 0, tzinfo=UTC)),
        (date(2027, 3, 28), datetime(2027, 3, 28, 7, 0, tzinfo=UTC)),     # switch day, 09:00 is already CEST
        (date(2027, 3, 29), datetime(2027, 3, 29, 7, 0, tzinfo=UTC)),
    ],
)
def test_combine_local_uses_the_offset_of_that_date(d, expected_utc):
    assert combine_local(d, time(9, 0)) == expected_utc


def test_combine_local_dst_edges_are_deterministic():
    # 25 Oct 2026 02:30 exists twice (CEST then CET): first occurrence (fold=0) = 00:30Z.
    assert combine_local(date(2026, 10, 25), time(2, 30)) == datetime(2026, 10, 25, 0, 30, tzinfo=UTC)
    # 28 Mar 2027 02:30 does not exist: moves forward to 03:30 CEST = 01:30Z.
    assert combine_local(date(2027, 3, 28), time(2, 30)) == datetime(2027, 3, 28, 1, 30, tzinfo=UTC)


@pytest.mark.parametrize(
    "d, hours",
    [(date(2026, 10, 24), 24), (date(2026, 10, 25), 25), (date(2026, 10, 26), 24),
     (date(2027, 3, 27), 24), (date(2027, 3, 28), 23), (date(2027, 3, 29), 24)],
)
def test_salon_day_has_23_24_or_25_hours(d, hours):
    start, end = salon_day_bounds(d)
    assert (end - start) == timedelta(hours=hours)
    assert start.tzinfo is not None and start.utcoffset() == timedelta(0)


def test_a_00_30_appointment_belongs_to_its_berlin_day_not_the_utc_day():
    start, end = salon_day_bounds(date(2026, 10, 13))
    instant = datetime(2026, 10, 12, 22, 30, tzinfo=UTC)  # 00:30 CEST on the 13th
    assert start <= instant < end


def test_naive_semantics_are_explicit():
    naive = datetime(2026, 10, 13, 9, 0)
    assert to_utc(naive) == datetime(2026, 10, 13, 7, 0, tzinfo=UTC)          # external input: Berlin wall time
    assert as_utc(naive) == datetime(2026, 10, 13, 9, 0, tzinfo=UTC)          # database value: UTC
    assert to_salon(naive).hour == 11                                          # a DB value shown in salon time
    aware = datetime(2026, 10, 13, 9, 0, tzinfo=ZoneInfo("America/New_York"))
    assert to_utc(aware) == datetime(2026, 10, 13, 13, 0, tzinfo=UTC)


def test_format_salon_never_shows_the_utc_clock():
    assert format_salon(datetime(2026, 10, 13, 7, 0, tzinfo=UTC)) == "13.10.2026 um 09:00 Uhr"
    assert format_salon(datetime(2026, 10, 27, 8, 0, tzinfo=UTC)) == "27.10.2026 um 09:00 Uhr"


class _In(BaseModel):
    at: SalonDatetimeIn


class _Out(BaseModel):
    at: SalonDatetimeOut


def test_request_type_naive_is_berlin_aware_is_instant():
    assert _In(at="2026-10-13T09:00:00").at == datetime(2026, 10, 13, 7, 0, tzinfo=UTC)
    assert _In(at="2026-10-13T09:00:00+02:00").at == datetime(2026, 10, 13, 7, 0, tzinfo=UTC)
    assert _In(at="2026-10-13T07:00:00Z").at == datetime(2026, 10, 13, 7, 0, tzinfo=UTC)


def test_response_type_serialises_with_berlin_offset_only_in_json():
    model = _Out(at=datetime(2026, 10, 13, 7, 0, tzinfo=UTC))
    assert model.model_dump_json() == '{"at":"2026-10-13T09:00:00+02:00"}'
    assert model.model_dump()["at"] == datetime(2026, 10, 13, 7, 0, tzinfo=UTC)  # python mode untouched
    assert _Out(at=datetime(2026, 10, 27, 8, 0, tzinfo=UTC)).model_dump_json() == '{"at":"2026-10-27T09:00:00+01:00"}'


def test_response_type_treats_naive_database_values_as_utc():
    assert _Out(at=datetime(2026, 10, 13, 7, 0)).model_dump_json() == '{"at":"2026-10-13T09:00:00+02:00"}'


def test_salon_tz_is_europe_berlin():
    assert SALON_TZ.key == "Europe/Berlin"
