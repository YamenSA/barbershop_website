import time
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.domains.booking.models import Appointment, Customer


class RetentionResult(BaseModel):
    anonymized_guest_appointments: int
    anonymized_customers: int
    duration_seconds: float


async def run_retention_job(session: AsyncSession) -> RetentionResult:
    start_time = time.time()
    
    # 1. Guest Anonymization (RETENTION_GUEST_MONTHS, standard 12)
    guest_cutoff = datetime.now(timezone.utc) - timedelta(days=settings.RETENTION_GUEST_MONTHS * 30)
    
    guest_stmt = select(Appointment).where(
        Appointment.customer_id == None,
        Appointment.starts_at < guest_cutoff,
        Appointment.guest_name != "[anonymisiert]"
    )
    guest_results = await session.execute(guest_stmt)
    guest_apts = guest_results.scalars().all()
    
    for apt in guest_apts:
        apt.guest_name = "[anonymisiert]"
        apt.guest_phone = "[anonymisiert]"
        session.add(apt)
    
    # 2. Customer Anonymization (RETENTION_CUSTOMER_MONTHS, standard 24)
    customer_cutoff = datetime.now(timezone.utc) - timedelta(days=settings.RETENTION_CUSTOMER_MONTHS * 30)
    
    customer_stmt = select(Customer).where(
        Customer.last_active_at < customer_cutoff,
        Customer.anonymized_at == None
    )
    customer_results = await session.execute(customer_stmt)
    customers = customer_results.scalars().all()
    
    for customer in customers:
        customer.name = "[anonymisiert]"
        customer.email = "[anonymisiert]@[anonymisiert]"
        customer.phone = "[anonymisiert]"
        customer.anonymized_at = datetime.now(timezone.utc)
        session.add(customer)
        
    await session.commit()
    
    return RetentionResult(
        anonymized_guest_appointments=len(guest_apts),
        anonymized_customers=len(customers),
        duration_seconds=round(time.time() - start_time, 2)
    )
