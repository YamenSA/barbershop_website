import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)

from app.core.config import settings
from app.core.time import as_utc, combine_local, salon_day_bounds, to_salon, to_utc
from app.domains.booking.models import Appointment, AppointmentOrigin, AppointmentStatus, Customer
from app.domains.booking.schemas import (
    AppointmentCreate,
    AppointmentStatusUpdate,
    AppointmentUpdate,
    CustomerCreate,
    PublicAppointmentCreate,
)
from app.domains.stammdaten.models import Service
from app.domains.booking.selection import load_selected_services, selection_ids, service_snapshots


async def _validate_combined_move(session: AsyncSession, appointment: Appointment, member_id: UUID,
                                  starts_at: datetime) -> datetime:
    """Existing snapshots keep duration; current eligibility/schedules still apply."""
    from app.domains.booking.availability import _load_members_for_selection, get_available_slots
    ids = [UUID(s["id"]) for s in appointment.selected_services]
    duration = sum(s["duration_minutes"] for s in appointment.selected_services)
    if not await _load_members_for_selection(session, ids, member_id):
        raise HTTPException(409, "Mitarbeiter kann nicht alle gewählten Leistungen ausführen")
    slots = await get_available_slots(session, member_id, ids[0], to_salon(starts_at).date(),
                                     duration_minutes=duration, exclude_appointment_id=appointment.id)
    if not any(slot.starts_at == starts_at for slot in slots):
        raise HTTPException(409, "BOOKING_CONFLICT")
    return starts_at + timedelta(minutes=duration)


