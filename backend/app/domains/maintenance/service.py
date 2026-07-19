import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.config import settings
from app.domains.booking.models import Appointment, Customer
from app.domains.booking.service import BookingService
from app.domains.maintenance.schemas import RetentionResultOut

logger = logging.getLogger(__name__)

class MaintenanceService:
    @staticmethod
    async def run_retention(session: AsyncSession, dry_run: bool = True) -> RetentionResultOut:
        now = datetime.now(timezone.utc)
        customer_cutoff = now - timedelta(days=settings.RETENTION_CUSTOMER_MONTHS * 30)
        guest_cutoff = now - timedelta(days=settings.RETENTION_GUEST_MONTHS * 30)

        # 1. Customers inactive for >= 12 months
        customer_stmt = select(Customer).where(
            Customer.last_active_at < customer_cutoff,
            Customer.anonymized_at == None
        )
        customer_results = await session.execute(customer_stmt)
        customers_to_anonymize = customer_results.scalars().all()
        anonymized_customers = len(customers_to_anonymize)

        # 2. Walk-in guests > 12 months
        guest_stmt = select(Appointment).where(
            Appointment.customer_id == None,
            Appointment.starts_at < guest_cutoff,
            or_(
                Appointment.guest_name != None,
                Appointment.guest_phone != None,
                Appointment.notes != None
            )
        )
        guest_results = await session.execute(guest_stmt)
        guests_to_anonymize = guest_results.scalars().all()
        anonymized_guest_appointments = len(guests_to_anonymize)

        if not dry_run:
            # Execute actual deletion
            for customer in customers_to_anonymize:
                await BookingService.delete_customer(session, customer.id)
            
            for apt in guests_to_anonymize:
                apt.guest_name = "[anonymisiert]"
                apt.guest_phone = "[anonymisiert]"
                apt.notes = None
                session.add(apt)
            
            await session.commit()
            mode = "EXECUTE"
        else:
            mode = "DRY_RUN"

        logger.info(
            f"Retention job executed. Mode: {mode}, "
            f"Anonymized Customers: {anonymized_customers}, "
            f"Anonymized Guest Appointments: {anonymized_guest_appointments}"
        )

        return RetentionResultOut(
            mode=mode,
            anonymized_customers=anonymized_customers,
            anonymized_guest_appointments=anonymized_guest_appointments
        )
