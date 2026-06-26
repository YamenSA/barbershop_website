"""
Pydantic/SQLModel schemas for the marketing domain (Promotions).

effective_status uses English identifiers per API contract (M1).
Localisation (sichtbar/geplant/abgelaufen/versteckt) is done in the UI layer.
"""
import datetime as dt
from typing import Literal, Optional
from uuid import UUID

from pydantic import field_validator
from sqlmodel import SQLModel

PromotionStatus = Literal["visible", "scheduled", "expired", "hidden"]


class PromotionBase(SQLModel):
    title: str
    description: str
    starts_on: dt.date
    ends_on: dt.date
    is_active: bool = True


class PromotionCreate(PromotionBase):
    pass


class PromotionUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    starts_on: Optional[dt.date] = None
    ends_on: Optional[dt.date] = None
    is_active: Optional[bool] = None


class PromotionRead(PromotionBase):
    id: UUID
    effective_status: PromotionStatus
    created_at: dt.datetime
    updated_at: dt.datetime


class PublicPromotionRead(SQLModel):
    id: UUID
    title: str
    description: str
    starts_on: dt.date
    ends_on: dt.date
