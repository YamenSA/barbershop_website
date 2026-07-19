from datetime import date, datetime, time
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.domains.stammdaten.models import TargetGroup, ServiceKind


# --- Services ---

class ServiceBase(BaseModel):
    name: str
    duration_minutes: int
    price_cents: int
    price_is_from: bool = False
    description: Optional[str] = None
    is_active: bool = True
    target_group: TargetGroup
    service_kind: ServiceKind
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    duration_minutes: Optional[int] = None
    price_cents: Optional[int] = None
    price_is_from: Optional[bool] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    target_group: Optional[TargetGroup] = None
    service_kind: Optional[ServiceKind] = None


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
    force: bool = False


class ClosureConflictWarning(BaseModel):
    code: str = "CLOSURE_CONFLICT_WARNING"
    conflicting_appointment_count: int
    requires_confirmation: bool = True


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


# --- Day Overrides ---

class DayOverrideBase(BaseModel):
    date: date
    override_type: str  # 'day_off' or 'extra_hours'
    custom_start_time: Optional[time] = None
    custom_end_time: Optional[time] = None
    reason: Optional[str] = None


class DayOverrideCreate(DayOverrideBase):
    pass


class DayOverrideRead(DayOverrideBase):
    id: UUID
    team_member_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Salon Profile ---

class SalonProfileBase(BaseModel):
    name: str
    street: str
    postal_code: str
    city: str
    country: str = "DE"
    phone: str
    email: Optional[str] = None


class SalonProfileRead(SalonProfileBase):
    model_config = ConfigDict(from_attributes=True)


class SalonProfileUpdate(BaseModel):
    name: Optional[str] = None
    street: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


# --- Working Day Schedule (Intervall-basiert) ---

class WorkingIntervalIn(BaseModel):
    start_time: time
    end_time: time

    @model_validator(mode='after')
    def end_after_start(self) -> 'WorkingIntervalIn':
        if self.end_time <= self.start_time:
            raise ValueError('Endzeit muss nach der Startzeit liegen')
        return self


class WorkingIntervalRead(BaseModel):
    id: UUID
    start_time: time
    end_time: time
    sort_order: int
    model_config = ConfigDict(from_attributes=True)


class WorkingDayScheduleIn(BaseModel):
    is_working: bool
    intervals: List[WorkingIntervalIn] = []

    @model_validator(mode='after')
    def validate_intervals(self) -> 'WorkingDayScheduleIn':
        if self.is_working and len(self.intervals) == 0:
            raise ValueError('Mindestens ein Zeitintervall erforderlich wenn der Mitarbeiter arbeitet')
        if not self.is_working and len(self.intervals) > 0:
            raise ValueError('Keine Zeitintervalle erlaubt wenn der Mitarbeiter nicht arbeitet')
        # Check for overlaps
        sorted_intervals = sorted(self.intervals, key=lambda i: i.start_time)
        for i in range(1, len(sorted_intervals)):
            if sorted_intervals[i].start_time < sorted_intervals[i - 1].end_time:
                raise ValueError('Zeitintervalle dürfen sich nicht überschneiden')
        return self


class WorkingDayScheduleRead(BaseModel):
    id: UUID
    team_member_id: UUID
    day_of_week: int
    is_working: bool
    intervals: List[WorkingIntervalRead] = []
    model_config = ConfigDict(from_attributes=True)


class WorkingWeekScheduleIn(BaseModel):
    """Bulk-Update: alle 7 Tage auf einmal."""
    days: List[WorkingDayScheduleIn]

    @model_validator(mode='after')
    def exactly_seven_days(self) -> 'WorkingWeekScheduleIn':
        if len(self.days) != 7:
            raise ValueError('Genau 7 Tage (Mo-So) erforderlich')
        return self


# --- Public Read Schemas ---

class PublicSalonHoursRead(BaseModel):
    day_of_week: int
    is_open: bool
    open_time: Optional[time] = None
    close_time: Optional[time] = None
    model_config = ConfigDict(from_attributes=True)


class PublicServiceRead(BaseModel):
    id: UUID
    name: str
    duration_minutes: int
    price_cents: int
    price_is_from: bool = False
    description: Optional[str] = None
    target_group: str
    service_kind: str
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)


class PublicServiceRef(BaseModel):
    id: UUID
    name: str
    model_config = ConfigDict(from_attributes=True)


class PublicTeamMemberRead(BaseModel):
    id: UUID
    name: str
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    services: List[PublicServiceRef] = []
    model_config = ConfigDict(from_attributes=True)
