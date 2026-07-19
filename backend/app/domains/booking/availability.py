from datetime import date, datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.domains.stammdaten.models import (
    DayOverride,
    SalonClosure,
    SalonHours,
    Service,
    TeamMember,
    TeamMemberServiceLink,
    WorkingDaySchedule,
    WorkingException,
    WorkingHours,
)


class SlotResult(BaseModel):
    starts_at: datetime
    ends_at: datetime


async def get_available_slots(
    session: AsyncSession, team_member_id: UUID, service_id: UUID, target_date: date
) -> List[SlotResult]:
    # 1. Load service
    service = await session.get(Service, service_id)
    if not service or not service.is_active:
        return []

    # 2. Check salon closures
    closure_stmt = select(SalonClosure).where(SalonClosure.date == target_date)
    closure_result = await session.execute(closure_stmt)
    if closure_result.first():
        return []

    # 3. Check salon hours
    weekday = target_date.weekday()
    salon_stmt = select(SalonHours).where(SalonHours.day_of_week == weekday)
    salon_result = await session.execute(salon_stmt)
    salon_hours = salon_result.scalar_one_or_none()
    if not salon_hours or not salon_hours.is_open:
        return []

    # 4. Check for DayOverride
    override_stmt = select(DayOverride).where(
        DayOverride.team_member_id == team_member_id,
        DayOverride.date == target_date,
    )
    override_result = await session.execute(override_stmt)
    day_override = override_result.scalar_one_or_none()

    # 5. Determine working windows (list of (start_time, end_time) tuples)
    working_windows = []
    
    if day_override:
        if day_override.override_type == "day_off":
            return []
        # extra_hours: single window
        w_start = max(salon_hours.open_time, day_override.custom_start_time)
        w_end = min(salon_hours.close_time, day_override.custom_end_time)
        if w_start < w_end:
            working_windows.append((w_start, w_end))
    else:
        # Load interval-based schedule
        schedule_stmt = select(WorkingDaySchedule).where(
            WorkingDaySchedule.team_member_id == team_member_id,
            WorkingDaySchedule.day_of_week == weekday,
        )
        schedule_result = await session.execute(schedule_stmt)
        schedule = schedule_result.scalar_one_or_none()
        
        if not schedule or not schedule.is_working:
            return []
        
        for iv in schedule.intervals:
            w_start = max(salon_hours.open_time, iv.start_time)
            w_end = min(salon_hours.close_time, iv.end_time)
            if w_start < w_end:
                working_windows.append((w_start, w_end))
    
    if not working_windows:
        return []

    # 6. Load exceptions for the full day span
    overall_start = min(w[0] for w in working_windows)
    overall_end = max(w[1] for w in working_windows)
    start_dt = datetime.combine(target_date, overall_start, tzinfo=timezone.utc)
    end_dt = datetime.combine(target_date, overall_end, tzinfo=timezone.utc)
    
    exception_stmt = select(WorkingException).where(
        WorkingException.team_member_id == team_member_id,
        WorkingException.starts_at < end_dt,
        WorkingException.ends_at > start_dt,
    )
    exceptions_result = await session.execute(exception_stmt)
    exceptions = exceptions_result.scalars().all()

    # 7. Load confirmed appointments
    from app.domains.booking.models import Appointment, AppointmentStatus
    apt_stmt = select(Appointment).where(
        Appointment.team_member_id == team_member_id,
        Appointment.status == AppointmentStatus.confirmed,
        Appointment.starts_at < end_dt,
        Appointment.ends_at > start_dt,
    )
    apt_result = await session.execute(apt_stmt)
    appointments = apt_result.scalars().all()

    # 8. Generate slots for each working window
    duration = timedelta(minutes=service.duration_minutes)
    slots: List[SlotResult] = []
    
    for w_start, w_end in working_windows:
        window_start_dt = datetime.combine(target_date, w_start, tzinfo=timezone.utc)
        window_end_dt = datetime.combine(target_date, w_end, tzinfo=timezone.utc)
        current_dt = window_start_dt
        
        while current_dt + duration <= window_end_dt:
            slot_end = current_dt + duration
            
            is_blocked = False
            for exc in exceptions:
                exc_start = exc.starts_at.replace(tzinfo=timezone.utc) if exc.starts_at.tzinfo is None else exc.starts_at
                exc_end = exc.ends_at.replace(tzinfo=timezone.utc) if exc.ends_at.tzinfo is None else exc.ends_at
                if current_dt < exc_end and slot_end > exc_start:
                    is_blocked = True
                    break
            
            if not is_blocked:
                for apt in appointments:
                    apt_start = apt.starts_at.replace(tzinfo=timezone.utc) if apt.starts_at.tzinfo is None else apt.starts_at
                    apt_end = apt.ends_at.replace(tzinfo=timezone.utc) if apt.ends_at.tzinfo is None else apt.ends_at
                    if current_dt < apt_end and slot_end > apt_start:
                        is_blocked = True
                        break
            
            if not is_blocked:
                slots.append(SlotResult(starts_at=current_dt, ends_at=slot_end))
            
            current_dt += timedelta(minutes=15)

    return slots


