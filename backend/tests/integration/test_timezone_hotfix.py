"""Characterization tests for the timezone hotfix (B-1).

These tests are written against BEHAVIOUR only (HTTP API, availability engine, reminder
job) and use nothing from ``app.core.time``: they must run — and FAIL — against the
pre-hotfix code, then pass after the fix. Convention under test:

* the salon works in Europe/Berlin wall time (09:00-18:00), the database stores real UTC;
* "what the customer sees" == "what the mail says" == "what the admin sees" == salon time.

Expected values are computed with plain zoneinfo, independent of the code under test.
"""
import importlib
import re
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.limiter import limiter
from app.domains.booking.availability import get_available_slots
from app.domains.notifications.reminders import run_reminder_job
from app.domains.stammdaten.models import (
    SalonHours,
    Service,
    TeamMember,
    TeamMemberServiceLink,
    WorkingDaySchedule,
    WorkingInterval,
)

BER = ZoneInfo("Europe/Berlin")


def berlin(y, m, d, hh=0, mm=0):
    """Berlin wall time -> aware UTC instant (independent reference implementation)."""
    return datetime(y, m, d, hh, mm, tzinfo=BER).astimezone(timezone.utc)


def utc_iso(y, m, d, hh=0, mm=0) -> str:
    """What the admin UI sends: `new Date(datetime-local).toISOString()` = the real instant in UTC."""
    return berlin(y, m, d, hh, mm).isoformat()


def local_hhmm(iso_or_dt) -> str:
    dt = datetime.fromisoformat(iso_or_dt) if isinstance(iso_or_dt, str) else iso_or_dt
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(BER).strftime("%H:%M")


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    limiter.reset()
    yield
    limiter.reset()


async def seed_salon(session: AsyncSession, *, duration=30):
    """Salon open 09:00-18:00 on ALL days (so DST Sundays can be tested), one bookable stylist."""
    service = Service(name=f"Svc-{datetime.now().timestamp()}", duration_minutes=duration, price_cents=2000, is_active=True)
    member = TeamMember(name="Stylist", is_active=True)
    session.add_all([service, member])
    await session.flush()
    session.add(TeamMemberServiceLink(team_member_id=member.id, service_id=service.id))
    for dow in range(7):
        session.add(SalonHours(day_of_week=dow, is_open=True, open_time=time(9, 0), close_time=time(18, 0)))
        sched = WorkingDaySchedule(team_member_id=member.id, day_of_week=dow, is_working=True)
        session.add(sched)
        await session.flush()
        session.add(WorkingInterval(schedule_id=sched.id, start_time=time(9, 0), end_time=time(18, 0), sort_order=0))
    await session.commit()
    return service, member


def open_booking_window(monkeypatch):
    """Take 'now' out of the picture for tests about fixed calendar dates."""
    monkeypatch.setattr(settings, "BOOKING_MIN_LEAD_HOURS", -10**6)
    monkeypatch.setattr(settings, "BOOKING_MAX_HORIZON_DAYS", 10**5)


def freeze_now(monkeypatch, instant: datetime):
    """Freeze datetime.now() in every module that reads the clock (works before and after the fix)."""

    class Frozen(datetime):
        @classmethod
        def now(cls, tz=None):
            return instant.astimezone(tz) if tz is not None else instant.replace(tzinfo=None)

    for name in (
        "app.domains.booking.service",
        "app.domains.booking.availability",
        "app.domains.notifications.reminders",
        "app.core.time",
    ):
        try:
            module = importlib.import_module(name)
        except ImportError:
            continue
        if hasattr(module, "datetime"):
            monkeypatch.setattr(module, "datetime", Frozen)


def capture_emails(monkeypatch):
    sent = []
    monkeypatch.setattr("app.domains.notifications.service.send_email", lambda msg: sent.append(msg))
    return sent


