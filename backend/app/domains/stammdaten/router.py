from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.domains.stammdaten.schemas import (
    SalonClosureCreate,
    SalonClosureRead,
    SalonHoursRead,
    SalonHoursUpdate,
    ServiceAssignment,
    ServiceCreate,
    ServiceRead,
    ServiceUpdate,
    TeamMemberCreate,
    TeamMemberRead,
    TeamMemberUpdate,
    WorkingExceptionCreate,
    WorkingExceptionRead,
    WorkingHoursRead,
    WorkingHoursUpdate,
)
from app.domains.stammdaten.service import StammdatenService

router = APIRouter()


# --- Services ---

@router.post("/services", response_model=ServiceRead, status_code=status.HTTP_201_CREATED)
async def create_service(
    service_in: ServiceCreate, session: AsyncSession = Depends(get_session)
):
    return await StammdatenService.create_service(session, service_in)


@router.get("/services", response_model=List[ServiceRead])
async def get_services(session: AsyncSession = Depends(get_session)):
    return await StammdatenService.get_services(session)


@router.get("/services/{service_id}", response_model=ServiceRead)
async def get_service(service_id: UUID, session: AsyncSession = Depends(get_session)):
    return await StammdatenService.get_service(session, service_id)


@router.put("/services/{service_id}", response_model=ServiceRead)
async def update_service(
    service_id: UUID,
    service_in: ServiceUpdate,
    session: AsyncSession = Depends(get_session),
):
    return await StammdatenService.update_service(session, service_id, service_in)


@router.delete("/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_service(
    service_id: UUID, session: AsyncSession = Depends(get_session)
):
    await StammdatenService.deactivate_service(session, service_id)


# --- Team Members ---

@router.post(
    "/team-members", response_model=TeamMemberRead, status_code=status.HTTP_201_CREATED
)
async def create_team_member(
    member_in: TeamMemberCreate, session: AsyncSession = Depends(get_session)
):
    return await StammdatenService.create_team_member(session, member_in)


@router.get("/team-members", response_model=List[TeamMemberRead])
async def get_team_members(session: AsyncSession = Depends(get_session)):
    return await StammdatenService.get_team_members(session)


@router.get("/team-members/{member_id}", response_model=TeamMemberRead)
async def get_team_member(member_id: UUID, session: AsyncSession = Depends(get_session)):
    return await StammdatenService.get_team_member(session, member_id)


@router.put("/team-members/{member_id}", response_model=TeamMemberRead)
async def update_team_member(
    member_id: UUID,
    member_in: TeamMemberUpdate,
    session: AsyncSession = Depends(get_session),
):
    return await StammdatenService.update_team_member(session, member_id, member_in)


@router.put("/team-members/{member_id}/services", response_model=TeamMemberRead)
async def assign_services(
    member_id: UUID,
    assignment: ServiceAssignment,
    session: AsyncSession = Depends(get_session),
):
    return await StammdatenService.assign_services(
        session, member_id, assignment.service_ids
    )


# --- Salon Hours & Closures ---

@router.get("/salon-hours", response_model=List[SalonHoursRead])
async def get_salon_hours(session: AsyncSession = Depends(get_session)):
    return await StammdatenService.get_salon_hours(session)


@router.put("/salon-hours/{day_of_week}", response_model=SalonHoursRead)
async def update_salon_hours(
    day_of_week: int,
    hours_in: SalonHoursUpdate,
    session: AsyncSession = Depends(get_session),
):
    return await StammdatenService.update_salon_hours(session, day_of_week, hours_in)


@router.get("/salon-closures", response_model=List[SalonClosureRead])
async def get_salon_closures(session: AsyncSession = Depends(get_session)):
    return await StammdatenService.get_salon_closures(session)


@router.post(
    "/salon-closures", response_model=SalonClosureRead, status_code=status.HTTP_201_CREATED
)
async def create_salon_closure(
    closure_in: SalonClosureCreate, session: AsyncSession = Depends(get_session)
):
    return await StammdatenService.create_salon_closure(session, closure_in)


@router.delete("/salon-closures/{closure_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_salon_closure(
    closure_id: UUID, session: AsyncSession = Depends(get_session)
):
    await StammdatenService.delete_salon_closure(session, closure_id)


# --- Working Hours & Exceptions ---

@router.get("/team-members/{member_id}/working-hours", response_model=List[WorkingHoursRead])
async def get_working_hours(member_id: UUID, session: AsyncSession = Depends(get_session)):
    # This needs a get_working_hours method in service
    statement = select(WorkingHours).where(WorkingHours.team_member_id == member_id)
    result = await session.execute(statement)
    return result.scalars().all()


@router.put("/team-members/{member_id}/working-hours/{day_of_week}", response_model=WorkingHoursRead)
async def update_working_hours(
    member_id: UUID,
    day_of_week: int,
    hours_in: WorkingHoursUpdate,
    session: AsyncSession = Depends(get_session),
):
    return await StammdatenService.update_working_hours(session, member_id, day_of_week, hours_in)


@router.get("/team-members/{member_id}/exceptions", response_model=List[WorkingExceptionRead])
async def get_working_exceptions(
    member_id: UUID, session: AsyncSession = Depends(get_session)
):
    return await StammdatenService.get_working_exceptions(session, member_id)


@router.post(
    "/team-members/{member_id}/exceptions",
    response_model=WorkingExceptionRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_working_exception(
    member_id: UUID,
    exception_in: WorkingExceptionCreate,
    session: AsyncSession = Depends(get_session),
):
    return await StammdatenService.create_working_exception(session, member_id, exception_in)


@router.delete("/exceptions/{exception_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_working_exception(
    exception_id: UUID, session: AsyncSession = Depends(get_session)
):
    await StammdatenService.delete_working_exception(session, exception_id)
