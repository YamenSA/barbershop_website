from typing import List

from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.domains.stammdaten.schemas import PublicSalonHoursRead, PublicServiceRead, PublicTeamMemberRead, SalonProfileRead
from app.domains.stammdaten.service import StammdatenService

router = APIRouter()


@router.get("/salon-profile", response_model=SalonProfileRead)
async def get_public_salon_profile(session: AsyncSession = Depends(get_session)):
    return await StammdatenService.get_salon_profile(session)


@router.get("/salon-hours", response_model=List[PublicSalonHoursRead])
async def get_public_salon_hours(session: AsyncSession = Depends(get_session)):
    return await StammdatenService.get_public_salon_hours(session)


@router.get("/services", response_model=List[PublicServiceRead])
async def get_public_services(session: AsyncSession = Depends(get_session)):
    services = await StammdatenService.get_active_services_public(session)
    return [PublicServiceRead.model_validate(s) for s in services]


@router.get("/team", response_model=List[PublicTeamMemberRead])
async def get_public_team(session: AsyncSession = Depends(get_session)):
    return await StammdatenService.get_active_team_public(session)