async def get_public_slots(
    session: AsyncSession,
    service_id: UUID,
    target_date: date,
    team_member_id: Optional[UUID] = None,
) -> List["PublicSlotResult"]:
    """Return slots enriched with team-member info, filtered to the booking window."""
    now = datetime.now(timezone.utc)
    window_open = now + timedelta(hours=settings.BOOKING_MIN_LEAD_HOURS)
    window_close = now + timedelta(days=settings.BOOKING_MAX_HORIZON_DAYS)

    if team_member_id is not None:
        members = await _load_members_for_service(session, service_id, only_id=team_member_id)
    else:
        members = await _load_members_for_service(session, service_id)

    result: List[PublicSlotResult] = []
    seen: set = set()

    for member in members:
        raw_slots = await get_available_slots(session, member.id, service_id, target_date)
        for slot in raw_slots:
            if slot.starts_at < window_open or slot.starts_at > window_close:
                continue
            key = (slot.starts_at, member.id)
            if key in seen:
                continue
            seen.add(key)
            result.append(
                PublicSlotResult(
                    starts_at=slot.starts_at,
                    ends_at=slot.ends_at,
                    team_member_id=member.id,
                    team_member_name=member.name,
                )
            )

    result.sort(key=lambda s: (s.starts_at, s.team_member_name))
    return result


async def _load_members_for_service(
    session: AsyncSession,
    service_id: UUID,
    only_id: Optional[UUID] = None,
) -> List[TeamMember]:
    stmt = (
        select(TeamMember)
        .join(TeamMemberServiceLink, TeamMemberServiceLink.team_member_id == TeamMember.id)
        .where(
            TeamMemberServiceLink.service_id == service_id,
            TeamMember.is_active == True,  # noqa: E712
        )
    )
    if only_id is not None:
        stmt = stmt.where(TeamMember.id == only_id)
    result = await session.execute(stmt)
    return result.scalars().all()


class PublicSlotResult(BaseModel):
    starts_at: datetime
    ends_at: datetime
    team_member_id: UUID
    team_member_name: str


async def resolve_any_member(
    session: AsyncSession,
    service_id: UUID,
    starts_at: datetime,
    ends_at: datetime,
) -> Optional[UUID]:
    """Pick the first available team member for the given slot."""
    members = await _load_members_for_service(session, service_id)
    from app.domains.booking.models import Appointment, AppointmentStatus

    for member in sorted(members, key=lambda m: m.name):
        overlap_stmt = select(Appointment).where(
            Appointment.team_member_id == member.id,
            Appointment.status == AppointmentStatus.confirmed,
            Appointment.starts_at < ends_at,
            Appointment.ends_at > starts_at,
        )
        if not (await session.execute(overlap_stmt)).first():
            return member.id
    return None
