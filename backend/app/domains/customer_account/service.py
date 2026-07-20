import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.domains.booking.models import Customer
from app.domains.customer_account.models import CustomerToken, TokenPurpose
from app.domains.customer_account.schemas import (
    AccountAppointmentRead,
    AppointmentListOut,
    MeOut,
    ProfileUpdate,
)

logger = logging.getLogger(__name__)


def _hash_token(plaintext: str) -> str:
    return hashlib.sha256(plaintext.encode()).hexdigest()


async def issue_token(
    session: AsyncSession, customer_id: UUID, purpose: TokenPurpose
) -> str:
    """Invalidate open tokens of same purpose, create new single-use token. Returns plaintext."""
    open_stmt = select(CustomerToken).where(
        CustomerToken.customer_id == customer_id,
        CustomerToken.purpose == purpose,
        CustomerToken.used_at == None,  # noqa: E711
    )
    result = await session.execute(open_stmt)
    for old_token in result.scalars().all():
        old_token.used_at = datetime.now(timezone.utc)
        session.add(old_token)

    plaintext = secrets.token_urlsafe(32)
    token_hash = _hash_token(plaintext)

    if purpose == TokenPurpose.email_verification:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.CUSTOMER_VERIFY_TOKEN_HOURS)
    else:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.CUSTOMER_RESET_TOKEN_HOURS)

    token = CustomerToken(
        customer_id=customer_id,
        token_hash=token_hash,
        purpose=purpose,
        expires_at=expires_at,
    )
    session.add(token)
    await session.flush()
    return plaintext


async def consume_token(
    session: AsyncSession, plaintext: str, purpose: TokenPurpose
) -> CustomerToken:
    """Validate and consume a token. Raises 404/410 on failure."""
    token_hash = _hash_token(plaintext)
    stmt = select(CustomerToken).where(
        CustomerToken.token_hash == token_hash,
        CustomerToken.purpose == purpose,
    )
    result = await session.execute(stmt)
    token = result.scalar_one_or_none()

    if not token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="TOKEN_NOT_FOUND")
    if token.used_at is not None:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="TOKEN_USED")
    # SQLite may return naive datetimes; normalize for comparison
    expires_at = token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if datetime.now(timezone.utc) >= expires_at:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="TOKEN_EXPIRED")

    token.used_at = datetime.now(timezone.utc)
    session.add(token)
    return token


async def register(
    session: AsyncSession,
    name: str,
    email: str,
    password: str,
    phone: str | None,
) -> None:
    """Register or upgrade customer. Always returns without revealing whether email exists."""
    from app.domains.auth.service import pwd_context

    stmt = select(Customer).where(Customer.email == email)
    result = await session.execute(stmt)
    customer = result.scalar_one_or_none()

    if customer and customer.anonymized_at:
        return

    if customer and customer.email_verified_at and customer.hashed_password:
        # Already verified account — send hint mail silently
        try:
            from app.domains.notifications.service import send_account_email
            from app.domains.notifications.templates import render_duplicate_register
            subject, body = render_duplicate_register(customer_name=customer.name)
            await send_account_email(to_email=customer.email, subject=subject, html_body=body)
        except Exception:
            pass
        return

    if customer is None:
        customer = Customer(name=name, email=email, phone=phone)
        session.add(customer)
        await session.flush()
    else:
        customer.name = name
        if phone is not None:
            customer.phone = phone

    customer.hashed_password = pwd_context.hash(password)
    customer.email_verified_at = None
    session.add(customer)
    await session.flush()

    plaintext = await issue_token(session, customer.id, TokenPurpose.email_verification)
    await session.commit()

    try:
        from app.domains.notifications.service import send_account_email
        from app.domains.notifications.templates import render_verification
        subject, body = render_verification(
            customer_name=customer.name, token=plaintext
        )
        await send_account_email(to_email=customer.email, subject=subject, html_body=body)
    except Exception as exc:
        logger.error("Failed to send verification email for customer_id=%s: %s", customer.id, exc)


async def verify_email(session: AsyncSession, plaintext: str) -> None:
    token = await consume_token(session, plaintext, TokenPurpose.email_verification)
    customer = await session.get(Customer, token.customer_id)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="TOKEN_NOT_FOUND")
    customer.email_verified_at = datetime.now(timezone.utc)
    session.add(customer)
    await session.commit()


