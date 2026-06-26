"""
T026: Unit tests for atomic reschedule.
- Happy path: reschedule succeeds → new appt confirmed, old cancelled
- Conflict: target slot occupied → 409, original stays confirmed
"""
import datetime as dt
import secrets
from datetime import time as t
from unittest.mock import patch
from uuid import uuid4

import pytest
from httpx import AsyncClient, ASGITransport
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.main import app


def _slot_days(n: int, hour: int = 10) -> dt.datetime:
    target = dt.date.today() + dt.timedelta(days=n)
    return dt.datetime(target.year, target.month, target.day, hour, 0, 0, tzinfo=dt.timezone.utc)


@pytest.fixture(name="reschedule_setup")
async def reschedule_setup_fixture(session: AsyncSession):
    from app.domains.stammdaten.models import (
        SalonHours, Service, TeamMember, TeamMemberServiceLink, WorkingHours
    )
    service = Service(name="Haarschnitt", duration_minutes=30, price_cents=2500, is_active=True)
    member = TeamMember(name="Max", is_active=True)
    session.add_all([service, member])
    await session.flush()
    session.add(TeamMemberServiceLink(team_member_id=member.id, service_id=service.id))
    for dow in range(7):
        session.add(SalonHours(day_of_week=dow, is_open=True, open_time=t(8), close_time=t(20)))
        session.add(WorkingHours(team_member_id=member.id, day_of_week=dow, start_time=t(8), end_time=t(20)))
    await session.commit()
    return {"service_id": service.id, "member_id": member.id}


@pytest.fixture(name="rs_client")
async def rs_client_fixture(session: AsyncSession):
    def override():
        return session

    app.dependency_overrides[get_session] = override

    from app.core.limiter import limiter
    limiter.reset()

    with patch("app.domains.notifications.email.send_email", return_value=None):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c
    app.dependency_overrides.clear()


async def _book_and_login(client: AsyncClient, session: AsyncSession, setup: dict, email: str, slot_days: int = 5):
    """Register, verify, book appointment, login, return appointment id."""
    from app.domains.customer_account.models import CustomerToken, TokenPurpose
    from app.domains.booking.models import Customer as CustomerModel
    from sqlmodel import select
    import hashlib

    resp = await client.post("/api/v1/account/register", json={
        "name": "RS User",
        "email": email,
        "password": "password1234",
    })
    assert resp.status_code == 202

    cust = (await session.execute(select(CustomerModel).where(CustomerModel.email == email))).scalar_one()
    token = (await session.execute(
        select(CustomerToken).where(
            CustomerToken.customer_id == cust.id,
            CustomerToken.purpose == TokenPurpose.email_verification,
            CustomerToken.used_at == None,
        )
    )).scalar_one()
    plaintext = secrets.token_urlsafe(32)
    token.token_hash = hashlib.sha256(plaintext.encode()).hexdigest()
    session.add(token)
    await session.commit()
    await client.post(f"/api/v1/account/verify/{plaintext}")

    resp = await client.post("/api/v1/public/booking/appointments", json={
        "service_id": str(setup["service_id"]),
        "team_member_id": str(setup["member_id"]),
        "starts_at": _slot_days(slot_days).isoformat(),
        "customer": {"name": "RS User", "email": email, "phone": None},
        "privacy_acknowledged": True,
    })
    assert resp.status_code == 201
    appt_id = resp.json()["id"]

    await client.post("/api/v1/account/login", json={"email": email, "password": "password1234"})
    return appt_id


@pytest.mark.asyncio
async def test_reschedule_happy_path(rs_client: AsyncClient, session: AsyncSession, reschedule_setup):
    appt_id = await _book_and_login(rs_client, session, reschedule_setup, "rs_happy@example.com", slot_days=5)

    new_slot = _slot_days(7, hour=11).isoformat()
    resp = await rs_client.post(f"/api/v1/account/appointments/{appt_id}/reschedule", json={
        "starts_at": new_slot,
        "team_member_id": str(reschedule_setup["member_id"]),
    })
    assert resp.status_code == 200
    new_appt = resp.json()
    assert new_appt["status"] == "confirmed"
    assert new_appt["id"] != appt_id

    # Old appointment should now be cancelled
    from app.domains.booking.models import Appointment, AppointmentStatus
    from uuid import UUID
    old = await session.get(Appointment, UUID(appt_id))
    assert old.status == AppointmentStatus.cancelled


@pytest.mark.asyncio
async def test_reschedule_conflict_original_stays(rs_client: AsyncClient, session: AsyncSession, reschedule_setup):
    """If target slot is already taken, 409 and original appointment stays confirmed."""
    # Book two users: A and B
    appt_a = await _book_and_login(rs_client, session, reschedule_setup, "rs_conflict_a@example.com", slot_days=5)

    # Book B at the slot we want to reschedule A to
    target_slot = _slot_days(7, hour=11)
    resp = await rs_client.post("/api/v1/public/booking/appointments", json={
        "service_id": str(reschedule_setup["service_id"]),
        "team_member_id": str(reschedule_setup["member_id"]),
        "starts_at": target_slot.isoformat(),
        "customer": {"name": "B User", "email": "rs_conflict_b@example.com", "phone": None},
        "privacy_acknowledged": True,
    })
    assert resp.status_code == 201

    # Try to reschedule A to B's slot
    resp = await rs_client.post(f"/api/v1/account/appointments/{appt_a}/reschedule", json={
        "starts_at": target_slot.isoformat(),
        "team_member_id": str(reschedule_setup["member_id"]),
    })
    assert resp.status_code == 409
    assert resp.json()["detail"] == "BOOKING_CONFLICT"

    # Original appointment A should still be confirmed
    from app.domains.booking.models import Appointment, AppointmentStatus
    from uuid import UUID
    old = await session.get(Appointment, UUID(appt_a))
    assert old.status == AppointmentStatus.confirmed
