from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from sqlmodel import Field, Relationship, SQLModel

from app.core.base import TimestampModel, UUIDModel


class AppointmentStatus(str, Enum):
    confirmed = "confirmed"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


class Customer(UUIDModel, TimestampModel, table=True):
    __tablename__ = "customers"

    name: str = Field(nullable=False)
    email: str = Field(unique=True, index=True, nullable=False)
    phone: Optional[str] = Field(default=None)
    last_active_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    anonymized_at: Optional[datetime] = Field(default=None)


class Appointment(UUIDModel, TimestampModel, table=True):
    __tablename__ = "appointments"

    team_member_id: UUID = Field(foreign_key="team_members.id", nullable=False)
    service_id: UUID = Field(foreign_key="services.id", nullable=False)
    customer_id: Optional[UUID] = Field(
        default=None, foreign_key="customers.id", nullable=True
    )
    guest_name: Optional[str] = Field(default=None)
    guest_phone: Optional[str] = Field(default=None)
    
    starts_at: datetime = Field(nullable=False)
    ends_at: datetime = Field(nullable=False)
    status: AppointmentStatus = Field(
        default=AppointmentStatus.confirmed, nullable=False
    )
    notes: Optional[str] = Field(default=None)

    customer: Optional[Customer] = Relationship()
