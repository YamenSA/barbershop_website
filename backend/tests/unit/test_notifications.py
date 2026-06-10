"""
Unit tests for the reminder notification job (US2).
Runs against in-memory SQLite — idempotency via app-level has_sent() check.
The DB-level uq_reminder_sent partial index is Postgres-only (T013a pattern).
"""
import secrets
from datetime import datetime, timedelta, timezone

import pytest
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.domains.booking.models import Appointment, AppointmentOrigin, AppointmentStatus, Customer
from app.domains.notifications.models import NotificationKind, NotificationLog, NotificationStatus
from app.domains.notifications.reminders import run_reminder_job
from app.domains.stammdaten.models import Service, TeamMember


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(name="rsetup")
async def reminder_setup_fixture(session: AsyncSession):
    service = Service(name="Schnitt", duration_minutes=30, price_cents=2000)
    member = TeamMember(name="Ali")
    customer = Customer(name="Erika Muster", email="erika@example.com")
    session.add_all([service, member, customer])
    await session.commit()
    return {"service": service, "member": member, "customer": customer}


async def _make_appointment(
    session: AsyncSession,
    setup: dict,
    starts_at: datetime,
    status: AppointmentStatus = AppointmentStatus.confirmed,
) -> Appointment:
    apt = Appointment(
        team_member_id=setup["member"].id,
        service_id=setup["service"].id,
        customer_id=setup["customer"].id,
        starts_at=starts_at,
        ends_at=starts_at + timedelta(minutes=30),
        status=status,
        origin=AppointmentOrigin.online,
        cancellation_token=secrets.token_urlsafe(16),
    )
    session.add(apt)
    await session.commit()
    return apt


# ---------------------------------------------------------------------------
# US2 Sz. 1: Reminder sent when appointment is in 24-h window
# ---------------------------------------------------------------------------


async def test_reminder_sent_for_appointment_in_window(session: AsyncSession, rsetup: dict):
    starts_at = datetime.now(timezone.utc) + timedelta(hours=12)
    apt = await _make_appointment(session, rsetup, starts_at)

    result = await run_reminder_job(session)

    assert result.reminders_sent == 1
    log = (await session.execute(
        select(NotificationLog).where(
            NotificationLog.appointment_id == apt.id,
            NotificationLog.kind == NotificationKind.reminder,
        )
    )).scalar_one_or_none()
    assert log is not None
    assert log.status == NotificationStatus.sent


# ---------------------------------------------------------------------------
# US2: Idempotency — no second send on repeated runs
# ---------------------------------------------------------------------------


async def test_reminder_idempotent_on_repeated_runs(session: AsyncSession, rsetup: dict):
    starts_at = datetime.now(timezone.utc) + timedelta(hours=12)
    await _make_appointment(session, rsetup, starts_at)

    r1 = await run_reminder_job(session)
    r2 = await run_reminder_job(session)

    assert r1.reminders_sent == 1
    assert r2.reminders_sent == 0
    assert r2.reminders_skipped == 1


# ---------------------------------------------------------------------------
# US2 Sz. 2: Cancelled appointment receives no reminder
# ---------------------------------------------------------------------------


async def test_cancelled_appointment_not_reminded(session: AsyncSession, rsetup: dict):
    starts_at = datetime.now(timezone.utc) + timedelta(hours=12)
    await _make_appointment(session, rsetup, starts_at, status=AppointmentStatus.cancelled)

    result = await run_reminder_job(session)

    assert result.reminders_sent == 0


# ---------------------------------------------------------------------------
# US2 Sz. 3: Appointment < 30 min away skipped (last-minute margin)
# ---------------------------------------------------------------------------


async def test_last_minute_appointment_skipped(session: AsyncSession, rsetup: dict):
    starts_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    await _make_appointment(session, rsetup, starts_at)

    result = await run_reminder_job(session)

    assert result.reminders_sent == 0


# ---------------------------------------------------------------------------
# Appointment outside 24-h window not reminded
# ---------------------------------------------------------------------------


async def test_appointment_outside_window_not_reminded(session: AsyncSession, rsetup: dict):
    starts_at = datetime.now(timezone.utc) + timedelta(hours=36)
    await _make_appointment(session, rsetup, starts_at)

    result = await run_reminder_job(session)

    assert result.reminders_sent == 0
