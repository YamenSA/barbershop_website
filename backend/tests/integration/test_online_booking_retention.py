from datetime import datetime, timedelta, timezone
import pytest
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from httpx import AsyncClient

from app.domains.booking.models import Customer
from app.domains.maintenance.service import MaintenanceService
from app.domains.stammdaten.models import Service, TeamMember

@pytest.mark.asyncio
async def test_online_booking_updates_last_active_and_respects_retention(
    public_client: AsyncClient, session: AsyncSession
):
    # 1. Setup service and member
    service = Service(name="Haarschnitt", duration_minutes=30, price_cents=2500, is_active=True)
    member = TeamMember(name="Max", is_active=True)
    session.add_all([service, member])
    await session.commit()

    # 2. Perform online booking
    future = datetime.now(timezone.utc) + timedelta(days=7)
    starts_at = future.replace(hour=10, minute=0, second=0, microsecond=0)
    
    booking_data = {
        "service_id": str(service.id),
        "team_member_id": str(member.id),
        "starts_at": starts_at.isoformat(),
        "customer": {
            "name": "Online Gast",
            "email": "online@example.com",
            "phone": "+4912345"
        },
        "privacy_acknowledged": True
    }
    
    resp = await public_client.post("/api/v1/public/booking/appointments", json=booking_data)
    assert resp.status_code == 201
    
    # Verify last_active_at is set
    stmt = select(Customer).where(Customer.email == "online@example.com")
    customer = (await session.execute(stmt)).scalar_one()
    assert customer.last_active_at is not None
    
    now = datetime.now(timezone.utc)
    last_active = customer.last_active_at
    if last_active.tzinfo is None:
        last_active = last_active.replace(tzinfo=timezone.utc)
    
    assert (now - last_active).total_seconds() < 60

    # 3. Simulate passing 25 months
    customer.last_active_at = datetime.now(timezone.utc) - timedelta(days=750)
    session.add(customer)
    await session.commit()
    
    # 4. Run retention job
    result = await MaintenanceService.run_retention(session, dry_run=False)
    assert result.anonymized_customers >= 1
    
    # Verify anonymization
    await session.refresh(customer)
    assert customer.name == "[anonymisiert]"
    assert customer.email.startswith("[anonymisiert]")
    assert customer.anonymized_at is not None
