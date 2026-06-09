from datetime import datetime, timedelta, timezone
from uuid import UUID

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.domains.booking.models import Appointment, Customer
from app.domains.stammdaten.models import Service, TeamMember
from app.main import app


@pytest.mark.asyncio
async def test_booking_integrity_overlap_fails(
    client: AsyncClient, session: AsyncSession
):
    # Setup
    service = Service(name="Service 1", duration_minutes=60, price_cents=1000)
    member = TeamMember(name="Barber 1")
    session.add(service)
    session.add(member)
    await session.commit()
    await session.refresh(service)
    await session.refresh(member)

    start_time = datetime(2026, 7, 15, 10, 0, tzinfo=timezone.utc)
    
    # First appointment
    response1 = await client.post(
        "/api/v1/appointments",
        json={
            "team_member_id": str(member.id),
            "service_id": str(service.id),
            "guest_name": "Hans",
            "guest_phone": "+49123",
            "starts_at": start_time.isoformat(),
            "admin_override": True,
        },
    )
    assert response1.status_code == 201

    # Overlapping appointment (30 mins later, first is 60 mins long)
    response2 = await client.post(
        "/api/v1/appointments",
        json={
            "team_member_id": str(member.id),
            "service_id": str(service.id),
            "guest_name": "Klaus",
            "guest_phone": "+49456",
            "starts_at": (start_time + timedelta(minutes=30)).isoformat(),
            "admin_override": True,
        },
    )
    # Expected: 409 Conflict due to EXCLUDE constraint
    assert response2.status_code == 409


@pytest.mark.asyncio
async def test_adjacent_slots_allowed(client: AsyncClient, session: AsyncSession):
    service = Service(name="Service 1", duration_minutes=45, price_cents=1000)
    member = TeamMember(name="Barber 1")
    session.add(service)
    session.add(member)
    await session.commit()
    await session.refresh(service)
    await session.refresh(member)

    start_time = datetime(2026, 7, 15, 10, 0, tzinfo=timezone.utc)
    
    # First: 10:00 - 10:45
    await client.post(
        "/api/v1/appointments",
        json={
            "team_member_id": str(member.id),
            "service_id": str(service.id),
            "guest_name": "Hans",
            "guest_phone": "+49123",
            "starts_at": start_time.isoformat(),
            "admin_override": True,
        },
    )

    # Second: 10:45 - 11:30 (Adjacent is allowed in halboffenes Intervall [))
    response = await client.post(
        "/api/v1/appointments",
        json={
            "team_member_id": str(member.id),
            "service_id": str(service.id),
            "guest_name": "Klaus",
            "guest_phone": "+49456",
            "starts_at": (start_time + timedelta(minutes=45)).isoformat(),
            "admin_override": True,
        },
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_cancelled_doesnt_block(client: AsyncClient, session: AsyncSession):
    service = Service(name="Service 1", duration_minutes=60, price_cents=1000)
    member = TeamMember(name="Barber 1")
    session.add(service)
    session.add(member)
    await session.commit()
    await session.refresh(service)
    await session.refresh(member)

    start_time = datetime(2026, 7, 15, 10, 0, tzinfo=timezone.utc)
    
    # Create first
    resp = await client.post(
        "/api/v1/appointments",
        json={
            "team_member_id": str(member.id),
            "service_id": str(service.id),
            "guest_name": "Hans",
            "guest_phone": "+49123",
            "starts_at": start_time.isoformat(),
            "admin_override": True,
        },
    )
    apt_id = resp.json()["id"]

    # Cancel first
    await client.patch(f"/api/v1/appointments/{apt_id}/status", json={"status": "cancelled"})

    # New appointment in same slot
    response = await client.post(
        "/api/v1/appointments",
        json={
            "team_member_id": str(member.id),
            "service_id": str(service.id),
            "guest_name": "Klaus",
            "guest_phone": "+49456",
            "starts_at": start_time.isoformat(),
            "admin_override": True,
        },
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_customer_booking(client: AsyncClient, session: AsyncSession):
    service = Service(name="Service 1", duration_minutes=30, price_cents=1000)
    member = TeamMember(name="Barber 1")
    customer = Customer(name="Registered User", email="user@example.com")
    session.add(service)
    session.add(member)
    session.add(customer)
    await session.commit()
    await session.refresh(service)
    await session.refresh(member)
    await session.refresh(customer)

    response = await client.post(
        "/api/v1/appointments",
        json={
            "team_member_id": str(member.id),
            "service_id": str(service.id),
            "customer_id": str(customer.id),
            "starts_at": datetime(2026, 7, 15, 14, 0, tzinfo=timezone.utc).isoformat(),
            "admin_override": True,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["customer_id"] == str(customer.id)
    assert data["guest_name"] is None