class BookingService:
    @staticmethod
    async def create_customer(
        session: AsyncSession, customer_in: CustomerCreate
    ) -> Customer:
        customer = Customer.model_validate(customer_in)
        session.add(customer)
        await session.commit()
        await session.refresh(customer)
        return customer

    @staticmethod
    async def get_customers(
        session: AsyncSession,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
        include_anonymized: bool = False,
    ) -> dict:
        from sqlalchemy import or_, func, select
        
        statement = select(Customer)
        if not include_anonymized:
            statement = statement.where(Customer.anonymized_at == None)
            
        if search:
            q = search.lower()
            statement = statement.where(
                or_(
                    func.lower(Customer.name).like(f"%{q}%"),
                    Customer.phone.like(f"%{search}%"),
                    func.lower(Customer.email).like(f"%{q}%"),
                )
            )
            
        from sqlalchemy.sql import func as sql_func
        count_stmt = select(sql_func.count()).select_from(statement.subquery())
        total = await session.scalar(count_stmt)
        
        statement = statement.order_by(Customer.created_at.desc()).limit(limit).offset(offset)
        results = await session.execute(statement)
        items = results.scalars().all()
        
        return {"items": items, "total": total or 0}

    @staticmethod
    async def get_customer(session: AsyncSession, customer_id: UUID) -> Customer:
        customer = await session.get(Customer, customer_id)
        if not customer or customer.anonymized_at:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found"
            )
        return customer

    @staticmethod
    async def delete_customer(session: AsyncSession, customer_id: UUID) -> None:
        customer = await BookingService.get_customer(session, customer_id)
        # Immediate anonymization per GDPR
        customer.name = "[anonymisiert]"
        customer.email = f"[anonymisiert]-{customer.id}@anonymisiert.local"
        customer.phone = "[anonymisiert]"
        customer.anonymized_at = datetime.now(timezone.utc)
        session.add(customer)
        
        # M10: Clear PII from all related appointments
        from sqlalchemy import select
        from app.domains.booking.models import Appointment
        
        statement = select(Appointment).where(Appointment.customer_id == customer_id)
        result = await session.execute(statement)
        appointments = result.scalars().all()
        
        for apt in appointments:
            apt.guest_name = None
            apt.guest_phone = None
            if apt.notes is not None:
                apt.notes = "[anonymisiert]"
            session.add(apt)
            
        await session.commit()

    @staticmethod
    async def create_appointment(
        session: AsyncSession, appointment_in: AppointmentCreate
    ) -> Appointment:
        from app.domains.booking.models import AppointmentStatus

        service = await session.get(Service, appointment_in.service_id)
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

        starts_at = to_utc(appointment_in.starts_at)  # naive = salon (Berlin) wall time
        ends_at = starts_at + timedelta(minutes=service.duration_minutes)

        if not appointment_in.admin_override:
            await BookingService._check_working_schedule(
                session, appointment_in.team_member_id, starts_at, ends_at, service
            )

        # Double-booking check (always enforced)
        overlap_stmt = select(Appointment).where(
            Appointment.team_member_id == appointment_in.team_member_id,
            Appointment.status == AppointmentStatus.confirmed,
            Appointment.starts_at < ends_at,
            Appointment.ends_at > starts_at,
        )
        if (await session.execute(overlap_stmt)).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="BOOKING_CONFLICT")

        appointment = Appointment(
            **appointment_in.model_dump(exclude={"admin_override", "starts_at"}),
            starts_at=starts_at,
            ends_at=ends_at,
        )
        session.add(appointment)
        await session.commit()
        await session.refresh(appointment)
        await session.refresh(appointment, ["customer"])
        return appointment

    @staticmethod
    async def _check_working_schedule(
        session: AsyncSession, team_member_id: UUID, starts_at: datetime, ends_at: datetime, service: Service
    ) -> None:
        from app.domains.stammdaten.models import SalonClosure, SalonHours, DayOverride, WorkingDaySchedule
        # Salon rules are Berlin wall time: derive date/weekday/clock from the local view.
        local_start = to_salon(starts_at)
        local_end = to_salon(ends_at)
        appt_date = local_start.date()
        weekday = appt_date.weekday()

        closure_stmt = select(SalonClosure).where(SalonClosure.date == appt_date)
        if (await session.execute(closure_stmt)).first():
            raise HTTPException(status_code=422, detail="Der Salon ist an diesem Tag geschlossen")

        salon_stmt = select(SalonHours).where(SalonHours.day_of_week == weekday)
        salon_hours = (await session.execute(salon_stmt)).scalar_one_or_none()
        if not salon_hours or not salon_hours.is_open:
            raise HTTPException(status_code=422, detail="Der Salon hat an diesem Tag nicht geöffnet")

        override_stmt = select(DayOverride).where(
            DayOverride.team_member_id == team_member_id,
            DayOverride.date == appt_date,
        )
        day_override = (await session.execute(override_stmt)).scalar_one_or_none()

        if day_override:
            if day_override.override_type == "day_off":
                raise HTTPException(status_code=422, detail="Mitarbeiter hat an diesem Tag frei")
            eff_start = day_override.custom_start_time
            eff_end = day_override.custom_end_time
            window_start = combine_local(appt_date, max(salon_hours.open_time, eff_start))
            window_end = combine_local(appt_date, min(salon_hours.close_time, eff_end))
            if starts_at < window_start or ends_at > window_end:
                raise HTTPException(status_code=422, detail="Termin liegt außerhalb der Arbeitszeiten")
        else:
            sched_stmt = select(WorkingDaySchedule).where(
                WorkingDaySchedule.team_member_id == team_member_id,
                WorkingDaySchedule.day_of_week == weekday,
            )
            schedule = (await session.execute(sched_stmt)).scalar_one_or_none()
            if not schedule or not schedule.is_working or not schedule.intervals:
                raise HTTPException(status_code=422, detail="Mitarbeiter arbeitet an diesem Tag nicht")
            
            appt_start_time = local_start.time().replace(tzinfo=None)
            appt_end_time = local_end.time().replace(tzinfo=None)
            fits = False
            for iv in schedule.intervals:
                eff_start = max(salon_hours.open_time, iv.start_time)
                eff_end = min(salon_hours.close_time, iv.end_time)
                if appt_start_time >= eff_start and appt_end_time <= eff_end:
                    fits = True
                    break
            if not fits:
                raise HTTPException(status_code=422, detail="Termin liegt außerhalb der Arbeitszeiten")

    @staticmethod
    async def get_appointment(session: AsyncSession, appointment_id: UUID) -> Appointment:
        statement = (
            select(Appointment)
            .options(selectinload(Appointment.customer))
            .where(Appointment.id == appointment_id)
        )
        appointment = (await session.execute(statement)).scalar_one_or_none()
        if not appointment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found"
            )
        return appointment

    @staticmethod
    async def update_appointment_status(
        session: AsyncSession, appointment_id: UUID, status_in: AppointmentStatusUpdate
    ) -> Appointment:
        appointment = await BookingService.get_appointment(session, appointment_id)
        appointment.status = status_in.status
        session.add(appointment)
        await session.commit()
        await session.refresh(appointment)
        await session.refresh(appointment, ["customer"])
        return appointment

    @staticmethod
    async def list_appointments(
        session: AsyncSession,
        team_member_id: Optional[UUID] = None,
        customer_id: Optional[UUID] = None,
        from_date=None,
        to_date=None,
    ) -> List[Appointment]:
        from datetime import date as date_type, time as time_type
        statement = select(Appointment).options(selectinload(Appointment.customer))
        if team_member_id:
            statement = statement.where(Appointment.team_member_id == team_member_id)
        if customer_id:
            statement = statement.where(Appointment.customer_id == customer_id)
        if from_date:
            from_dt = salon_day_bounds(from_date)[0]
            statement = statement.where(Appointment.starts_at >= from_dt)
        if to_date:
            to_dt = salon_day_bounds(to_date)[1]
            statement = statement.where(Appointment.starts_at < to_dt)
        results = await session.execute(statement)
        return results.scalars().all()

    @staticmethod
    async def patch_appointment(
        session: AsyncSession, appointment_id: UUID, update_in: AppointmentUpdate
    ) -> Appointment:
        from app.domains.booking.models import AppointmentStatus
        appointment = await BookingService.get_appointment(session, appointment_id)

        if appointment.status != AppointmentStatus.confirmed:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="INVALID_STATUS_TRANSITION")

        if update_in.starts_at is not None or update_in.team_member_id is not None:
            new_member_id = update_in.team_member_id or appointment.team_member_id
            new_starts = (
                to_utc(update_in.starts_at)
                if update_in.starts_at is not None
                else as_utc(appointment.starts_at)
            )

            svc = await session.get(Service, appointment.service_id)
            new_ends = (
                await _validate_combined_move(session, appointment, new_member_id, new_starts)
                if appointment.service_selection
                else new_starts + timedelta(minutes=svc.duration_minutes)
            )

            overlap_stmt = select(Appointment).where(
                Appointment.team_member_id == new_member_id,
                Appointment.status == AppointmentStatus.confirmed,
                Appointment.id != appointment_id,
                Appointment.starts_at < new_ends,
                Appointment.ends_at > new_starts,
            )
            if (await session.execute(overlap_stmt)).first():
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="BOOKING_CONFLICT")

            appointment.team_member_id = new_member_id
            appointment.starts_at = new_starts
            appointment.ends_at = new_ends

        if update_in.notes is not None:
            appointment.notes = update_in.notes

        session.add(appointment)
        await session.commit()
        await session.refresh(appointment)
        await session.refresh(appointment, ["customer"])
        logger.info(
            "AUDIT appointment_patched id=%s starts_at=%s team_member_id=%s",
            appointment.id,
            appointment.starts_at,
            appointment.team_member_id,
        )
        return appointment


