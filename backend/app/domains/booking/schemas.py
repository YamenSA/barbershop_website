from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.core.schema_types import SalonDatetimeIn, SalonDatetimeOut
from app.domains.booking.models import AppointmentStatus


class CustomerBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerRead(CustomerBase):
    id: UUID
    created_at: datetime
    last_active_at: datetime
    anonymized_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class CustomerListOut(BaseModel):
    items: List[CustomerRead]
    total: int


class AppointmentBase(BaseModel):
    team_member_id: UUID
    service_id: UUID
    customer_id: Optional[UUID] = None
    guest_name: Optional[str] = None
    guest_phone: Optional[str] = None
    starts_at: SalonDatetimeIn
    notes: Optional[str] = None


class AppointmentCreate(AppointmentBase):
    admin_override: bool = False  # not persisted — skips schedule check when True


class BookedService(BaseModel):
    id: UUID
    name: str
    duration_minutes: int
    price_cents: int
    price_is_from: bool


class AppointmentRead(BaseModel):
    id: UUID
    team_member_id: UUID
    service_id: UUID
    selected_services: List[BookedService] = Field(default_factory=list)
    service_names: List[str] = Field(default_factory=list)
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_anonymized_at: Optional[datetime] = None
    guest_name: Optional[str] = None
    guest_phone: Optional[str] = None
    starts_at: SalonDatetimeOut
    ends_at: SalonDatetimeOut
    status: AppointmentStatus
    notes: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class AppointmentStatusUpdate(BaseModel):
    status: AppointmentStatus


class AppointmentUpdate(BaseModel):
    starts_at: Optional[SalonDatetimeIn] = None
    team_member_id: Optional[UUID] = None
    notes: Optional[str] = None


class AppointmentSummary(BaseModel):
    id: UUID
    team_member_id: UUID
    service_id: UUID
    service_names: List[str] = Field(default_factory=list)
    customer_id: Optional[UUID] = None
    customer_name: Optional[str] = None
    customer_anonymized_at: Optional[datetime] = None
    guest_name: Optional[str] = None
    guest_phone: Optional[str] = None
    starts_at: SalonDatetimeOut
    ends_at: SalonDatetimeOut
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

    @field_validator("name")
    @classmethod
    def non_blank_name(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Bitte einen Namen angeben")
        return value.strip()


class PublicAppointmentCreate(BaseModel):
    service_id: Optional[UUID] = None
    service_ids: Optional[List[UUID]] = Field(default=None, min_length=1, max_length=20)
    team_member_id: Optional[UUID] = None  # None = any available stylist
    starts_at: SalonDatetimeIn
    customer: PublicCustomerCreate
    privacy_acknowledged: bool
    expected_total_price_cents: Optional[int] = Field(default=None, ge=0)
    expected_total_duration_minutes: Optional[int] = Field(default=None, ge=1)

    @model_validator(mode="after")
    def valid_selection(self):
        if (self.service_id is None) == (self.service_ids is None):
            raise ValueError("Genau eine Leistungsauswahl ist erforderlich")
        if self.service_ids and len(set(self.service_ids)) != len(self.service_ids):
            raise ValueError("Leistungen dürfen nicht doppelt ausgewählt werden")
        return self

    @field_validator("privacy_acknowledged")
    @classmethod
    def must_be_acknowledged(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Datenschutzerklärung muss akzeptiert werden")
        return v


class PublicSlot(BaseModel):
    starts_at: SalonDatetimeOut
    ends_at: SalonDatetimeOut
    team_member_id: UUID
    team_member_name: str


class AvailabilityResponse(BaseModel):
    date: str
    slots: List[PublicSlot]


class BookingDayRead(BaseModel):
    date: str
    is_open: bool


class PublicAppointmentRead(BaseModel):
    id: UUID
    service_id: UUID
    selected_services: List[BookedService] = Field(default_factory=list)
    team_member_id: UUID
    starts_at: SalonDatetimeOut
    ends_at: SalonDatetimeOut
    status: AppointmentStatus
    cancellation_token: str
    payment_note: str = "Barzahlung vor Ort"
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Public Cancellation Schemas (US3)
# ---------------------------------------------------------------------------


class CancellationView(BaseModel):
    id: UUID
    service_name: str
    team_member_name: str
    starts_at: SalonDatetimeOut
    status: AppointmentStatus
    cancellable: bool
    cancellation_deadline: Optional[SalonDatetimeOut] = None
