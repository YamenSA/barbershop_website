from datetime import date, datetime, time
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# --- Services ---

class ServiceBase(BaseModel):
    name: str
    duration_minutes: int
    price_cents: int
    is_active: bool = True


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    duration_minutes: Optional[int] = None
    price_cents: Optional[int] = None
    is_active: Optional[bool] = None


class ServiceRead(ServiceBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


# --- Team Members ---

class TeamMemberBase(BaseModel):
    name: str
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    is_active: bool = True


class TeamMemberCreate(TeamMemberBase):
    pass


class TeamMemberUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    is_active: Optional[bool] = None


class TeamMemberRead(TeamMemberBase):
    id: UUID
    services: List[ServiceRead] = []
    model_config = ConfigDict(from_attributes=True)


class ServiceAssignment(BaseModel):
    service_ids: List[UUID]


# --- Salon Hours & Closures ---

class SalonHoursBase(BaseModel):
    day_of_week: int
    is_open: bool = True
    open_time: Optional[time] = None
    close_time: Optional[time] = None


class SalonHoursRead(SalonHoursBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


class SalonHoursUpdate(BaseModel):
    is_open: Optional[bool] = None
    open_time: Optional[time] = None
    close_time: Optional[time] = None


class SalonClosureBase(BaseModel):
    date: date
    reason: Optional[str] = None


class SalonClosureCreate(SalonClosureBase):
    pass


class SalonClosureRead(SalonClosureBase):
    id: UUID
    model_config = ConfigDict(from_attributes=True)


# --- Working Hours & Exceptions ---

class WorkingHoursBase(BaseModel):
    day_of_week: int
    start_time: time
    end_time: time


class WorkingHoursCreate(WorkingHoursBase):
    pass


class WorkingHoursRead(WorkingHoursBase):
    id: UUID
    team_member_id: UUID
    model_config = ConfigDict(from_attributes=True)


class WorkingHoursUpdate(BaseModel):
    start_time: Optional[time] = None
    end_time: Optional[time] = None


class WorkingExceptionBase(BaseModel):
    starts_at: datetime
    ends_at: datetime
    reason: Optional[str] = None


class WorkingExceptionCreate(WorkingExceptionBase):
    pass


class WorkingExceptionRead(WorkingExceptionBase):
    id: UUID
    team_member_id: UUID
    model_config = ConfigDict(from_attributes=True)
