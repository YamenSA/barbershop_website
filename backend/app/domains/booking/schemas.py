from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.domains.booking.models import AppointmentStatus


class CustomerBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerRead(CustomerBase):
    id: UUID
    last_active_at: datetime
    anonymized_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class AppointmentBase(BaseModel):
    team_member_id: UUID
    service_id: UUID
    customer_id: Optional[UUID] = None
    guest_name: Optional[str] = None
    guest_phone: Optional[str] = None
    starts_at: datetime
    notes: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    admin_override: bool = False  # not persisted — skips schedule check when True


class AppointmentRead(BaseModel):
    id: UUID
    team_member_id: UUID
    service_id: UUID
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    guest_name: Optional[str] = None
    guest_phone: Optional[str] = None
    starts_at: datetime
    ends_at: datetime
    status: AppointmentStatus
    notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus


class AppointmentUpdate(BaseModel):
    starts_at: Optional[datetime] = None
    team_member_id: Optional[UUID] = None
    notes: Optional[str] = None


class AppointmentSummary(BaseModel):
    id: UUID
    team_member_id: UUID
    service_id: UUID
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    guest_name: Optional[str] = None
    guest_phone: Optional[str] = None
    starts_at: datetime
    ends_at: datetime
    status: AppointmentStatus
    model_config = ConfigDict(from_attributes=True)


class WorkingMemberSummary(BaseModel):
    team_member_id: UUID
    name: str
    start_time: str
    end_time: str


class DashboardResponse(BaseModel):
    date: str
    appointments: List[AppointmentSummary]
    working_today: List[WorkingMemberSummary]


# ---------------------------------------------------------------------------
# Public Booking Schemas (US1)
# ---------------------------------------------------------------------------


class PublicCustomerCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = None


class PublicAppointmentCreate(BaseModel):
    service_id: UUID
    team_member_id: Optional[UUID] = None  # None = any available stylist
    starts_at: datetime
    customer: PublicCustomerCreate
    privacy_acknowledged: bool

    @field_validator("privacy_acknowledged")
    @classmethod
    def must_be_acknowledged(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Datenschutzerklärung muss akzeptiert werden")
        return v


class PublicSlot(BaseModel):
    starts_at: datetime
    ends_at: datetime
    team_member_id: UUID
    team_member_name: str


class AvailabilityResponse(BaseModel):
    date: str
    slots: List[PublicSlot]


class PublicAppointmentRead(BaseModel):
    id: UUID
    service_id: UUID
    team_member_id: UUID
    starts_at: datetime
    ends_at: datetime
    status: AppointmentStatus
    cancellation_token: str
    payment_note: str = "Zahlung vor Ort"
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Public Cancellation Schemas (US3)
# ---------------------------------------------------------------------------


class CancellationView(BaseModel):
    id: UUID
    service_name: str
    team_member_name: str
    starts_at: datetime
    status: AppointmentStatus
    cancellable: bool
    cancellation_deadline: Optional[datetime] = None
