import time
from datetime import datetime, timedelta, timezone

from pydantic import BaseModel
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.domains.booking.models import Appointment, AppointmentStatus
from app.domains.notifications.models import NotificationKind
from app.domains.notifications.service import has_sent, send_reminder

# Appointments starting within this margin are too imminent for a useful reminder.
_LAST_MINUTE_MINUTES = 30


class ReminderResult(BaseModel):
    reminders_sent: int
    reminders_skipped: int
    duration_seconds: float


async def run_reminder_job(session: AsyncSession) -> ReminderResult:
    """
    Select all confirmed, un-reminded appointments starting in (now+30min, now+24h]
    and send each a reminder email. Idempotent: app-level has_sent() check plus the
    uq_reminder_sent DB index prevent duplicate sends even across concurrent runs.
    """
    start_time = time.time()
    now = datetime.now(timezone.utc)
    window_close = now + timedelta(hours=settings.REMINDER_LEAD_HOURS)
    last_minute_cutoff = now + timedelta(minutes=_LAST_MINUTE_MINUTES)

    stmt = select(Appointment).where(
        Appointment.status == AppointmentStatus.confirmed,
        Appointment.customer_id.isnot(None),  # type: ignore[union-attr]
        Appointment.starts_at > last_minute_cutoff,
        Appointment.starts_at <= window_close,
    )
    result = await session.execute(stmt)
    candidates = result.scalars().all()

    sent = 0
    skipped = 0

    for apt in candidates:
        if await has_sent(session, apt.id, NotificationKind.reminder):
            skipped += 1
            continue
        await send_reminder(session, apt)
        sent += 1

    return ReminderResult(
        reminders_sent=sent,
        reminders_skipped=skipped,
        duration_seconds=round(time.time() - start_time, 3),
    )