async def login(
    session: AsyncSession,
    email: str,
    password: str,
    ip: str,
) -> Customer:
    from app.domains.auth.service import compute_delay, pwd_context, record_failed_attempt
    import asyncio

    delay = compute_delay(ip)
    if delay:
        await asyncio.sleep(delay)

    stmt = select(Customer).where(Customer.email == email, Customer.anonymized_at == None)  # noqa: E711
    result = await session.execute(stmt)
    customer = result.scalar_one_or_none()

    if not customer or not customer.hashed_password or not pwd_context.verify(password, customer.hashed_password):
        record_failed_attempt(ip)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="INVALID_CREDENTIALS")

    if not customer.email_verified_at:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="EMAIL_NOT_VERIFIED")

    return customer


async def request_reset(session: AsyncSession, email: str) -> None:
    """Always returns generically."""
    stmt = select(Customer).where(
        Customer.email == email,
        Customer.anonymized_at == None,  # noqa: E711
        Customer.hashed_password != None,  # noqa: E711
    )
    result = await session.execute(stmt)
    customer = result.scalar_one_or_none()

    if not customer:
        return

    plaintext = await issue_token(session, customer.id, TokenPurpose.password_reset)
    await session.commit()

    try:
        from app.domains.notifications.service import send_account_email
        from app.domains.notifications.templates import render_password_reset
        subject, body = render_password_reset(customer_name=customer.name, token=plaintext)
        await send_account_email(to_email=customer.email, subject=subject, html_body=body)
    except Exception as exc:
        logger.error("Failed to send reset email for customer_id=%s: %s", customer.id, exc)


async def reset_password(session: AsyncSession, plaintext: str, new_password: str) -> None:
    from app.domains.auth.service import pwd_context

    token = await consume_token(session, plaintext, TokenPurpose.password_reset)
    customer = await session.get(Customer, token.customer_id)
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="TOKEN_NOT_FOUND")
    customer.hashed_password = pwd_context.hash(new_password)
    session.add(customer)
    await session.commit()


async def update_profile(
    session: AsyncSession, customer: Customer, update: ProfileUpdate
) -> Customer:
    if update.name is not None:
        customer.name = update.name
    if update.phone is not None:
        customer.phone = update.phone
    session.add(customer)
    await session.commit()
    await session.refresh(customer)
    return customer


async def export_data(session: AsyncSession, customer: Customer) -> dict:
    from app.domains.booking.service import list_customer_appointments
    appt_list = await list_customer_appointments(session, customer.id)
    all_appts = appt_list.upcoming + appt_list.past
    return {
        "profile": {
            "id": str(customer.id),
            "name": customer.name,
            "email": customer.email,
            "phone": customer.phone,
        },
        "appointments": [a.model_dump(mode="json") for a in all_appts],
        "exported_at": datetime.now(timezone.utc).isoformat(),
    }


async def delete_account(session: AsyncSession, customer: Customer) -> None:
    from app.domains.booking.models import Appointment, AppointmentStatus
    from app.domains.booking.service import BookingService

    # Cancel upcoming confirmed appointments first
    upcoming_stmt = select(Appointment).where(
        Appointment.customer_id == customer.id,
        Appointment.status == AppointmentStatus.confirmed,
        Appointment.starts_at > datetime.now(timezone.utc),
    )
    result = await session.execute(upcoming_stmt)
    for appt in result.scalars().all():
        appt.status = AppointmentStatus.cancelled
        session.add(appt)

    await session.flush()

    # Delete customer tokens
    tokens_stmt = select(CustomerToken).where(CustomerToken.customer_id == customer.id)
    result = await session.execute(tokens_stmt)
    for token in result.scalars().all():
        await session.delete(token)

    await session.flush()

    # Anonymize via BookingService, which sets anonymized_at + clears PII
    await BookingService.delete_customer(session, customer.id)

    # Clear account credentials so login is impossible
    # (delete_customer already commits; reload customer)
    stmt = select(Customer).where(Customer.id == customer.id)
    result = await session.execute(stmt)
    cust = result.scalar_one_or_none()
    if cust:
        cust.hashed_password = None
        cust.email_verified_at = None
        session.add(cust)
        await session.commit()
