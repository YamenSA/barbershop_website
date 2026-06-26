"""Admin router for Promotions (protected by get_current_admin)."""
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.domains.auth.dependencies import get_current_admin
from app.domains.marketing.schemas import (
    PromotionCreate,
    PromotionRead,
    PromotionUpdate,
)
from app.domains.marketing.service import PromotionService

router = APIRouter(tags=["promotions-admin"])


@router.post(
    "/promotions",
    response_model=PromotionRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_admin)],
)
async def create_promotion(
    data: PromotionCreate,
    session: AsyncSession = Depends(get_session),
):
    return await PromotionService.create(session, data)


@router.get(
    "/promotions",
    response_model=list[PromotionRead],
    dependencies=[Depends(get_current_admin)],
)
async def list_promotions(session: AsyncSession = Depends(get_session)):
    return await PromotionService.list_all(session)


@router.get(
    "/promotions/{promotion_id}",
    response_model=PromotionRead,
    dependencies=[Depends(get_current_admin)],
)
async def get_promotion(
    promotion_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    return await PromotionService.get(session, promotion_id)


@router.put(
    "/promotions/{promotion_id}",
    response_model=PromotionRead,
    dependencies=[Depends(get_current_admin)],
)
async def update_promotion(
    promotion_id: UUID,
    data: PromotionUpdate,
    session: AsyncSession = Depends(get_session),
):
    return await PromotionService.update(session, promotion_id, data)


@router.delete(
    "/promotions/{promotion_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_admin)],
)
async def delete_promotion(
    promotion_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    await PromotionService.delete(session, promotion_id)
