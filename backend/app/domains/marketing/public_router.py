"""Public router for Promotions — only visible (active + date covers today)."""
from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.domains.marketing.schemas import PublicPromotionRead
from app.domains.marketing.service import PromotionService

router = APIRouter(tags=["promotions-public"])


@router.get("/promotions", response_model=list[PublicPromotionRead])
async def list_public_promotions(session: AsyncSession = Depends(get_session)):
    """
    Return only promotions that are currently visible:
    is_active AND starts_on <= today <= ends_on (today = Europe/Berlin, I2 guard).
    """
    return await PromotionService.list_public_active(session)
