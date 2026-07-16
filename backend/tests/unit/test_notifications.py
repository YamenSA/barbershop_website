"""
Unit tests for the reminder notification job (US2).
Runs against in-memory SQLite — idempotency via app-level has_sent() check.
The DB-level uq_reminder_sent partial index is Postgres-only (T013a pattern).
"""
import secrets
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import pytest
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.domains.booking.models import Appointment, AppointmentOrigin, AppointmentStatus, Customer
from app.domains.notifications import email as email_module
from app.domains.notifications.email import BREVO_API_URL, EmailMessage, send_email
from app.domains.notifications.models import NotificationKind, NotificationLog, NotificationStatus
from app.domains.notifications.reminders import run_reminder_job
from app.domains.stammdaten.models import Service, TeamMember


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(name="rsetup")
async def reminder_setup_fixture(session: AsyncSession):
    service = Service(name="Schnitt", duration_minutes=30, price_cents=2000)
    member = TeamMember(name="Ali")
    customer = Customer(name="Erika Muster", email="erika@example.com")
    session.add_all([service, member, customer])
    await session.commit()
    return {"service": service, "member": member, "customer": customer}


async def _make_appointment(
    session: AsyncSession,
    setup: dict,
    starts_at: datetime,
    status: AppointmentStatus = AppointmentStatus.confirmed,
) -> Appointment:
    apt = Appointment(
        team_member_id=setup["member"].id,
        service_id=setup["service"].id,
        customer_id=setup["customer"].id,
        starts_at=starts_at,
        ends_at=starts_at + timedelta(minutes=30),
        status=status,
        origin=AppointmentOrigin.online,
        cancellation_token=secrets.token_urlsafe(16),
    )
    session.add(apt)
    await session.commit()
    return apt


# ---------------------------------------------------------------------------
# US2 Sz. 1: Reminder sent when appointment is in 24-h window
# ---------------------------------------------------------------------------


async def test_reminder_sent_for_appointment_in_window(session: AsyncSession, rsetup: dict):
    starts_at = datetime.now(timezone.utc) + timedelta(hours=12)
    apt = await _make_appointment(session, rsetup, starts_at)

    result = await run_reminder_job(session)

    assert result.reminders_sent == 1
    log = (await session.execute(
        select(NotificationLog).where(
            NotificationLog.appointment_id == apt.id,
            NotificationLog.kind == NotificationKind.reminder,
        )
    )).scalar_one_or_none()
    assert log is not None
    assert log.status == NotificationStatus.sent


# ---------------------------------------------------------------------------
# US2: Idempotency — no second send on repeated runs
# ---------------------------------------------------------------------------


async def test_reminder_idempotent_on_repeated_runs(session: AsyncSession, rsetup: dict):
    starts_at = datetime.now(timezone.utc) + timedelta(hours=12)
    await _make_appointment(session, rsetup, starts_at)

    r1 = await run_reminder_job(session)
    r2 = await run_reminder_job(session)

    assert r1.reminders_sent == 1
    assert r2.reminders_sent == 0
    assert r2.reminders_skipped == 1


# ---------------------------------------------------------------------------
# US2 Sz. 2: Cancelled appointment receives no reminder
# ---------------------------------------------------------------------------


async def test_cancelled_appointment_not_reminded(session: AsyncSession, rsetup: dict):
    starts_at = datetime.now(timezone.utc) + timedelta(hours=12)
    await _make_appointment(session, rsetup, starts_at, status=AppointmentStatus.cancelled)

    result = await run_reminder_job(session)

    assert result.reminders_sent == 0


# ---------------------------------------------------------------------------
# US2 Sz. 3: Appointment < 30 min away skipped (last-minute margin)
# ---------------------------------------------------------------------------


async def test_last_minute_appointment_skipped(session: AsyncSession, rsetup: dict):
    starts_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    await _make_appointment(session, rsetup, starts_at)

    result = await run_reminder_job(session)

    assert result.reminders_sent == 0


# ---------------------------------------------------------------------------
# Appointment outside 24-h window not reminded
# ---------------------------------------------------------------------------


async def test_appointment_outside_window_not_reminded(session: AsyncSession, rsetup: dict):
    starts_at = datetime.now(timezone.utc) + timedelta(hours=36)
    await _make_appointment(session, rsetup, starts_at)

    result = await run_reminder_job(session)

    assert result.reminders_sent == 0


# ---------------------------------------------------------------------------
# send_email() — Brevo HTTP transport (httpx)
# ---------------------------------------------------------------------------


def _mock_httpx_client(status_code: int, text: str = ""):
    """Build a MagicMock replacement for httpx.Client usable as a context manager."""
    response = MagicMock(status_code=status_code, text=text)
    client = MagicMock()
    client.post.return_value = response
    client.__enter__.return_value = client
    client.__exit__.return_value = False
    return client


def test_send_email_dry_run_without_api_key(monkeypatch):
    """No BREVO_API_KEY → log to console, never touch httpx."""
    monkeypatch.setattr(email_module.settings, "BREVO_API_KEY", None)
    with patch.object(email_module.httpx, "Client") as mock_client_cls:
        send_email(EmailMessage(to="kunde@example.com", subject="Hallo", html_body="<p>Hi</p>"))
        mock_client_cls.assert_not_called()


def test_send_email_posts_to_brevo_on_201(monkeypatch):
    """With an API key, a 201 response is treated as success and the payload is well-formed."""
    monkeypatch.setattr(email_module.settings, "BREVO_API_KEY", "test-key")
    monkeypatch.setattr(email_module.settings, "EMAIL_FROM", "buchung@azzam-salon.de")
    monkeypatch.setattr(email_module.settings, "EMAIL_FROM_NAME", "Azzam Barbershop")
    monkeypatch.setattr(email_module.settings, "EMAIL_REPLY_TO", "reply@example.com")

    mock_client = _mock_httpx_client(201)
    with patch.object(email_module.httpx, "Client", return_value=mock_client):
        send_email(EmailMessage(to="kunde@example.com", subject="Betreff", html_body="<p>Body</p>"))

    mock_client.post.assert_called_once()
    args, kwargs = mock_client.post.call_args
    assert args[0] == BREVO_API_URL
    assert kwargs["headers"]["api-key"] == "test-key"
    payload = kwargs["json"]
    assert payload["sender"] == {"email": "buchung@azzam-salon.de", "name": "Azzam Barbershop"}
    assert payload["to"] == [{"email": "kunde@example.com"}]
    assert payload["replyTo"] == {"email": "reply@example.com"}
    assert payload["subject"] == "Betreff"
    assert payload["htmlContent"] == "<p>Body</p>"


def test_send_email_raises_with_body_on_non_201(monkeypatch):
    """A non-201 response raises RuntimeError including status code and response body."""
    monkeypatch.setattr(email_module.settings, "BREVO_API_KEY", "test-key")
    monkeypatch.setattr(email_module.settings, "EMAIL_REPLY_TO", "reply@example.com")

    mock_client = _mock_httpx_client(400, text='{"code":"invalid_parameter","message":"bad sender"}')
    with patch.object(email_module.httpx, "Client", return_value=mock_client):
        with pytest.raises(RuntimeError) as exc_info:
            send_email(EmailMessage(to="kunde@example.com", subject="X", html_body="<p>X</p>"))

    message = str(exc_info.value)
    assert "400" in message
    assert "bad sender" in message
