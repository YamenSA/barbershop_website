from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel

from app.core.base import TimestampModel, UUIDModel


class TokenPurpose(str, Enum):
    email_verification = "email_verification"
    password_reset = "password_reset"


class CustomerToken(UUIDModel, table=True):
    __tablename__ = "customer_tokens"

    customer_id: UUID = Field(foreign_key="customers.id", index=True, nullable=False)
    token_hash: str = Field(unique=True, index=True, nullable=False)
    purpose: TokenPurpose = Field(nullable=False)
    expires_at: datetime = Field(nullable=False, sa_type=DateTime(timezone=True))
    used_at: Optional[datetime] = Field(default=None, sa_type=DateTime(timezone=True))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_type=DateTime(timezone=True),
    )
