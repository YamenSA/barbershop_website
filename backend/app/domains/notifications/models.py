from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID

from sqlalchemy import DateTime
from sqlmodel import Field, SQLModel

from app.core.base import UUIDModel


class NotificationKind(str, Enum):
    confirmation = "confirmation"
    reminder = "reminder"


class NotificationChannel(str, Enum):
    email = "email"


class NotificationStatus(str, Enum):
    sent = "sent"
    failed = "failed"
    skipped = "skipped"


class NotificationLog(UUIDModel, table=True):
    __tablename__ = "notification_logs"

    appointment_id: UUID = Field(foreign_key="appointments.id", nullable=False, index=True)
    kind: NotificationKind = Field(nullable=False)
    channel: NotificationChannel = Field(default=NotificationChannel.email, nullable=False)
    status: NotificationStatus = Field(nullable=False)
    error: Optional[str] = Field(default=None)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_type=DateTime(timezone=True),
    )
