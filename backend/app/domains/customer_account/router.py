import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.limiter import limiter
from app.domains.booking.models import Customer
from app.domains.customer_account.dependencies import get_current_customer
from app.domains.customer_account.schemas import (
    AccountAppointmentRead,
    AppointmentListOut,
    ForgotPasswordRequest,
    GenericMessageOut,
    LoginRequest,
    MeOut,
    ProfileUpdate,
    RegisterRequest,
    RescheduleRequest,
    ResetOut,
    ResetPasswordRequest,
    VerifiedOut,
)
from app.domains.customer_account import service as account_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/account", tags=["customer-account"])

_RATE = f"{settings.RATE_LIMIT_ACCOUNT_PER_MINUTE}/minute"
_COOKIE_NAME = "customer_session"


def _set_session_cookie(response: Response, token: str, remember: bool) -> None:
    max_age = (
        settings.CUSTOMER_REMEMBER_EXPIRE_DAYS * 86400
        if remember
        else settings.CUSTOMER_SESSION_EXPIRE_HOURS * 3600
    )
    response.set_cookie(
        key=_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=max_age,
    )


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------


@router.post("/register", status_code=202, response_model=GenericMessageOut)
@limiter.limit(_RATE)
async def register(
    request: Request,
    body: RegisterRequest,
    session: AsyncSession = Depends(get_session),
):
    await account_service.register(
        session, name=body.name, email=body.email, password=body.password, phone=body.phone
    )
    return GenericMessageOut(message="Falls die Adresse gültig ist, wurde eine E-Mail gesendet.")


@router.post("/verify/{token}", response_model=VerifiedOut)
async def verify_email(token: str, session: AsyncSession = Depends(get_session)):
    await account_service.verify_email(session, token)
    return VerifiedOut(verified=True)


@router.post("/login", response_model=MeOut)
@limiter.limit(_RATE)
async def login(
    request: Request,
    body: LoginRequest,
    session: AsyncSession = Depends(get_session),
):
    ip = request.client.host if request.client else "unknown"
    customer = await account_service.login(session, email=body.email, password=body.password, ip=ip)

    from app.domains.auth.service import create_customer_token
    token = create_customer_token(customer.id, remember=body.remember_me)

    response = JSONResponse(
        content={"id": str(customer.id), "name": customer.name, "email": customer.email},
    )
    _set_session_cookie(response, token, body.remember_me)
    return response


@router.post("/logout", response_model=GenericMessageOut)
async def logout(
    current_customer: Customer = Depends(get_current_customer),
):
    response = JSONResponse(content={"message": "ok"})
    response.delete_cookie(_COOKIE_NAME)
    return response


@router.get("/me", response_model=MeOut)
async def me(current_customer: Customer = Depends(get_current_customer)):
    return MeOut(
        id=current_customer.id,
        name=current_customer.name,
        email=current_customer.email,
        phone=current_customer.phone,
    )


@router.post("/password/forgot", status_code=202, response_model=GenericMessageOut)
@limiter.limit(_RATE)
async def forgot_password(
    request: Request,
    body: ForgotPasswordRequest,
    session: AsyncSession = Depends(get_session),
):
    await account_service.request_reset(session, email=body.email)
    return GenericMessageOut(message="Falls ein Konto existiert, wurde eine E-Mail gesendet.")


@router.post("/password/reset/{token}", response_model=ResetOut)
@limiter.limit(_RATE)
async def reset_password(
    request: Request,
    token: str,
    body: ResetPasswordRequest,
    session: AsyncSession = Depends(get_session),
):
    await account_service.reset_password(session, plaintext=token, new_password=body.password)
    return ResetOut(reset=True)


# ---------------------------------------------------------------------------
# Appointment self-service
# ---------------------------------------------------------------------------


@router.get("/appointments", response_model=AppointmentListOut)
async def list_appointments(
    current_customer: Customer = Depends(get_current_customer),
    session: AsyncSession = Depends(get_session),
):
    from app.domains.booking.service import list_customer_appointments
    return await list_customer_appointments(session, current_customer.id)


@router.post("/appointments/{appointment_id}/cancel", response_model=AccountAppointmentRead)
async def cancel_appointment(
    appointment_id: str,
    current_customer: Customer = Depends(get_current_customer),
    session: AsyncSession = Depends(get_session),
):
    from uuid import UUID
    from app.domains.booking.service import cancel_own_appointment
    return await cancel_own_appointment(session, current_customer.id, UUID(appointment_id))


@router.post("/appointments/{appointment_id}/reschedule", response_model=AccountAppointmentRead)
async def reschedule_appointment(
    appointment_id: str,
    body: RescheduleRequest,
    current_customer: Customer = Depends(get_current_customer),
    session: AsyncSession = Depends(get_session),
):
    from uuid import UUID
    from app.domains.booking.service import reschedule_appointment
    return await reschedule_appointment(
        session,
        current_customer.id,
        UUID(appointment_id),
        body.starts_at,
        body.team_member_id,
    )


# ---------------------------------------------------------------------------
# Profile & GDPR
# ---------------------------------------------------------------------------


@router.patch("/profile", response_model=MeOut)
async def update_profile(
    body: ProfileUpdate,
    current_customer: Customer = Depends(get_current_customer),
    session: AsyncSession = Depends(get_session),
):
    customer = await account_service.update_profile(session, current_customer, body)
    return MeOut(id=customer.id, name=customer.name, email=customer.email, phone=customer.phone)


@router.get("/export")
async def export_data(
    current_customer: Customer = Depends(get_current_customer),
    session: AsyncSession = Depends(get_session),
):
    data = await account_service.export_data(session, current_customer)
    content = json.dumps(data, ensure_ascii=False, indent=2)
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": 'attachment; filename="meine-daten.json"'},
    )


@router.delete("/", status_code=204)
async def delete_account(
    current_customer: Customer = Depends(get_current_customer),
    session: AsyncSession = Depends(get_session),
):
    await account_service.delete_account(session, current_customer)
    response = Response(status_code=204)
    response.delete_cookie(_COOKIE_NAME)
    return response