async def book(public_client: AsyncClient, service, member, starts_at_iso: str, email="kunde@example.com"):
    resp = await public_client.post(
        "/api/v1/public/booking/appointments",
        json={
            "service_id": str(service.id),
            "team_member_id": str(member.id),
            "starts_at": starts_at_iso,
            "customer": {"name": "Test Kunde", "email": email},
            "privacy_acknowledged": True,
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def public_slots(public_client, service, member, day: str):
    resp = await public_client.get(
        "/api/v1/public/booking/availability",
        params={"service_id": str(service.id), "team_member_id": str(member.id), "date": day},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["slots"]


# ---------------------------------------------------------------------------
# T1-T6  Slots span 09:00-17:30 salon time on every relevant date
# ---------------------------------------------------------------------------

SLOT_DATES = [
    date(2026, 10, 13),  # summer (CEST, +02:00)
    date(2026, 10, 24),  # Saturday before the switch (CEST)
    date(2026, 10, 25),  # switch day: 03:00 CEST -> 02:00 CET (Sunday, opened for the test)
    date(2026, 10, 26),  # Monday after the switch (CET, +01:00)
    date(2026, 10, 27),  # winter
    date(2027, 3, 27),   # Saturday before spring-forward (CET)
    date(2027, 3, 28),   # spring-forward day (02:00 -> 03:00, Sunday, opened for the test)
    date(2027, 3, 29),   # Monday after spring-forward (CEST)
]


@pytest.mark.parametrize("day", SLOT_DATES, ids=lambda d: d.isoformat())
async def test_slots_span_salon_opening_hours_in_berlin_time(session: AsyncSession, day: date):
    service, member = await seed_salon(session)
    slots = await get_available_slots(session, member.id, service.id, day)

    assert len(slots) == 35  # 09:00 .. 17:30 on a 15-minute grid
    assert slots[0].starts_at == berlin(day.year, day.month, day.day, 9, 0)
    assert slots[-1].starts_at == berlin(day.year, day.month, day.day, 17, 30)


async def test_summer_and_winter_offsets_differ_by_exactly_one_hour(session: AsyncSession):
    service, member = await seed_salon(session)
    summer = (await get_available_slots(session, member.id, service.id, date(2026, 10, 24)))[0].starts_at
    winter = (await get_available_slots(session, member.id, service.id, date(2026, 10, 26)))[0].starts_at
    assert summer.astimezone(timezone.utc).time() == time(7, 0)  # 09:00 CEST
    assert winter.astimezone(timezone.utc).time() == time(8, 0)  # 09:00 CET


async def test_public_availability_api_uses_berlin_offset(
    public_client: AsyncClient, session: AsyncSession, monkeypatch
):
    open_booking_window(monkeypatch)
    service, member = await seed_salon(session)

    summer = await public_slots(public_client, service, member, "2026-10-13")
    assert datetime.fromisoformat(summer[0]["starts_at"]) == berlin(2026, 10, 13, 9, 0)
    assert summer[0]["starts_at"].endswith("+02:00")
    assert datetime.fromisoformat(summer[-1]["starts_at"]) == berlin(2026, 10, 13, 17, 30)

    winter = await public_slots(public_client, service, member, "2026-10-27")
    assert winter[0]["starts_at"].endswith("+01:00")
    assert datetime.fromisoformat(winter[0]["starts_at"]) == berlin(2026, 10, 27, 9, 0)


# ---------------------------------------------------------------------------
# T2  Mail = website = admin
# ---------------------------------------------------------------------------


async def test_mail_website_and_admin_show_the_same_salon_time(
    public_client: AsyncClient, client: AsyncClient, session: AsyncSession, monkeypatch
):
    open_booking_window(monkeypatch)
    emails = capture_emails(monkeypatch)
    service, member = await seed_salon(session)

    slots = await public_slots(public_client, service, member, "2026-10-13")
    chosen = slots[0]  # the customer picks the first offered slot
    booked = await book(public_client, service, member, chosen["starts_at"])

    website = local_hhmm(chosen["starts_at"])  # what the browser shows the customer
    confirmation = local_hhmm(booked["starts_at"])
    admin_rows = (await client.get("/api/v1/appointments")).json()
    assert len(admin_rows) == 1
    admin = local_hhmm(admin_rows[0]["starts_at"])  # what FullCalendar shows in salon time

    assert len(emails) == 1
    mail = re.search(r"um (\d{2}:\d{2}) Uhr", emails[0].html_body).group(1)

    assert website == confirmation == admin == mail == "09:00"


# ---------------------------------------------------------------------------
# T14  Admin appointment and online slots collide correctly
# ---------------------------------------------------------------------------


def admin_payload(service, member, starts_at, **extra):
    return {
        "team_member_id": str(member.id),
        "service_id": str(service.id),
        "guest_name": "Gast",
        "guest_phone": "0123",
        "starts_at": starts_at,
        **extra,
    }


async def test_admin_appointment_blocks_the_matching_online_slots(
    client: AsyncClient, session: AsyncSession
):
    service, member = await seed_salon(session)
    resp = await client.post(
        "/api/v1/appointments", json=admin_payload(service, member, utc_iso(2026, 10, 13, 10, 0), admin_override=True)
    )
    assert resp.status_code == 201, resp.text

    slots = await get_available_slots(session, member.id, service.id, date(2026, 10, 13))
    starts = {local_hhmm(s.starts_at) for s in slots}
    # 10:00-10:30 blocks the 09:45, 10:00 and 10:15 starts of a 30-minute service.
    assert not starts & {"09:45", "10:00", "10:15"}
    assert len(slots) == 32


async def test_online_booking_on_an_admin_booked_slot_conflicts(
    client: AsyncClient, public_client: AsyncClient, session: AsyncSession, monkeypatch
):
    open_booking_window(monkeypatch)
    service, member = await seed_salon(session)
    assert (await client.post(
        "/api/v1/appointments", json=admin_payload(service, member, utc_iso(2026, 10, 13, 10, 0), admin_override=True)
    )).status_code == 201

    resp = await public_client.post(
        "/api/v1/public/booking/appointments",
        json={
            "service_id": str(service.id),
            "team_member_id": str(member.id),
            "starts_at": utc_iso(2026, 10, 13, 10, 0),
            "customer": {"name": "X", "email": "x@example.com"},
            "privacy_acknowledged": True,
        },
    )
    assert resp.status_code == 409


# ---------------------------------------------------------------------------
# T15  Admin schedule check runs on the salon clock
# ---------------------------------------------------------------------------


async def test_admin_schedule_check_uses_salon_clock(client: AsyncClient, session: AsyncSession):
    service, member = await seed_salon(session)

    inside = await client.post("/api/v1/appointments", json=admin_payload(service, member, utc_iso(2026, 10, 13, 10, 0)))
    assert inside.status_code == 201, inside.text

    too_late = await client.post("/api/v1/appointments", json=admin_payload(service, member, utc_iso(2026, 10, 13, 17, 45)))
    assert too_late.status_code == 422  # ends 18:15, salon closes 18:00


# ---------------------------------------------------------------------------
# T16/T17  Day windows and the naive-input contract
# ---------------------------------------------------------------------------


async def test_appointment_after_midnight_belongs_to_the_berlin_day(client: AsyncClient, session: AsyncSession):
    service, member = await seed_salon(session)
    created = await client.post(
        "/api/v1/appointments", json=admin_payload(service, member, utc_iso(2026, 10, 13, 0, 30), admin_override=True)
    )
    assert created.status_code == 201, created.text  # 22:30 UTC on 12 Oct, but 13 Oct in Berlin

    dash = (await client.get("/api/v1/admin/dashboard", params={"date": "2026-10-13"})).json()
    assert len(dash["appointments"]) == 1
    day_before = (await client.get("/api/v1/admin/dashboard", params={"date": "2026-10-12"})).json()
    assert day_before["appointments"] == []

    listed = (await client.get("/api/v1/appointments", params={"from_date": "2026-10-13", "to_date": "2026-10-13"})).json()
    assert len(listed) == 1


async def test_naive_input_is_salon_wall_time(client: AsyncClient, session: AsyncSession):
    service, member = await seed_salon(session)
    resp = await client.post(
        "/api/v1/appointments", json=admin_payload(service, member, "2026-10-13T10:00:00", admin_override=True)
    )
    assert resp.status_code == 201, resp.text
    assert datetime.fromisoformat(resp.json()["starts_at"]) == berlin(2026, 10, 13, 10, 0)


# ---------------------------------------------------------------------------
# T11  24-hour cancellation deadline in REAL hours (also across the DST switch)
# ---------------------------------------------------------------------------


async def _book_first_slot(public_client, service, member, day, booked_at_utc, monkeypatch):
    freeze_now(monkeypatch, booked_at_utc)
    slots = await public_slots(public_client, service, member, day)
    return await book(public_client, service, member, slots[0]["starts_at"])


@pytest.mark.parametrize(
    "day, deadline",
    [
        # Monday 26.10. 09:00 CET = 08:00Z  ->  deadline Sunday 25.10. 08:00Z (= 09:00 CET)
        ("2026-10-26", datetime(2026, 10, 25, 8, 0, tzinfo=timezone.utc)),
        # Sunday 25.10. 09:00 CET = 08:00Z  ->  deadline Saturday 24.10. 08:00Z (= 10:00 CEST, 25 wall-clock hours)
        ("2026-10-25", datetime(2026, 10, 24, 8, 0, tzinfo=timezone.utc)),
    ],
)
async def test_cancellation_deadline_is_24_real_hours(
    public_client: AsyncClient, session: AsyncSession, monkeypatch, day, deadline
):
    emails = capture_emails(monkeypatch)  # noqa: F841
    service, member = await seed_salon(session)
    booked = await _book_first_slot(public_client, service, member, day, datetime(2026, 10, 20, 8, 0, tzinfo=timezone.utc), monkeypatch)
    token = booked["cancellation_token"]

    # 30 minutes before the deadline: still cancellable
    freeze_now(monkeypatch, deadline - timedelta(minutes=30))
    view = (await public_client.get(f"/api/v1/public/booking/cancel/{token}")).json()
    assert view["cancellable"] is True

    # 30 minutes after the deadline (still 23.5 real hours before the appointment): refused
    freeze_now(monkeypatch, deadline + timedelta(minutes=30))
    view = (await public_client.get(f"/api/v1/public/booking/cancel/{token}")).json()
    assert view["cancellable"] is False
    refused = await public_client.post(f"/api/v1/public/booking/cancel/{token}")
    assert refused.status_code == 410


@pytest.mark.parametrize(
    "day, deadline",
    [
        ("2026-10-26", datetime(2026, 10, 25, 8, 0, tzinfo=timezone.utc)),
        ("2026-10-25", datetime(2026, 10, 24, 8, 0, tzinfo=timezone.utc)),
        ("2026-10-13", datetime(2026, 10, 12, 7, 0, tzinfo=timezone.utc)),  # summer: 09:00 CEST = 07:00Z
    ],
)
async def test_deadline_for_the_first_bookable_slot_of_a_day(session: AsyncSession, monkeypatch, day, deadline):
    """Isolates the deadline arithmetic from HTTP/SQLite details: take the value the booking
    engine would store for the 09:00 opening slot and ask for the cancellation view."""
    from app.domains.booking.models import Appointment
    from app.domains.booking.service import _build_cancellation_view

    service, member = await seed_salon(session)
    first = (await get_available_slots(session, member.id, service.id, date.fromisoformat(day)))[0]
    transient = Appointment(
        team_member_id=member.id, service_id=service.id,
        starts_at=first.starts_at, ends_at=first.ends_at,
    )  # not persisted: keeps datetimes timezone-aware on SQLite

    freeze_now(monkeypatch, deadline - timedelta(minutes=30))
    assert (await _build_cancellation_view(session, transient)).cancellable is True
    freeze_now(monkeypatch, deadline + timedelta(minutes=30))
    assert (await _build_cancellation_view(session, transient)).cancellable is False


# ---------------------------------------------------------------------------
# T12  2-hour lead time in real hours
# ---------------------------------------------------------------------------


async def test_lead_time_is_two_real_hours(public_client: AsyncClient, session: AsyncSession, monkeypatch):
    monkeypatch.setattr(settings, "BOOKING_MIN_LEAD_HOURS", 2)
    monkeypatch.setattr(settings, "BOOKING_MAX_HORIZON_DAYS", 60)
    service, member = await seed_salon(session)

    freeze_now(monkeypatch, berlin(2026, 10, 13, 8, 0))  # 08:00 Berlin
    slots = await public_slots(public_client, service, member, "2026-10-13")
    assert datetime.fromisoformat(slots[0]["starts_at"]) == berlin(2026, 10, 13, 10, 0)

    freeze_now(monkeypatch, berlin(2026, 10, 27, 8, 0))  # same in winter
    slots = await public_slots(public_client, service, member, "2026-10-27")
    assert datetime.fromisoformat(slots[0]["starts_at"]) == berlin(2026, 10, 27, 10, 0)


# ---------------------------------------------------------------------------
# T13  Reminder window in real hours
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "day, in_window_now, out_of_window_now",
    [
        # first slot = 09:00 Berlin. Window is (now+30min, now+24h].
        ("2026-10-27", datetime(2026, 10, 26, 8, 5, tzinfo=timezone.utc), datetime(2026, 10, 26, 7, 55, tzinfo=timezone.utc)),  # winter: 09:00 CET = 08:00Z
        ("2026-10-13", datetime(2026, 10, 12, 7, 5, tzinfo=timezone.utc), datetime(2026, 10, 12, 6, 55, tzinfo=timezone.utc)),  # summer: 09:00 CEST = 07:00Z
    ],
)
async def test_reminder_window_uses_real_appointment_time(
    public_client: AsyncClient, session: AsyncSession, monkeypatch, day, in_window_now, out_of_window_now
):
    emails = capture_emails(monkeypatch)
    service, member = await seed_salon(session)
    await _book_first_slot(public_client, service, member, day, datetime(2026, 10, 1, 8, 0, tzinfo=timezone.utc), monkeypatch)
    emails.clear()

    freeze_now(monkeypatch, out_of_window_now)  # 24h05m before the real appointment
    assert (await run_reminder_job(session)).reminders_sent == 0

    freeze_now(monkeypatch, in_window_now)  # 23h55m before the real appointment
    assert (await run_reminder_job(session)).reminders_sent == 1
    assert "09:00" in emails[-1].html_body
