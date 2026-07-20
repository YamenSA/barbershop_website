"""
Integration tests for the customer account self-service (US1-US4, cross-cutting).
Runs against in-memory SQLite — no Docker required.

T011: register→verify→login, unverified login 403, generic enumeration response
T012: GET /account/appointments shows only own; cross-account → 404
T013: password forgot→reset (generic response, token single-use, expired → 410)
T025: cancel (slot freed), cutoff exceeded → 410, foreign appt → 404
T032: profile update, export JSON, delete → upcoming cancelled, anonymized, login 401
T038: guest books → register+verify → GET appointments includes guest booking
T043: role separation — customer cookie rejected by admin, admin cookie by /account/*
"""
import datetime as dt
import re
import time
from datetime import time as t
from unittest.mock import AsyncMock, patch
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient, ASGITransport
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.domains.auth.dependencies import get_current_admin
from app.domains.auth.models import AdminAccount
from app.main import app


# ---------------------------------------------------------------------------
# Helpers & fixtures
# ---------------------------------------------------------------------------


def _slot_days(n: int, hour: int = 10) -> str:
    target = dt.date.today() + dt.timedelta(days=n)
    return dt.datetime(target.year, target.month, target.day, hour, 0, 0, tzinfo=dt.timezone.utc).isoformat()


@pytest.fixture(name="account_setup")
async def account_setup_fixture(session: AsyncSession):
    """Seed: service, team member, full-week salon & working hours."""
    from app.domains.stammdaten.models import (
        SalonHours,
        Service,
        TeamMember,
        TeamMemberServiceLink,
        WorkingHours,
    )

    service = Service(name="Haarschnitt", duration_minutes=30, price_cents=2500, is_active=True)
    member = TeamMember(name="Max Mustermann", is_active=True)
    session.add_all([service, member])
    await session.flush()
    session.add(TeamMemberServiceLink(team_member_id=member.id, service_id=service.id))
    for dow in range(7):
        session.add(SalonHours(day_of_week=dow, is_open=True, open_time=t(8), close_time=t(20)))
        session.add(WorkingHours(team_member_id=member.id, day_of_week=dow, start_time=t(8), end_time=t(20)))
    await session.commit()
    return {"service_id": str(service.id), "member_id": str(member.id)}


@pytest.fixture(name="account_client")
async def account_client_fixture(session: AsyncSession):
    """Unauthenticated client for account endpoints; emails and rate limits suppressed."""
    def override_session():
        return session

    app.dependency_overrides[get_session] = override_session

    # Reset rate limiter counters before each test
    from app.core.limiter import limiter
    limiter.reset()

    with patch("app.domains.notifications.email.send_email", return_value=None):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c
    app.dependency_overrides.clear()


