from pydantic import BaseModel
from uuid import UUID


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    username: str


class AdminOut(BaseModel):
    username: str
