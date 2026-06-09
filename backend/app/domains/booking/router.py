from datetime import date
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.domains.booking.availability import SlotResult, get_available_slots
from app.domains.booking.schemas import (
    AppointmentCreate,
    AppointmentRead,
    AppointmentStatusUpdate,
    AppointmentUpdate,
    CustomerCreate,
    CustomerRead,
)
from app.domains.booking.service import BookingService
from app.domains.auth.dependencies import get_current_admin

router = APIRouter(dependencies=[Depends(get_current_admin)])


@router.get("/availability", response_model=List[SlotResult])
async def get_availability(
    service_id: UUID,
    target_date: date,
    team_member_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    return await get_available_slots(session, team_member_id, service_id, target_date)


@router.post(
    "/appointments", response_model=AppointmentRead, status_code=status.HTTP_201_CREATED
)
async def create_appointment(
    appointment_in: AppointmentCreate, session: AsyncSession = Depends(get_session)
):
    return await BookingService.create_appointment(session, appointment_in)


@router.get("/appointments", response_model=List[AppointmentRead])
async def list_appointments(
    team_member_id: Optional[UUID] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    session: AsyncSession = Depends(get_session),
):
    return await BookingService.list_appointments(session, team_member_id, from_date, to_date)


@router.get("/appointments/{appointment_id}", response_model=AppointmentRead)
async def get_appointment(
    appointment_id: UUID, session: AsyncSession = Depends(get_session)
):
    return await BookingService.get_appointment(session, appointment_id)


@router.patch("/appointments/{appointment_id}", response_model=AppointmentRead)
async def patch_appointment(
    appointment_id: UUID,
    update_in: AppointmentUpdate,
    session: AsyncSession = Depends(get_session),
):
    return await BookingService.patch_appointment(session, appointment_id, update_in)


@router.patch("/appointments/{appointment_id}/status", response_model=AppointmentRead)
async def update_appointment_status(
    appointment_id: UUID,
    status_in: AppointmentStatusUpdate,
    session: AsyncSession = Depends(get_session),
):
    return await BookingService.update_appointment_status(
        session, appointment_id, status_in
    )


@router.post(
    "/customers", response_model=CustomerRead, status_code=status.HTTP_201_CREATED
)
async def create_customer(
    customer_in: CustomerCreate, session: AsyncSession = Depends(get_session)
):
    return await BookingService.create_customer(session, customer_in)


@router.get("/customers", response_model=List[CustomerRead])
async def list_customers(
    search: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
):
    return await BookingService.get_customers(session, search)


@router.get("/customers/{customer_id}", response_model=CustomerRead)
async def get_customer(customer_id: UUID, session: AsyncSession = Depends(get_session)):
    return await BookingService.get_customer(session, customer_id)


@router.delete("/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: UUID, session: AsyncSession = Depends(get_session)
):
    await BookingService.delete_customer(session, customer_id)
