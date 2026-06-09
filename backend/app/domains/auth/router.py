import asyncio
from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.database import get_session
from app.core.config import settings
from app.domains.auth.models import AdminAccount
from app.domains.auth.schemas import LoginRequest, TokenResponse, AdminOut
from app.domains.auth.service import (
    verify_password,
    create_session_token,
    record_failed_attempt,
    compute_delay,
)
from app.domains.auth.dependencies import get_current_admin

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/login", response_model=TokenResponse)
@limiter.limit(f"{settings.RATE_LIMIT_LOGIN_PER_MINUTE}/minute")
async def login(
    request: Request,
    response: Response,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_session),
):
    ip = request.client.host
    delay = compute_delay(ip)
    if delay > 0:
        await asyncio.sleep(delay)

    statement = select(AdminAccount).where(AdminAccount.username == login_data.username)
    result = await db.execute(statement)
    admin = result.scalar_one_or_none()

    if not admin or not verify_password(login_data.password, admin.hashed_password):
        record_failed_attempt(ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    token = create_session_token(admin.username)
    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.SESSION_EXPIRE_HOURS * 3600,
    )
    return TokenResponse(username=admin.username)


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("session")
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=AdminOut)
async def get_me(current_admin: AdminAccount = Depends(get_current_admin)):
    return AdminOut(username=current_admin.username)
