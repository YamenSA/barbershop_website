import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession
from datetime import datetime, timezone, timedelta

from app.core.config import settings
from app.domains.booking.models import Customer, Appointment, AppointmentOrigin, AppointmentStatus
from app.domains.stammdaten.models import Service, TeamMember
from app.domains.booking.service import BookingService

async def main():
    engine = create_async_engine(str(settings.DATABASE_URL))
    
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        
    async with AsyncSession(engine, expire_on_commit=False) as session:
        import uuid
        uid = uuid.uuid4().hex[:6]
        service = Service(name=f"Test Service {uid}", duration_minutes=30, price_cents=1000)
        member = TeamMember(name=f"Test Member {uid}")
        session.add(service)
        session.add(member)
        await session.commit()
        
        # 2. Create customer
        customer = Customer(name="John Doe", email=f"john.test.{uid}@example.com", phone="555-1234")
        session.add(customer)
        await session.commit()
        
        # 3. Create appointment with PII
        now = datetime.now(timezone.utc)
        apt = Appointment(
            team_member_id=member.id,
            service_id=service.id,
            customer_id=customer.id,
            starts_at=now + timedelta(days=1),
            ends_at=now + timedelta(days=1, minutes=30),
            notes="Wants a special fade cut, friend of the owner.",
            status=AppointmentStatus.confirmed,
            origin=AppointmentOrigin.online
        )
        session.add(apt)
        await session.commit()
        
        print("\n--- BEFORE ANONYMIZATION ---")
        stmt = select(Appointment).where(Appointment.customer_id == customer.id)
        apt_before = (await session.execute(stmt)).scalar_one()
        print(f"Appointment ID: {apt_before.id}")
        print(f"Customer ID: {apt_before.customer_id}")
        print(f"Guest Name: {apt_before.guest_name}")
        print(f"Guest Phone: {apt_before.guest_phone}")
        print(f"Notes: {apt_before.notes}")
        
        # 4. Anonymize
        await BookingService.delete_customer(session, customer.id)
        
        # 5. Fetch raw row
        
        print("\n--- AFTER ANONYMIZATION ---")
        stmt2 = select(Appointment).where(Appointment.customer_id == customer.id)
        apt_after = (await session.execute(stmt2)).scalar_one()
        print(f"Appointment ID: {apt_after.id}")
        print(f"Customer ID: {apt_after.customer_id}")
        print(f"Guest Name: {apt_after.guest_name}")
        print(f"Guest Phone: {apt_after.guest_phone}")
        print(f"Notes: {apt_after.notes}")
        
if __name__ == "__main__":
    asyncio.run(main())
