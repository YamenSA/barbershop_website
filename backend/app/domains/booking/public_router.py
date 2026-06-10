from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Request
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.limiter import limiter
from app.domains.booking.availability import get_public_slots
from app.domains.booking.schemas import (
    AvailabilityResponse,
    CancellationView,
    PublicAppointmentCreate,
    PublicAppointmentRead,
    PublicSlot,
)
from app.domains.booking.service import (
    cancel_by_token,
    create_public_appointment,
    get_cancellation_view,
)
from app.domains.notifications.service import send_confirmation

router = APIRouter(prefix="/booking", tags=["public-booking"])


@router.get("/availability", response_model=AvailabilityResponse)
async def get_availability(
    service_id: UUID,
    date: date,
    team_member_id: Optional[UUID] = None,
    session: AsyncSession = Depends(get_session),
) -> AvailabilityResponse:
    slots = await get_public_slots(session, service_id, date, team_member_id)
    return AvailabilityResponse(
        date=date.isoformat(),
        slots=[
            PublicSlot(
                starts_at=s.starts_at,
                ends_at=s.ends_at,
                team_member_id=s.team_member_id,
                team_member_name=s.team_member_name,
            )
            for s in slots
        ],
    )


@router.post("/appointments", response_model=PublicAppointmentRead, status_code=201)
@limiter.limit(f"{settings.RATE_LIMIT_BOOKING_PER_MINUTE}/minute")
async def book_appointment(
    request: Request,
    data: PublicAppointmentCreate,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_session),
) -> PublicAppointmentRead:
    appointment = await create_public_appointment(session, data)
    background_tasks.add_task(send_confirmation, session, appointment)
    return PublicAppointmentRead.model_validate(appointment)


@router.get("/cancel/{token}", response_model=CancellationView)
async def view_cancellation(
    token: str,
    session: AsyncSession = Depends(get_session),
) -> CancellationView:
    return await get_cancellation_view(session, token)


@router.post("/cancel/{token}", response_model=CancellationView)
@limiter.limit(f"{settings.RATE_LIMIT_BOOKING_PER_MINUTE}/minute")
async def cancel_appointment(
    request: Request,
    token: str,
    session: AsyncSession = Depends(get_session),
) -> CancellationView:
    return await cancel_by_token(session, token)