# ---------------------------------------------------------------------------
# Customer account self-service (Phase 5)
# ---------------------------------------------------------------------------


async def list_customer_appointments(session: AsyncSession, customer_id: UUID):
    from app.domains.customer_account.schemas import AccountAppointmentRead, AppointmentListOut
    from app.domains.stammdaten.models import Service, TeamMember

    now = datetime.now(timezone.utc)
    cutoff = timedelta(hours=settings.CANCELLATION_CUTOFF_HOURS)

    stmt = select(Appointment).where(Appointment.customer_id == customer_id)
    result = await session.execute(stmt)
    appointments = result.scalars().all()

    upcoming = []
    past = []
    for appt in appointments:
        service = await session.get(Service, appt.service_id)
        member = await session.get(TeamMember, appt.team_member_id)
        starts = appt.starts_at if appt.starts_at.tzinfo else appt.starts_at.replace(tzinfo=timezone.utc)
        cancellable = (
            appt.status == AppointmentStatus.confirmed
            and now < starts - cutoff
        )
        row = AccountAppointmentRead(
            id=appt.id,
            service_name=appt.service_summary or (service.name if service else "Unbekannt"),
            team_member_name=member.name if member else "Unbekannt",
            starts_at=starts,
            ends_at=appt.ends_at,
            status=appt.status.value,
            cancellable=cancellable,
            reschedulable=cancellable,
        )
        if starts >= now:
            upcoming.append(row)
        else:
            past.append(row)

    upcoming.sort(key=lambda a: a.starts_at)
    past.sort(key=lambda a: a.starts_at, reverse=True)
    return AppointmentListOut(upcoming=upcoming, past=past)