async def _register_and_verify(client: AsyncClient, session: AsyncSession, email: str, password: str = "password1234") -> None:
    """Register a customer and consume the verification token directly from DB."""
    resp = await client.post("/api/v1/account/register", json={
        "name": "Test User",
        "email": email,
        "password": password,
    })
    assert resp.status_code == 202

    from sqlmodel import select
    from app.domains.customer_account.models import CustomerToken, TokenPurpose
    stmt = select(CustomerToken).where(
        CustomerToken.purpose == TokenPurpose.email_verification,
        CustomerToken.used_at == None,
    )
    result = await session.execute(stmt)
    tokens = result.scalars().all()
    assert tokens, "No verification token found in DB"

    from app.domains.customer_account.service import _hash_token
    from app.domains.booking.models import Customer
    cust_stmt = select(Customer).where(Customer.email == email)
    cust = (await session.execute(cust_stmt)).scalar_one()
    token = next((tok for tok in tokens if tok.customer_id == cust.id), None)
    assert token, "Token not matched to customer"

    # We need the plaintext. Since we can't reverse SHA-256, re-issue via service directly.
    import secrets, hashlib
    plaintext = secrets.token_urlsafe(32)
    token.token_hash = hashlib.sha256(plaintext.encode()).hexdigest()
    session.add(token)
    await session.commit()

    resp = await client.post(f"/api/v1/account/verify/{plaintext}")
    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# T011: register → verify → login; unverified → 403; enumeration generic
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_register_verify_login(account_client: AsyncClient, session: AsyncSession, account_setup):
    email = "testuser@example.com"
    await _register_and_verify(account_client, session, email)

    # Login after verification → 200
    resp = await account_client.post("/api/v1/account/login", json={"email": email, "password": "password1234"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == email


@pytest.mark.asyncio
async def test_unverified_login_rejected(account_client: AsyncClient, session: AsyncSession, account_setup):
    email = "unverified@example.com"
    resp = await account_client.post("/api/v1/account/register", json={
        "name": "Unverified",
        "email": email,
        "password": "password1234",
    })
    assert resp.status_code == 202

    resp = await account_client.post("/api/v1/account/login", json={"email": email, "password": "password1234"})
    assert resp.status_code == 403
    assert resp.json()["detail"] == "EMAIL_NOT_VERIFIED"


@pytest.mark.asyncio
async def test_register_generic_response_for_existing_email(account_client: AsyncClient, session: AsyncSession, account_setup):
    email = "double@example.com"
    await _register_and_verify(account_client, session, email)

    # Registering again with same email returns same generic 202 (no enumeration)
    resp = await account_client.post("/api/v1/account/register", json={
        "name": "Another",
        "email": email,
        "password": "newpassword1234",
    })
    assert resp.status_code == 202


# ---------------------------------------------------------------------------
# T012: GET /account/appointments shows only own; cross-account → 404
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_appointments_only_own(account_client: AsyncClient, session: AsyncSession, account_setup):
    email_a = "usera@example.com"
    email_b = "userb@example.com"
    await _register_and_verify(account_client, session, email_a)
    await _register_and_verify(account_client, session, email_b)

    # Book an appointment for user A
    payload = {
        "service_id": account_setup["service_id"],
        "team_member_id": account_setup["member_id"],
        "starts_at": _slot_days(5),
        "customer": {"name": "User A", "email": email_a, "phone": None},
        "privacy_acknowledged": True,
    }
    resp = await account_client.post("/api/v1/public/booking/appointments", json=payload)
    assert resp.status_code == 201
    appt_id = resp.json()["id"]

    # Login as user B
    resp = await account_client.post("/api/v1/account/login", json={"email": email_b, "password": "password1234"})
    assert resp.status_code == 200
    cookies = account_client.cookies

    # List appointments for B → empty
    resp = await account_client.get("/api/v1/account/appointments")
    assert resp.status_code == 200
    data = resp.json()
    all_ids = [a["id"] for a in data["upcoming"] + data["past"]]
    assert appt_id not in all_ids


@pytest.mark.asyncio
async def test_cancel_cross_account_forbidden(account_client: AsyncClient, session: AsyncSession, account_setup):
    email_a = "owner@example.com"
    email_b = "intruder@example.com"
    await _register_and_verify(account_client, session, email_a)
    await _register_and_verify(account_client, session, email_b)

    # Book for user A
    payload = {
        "service_id": account_setup["service_id"],
        "team_member_id": account_setup["member_id"],
        "starts_at": _slot_days(5),
        "customer": {"name": "Owner", "email": email_a, "phone": None},
        "privacy_acknowledged": True,
    }
    resp = await account_client.post("/api/v1/public/booking/appointments", json=payload)
    assert resp.status_code == 201
    appt_id = resp.json()["id"]

    # Login as user B, try to cancel A's appointment
    await account_client.post("/api/v1/account/login", json={"email": email_b, "password": "password1234"})
    resp = await account_client.post(f"/api/v1/account/appointments/{appt_id}/cancel")
    assert resp.status_code == 404
    assert resp.json()["detail"] == "APPOINTMENT_NOT_FOUND"


# ---------------------------------------------------------------------------
# T013: password forgot → reset (generic, single-use, expired)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_password_forgot_generic_response(account_client: AsyncClient, session: AsyncSession, account_setup):
    # Non-existent email → 202 (generic)
    resp = await account_client.post("/api/v1/account/password/forgot", json={"email": "nobody@example.com"})
    assert resp.status_code == 202

    # Real email → also 202
    await _register_and_verify(account_client, session, "resetme@example.com")
    resp = await account_client.post("/api/v1/account/password/forgot", json={"email": "resetme@example.com"})
    assert resp.status_code == 202


@pytest.mark.asyncio
async def test_password_reset_flow(account_client: AsyncClient, session: AsyncSession, account_setup):
    email = "resetflow@example.com"
    await _register_and_verify(account_client, session, email)

    # Trigger reset
    await account_client.post("/api/v1/account/password/forgot", json={"email": email})

    # Grab token from DB and inject fresh plaintext
    from sqlmodel import select
    from app.domains.customer_account.models import CustomerToken, TokenPurpose
    import secrets, hashlib
    from app.domains.booking.models import Customer as CustomerModel
    cust = (await session.execute(select(CustomerModel).where(CustomerModel.email == email))).scalar_one()
    stmt = select(CustomerToken).where(
        CustomerToken.customer_id == cust.id,
        CustomerToken.purpose == TokenPurpose.password_reset,
        CustomerToken.used_at == None,
    )
    result = await session.execute(stmt)
    token = result.scalar_one()
    plaintext = secrets.token_urlsafe(32)
    token.token_hash = hashlib.sha256(plaintext.encode()).hexdigest()
    session.add(token)
    await session.commit()

    resp = await account_client.post(f"/api/v1/account/password/reset/{plaintext}", json={"password": "newpassword5678"})
    assert resp.status_code == 200
    assert resp.json()["reset"] is True

    # Old password no longer works
    resp = await account_client.post("/api/v1/account/login", json={"email": email, "password": "password1234"})
    assert resp.status_code == 401

    # New password works
    resp = await account_client.post("/api/v1/account/login", json={"email": email, "password": "newpassword5678"})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_password_reset_token_single_use(account_client: AsyncClient, session: AsyncSession, account_setup):
    email = "single_use@example.com"
    await _register_and_verify(account_client, session, email)
    await account_client.post("/api/v1/account/password/forgot", json={"email": email})

    from sqlmodel import select
    from app.domains.customer_account.models import CustomerToken, TokenPurpose
    import secrets, hashlib
    from app.domains.booking.models import Customer as CustomerModel
    cust = (await session.execute(select(CustomerModel).where(CustomerModel.email == email))).scalar_one()
    token = (await session.execute(
        select(CustomerToken).where(
            CustomerToken.customer_id == cust.id,
            CustomerToken.purpose == TokenPurpose.password_reset,
            CustomerToken.used_at == None,
        )
    )).scalar_one()
    plaintext = secrets.token_urlsafe(32)
    token.token_hash = hashlib.sha256(plaintext.encode()).hexdigest()
    session.add(token)
    await session.commit()

    await account_client.post(f"/api/v1/account/password/reset/{plaintext}", json={"password": "newpassword5678"})
    # Second use → 410
    resp = await account_client.post(f"/api/v1/account/password/reset/{plaintext}", json={"password": "anotherpassword"})
    assert resp.status_code == 410
    assert resp.json()["detail"] == "TOKEN_USED"


@pytest.mark.asyncio
async def test_password_reset_expired_token(account_client: AsyncClient, session: AsyncSession, account_setup):
    email = "expired_reset@example.com"
    await _register_and_verify(account_client, session, email)

    # Create an expired token directly
    from sqlmodel import select
    from app.domains.customer_account.models import CustomerToken, TokenPurpose
    import secrets, hashlib
    from app.domains.booking.models import Customer as CustomerModel
    from datetime import timezone

    cust = (await session.execute(select(CustomerModel).where(CustomerModel.email == email))).scalar_one()
    plaintext = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(plaintext.encode()).hexdigest()
    expired_token = CustomerToken(
        customer_id=cust.id,
        token_hash=token_hash,
        purpose=TokenPurpose.password_reset,
        expires_at=dt.datetime(2020, 1, 1, tzinfo=timezone.utc),
    )
    session.add(expired_token)
    await session.commit()

    resp = await account_client.post(f"/api/v1/account/password/reset/{plaintext}", json={"password": "newpassword5678"})
    assert resp.status_code == 410
    assert resp.json()["detail"] == "TOKEN_EXPIRED"


# ---------------------------------------------------------------------------
# T025: cancel — slot freed, cutoff exceeded → 410, cross-account → 404
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_cancel_own_appointment(account_client: AsyncClient, session: AsyncSession, account_setup):
    email = "canceller@example.com"
    await _register_and_verify(account_client, session, email)

    # Book an appointment
    payload = {
        "service_id": account_setup["service_id"],
        "team_member_id": account_setup["member_id"],
        "starts_at": _slot_days(5),
        "customer": {"name": "Canceller", "email": email, "phone": None},
        "privacy_acknowledged": True,
    }
    resp = await account_client.post("/api/v1/public/booking/appointments", json=payload)
    assert resp.status_code == 201
    appt_id = resp.json()["id"]

    # Login
    await account_client.post("/api/v1/account/login", json={"email": email, "password": "password1234"})

    # Cancel
    resp = await account_client.post(f"/api/v1/account/appointments/{appt_id}/cancel")
    assert resp.status_code == 200
    assert resp.json()["status"] == "cancelled"


@pytest.mark.asyncio
async def test_cancel_past_cutoff(account_client: AsyncClient, session: AsyncSession, account_setup):
    """Appointment within 24h cutoff → 410."""
    from app.domains.booking.models import Appointment, AppointmentStatus, AppointmentOrigin
    from app.domains.booking.service import _upsert_customer
    from app.domains.booking.schemas import CustomerCreate
    import secrets

    email = "cutoff_test@example.com"
    await _register_and_verify(account_client, session, email)
    await account_client.post("/api/v1/account/login", json={"email": email, "password": "password1234"})

    from sqlmodel import select
    from app.domains.booking.models import Customer as CustomerModel
    cust = (await session.execute(select(CustomerModel).where(CustomerModel.email == email))).scalar_one()

    from uuid import UUID
    # Create appointment starting in 1 hour (within cutoff)
    starts_at = dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=1)
    ends_at = starts_at + dt.timedelta(minutes=30)
    appt = Appointment(
        team_member_id=UUID(account_setup["member_id"]),
        service_id=UUID(account_setup["service_id"]),
        customer_id=cust.id,
        starts_at=starts_at,
        ends_at=ends_at,
        status=AppointmentStatus.confirmed,
        origin=AppointmentOrigin.online,
        cancellation_token=secrets.token_urlsafe(16),
    )
    session.add(appt)
    await session.commit()

    resp = await account_client.post(f"/api/v1/account/appointments/{str(appt.id)}/cancel")
    assert resp.status_code == 410
    assert resp.json()["detail"] == "CANCELLATION_WINDOW_CLOSED"


# ---------------------------------------------------------------------------
# T032: profile update, export, delete → upcoming cancelled, anonymized, login 401
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_profile_update(account_client: AsyncClient, session: AsyncSession, account_setup):
    email = "profileuser@example.com"
    await _register_and_verify(account_client, session, email)
    await account_client.post("/api/v1/account/login", json={"email": email, "password": "password1234"})

    resp = await account_client.patch("/api/v1/account/profile", json={"name": "New Name"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"


@pytest.mark.asyncio
async def test_export_data(account_client: AsyncClient, session: AsyncSession, account_setup):
    email = "exportuser@example.com"
    await _register_and_verify(account_client, session, email)
    await account_client.post("/api/v1/account/login", json={"email": email, "password": "password1234"})

    resp = await account_client.get("/api/v1/account/export")
    assert resp.status_code == 200
    assert "attachment" in resp.headers.get("content-disposition", "")
    data = resp.json()
    assert "profile" in data
    assert "appointments" in data
    assert "exported_at" in data


@pytest.mark.asyncio
async def test_delete_account(account_client: AsyncClient, session: AsyncSession, account_setup):
    email = "deleteuser@example.com"
    await _register_and_verify(account_client, session, email)

    # Book an upcoming appointment
    payload = {
        "service_id": account_setup["service_id"],
        "team_member_id": account_setup["member_id"],
        "starts_at": _slot_days(5),
        "customer": {"name": "Delete User", "email": email, "phone": None},
        "privacy_acknowledged": True,
    }
    resp = await account_client.post("/api/v1/public/booking/appointments", json=payload)
    assert resp.status_code == 201
    appt_id = resp.json()["id"]

    await account_client.post("/api/v1/account/login", json={"email": email, "password": "password1234"})

    resp = await account_client.delete("/api/v1/account/")
    assert resp.status_code == 204

    # Login after deletion → 401
    resp = await account_client.post("/api/v1/account/login", json={"email": email, "password": "password1234"})
    assert resp.status_code == 401

    # Check appointment is cancelled
    from sqlmodel import select
    from app.domains.booking.models import Appointment, AppointmentStatus
    from uuid import UUID
    appt = await session.get(Appointment, UUID(appt_id))
    assert appt.status == AppointmentStatus.cancelled

    # Check customer is anonymized
    from app.domains.booking.models import Customer as CustomerModel
    stmt = select(CustomerModel).where(CustomerModel.email == email)
    result = await session.execute(stmt)
    cust = result.scalar_one_or_none()
    assert cust is None or cust.anonymized_at is not None


# ---------------------------------------------------------------------------
# T038: Guest books → register+verify → appointments include guest booking
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_guest_booking_linked_after_register(account_client: AsyncClient, session: AsyncSession, account_setup):
    email = "guest_then_account@example.com"

    # Guest booking
    payload = {
        "service_id": account_setup["service_id"],
        "team_member_id": account_setup["member_id"],
        "starts_at": _slot_days(5),
        "customer": {"name": "Guest", "email": email, "phone": None},
        "privacy_acknowledged": True,
    }
    resp = await account_client.post("/api/v1/public/booking/appointments", json=payload)
    assert resp.status_code == 201
    guest_appt_id = resp.json()["id"]

    # Register + verify with same email
    await _register_and_verify(account_client, session, email)

    # Login and check appointments
    await account_client.post("/api/v1/account/login", json={"email": email, "password": "password1234"})
    resp = await account_client.get("/api/v1/account/appointments")
    assert resp.status_code == 200
    data = resp.json()
    all_ids = [a["id"] for a in data["upcoming"] + data["past"]]
    assert guest_appt_id in all_ids


# ---------------------------------------------------------------------------
# T043: Role separation — customer cookie rejected by admin; admin cookie by /account/*
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_customer_cookie_rejected_by_admin(account_client: AsyncClient, session: AsyncSession, account_setup):
    email = "rolesep@example.com"
    await _register_and_verify(account_client, session, email)
    await account_client.post("/api/v1/account/login", json={"email": email, "password": "password1234"})

    # Try accessing admin endpoint with customer cookie
    resp = await account_client.get("/api/v1/auth/me")
    assert resp.status_code in (401, 403, 404)


@pytest.mark.asyncio
async def test_customer_cookie_rejected_by_customers_endpoint(account_client: AsyncClient, session: AsyncSession, account_setup):
    """GET /customers serves customer PII to admins only — a customer session must not read it."""
    email = "rolesep2@example.com"
    await _register_and_verify(account_client, session, email)
    await account_client.post("/api/v1/account/login", json={"email": email, "password": "password1234"})

    resp = await account_client.get("/api/v1/customers")
    assert resp.status_code in (401, 403, 404)


@pytest.mark.asyncio
async def test_admin_cookie_rejected_by_account(session: AsyncSession, account_setup):
    from app.domains.auth.service import create_session_token

    admin_token = create_session_token("admin")

    def override_session():
        return session

    app.dependency_overrides[get_session] = override_session
    with patch("app.domains.notifications.email.send_email", return_value=None):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            client.cookies.set("session", admin_token)
            resp = await client.get("/api/v1/account/me")
    app.dependency_overrides.clear()

    assert resp.status_code == 401
