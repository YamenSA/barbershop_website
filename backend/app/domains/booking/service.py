from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.domains.booking.models import Appointment, Customer
from app.domains.booking.schemas import (
    AppointmentCreate,
    AppointmentStatusUpdate,
    CustomerCreate,
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
    async def get_customers(session: AsyncSession) -> List[Customer]:
        statement = select(Customer).where(Customer.anonymized_at == None)
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
        # Load service to get duration
        service = await session.get(Service, appointment_in.service_id)
        if not service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Service not found"
            )

        ends_at = appointment_in.starts_at + timedelta(minutes=service.duration_minutes)

        # Application-level double booking check (in addition to DB constraint)
        from app.domains.booking.models import AppointmentStatus
        overlap_stmt = select(Appointment).where(
            Appointment.team_member_id == appointment_in.team_member_id,
            Appointment.status == AppointmentStatus.confirmed,
            Appointment.starts_at < ends_at,
            Appointment.ends_at > appointment_in.starts_at
        )
        overlap_result = await session.execute(overlap_stmt)
        if overlap_result.first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Double booking detected")

        appointment = Appointment(
            **appointment_in.model_dump(),
            ends_at=ends_at,
        )
        
        session.add(appointment)
        # IntegrityError will be caught by global handler (T010) and return 409
        await session.commit()
        await session.refresh(appointment)
        return appointment

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
        session: AsyncSession, team_member_id: Optional[UUID] = None
    ) -> List[Appointment]:
        statement = select(Appointment)
        if team_member_id:
            statement = statement.where(Appointment.team_member_id == team_member_id)
        results = await session.execute(statement)
        return results.scalars().all()
