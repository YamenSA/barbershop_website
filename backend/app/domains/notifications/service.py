import logging
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.domains.notifications.email import EmailMessage, send_email
from app.domains.notifications.models import (
    NotificationChannel,
    NotificationKind,
    NotificationLog,
    NotificationStatus,
)
from app.domains.notifications.templates import render_confirmation, render_reminder

logger = logging.getLogger(__name__)


async def has_sent(
    session: AsyncSession,
    appointment_id: UUID,
    kind: NotificationKind,
) -> bool:
    stmt = select(NotificationLog).where(
        NotificationLog.appointment_id == appointment_id,
        NotificationLog.kind == kind,
        NotificationLog.status == NotificationStatus.sent,
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none() is not None


async def _send_and_log(
    session: AsyncSession,
    appointment_id: UUID,
    kind: NotificationKind,
    to_email: str,
    subject: str,
    html_body: str,
) -> None:
    if await has_sent(session, appointment_id, kind):
        logger.debug("Notification %s/%s already sent, skipping", appointment_id, kind)
        return

    status = NotificationStatus.failed
    error: str | None = None
    try:
        send_email(EmailMessage(to=to_email, subject=subject, html_body=html_body))
        status = NotificationStatus.sent
    except Exception as exc:
        error = str(exc)
        logger.error("Failed to send %s for appointment %s: %s", kind, appointment_id, exc)

    log_entry = NotificationLog(
        appointment_id=appointment_id,
        kind=kind,
        channel=NotificationChannel.email,
        status=status,
        error=error,
    )
    session.add(log_entry)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        logger.debug("Duplicate notification log for %s/%s, ignored", appointment_id, kind)


async def send_account_email(*, to_email: str, subject: str, html_body: str) -> None:
    """Send transactional account email (verification, reset, reschedule). No NotificationLog dependency."""
    try:
        send_email(EmailMessage(to=to_email, subject=subject, html_body=html_body))
    except Exception as exc:
        logger.error("Failed to send account email: %s", exc)


async def send_confirmation(session: AsyncSession, appointment) -> None:
    """Render and send the booking confirmation email, then persist the log."""
    from app.domains.booking.models import Customer
    from app.domains.stammdaten.models import Service, TeamMember

    customer = await session.get(Customer, appointment.customer_id)
    service = await session.get(Service, appointment.service_id)
    team_member = await session.get(TeamMember, appointment.team_member_id)

    if not customer or not service or not team_member:
        logger.warning("send_confirmation: missing related object for appointment %s", appointment.id)
        return

    subject, html_body = render_confirmation(
        customer_name=customer.name,
        service_name=service.name,
        team_member_name=team_member.name,
        starts_at=appointment.starts_at,
        cancellation_token=appointment.cancellation_token,
    )
    await _send_and_log(
        session,
        appointment.id,
        NotificationKind.confirmation,
        customer.email,
        subject,
        html_body,
    )


async def send_reminder(session: AsyncSession, appointment) -> None:
    """Render and send the 24-h reminder email, then persist the log."""
    from app.domains.booking.models import Customer
    from app.domains.stammdaten.models import Service, TeamMember

    if not appointment.customer_id:
        return

    customer = await session.get(Customer, appointment.customer_id)
    service = await session.get(Service, appointment.service_id)
    team_member = await session.get(TeamMember, appointment.team_member_id)

    if not customer or not service or not team_member:
        logger.warning("send_reminder: missing related object for appointment %s", appointment.id)
        return

    subject, html_body = render_reminder(
        customer_name=customer.name,
        service_name=service.name,
        team_member_name=team_member.name,
        starts_at=appointment.starts_at,
    )
    await _send_and_log(
        session,
        appointment.id,
        NotificationKind.reminder,
        customer.email,
        subject,
        html_body,
    )
