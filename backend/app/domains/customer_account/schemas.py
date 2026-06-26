from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator


def _require_strong_password(v: str) -> str:
    if len(v) < 10:
        raise ValueError("WEAK_PASSWORD")
    return v


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _require_strong_password(v)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        return _require_strong_password(v)


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None


class MeOut(BaseModel):
    id: UUID
    name: str
    email: str
    phone: Optional[str] = None


class AccountAppointmentRead(BaseModel):
    id: UUID
    service_name: str
    team_member_name: str
    starts_at: datetime
    ends_at: datetime
    status: str
    cancellable: bool
    reschedulable: bool


class AppointmentListOut(BaseModel):
    upcoming: list[AccountAppointmentRead]
    past: list[AccountAppointmentRead]


class RescheduleRequest(BaseModel):
    starts_at: datetime
    team_member_id: Optional[UUID] = None


class GenericMessageOut(BaseModel):
    message: str


class VerifiedOut(BaseModel):
    verified: bool


class ResetOut(BaseModel):
    reset: bool
