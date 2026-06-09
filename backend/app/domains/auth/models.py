import datetime as dt
from sqlmodel import Field, SQLModel
from app.core.base import UUIDModel


class AdminAccount(UUIDModel, table=True):
    __tablename__ = "admin_accounts"

    username: str = Field(index=True, unique=True, nullable=False)
    hashed_password: str = Field(nullable=False)
    created_at: dt.datetime = Field(
        default_factory=dt.datetime.now,
        nullable=False,
    )
    updated_at: dt.datetime = Field(
        default_factory=dt.datetime.now,
        nullable=False,
    )
