from datetime import date, datetime, time, timezone
from typing import List

import pytest
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.domains.booking.availability import get_available_slots
from app.domains.stammdaten.models import (
    DayOverride,
    SalonClosure,
    SalonHours,
    Service,
    TeamMember,
    WorkingException,
    WorkingDaySchedule, WorkingInterval,
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
    sched = WorkingDaySchedule(team_member_id=member.id, day_of_week=0, is_working=True); session.add(sched); session.flush(); session.add(WorkingInterval(schedule_id=sched.id, start_time=time(9, 0), end_time=time(11, 0)))
    await session.commit()

    test_date = date(2026, 7, 13)  # A Monday
    slots = await get_available_slots(session, member.id, service.id, test_date)

    # Expected slots: 09:00, 09:15, 09:30, 09:45, 10:00, 10:15, 10:30 (ends at 11:00)
    assert len(slots) == 7
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
    sched = WorkingDaySchedule(team_member_id=member.id, day_of_week=2, is_working=True); session.add(sched); session.flush(); session.add(WorkingInterval(schedule_id=sched.id, start_time=time(9, 0), end_time=time(18, 0)))
    
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
    sched0 = WorkingDaySchedule(team_member_id=member.id, day_of_week=0, is_working=True); session.add(sched0); session.flush(); session.add(WorkingInterval(schedule_id=sched0.id, start_time=time(9, 0), end_time=time(12, 0)))
    
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


@pytest.mark.asyncio
async def test_day_off_override_returns_no_slots(session: AsyncSession):
    service = Service(name="Test Service", duration_minutes=30, price_cents=1000)
    member = TeamMember(name="Barber 1")
    session.add(service)
    session.add(member)
    session.add(SalonHours(day_of_week=0, is_open=True, open_time=time(9, 0), close_time=time(18, 0)))
    sched = WorkingDaySchedule(team_member_id=member.id, day_of_week=0, is_working=True); session.add(sched); session.flush(); session.add(WorkingInterval(schedule_id=sched.id, start_time=time(9, 0), end_time=time(18, 0)))
    
    test_date = date(2026, 7, 13) # Monday
    session.add(DayOverride(
        team_member_id=member.id,
        date=test_date,
        override_type="day_off",
        reason="Sick"
    ))
    await session.commit()

    slots = await get_available_slots(session, member.id, service.id, test_date)
    assert len(slots) == 0


@pytest.mark.asyncio
async def test_extra_hours_override_uses_custom_times(session: AsyncSession):
    service = Service(name="Test Service", duration_minutes=60, price_cents=1000)
    member = TeamMember(name="Barber 1")
    session.add(service)
    session.add(member)
    session.add(SalonHours(day_of_week=0, is_open=True, open_time=time(9, 0), close_time=time(18, 0)))
    # Regular hours 9-12
    sched0 = WorkingDaySchedule(team_member_id=member.id, day_of_week=0, is_working=True); session.add(sched0); session.flush(); session.add(WorkingInterval(schedule_id=sched0.id, start_time=time(9, 0), end_time=time(12, 0)))
    
    test_date = date(2026, 7, 13) # Monday
    # Override hours 14-16
    session.add(DayOverride(
        team_member_id=member.id,
        date=test_date,
        override_type="extra_hours",
        custom_start_time=time(14, 0),
        custom_end_time=time(16, 0)
    ))
    await session.commit()

    slots = await get_available_slots(session, member.id, service.id, test_date)
    # Expected: 14:00, 14:15, 14:30, 14:45, 15:00.
    assert len(slots) == 5
    assert all(s.starts_at.time() >= time(14, 0) for s in slots)
    assert all(s.starts_at.time() < time(16, 0) for s in slots)


@pytest.mark.asyncio
async def test_override_does_not_affect_adjacent_days(session: AsyncSession):
    service = Service(name="Test Service", duration_minutes=60, price_cents=1000)
    member = TeamMember(name="Barber 1")
    session.add(service)
    session.add(member)
    session.add(SalonHours(day_of_week=0, is_open=True, open_time=time(9, 0), close_time=time(18, 0)))
    session.add(SalonHours(day_of_week=1, is_open=True, open_time=time(9, 0), close_time=time(18, 0)))
    sched0 = WorkingDaySchedule(team_member_id=member.id, day_of_week=0, is_working=True); session.add(sched0); session.flush(); session.add(WorkingInterval(schedule_id=sched0.id, start_time=time(9, 0), end_time=time(12, 0)))
    sched1 = WorkingDaySchedule(team_member_id=member.id, day_of_week=1, is_working=True); session.add(sched1); session.flush(); session.add(WorkingInterval(schedule_id=sched1.id, start_time=time(9, 0), end_time=time(12, 0)))
    
    test_date = date(2026, 7, 13) # Monday
    next_day = date(2026, 7, 14) # Tuesday
    
    # Day off on Monday
    session.add(DayOverride(
        team_member_id=member.id,
        date=test_date,
        override_type="day_off"
    ))
    await session.commit()

    # Monday should have 0 slots
    slots_mon = await get_available_slots(session, member.id, service.id, test_date)
    assert len(slots_mon) == 0

    # Tuesday should be unaffected
    slots_tue = await get_available_slots(session, member.id, service.id, next_day)
    assert len(slots_tue) == 9 # 9:00, 9:15, 9:30, 9:45, 10:00, 10:15, 10:30, 10:45, 11:00
