import datetime as dt

from sqlalchemy import DateTime
from sqlmodel import Field

from app.core.base import TimestampModel, UUIDModel


class Promotion(UUIDModel, TimestampModel, table=True):
    __tablename__ = "promotions"

    title: str = Field(nullable=False)
    description: str = Field(nullable=False)
    starts_on: dt.date = Field(nullable=False)
    ends_on: dt.date = Field(nullable=False)
    is_active: bool = Field(default=True, nullable=False)
