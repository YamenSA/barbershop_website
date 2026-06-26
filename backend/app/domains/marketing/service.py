"""
Service layer for marketing domain (Promotions).

Guards:
- I2: 'today' is ALWAYS computed in Europe/Berlin timezone.
  A UTC off-by-one would leave expired promotions visible up to 1 day too long → UWG risk.
- validate_promotion_dates: ends_on >= starts_on; raises 422 otherwise.
"""
import datetime as dt
from typing import List, Optional
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.domains.marketing.models import Promotion
from app.domains.marketing.schemas import (
    PromotionCreate,
    PromotionStatus,
    PromotionUpdate,
)

BERLIN = ZoneInfo("Europe/Berlin")


def get_berlin_today() -> dt.date:
    """Return today's date in the Europe/Berlin timezone (I2 guard)."""
    return dt.datetime.now(tz=BERLIN).date()


def compute_effective_status(
    is_active: bool,
    starts_on: dt.date,
    ends_on: dt.date,
) -> PromotionStatus:
    """
    Derive effective status from promotion fields.

    Logic (data-model.md):
        if not is_active:            → "hidden"
        elif today < starts_on:      → "scheduled"
        elif today > ends_on:        → "expired"
        else:                        → "visible"

    'today' is obtained via get_berlin_today() so the function is testable
    through patching that helper.
    """
    today = get_berlin_today()
    if not is_active:
        return "hidden"
    if today < starts_on:
        return "scheduled"
    if today > ends_on:
        return "expired"
    return "visible"


def validate_promotion_dates(starts_on: dt.date, ends_on: dt.date) -> None:
    """Raise 422 when ends_on < starts_on."""
    if ends_on < starts_on:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="ends_on must be >= starts_on",
        )


def _enrich(promotion: Promotion) -> dict:
    """Return promotion as dict with computed effective_status."""
    d = promotion.model_dump()
    d["effective_status"] = compute_effective_status(
        promotion.is_active, promotion.starts_on, promotion.ends_on
    )
    return d


class PromotionService:
    @staticmethod
    async def create(
        session: AsyncSession, data: PromotionCreate
    ) -> dict:
        validate_promotion_dates(data.starts_on, data.ends_on)
        promotion = Promotion.model_validate(data)
        session.add(promotion)
        await session.commit()
        await session.refresh(promotion)
        return _enrich(promotion)

    @staticmethod
    async def list_all(session: AsyncSession) -> List[dict]:
        stmt = select(Promotion).order_by(Promotion.created_at.desc())
        result = await session.exec(stmt)
        return [_enrich(p) for p in result.all()]

    @staticmethod
    async def get(session: AsyncSession, promotion_id: UUID) -> dict:
        promotion = await session.get(Promotion, promotion_id)
        if not promotion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Promotion not found"
            )
        return _enrich(promotion)

    @staticmethod
    async def update(
        session: AsyncSession, promotion_id: UUID, data: PromotionUpdate
    ) -> dict:
        promotion = await session.get(Promotion, promotion_id)
        if not promotion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Promotion not found"
            )
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(promotion, key, value)

        # Re-validate dates after partial update
        validate_promotion_dates(promotion.starts_on, promotion.ends_on)

        session.add(promotion)
        await session.commit()
        await session.refresh(promotion)
        return _enrich(promotion)

    @staticmethod
    async def delete(session: AsyncSession, promotion_id: UUID) -> None:
        promotion = await session.get(Promotion, promotion_id)
        if not promotion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Promotion not found"
            )
        await session.delete(promotion)
        await session.commit()

    @staticmethod
    async def list_public_active(session: AsyncSession) -> List[Promotion]:
        """
        Return only promotions where effective_status == 'visible'.

        A promotion is visible iff:
            is_active AND starts_on <= today <= ends_on
        where 'today' is Europe/Berlin (I2 guard).
        """
        today = get_berlin_today()
        stmt = (
            select(Promotion)
            .where(Promotion.is_active == True)
            .where(Promotion.starts_on <= today)
            .where(Promotion.ends_on >= today)
            .order_by(Promotion.ends_on)
        )
        result = await session.exec(stmt)
        return result.all()
