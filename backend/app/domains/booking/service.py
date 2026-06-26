import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

logger = logging.getLogger(__name__)

from app.core.config import settings
from app.domains.booking.models import Appointment, AppointmentOrigin, AppointmentStatus, Customer
from app.domains.booking.schemas import (
    AppointmentCreate,
    AppointmentStatusUpdate,
    AppointmentUpdate,
    CustomerCreate,
    PublicAppointmentCreate,
)
from app.domains.stammdaten.models import Service


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
        session: AsyncSession, search: Optional[str] = None
    ) -> List[Customer]:
        from sqlalchemy import or_, func
        statement = select(Customer).where(Customer.anonymized_at == None)
        if search:
            q = search.lower()
            statement = statement.where(
                or_(
                    func.lower(Customer.name).like(f"{q}%"),
                    Customer.phone.like(f"{search}%"),
                )
            )
        results = await session.execute(statement)
        return results.scalars().all()

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
        await session.commit()

    @staticmethod
    async def create_appointment(
        session: AsyncSession, appointment_in: AppointmentCreate
    ) -> Appointment:
        from app.domains.booking.models import AppointmentStatus

        service = await session.get(Service, appointment_in.service_id)
        if not service:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")

        starts_at = appointment_in.starts_at.replace(tzinfo=timezone.utc) \
            if appointment_in.starts_at.tzinfo is None else appointment_in.starts_at
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
        return appointment

    @staticmethod
    async def _check_working_schedule(
        session: AsyncSession, team_member_id: UUID, starts_at: datetime, ends_at: datetime, service: Service
    ) -> None:
        from app.domains.stammdaten.models import SalonClosure, SalonHours, DayOverride, WorkingHours
        appt_date = starts_at.date()
        weekday = appt_date.weekday()

        closure_stmt = select(SalonClosure).where(SalonClosure.date == appt_date)
        if (await session.execute(closure_stmt)).first():
            raise HTTPException(status_code=422, detail="Salon is closed on this date")

        salon_stmt = select(SalonHours).where(SalonHours.day_of_week == weekday)
        salon_hours = (await session.execute(salon_stmt)).scalar_one_or_none()
        if not salon_hours or not salon_hours.is_open:
            raise HTTPException(status_code=422, detail="Salon is not open on this day")

        override_stmt = select(DayOverride).where(
            DayOverride.team_member_id == team_member_id,
            DayOverride.date == appt_date,
        )
        day_override = (await session.execute(override_stmt)).scalar_one_or_none()

        if day_override:
            if day_override.override_type == "day_off":
                raise HTTPException(status_code=422, detail="Team member has day off")
            eff_start = day_override.custom_start_time
            eff_end = day_override.custom_end_time
        else:
            wh_stmt = select(WorkingHours).where(
                WorkingHours.team_member_id == team_member_id,
                WorkingHours.day_of_week == weekday,
            )
            wh = (await session.execute(wh_stmt)).scalar_one_or_none()
            if not wh:
                raise HTTPException(status_code=422, detail="Team member does not work on this day")
            eff_start = wh.start_time
            eff_end = wh.end_time

        window_start = datetime.combine(appt_date, max(salon_hours.open_time, eff_start), tzinfo=timezone.utc)
        window_end = datetime.combine(appt_date, min(salon_hours.close_time, eff_end), tzinfo=timezone.utc)

        if starts_at < window_start or ends_at > window_end:
            raise HTTPException(status_code=422, detail="Appointment outside working hours")

    @staticmethod
    async def get_appointment(session: AsyncSession, appointment_id: UUID) -> Appointment:
        appointment = await session.get(Appointment, appointment_id)
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
        return appointment

    @staticmethod
    async def list_appointments(
        session: AsyncSession,
        team_member_id: Optional[UUID] = None,
        from_date=None,
        to_date=None,
    ) -> List[Appointment]:
        from datetime import date as date_type, time as time_type
        statement = select(Appointment)
        if team_member_id:
            statement = statement.where(Appointment.team_member_id == team_member_id)
        if from_date:
            from_dt = datetime.combine(from_date, time_type.min, tzinfo=timezone.utc)
            statement = statement.where(Appointment.starts_at >= from_dt)
        if to_date:
            to_dt = datetime.combine(to_date + timedelta(days=1), time_type.min, tzinfo=timezone.utc)
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
            new_starts = update_in.starts_at or appointment.starts_at
            new_starts = new_starts.replace(tzinfo=timezone.utc) if new_starts.tzinfo is None else new_starts

            svc = await session.get(Service, appointment.service_id)
            new_ends = new_starts + timedelta(minutes=svc.duration_minutes)

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
            service_name=service.name if service else "Unbekannt",
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
        service_name=service.name if service else "Unbekannt",
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
    new_starts = (
        new_starts_at.replace(tzinfo=timezone.utc)
        if new_starts_at.tzinfo is None
        else new_starts_at.astimezone(timezone.utc)
    )

    # Guardrails
    if new_starts < now + timedelta(hours=settings.BOOKING_MIN_LEAD_HOURS):
        raise HTTPException(status_code=422, detail="BOOKING_TOO_SOON")
    if new_starts > now + timedelta(days=settings.BOOKING_MAX_HORIZON_DAYS):
        raise HTTPException(status_code=422, detail="BOOKING_TOO_FAR")
    if new_starts.minute % 15 != 0 or new_starts.second != 0 or new_starts.microsecond != 0:
        raise HTTPException(status_code=422, detail="INVALID_SLOT_TIME")

    service = await session.get(Service, appt.service_id)
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")

    new_ends = new_starts + timedelta(minutes=service.duration_minutes)
    team_member_id = new_team_member_id or appt.team_member_id

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
                service_name=service.name,
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
        service_name=service.name,
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
    deadline = appointment.starts_at - timedelta(hours=settings.CANCELLATION_CUTOFF_HOURS)
    cancellable = (
        appointment.status == AppointmentStatus.confirmed
        and now < deadline
    )
    return CancellationView(
        id=appointment.id,
        service_name=service.name if service else "Unbekannt",
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

    # Deadline check
    deadline = appointment.starts_at - timedelta(hours=settings.CANCELLATION_CUTOFF_HOURS)
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
    starts_at = (
        data.starts_at.replace(tzinfo=timezone.utc)
        if data.starts_at.tzinfo is None
        else data.starts_at.astimezone(timezone.utc)
    )

    # Guardrails
    if starts_at < now + timedelta(hours=settings.BOOKING_MIN_LEAD_HOURS):
        raise HTTPException(status_code=422, detail="BOOKING_TOO_SOON")
    if starts_at > now + timedelta(days=settings.BOOKING_MAX_HORIZON_DAYS):
        raise HTTPException(status_code=422, detail="BOOKING_TOO_FAR")

    # 15-minute grid
    if starts_at.minute % 15 != 0 or starts_at.second != 0 or starts_at.microsecond != 0:
        raise HTTPException(status_code=422, detail="INVALID_SLOT_TIME")

    # Load service
    service = await session.get(Service, data.service_id)
    if not service or not service.is_active:
        raise HTTPException(status_code=404, detail="Service not found")

    ends_at = starts_at + timedelta(minutes=service.duration_minutes)

    # Resolve team member
    if data.team_member_id is None:
        from app.domains.booking.availability import resolve_any_member
        team_member_id = await resolve_any_member(session, data.service_id, starts_at, ends_at)
        if team_member_id is None:
            raise HTTPException(status_code=409, detail="BOOKING_CONFLICT")
    else:
        team_member_id = data.team_member_id

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
    customer = await _upsert_customer(session, data.customer)

    appointment = Appointment(
        team_member_id=team_member_id,
        service_id=data.service_id,
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