async def _get_own_appointment(
    session: AsyncSession, customer_id: UUID, appointment_id: UUID
) -> Appointment:
    appt = await session.get(Appointment, appointment_id)
    if not appt or appt.customer_id != customer_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="APPOINTMENT_NOT_FOUND")
    return appt


async def cancel_own_appointment(
    session: AsyncSession, customer_id: UUID, appointment_id: UUID
):
    from app.domains.customer_account.schemas import AccountAppointmentRead
    from app.domains.stammdaten.models import Service, TeamMember

    appt = await _get_own_appointment(session, customer_id, appointment_id)

    if appt.status != AppointmentStatus.confirmed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="INVALID_STATUS")

    starts = appt.starts_at if appt.starts_at.tzinfo else appt.starts_at.replace(tzinfo=timezone.utc)
    deadline = starts - timedelta(hours=settings.CANCELLATION_CUTOFF_HOURS)
    if datetime.now(timezone.utc) >= deadline:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="CANCELLATION_WINDOW_CLOSED")

    appt.status = AppointmentStatus.cancelled
    session.add(appt)
    await session.commit()
    await session.refresh(appt)

    service = await session.get(Service, appt.service_id)
    member = await session.get(TeamMember, appt.team_member_id)
    return AccountAppointmentRead(
        id=appt.id,
        service_name=appt.service_summary or (service.name if service else "Unbekannt"),
        team_member_name=member.name if member else "Unbekannt",
        starts_at=appt.starts_at,
        ends_at=appt.ends_at,
        status=appt.status.value,
        cancellable=False,
        reschedulable=False,
    )


