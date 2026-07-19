from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID

from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel

from app.core.base import TimestampModel, UUIDModel


class AppointmentStatus(str, Enum):
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


class AppointmentOrigin(str, Enum):
    online = "online"
    walk_in = "walk_in"


class Customer(UUIDModel, TimestampModel, table=True):
    __tablename__ = "customers"

    name: str = Field(nullable=False)
    email: str = Field(unique=True, index=True, nullable=False)
    phone: Optional[str] = Field(default=None)
    last_active_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
        sa_type=DateTime(timezone=True),
    )
    anonymized_at: Optional[datetime] = Field(
        default=None, sa_type=DateTime(timezone=True)
    )
    hashed_password: Optional[str] = Field(default=None)
    email_verified_at: Optional[datetime] = Field(
        default=None, sa_type=DateTime(timezone=True)
    )


class Appointment(UUIDModel, TimestampModel, table=True):
    __tablename__ = "appointments"

    team_member_id: UUID = Field(foreign_key="team_members.id", nullable=False)
    service_id: UUID = Field(foreign_key="services.id", nullable=False)
    customer_id: Optional[UUID] = Field(
        default=None, foreign_key="customers.id", nullable=True
    )
    guest_name: Optional[str] = Field(default=None)
    guest_phone: Optional[str] = Field(default=None)
    
    starts_at: datetime = Field(nullable=False, sa_type=DateTime(timezone=True))
    ends_at: datetime = Field(nullable=False, sa_type=DateTime(timezone=True))
    status: AppointmentStatus = Field(
        default=AppointmentStatus.confirmed, nullable=False
    )
    notes: Optional[str] = Field(default=None)
    cancellation_token: Optional[str] = Field(default=None, unique=True)
    origin: AppointmentOrigin = Field(default=AppointmentOrigin.walk_in, nullable=False)

    customer: Optional[Customer] = Relationship()

    @property
    def customer_name(self) -> Optional[str]:
        return self.customer.name if self.customer else None
