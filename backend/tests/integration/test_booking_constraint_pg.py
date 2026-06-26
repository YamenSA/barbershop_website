import pytest
from datetime import datetime, timedelta, timezone
from sqlalchemy.exc import IntegrityError
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.domains.booking.models import Appointment, AppointmentStatus, AppointmentOrigin
from app.domains.stammdaten.models import Service, TeamMember

@pytest.mark.postgres
@pytest.mark.asyncio
async def test_postgres_exclude_constraint_prevents_overlap(session: AsyncSession):
    """
    Empirically verify that the tstzrange EXCLUDE constraint on Postgres
    works as expected. This test requires a running Postgres DB with
    the btree_gist extension and migration 009 applied.
    """
    # Setup
    if session.bind.dialect.name == "sqlite":
        pytest.skip("Postgres exclude constraint test skipped on SQLite")

    service = Service(name="S1", duration_minutes=30, price_cents=1000, is_active=True)
    member = TeamMember(name="M1", is_active=True)
    session.add_all([service, member])
    await session.commit()

    starts_at = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0) + timedelta(days=1)
    ends_at = starts_at + timedelta(minutes=30)

    # 1. Create first confirmed appointment
    apt1 = Appointment(
        team_member_id=member.id,
        service_id=service.id,
        starts_at=starts_at,
        ends_at=ends_at,
        status=AppointmentStatus.confirmed,
        origin=AppointmentOrigin.walk_in
    )
    session.add(apt1)
    await session.commit()

    # 2. Attempt to create overlapping confirmed appointment for SAME member
    # Starts 15 minutes into the first one
    apt2 = Appointment(
        team_member_id=member.id,
        service_id=service.id,
        starts_at=starts_at + timedelta(minutes=15),
        ends_at=starts_at + timedelta(minutes=45),
        status=AppointmentStatus.confirmed,
        origin=AppointmentOrigin.online
    )
    session.add(apt2)
    
    with pytest.raises(IntegrityError):
        await session.commit()
    
    await session.rollback()

    # 3. Verify that DIFFERENT member can book at the same time
    member2 = TeamMember(name="M2", is_active=True)
    session.add(member2)
    await session.commit()

    apt3 = Appointment(
        team_member_id=member2.id,
        service_id=service.id,
        starts_at=starts_at,
        ends_at=ends_at,
        status=AppointmentStatus.confirmed,
        origin=AppointmentOrigin.online
    )
    session.add(apt3)
    await session.commit() # Should succeed
