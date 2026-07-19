"""
Integration tests for the public cancellation flow (US3).
Runs against in-memory SQLite.
"""
import secrets
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app.domains.booking.models import Appointment, AppointmentOrigin, AppointmentStatus, Customer
from app.domains.stammdaten.models import Service, TeamMember


# ---------------------------------------------------------------------------
# Fixture — seeds one confirmed online appointment with a cancellation token
# ---------------------------------------------------------------------------


@pytest.fixture(name="cancel_setup")
async def cancel_setup_fixture(session: AsyncSession):
    service = Service(name="Haarschnitt", duration_minutes=30, price_cents=2500, is_active=True)
    member = TeamMember(name="Max Mustermann", is_active=True)
    customer = Customer(name="Erika Muster", email="erika@example.com")
    session.add_all([service, member, customer])
    await session.flush()

    # Appointment 7 days from now at 10:00 UTC — grid-aligned, within cancellation window
    future = datetime.now(timezone.utc) + timedelta(days=7)
    starts_at = future.replace(hour=10, minute=0, second=0, microsecond=0)
    token = secrets.token_urlsafe(32)
    apt = Appointment(
        team_member_id=member.id,
        service_id=service.id,
        customer_id=customer.id,
        starts_at=starts_at,
        ends_at=starts_at + timedelta(minutes=30),
        status=AppointmentStatus.confirmed,
        origin=AppointmentOrigin.online,
        cancellation_token=token,
    )
    session.add(apt)
    await session.commit()
    return {"appointment": apt, "token": token, "service": service, "member": member}


# ---------------------------------------------------------------------------
# GET /cancel/{token} — view endpoint
# ---------------------------------------------------------------------------


async def test_get_cancellation_view_returns_details(
    public_client: AsyncClient, cancel_setup: dict
):
    token = cancel_setup["token"]
    resp = await public_client.get(f"/api/v1/public/booking/cancel/{token}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "confirmed"
    assert body["cancellable"] is True
    assert body["service_name"] == "Haarschnitt"
    assert body["team_member_name"] == "Max Mustermann"
    assert body["cancellation_deadline"] is not None


async def test_get_cancellation_unknown_token_returns_404(public_client: AsyncClient):
    resp = await public_client.get("/api/v1/public/booking/cancel/unknown-token-xyz")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# US3 Sz. 1: Successful cancellation — slot becomes available again
# ---------------------------------------------------------------------------


async def test_cancel_success_returns_cancelled_status(
    public_client: AsyncClient, cancel_setup: dict
):
    token = cancel_setup["token"]
    resp = await public_client.post(f"/api/v1/public/booking/cancel/{token}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "cancelled"
    assert body["cancellable"] is False


async def test_slot_available_again_after_cancellation(
    public_client: AsyncClient, cancel_setup: dict, session: AsyncSession
):
    from app.domains.stammdaten.models import SalonHours, TeamMemberServiceLink, WorkingDaySchedule, WorkingInterval
    from datetime import time

    apt = cancel_setup["appointment"]
    service = cancel_setup["service"]
    member = cancel_setup["member"]
    token = cancel_setup["token"]

    # Seed hours so the slot actually appears in availability
    session.add(TeamMemberServiceLink(team_member_id=member.id, service_id=service.id))
    for dow in range(7):
        session.add(SalonHours(day_of_week=dow, is_open=True, open_time=time(8, 0), close_time=time(20, 0)))
        sched = WorkingDaySchedule(team_member_id=member.id, day_of_week=dow, is_working=True)
        session.add(sched)
        await session.flush()
        session.add(WorkingInterval(schedule_id=sched.id, start_time=time(8, 0), end_time=time(20, 0), sort_order=0))
    await session.commit()

    target_date = apt.starts_at.date().isoformat()

    # Before cancel — slot absent
    avail_before = await public_client.get(
        "/api/v1/public/booking/availability",
        params={"service_id": str(service.id), "team_member_id": str(member.id), "date": target_date},
    )
    booked_start = apt.starts_at.isoformat()[:19]
    slots_before = avail_before.json()["slots"]
    assert all(s["starts_at"][:19] != booked_start for s in slots_before)

    # Cancel
    await public_client.post(f"/api/v1/public/booking/cancel/{token}")

    # After cancel — slot present again
    avail_after = await public_client.get(
        "/api/v1/public/booking/availability",
        params={"service_id": str(service.id), "team_member_id": str(member.id), "date": target_date},
    )
    slots_after = avail_after.json()["slots"]
    assert any(s["starts_at"][:19] == booked_start for s in slots_after), "Slot not re-available"


# ---------------------------------------------------------------------------
# US3 Sz. 2: Deadline passed → 410
# ---------------------------------------------------------------------------


async def test_cancel_past_deadline_returns_410(
    public_client: AsyncClient, session: AsyncSession
):
    service = Service(name="Svc", duration_minutes=30, price_cents=1000, is_active=True)
    member = TeamMember(name="Ali", is_active=True)
    customer = Customer(name="Gast", email="gast@example.com")
    session.add_all([service, member, customer])
    await session.flush()

    # Appointment only 2 hours away — past the 24-h cutoff
    starts_at = datetime.now(timezone.utc) + timedelta(hours=2)
    token = secrets.token_urlsafe(32)
    apt = Appointment(
        team_member_id=member.id,
        service_id=service.id,
        customer_id=customer.id,
        starts_at=starts_at,
        ends_at=starts_at + timedelta(minutes=30),
        status=AppointmentStatus.confirmed,
        origin=AppointmentOrigin.online,
        cancellation_token=token,
    )
    session.add(apt)
    await session.commit()

    resp = await public_client.post(f"/api/v1/public/booking/cancel/{token}")
    assert resp.status_code == 410


# ---------------------------------------------------------------------------
# US3 Sz. 3: Repeated call is idempotent — shows cancelled
# ---------------------------------------------------------------------------


async def test_cancel_idempotent_returns_cancelled_on_repeat(
    public_client: AsyncClient, cancel_setup: dict
):
    token = cancel_setup["token"]
    r1 = await public_client.post(f"/api/v1/public/booking/cancel/{token}")
    r2 = await public_client.post(f"/api/v1/public/booking/cancel/{token}")
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r2.json()["status"] == "cancelled"


# ---------------------------------------------------------------------------
# Unknown token → 404
# ---------------------------------------------------------------------------


async def test_cancel_unknown_token_returns_404(public_client: AsyncClient):
    resp = await public_client.post("/api/v1/public/booking/cancel/no-such-token")
    assert resp.status_code == 404