async def reschedule_appointment(
    session: AsyncSession,
    customer_id: UUID,
    appointment_id: UUID,
    new_starts_at: datetime,
    new_team_member_id: Optional[UUID],
):
    from app.domains.customer_account.schemas import AccountAppointmentRead
    from app.domains.stammdaten.models import Service, TeamMember

    appt = await _get_own_appointment(session, customer_id, appointment_id)

    if appt.status != AppointmentStatus.confirmed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="INVALID_STATUS")

    appt_starts = appt.starts_at if appt.starts_at.tzinfo else appt.starts_at.replace(tzinfo=timezone.utc)
    deadline = appt_starts - timedelta(hours=settings.CANCELLATION_CUTOFF_HOURS)
    if datetime.now(timezone.utc) >= deadline:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="CANCELLATION_WINDOW_CLOSED")

    # Normalize new_starts_at to UTC
    now = datetime.now(timezone.utc)
    new_starts = to_utc(new_starts_at)  # naive = salon (Berlin) wall time

    # Guardrails
    if new_starts < now + timedelta(hours=settings.BOOKING_MIN_LEAD_HOURS):
        raise HTTPException(status_code=422, detail="BOOKING_TOO_SOON")
    if new_starts > now + timedelta(days=settings.BOOKING_MAX_HORIZON_DAYS):
        raise HTTPException(status_code=422, detail="BOOKING_TOO_FAR")
    local_new = to_salon(new_starts)
    if local_new.minute % 15 != 0 or local_new.second != 0 or local_new.microsecond != 0:
        raise HTTPException(status_code=422, detail="INVALID_SLOT_TIME")

    service = await session.get(Service, appt.service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    team_member_id = new_team_member_id or appt.team_member_id
    new_ends = (
        await _validate_combined_move(session, appt, team_member_id, new_starts)
        if appt.service_selection
        else new_starts + timedelta(minutes=service.duration_minutes)
    )

    # Check for overlap on new slot (excluding current appointment)
    overlap_stmt = select(Appointment).where(
        Appointment.team_member_id == team_member_id,
        Appointment.status == AppointmentStatus.confirmed,
        Appointment.id != appointment_id,
        Appointment.starts_at < new_ends,
        Appointment.ends_at > new_starts,
    )
    if (await session.execute(overlap_stmt)).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="BOOKING_CONFLICT")

    # Atomic: cancel old, create new
    appt.status = AppointmentStatus.cancelled
    session.add(appt)
    await session.flush()

    new_appt = Appointment(
        team_member_id=team_member_id,
        service_id=appt.service_id,
        service_selection=appt.service_selection,
        customer_id=customer_id,
        starts_at=new_starts,
        ends_at=new_ends,
        origin=appt.origin,
        cancellation_token=secrets.token_urlsafe(32),
    )
    session.add(new_appt)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        # Restore old appointment
        appt.status = AppointmentStatus.confirmed
        session.add(appt)
        await session.commit()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="BOOKING_CONFLICT")

    await session.refresh(new_appt)

    # Send reschedule confirmation email
    try:
        member = await session.get(TeamMember, new_appt.team_member_id)
        from app.domains.notifications.service import send_account_email
        from app.domains.notifications.templates import render_reschedule_confirmation
        from app.domains.booking.models import Customer
        customer = await session.get(Customer, customer_id)
        if customer and member and service:
            subject, body = render_reschedule_confirmation(
                customer_name=customer.name,
                service_name=new_appt.service_summary or service.name,
                team_member_name=member.name,
                starts_at=new_appt.starts_at,
                cancellation_token=new_appt.cancellation_token,
            )
            await send_account_email(to_email=customer.email, subject=subject, html_body=body)
    except Exception as exc:
        logger.warning("Reschedule confirmation email failed: %s", exc)

    now_after = datetime.now(timezone.utc)
    new_starts = new_appt.starts_at if new_appt.starts_at.tzinfo else new_appt.starts_at.replace(tzinfo=timezone.utc)
    cancellable = (
        new_appt.status == AppointmentStatus.confirmed
        and now_after < new_starts - timedelta(hours=settings.CANCELLATION_CUTOFF_HOURS)
    )
    member = await session.get(TeamMember, new_appt.team_member_id)
    return AccountAppointmentRead(
        id=new_appt.id,
        service_name=new_appt.service_summary or service.name,
        team_member_name=member.name if member else "Unbekannt",
        starts_at=new_appt.starts_at,
        ends_at=new_appt.ends_at,
        status=new_appt.status.value,
        cancellable=cancellable,
        reschedulable=cancellable,
    )


# ---------------------------------------------------------------------------
# Public booking (US1)
# ---------------------------------------------------------------------------


async def _upsert_customer(session: AsyncSession, data) -> Customer:
    """Create or return existing customer by email; update last_active_at."""
    stmt = select(Customer).where(Customer.email == data.email, Customer.anonymized_at == None)  # noqa: E711
    result = await session.execute(stmt)
    customer = result.scalar_one_or_none()
    if customer:
        customer.last_active_at = datetime.now(timezone.utc)
        session.add(customer)
    else:
        customer = Customer(
            name=data.name,
            email=data.email,
            phone=data.phone,
        )
        session.add(customer)
    await session.flush()
    return customer


# ---------------------------------------------------------------------------
# Public cancellation (US3)
# ---------------------------------------------------------------------------


async def _build_cancellation_view(
    session: AsyncSession, appointment: Appointment
) -> "CancellationView":
    from app.domains.booking.schemas import CancellationView
    from app.domains.stammdaten.models import Service, TeamMember

    service = await session.get(Service, appointment.service_id)
    team_member = await session.get(TeamMember, appointment.team_member_id)
    now = datetime.now(timezone.utc)
    deadline = as_utc(appointment.starts_at) - timedelta(hours=settings.CANCELLATION_CUTOFF_HOURS)
    cancellable = (
        appointment.status == AppointmentStatus.confirmed
        and now < deadline
    )
    return CancellationView(
        id=appointment.id,
        service_name=appointment.service_summary or (service.name if service else "Unbekannt"),
        team_member_name=team_member.name if team_member else "Unbekannt",
        starts_at=appointment.starts_at,
        status=appointment.status,
        cancellable=cancellable,
        cancellation_deadline=deadline if appointment.status == AppointmentStatus.confirmed else None,
    )


