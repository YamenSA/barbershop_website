from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

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
