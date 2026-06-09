from datetime import date, datetime, time, timezone
from typing import List

import pytest
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.domains.booking.availability import get_available_slots
from app.domains.stammdaten.models import (
    SalonClosure,
    SalonHours,
    Service,
    TeamMember,
    WorkingException,
    WorkingHours,
)


@pytest.mark.asyncio
async def test_basic_slot_generation(session: AsyncSession):
    # Setup: Service (30m), TeamMember, SalonHours (9-18), WorkingHours (9-18)
    service = Service(name="Test Service", duration_minutes=30, price_cents=1000)
    member = TeamMember(name="Barber 1")
    session.add(service)
    session.add(member)
    await session.commit()
    await session.refresh(service)
    await session.refresh(member)

    # Monday (0) 9:00 - 11:00 for testing brevity
    session.add(SalonHours(day_of_week=0, is_open=True, open_time=time(9, 0), close_time=time(18, 0)))
    session.add(WorkingHours(team_member_id=member.id, day_of_week=0, start_time=time(9, 0), end_time=time(11, 0)))
    await session.commit()

    test_date = date(2026, 7, 13)  # A Monday
    slots = await get_available_slots(session, member.id, service.id, test_date)

    # Expected slots: 09:00, 09:30, 10:00, 10:30 (ends at 11:00)
    assert len(slots) == 4
    assert slots[0].starts_at == datetime.combine(test_date, time(9, 0), tzinfo=timezone.utc)
    assert slots[-1].starts_at == datetime.combine(test_date, time(10, 30), tzinfo=timezone.utc)


@pytest.mark.asyncio
async def test_salon_closed_day(session: AsyncSession):
    service = Service(name="Test Service", duration_minutes=30, price_cents=1000)
    member = TeamMember(name="Barber 1")
    session.add(service)
    session.add(member)
    session.add(SalonHours(day_of_week=6, is_open=False))  # Sunday closed
    await session.commit()

    test_date = date(2026, 7, 19)  # A Sunday
    slots = await get_available_slots(session, member.id, service.id, test_date)
    assert len(slots) == 0


@pytest.mark.asyncio
async def test_salon_closure_holiday(session: AsyncSession):
    service = Service(name="Test Service", duration_minutes=30, price_cents=1000)
    member = TeamMember(name="Barber 1")
    session.add(service)
    session.add(member)
    session.add(SalonHours(day_of_week=2, is_open=True, open_time=time(9, 0), close_time=time(18, 0)))
    session.add(WorkingHours(team_member_id=member.id, day_of_week=2, start_time=time(9, 0), end_time=time(18, 0)))
    
    test_date = date(2026, 7, 15)  # A Wednesday
    session.add(SalonClosure(date=test_date, reason="Public Holiday"))
    await session.commit()

    slots = await get_available_slots(session, member.id, service.id, test_date)
    assert len(slots) == 0


@pytest.mark.asyncio
async def test_working_exception_blocks_slots(session: AsyncSession):
    service = Service(name="Test Service", duration_minutes=60, price_cents=1000)
    member = TeamMember(name="Barber 1")
    session.add(service)
    session.add(member)
    session.add(SalonHours(day_of_week=0, is_open=True, open_time=time(9, 0), close_time=time(18, 0)))
    session.add(WorkingHours(team_member_id=member.id, day_of_week=0, start_time=time(9, 0), end_time=time(12, 0)))
    
    test_date = date(2026, 7, 13)
    # Lunch break 10:00 - 11:00
    session.add(WorkingException(
        team_member_id=member.id,
        starts_at=datetime.combine(test_date, time(10, 0), tzinfo=timezone.utc),
        ends_at=datetime.combine(test_date, time(11, 0), tzinfo=timezone.utc),
        reason="Lunch"
    ))
    await session.commit()

    slots = await get_available_slots(session, member.id, service.id, test_date)
    # Expected: 09:00 (ends 10:00), 11:00 (ends 12:00). 10:00 is blocked.
    assert len(slots) == 2
    assert any(s.starts_at.time() == time(9, 0) for s in slots)
    assert any(s.starts_at.time() == time(11, 0) for s in slots)
    assert not any(s.starts_at.time() == time(10, 0) for s in slots)