async def get_cancellation_view(session: AsyncSession, token: str):
    stmt = select(Appointment).where(Appointment.cancellation_token == token)
    result = await session.execute(stmt)
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="TOKEN_NOT_FOUND")
    return await _build_cancellation_view(session, appointment)


async def cancel_by_token(session: AsyncSession, token: str):
    stmt = select(Appointment).where(Appointment.cancellation_token == token)
    result = await session.execute(stmt)
    appointment = result.scalar_one_or_none()
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="TOKEN_NOT_FOUND")

    # Idempotent: already cancelled → return view
    if appointment.status == AppointmentStatus.cancelled:
        return await _build_cancellation_view(session, appointment)

    # Deadline check: 24 REAL hours (instant arithmetic on real UTC)
    deadline = as_utc(appointment.starts_at) - timedelta(hours=settings.CANCELLATION_CUTOFF_HOURS)
    if datetime.now(timezone.utc) >= deadline:
        raise HTTPException(status_code=410, detail="CANCELLATION_WINDOW_CLOSED")

    appointment.status = AppointmentStatus.cancelled
    session.add(appointment)
    await session.commit()
    await session.refresh(appointment)
    return await _build_cancellation_view(session, appointment)


async def create_public_appointment(
    session: AsyncSession,
    data: PublicAppointmentCreate,
) -> Appointment:
    now = datetime.now(timezone.utc)

    # Normalize to UTC
    starts_at = to_utc(data.starts_at)  # naive = salon (Berlin) wall time

    # Guardrails
    if starts_at < now + timedelta(hours=settings.BOOKING_MIN_LEAD_HOURS):
        raise HTTPException(status_code=422, detail="BOOKING_TOO_SOON")
    if starts_at > now + timedelta(days=settings.BOOKING_MAX_HORIZON_DAYS):
        raise HTTPException(status_code=422, detail="BOOKING_TOO_FAR")

    # 15-minute grid (on the salon wall clock)
    local_start = to_salon(starts_at)
    if local_start.minute % 15 != 0 or local_start.second != 0 or local_start.microsecond != 0:
        raise HTTPException(status_code=422, detail="INVALID_SLOT_TIME")

    # Recalculate every detail on the server; a posted timestamp is not a hold.
    ids = selection_ids(data.service_id, data.service_ids)
    services = await load_selected_services(session, ids)
    if (data.expected_total_price_cents is not None and data.expected_total_price_cents != sum(s.price_cents for s in services)) or (
        data.expected_total_duration_minutes is not None and data.expected_total_duration_minutes != sum(s.duration_minutes for s in services)
    ):
        raise HTTPException(409, "SELECTION_CHANGED")
    ends_at = starts_at + timedelta(minutes=sum(s.duration_minutes for s in services))
    from app.domains.booking.availability import get_public_slots
    offered = await get_public_slots(session, None, local_start.date(), data.team_member_id, ids)
    matching = [s for s in offered if s.starts_at == starts_at and s.ends_at == ends_at]
    if not matching:
        raise HTTPException(status_code=409, detail="BOOKING_CONFLICT")
    team_member_id = matching[0].team_member_id

    # App-level overlap check (DB EXCLUDE is the hard guarantee)
    overlap_stmt = select(Appointment).where(
        Appointment.team_member_id == team_member_id,
        Appointment.status == AppointmentStatus.confirmed,
        Appointment.starts_at < ends_at,
        Appointment.ends_at > starts_at,
    )
    if (await session.execute(overlap_stmt)).first():
        raise HTTPException(status_code=409, detail="BOOKING_CONFLICT")

    # Customer upsert
    try:
        customer = await _upsert_customer(session, data.customer)
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=409, detail="BOOKING_CONFLICT")

    appointment = Appointment(
        team_member_id=team_member_id,
        service_id=ids[0],
        service_selection=service_snapshots(services),
        customer_id=customer.id,
        starts_at=starts_at,
        ends_at=ends_at,
        origin=AppointmentOrigin.online,
        cancellation_token=secrets.token_urlsafe(32),
    )
    session.add(appointment)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(status_code=409, detail="BOOKING_CONFLICT")
    await session.refresh(appointment)
    return appointment
