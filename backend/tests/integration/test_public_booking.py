"""
Integration tests for the public booking flow (US1).
Runs against in-memory SQLite — no Docker required.
"""
import datetime as dt
from uuid import UUID

import pytest
from httpx import AsyncClient, ASGITransport
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.main import app


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------



@pytest.fixture(name="setup")
async def booking_setup_fixture(session: AsyncSession):
    """Seed: one service, one team member, full-week salon + working hours."""
    from datetime import time

    from app.domains.stammdaten.models import (
        SalonHours,
        Service,
        TeamMember,
        TeamMemberServiceLink,
        WorkingHours,
    )

    service = Service(name="Haarschnitt", duration_minutes=30, price_cents=2500, is_active=True)
    member = TeamMember(name="Max Mustermann", is_active=True)
    session.add_all([service, member])
    await session.flush()

    session.add(TeamMemberServiceLink(team_member_id=member.id, service_id=service.id))

    for dow in range(7):
        session.add(SalonHours(day_of_week=dow, is_open=True, open_time=time(8, 0), close_time=time(20, 0)))
        session.add(WorkingHours(team_member_id=member.id, day_of_week=dow, start_time=time(8, 0), end_time=time(20, 0)))

    await session.commit()
    return {"service_id": str(service.id), "member_id": str(member.id)}


def _slot_in_7_days() -> str:
    """Returns an ISO datetime 7 days from now at 10:00 UTC — always passes guardrails."""
    target = dt.date.today() + dt.timedelta(days=7)
    starts_at = dt.datetime(target.year, target.month, target.day, 10, 0, 0, tzinfo=dt.timezone.utc)
    return starts_at.isoformat()


def _booking_payload(setup: dict, **overrides) -> dict:
    payload = {
        "service_id": setup["service_id"],
        "team_member_id": setup["member_id"],
        "starts_at": _slot_in_7_days(),
        "customer": {"name": "Erika Muster", "email": "erika@example.com"},
        "privacy_acknowledged": True,
    }
    payload.update(overrides)
    return payload


# ---------------------------------------------------------------------------
# US1 — Scenario 1: Happy path — book and slot disappears
# ---------------------------------------------------------------------------


async def test_happy_path_booking_returns_201(public_client: AsyncClient, setup: dict):
    payload = _booking_payload(setup)
    resp = await public_client.post("/api/v1/public/booking/appointments", json=payload)
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "confirmed"
    assert body["cancellation_token"]
    assert body["payment_note"]


async def test_slot_unavailable_after_booking(public_client: AsyncClient, setup: dict):
    payload = _booking_payload(setup)
    resp = await public_client.post("/api/v1/public/booking/appointments", json=payload)
    assert resp.status_code == 201

    target_date = (dt.date.today() + dt.timedelta(days=7)).isoformat()
    avail_resp = await public_client.get(
        "/api/v1/public/booking/availability",
        params={
            "service_id": setup["service_id"],
            "team_member_id": setup["member_id"],
            "date": target_date,
        },
    )
    assert avail_resp.status_code == 200
    slots = avail_resp.json()["slots"]
    booked_time = _slot_in_7_days()
    booked_start = booked_time[:19]  # strip tz for comparison
    assert all(s["starts_at"][:19] != booked_start for s in slots), "Booked slot still appears"


# ---------------------------------------------------------------------------
# US1 — Scenario 2: Walk-in collision blocks slot
# ---------------------------------------------------------------------------


async def test_walkin_conflict_returns_409(public_client: AsyncClient, setup: dict, session: AsyncSession):
    from app.domains.booking.models import Appointment, AppointmentStatus

    starts_at_str = _slot_in_7_days()
    starts_at = dt.datetime.fromisoformat(starts_at_str)
    ends_at = starts_at + dt.timedelta(minutes=30)

    # Create a walk-in appointment for the same slot
    walkin = Appointment(
        team_member_id=UUID(setup["member_id"]),
        service_id=UUID(setup["service_id"]),
        guest_name="Walk-in Kunde",
        guest_phone="+49123456789",
        starts_at=starts_at,
        ends_at=ends_at,
        status=AppointmentStatus.confirmed,
    )
    session.add(walkin)
    await session.commit()

    payload = _booking_payload(setup)
    resp = await public_client.post("/api/v1/public/booking/appointments", json=payload)
    assert resp.status_code == 409


# ---------------------------------------------------------------------------
# US1 — Scenario 4: Overlap pre-check → 409
# ---------------------------------------------------------------------------


async def test_double_booking_returns_409(public_client: AsyncClient, setup: dict):
    payload = _booking_payload(setup)
    r1 = await public_client.post("/api/v1/public/booking/appointments", json=payload)
    assert r1.status_code == 201

    payload2 = _booking_payload(setup, customer={"name": "Zweiter Gast", "email": "zweiter@example.com"})
    r2 = await public_client.post("/api/v1/public/booking/appointments", json=payload2)
    assert r2.status_code == 409


# ---------------------------------------------------------------------------
# US1 — Scenario 5: Duration overhang at closing time
# ---------------------------------------------------------------------------


async def test_slot_beyond_closing_not_offered(public_client: AsyncClient, setup: dict):
    target_date = (dt.date.today() + dt.timedelta(days=7)).isoformat()
    resp = await public_client.get(
        "/api/v1/public/booking/availability",
        params={"service_id": setup["service_id"], "team_member_id": setup["member_id"], "date": target_date},
    )
    assert resp.status_code == 200
    slots = resp.json()["slots"]
    # Closing is 20:00; 30-min service → last valid start is 19:30
    for slot in slots:
        start = dt.datetime.fromisoformat(slot["starts_at"].replace("Z", "+00:00"))
        end = dt.datetime.fromisoformat(slot["ends_at"].replace("Z", "+00:00"))
        assert end.time() <= dt.time(20, 0), f"Slot ends after closing: {end}"


# ---------------------------------------------------------------------------
# Guardrails → 422
# ---------------------------------------------------------------------------


async def test_guardrail_too_soon_returns_422(public_client: AsyncClient, setup: dict):
    too_soon = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=1)).isoformat()
    payload = _booking_payload(setup, starts_at=too_soon)
    resp = await public_client.post("/api/v1/public/booking/appointments", json=payload)
    assert resp.status_code == 422


async def test_guardrail_too_far_returns_422(public_client: AsyncClient, setup: dict):
    too_far = (dt.datetime.now(dt.timezone.utc) + dt.timedelta(days=65)).isoformat()
    payload = _booking_payload(setup, starts_at=too_far)
    resp = await public_client.post("/api/v1/public/booking/appointments", json=payload)
    assert resp.status_code == 422


async def test_missing_privacy_acknowledged_returns_422(public_client: AsyncClient, setup: dict):
    payload = _booking_payload(setup, privacy_acknowledged=False)
    resp = await public_client.post("/api/v1/public/booking/appointments", json=payload)
    assert resp.status_code == 422


async def test_missing_customer_email_returns_422(public_client: AsyncClient, setup: dict):
    payload = _booking_payload(setup)
    payload["customer"] = {"name": "Kein Mail"}
    resp = await public_client.post("/api/v1/public/booking/appointments", json=payload)
    assert resp.status_code == 422
