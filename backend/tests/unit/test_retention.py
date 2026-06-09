from datetime import datetime, timedelta, timezone
from uuid import UUID

import pytest
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.domains.booking.models import Appointment, AppointmentStatus, Customer
from app.domains.booking.retention import run_retention_job
from app.domains.stammdaten.models import Service, TeamMember


@pytest.mark.asyncio
async def test_guest_anonymization_after_12_months(session: AsyncSession):
    # Setup
    service = Service(name="S1", duration_minutes=30, price_cents=1000)
    member = TeamMember(name="B1")
    session.add(service)
    session.add(member)
    await session.commit()

    # Appointment 13 months ago
    old_date = datetime.now(timezone.utc) - timedelta(days=400)
    apt_old = Appointment(
        team_member_id=member.id,
        service_id=service.id,
        guest_name="Hans Old",
        guest_phone="+49123",
        starts_at=old_date,
        ends_at=old_date + timedelta(minutes=30),
        status=AppointmentStatus.completed
    )
    
    # Appointment 1 month ago
    recent_date = datetime.now(timezone.utc) - timedelta(days=30)
    apt_recent = Appointment(
        team_member_id=member.id,
        service_id=service.id,
        guest_name="Klaus New",
        guest_phone="+49456",
        starts_at=recent_date,
        ends_at=recent_date + timedelta(minutes=30),
        status=AppointmentStatus.completed
    )
    
    session.add(apt_old)
    session.add(apt_recent)
    await session.commit()

    result = await run_retention_job(session)
    assert result.anonymized_guest_appointments == 1

    await session.refresh(apt_old)
    await session.refresh(apt_recent)

    assert apt_old.guest_name == "[anonymisiert]"
    assert apt_old.guest_phone == "[anonymisiert]"
    assert apt_recent.guest_name == "Klaus New"


@pytest.mark.asyncio
async def test_customer_anonymization_after_24_months(session: AsyncSession):
    # Customer inactive for 25 months
    old_active = datetime.now(timezone.utc) - timedelta(days=750)
    c_old = Customer(
        name="Old Customer",
        email="old@example.com",
        phone="+49111",
        last_active_at=old_active
    )
    
    # Customer active 1 month ago
    recent_active = datetime.now(timezone.utc) - timedelta(days=30)
    c_recent = Customer(
        name="Recent Customer",
        email="recent@example.com",
        phone="+49222",
        last_active_at=recent_active
    )
    
    session.add(c_old)
    session.add(c_recent)
    await session.commit()

    result = await run_retention_job(session)
    assert result.anonymized_customers == 1

    await session.refresh(c_old)
    await session.refresh(c_recent)

    assert c_old.name == "[anonymisiert]"
    assert c_old.email == "[anonymisiert]@[anonymisiert]"
    assert c_old.anonymized_at is not None
    assert c_recent.name == "Recent Customer"
    assert c_recent.anonymized_at is None
