import datetime as dt
from typing import List, Optional
from uuid import UUID

from sqlalchemy import DateTime
from sqlmodel import Field, Relationship, SQLModel

from app.core.base import TimestampModel, UUIDModel


class TeamMemberServiceLink(SQLModel, table=True):
    __tablename__ = "team_member_services"

    team_member_id: UUID = Field(
        foreign_key="team_members.id", primary_key=True, ondelete="CASCADE"
    )
    service_id: UUID = Field(
        foreign_key="services.id", primary_key=True, ondelete="CASCADE"
    )


class Service(UUIDModel, TimestampModel, table=True):
    __tablename__ = "services"

    name: str = Field(index=True, unique=True, nullable=False)
    duration_minutes: int = Field(nullable=False)
    price_cents: int = Field(nullable=False)
    description: Optional[str] = Field(default=None)
    is_active: bool = Field(default=True, nullable=False)

    team_members: List["TeamMember"] = Relationship(
        back_populates="services", link_model=TeamMemberServiceLink, sa_relationship_kwargs={"lazy": "selectin"}
    )


class TeamMember(UUIDModel, TimestampModel, table=True):
    __tablename__ = "team_members"

    name: str = Field(nullable=False)
    bio: Optional[str] = Field(default=None)
    photo_url: Optional[str] = Field(default=None)
    is_active: bool = Field(default=True, nullable=False)

    services: List[Service] = Relationship(
        back_populates="team_members", link_model=TeamMemberServiceLink, sa_relationship_kwargs={"lazy": "selectin"}
    )


class SalonHours(UUIDModel, table=True):
    __tablename__ = "salon_hours"

    day_of_week: int = Field(unique=True, nullable=False)  # 0-6 (Mon-Sun)
    is_open: bool = Field(default=True, nullable=False)
    open_time: Optional[dt.time] = Field(default=None)
    close_time: Optional[dt.time] = Field(default=None)


class SalonClosure(UUIDModel, TimestampModel, table=True):
    __tablename__ = "salon_closures"

    date: dt.date = Field(unique=True, nullable=False)
    reason: Optional[str] = Field(default=None)


class WorkingHours(UUIDModel, table=True):
    __tablename__ = "working_hours"

    team_member_id: UUID = Field(foreign_key="team_members.id", nullable=False)
    day_of_week: int = Field(nullable=False)  # 0-6
    start_time: dt.time = Field(nullable=False)
    end_time: dt.time = Field(nullable=False)

    member: TeamMember = Relationship()


class WorkingException(UUIDModel, TimestampModel, table=True):
    __tablename__ = "working_exceptions"

    team_member_id: UUID = Field(foreign_key="team_members.id", nullable=False)
    starts_at: dt.datetime = Field(nullable=False, sa_type=DateTime(timezone=True))
    ends_at: dt.datetime = Field(nullable=False, sa_type=DateTime(timezone=True))
    reason: Optional[str] = Field(default=None)

    member: TeamMember = Relationship()


class SalonProfile(UUIDModel, TimestampModel, table=True):
    __tablename__ = "salon_profile"

    name: str = Field(nullable=False)
    street: str = Field(nullable=False)
    postal_code: str = Field(nullable=False)
    city: str = Field(nullable=False)
    country: str = Field(default="DE", nullable=False)
    phone: str = Field(nullable=False)
    email: Optional[str] = Field(default=None)


class DayOverride(UUIDModel, table=True):
    __tablename__ = "day_overrides"

    team_member_id: UUID = Field(foreign_key="team_members.id", nullable=False)
    date: dt.date = Field(nullable=False)
    override_type: str = Field(nullable=False)  # 'day_off' or 'extra_hours'
    custom_start_time: Optional[dt.time] = Field(default=None)
    custom_end_time: Optional[dt.time] = Field(default=None)
    reason: Optional[str] = Field(default=None)
    created_at: dt.datetime = Field(
        default_factory=lambda: dt.datetime.now(dt.timezone.utc),
        nullable=False,
        sa_type=DateTime(timezone=True),
    )

    member: TeamMember = Relationship()
