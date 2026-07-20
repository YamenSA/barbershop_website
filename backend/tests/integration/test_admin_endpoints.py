from datetime import datetime, date as date_type, timezone, time
import os
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.stammdaten.models import SalonHours, Service, TeamMember, WorkingHours
from app.domains.booking.models import AppointmentStatus


# ── fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
async def base_data(session: AsyncSession):
    """Seed service, stylist, salon hours, and working hours for Mon 09:00–17:00."""
    svc = Service(name="Schnitt", duration_minutes=30, price_cents=2500)
    member = TeamMember(name="Alex")
    session.add_all([svc, member])
    await session.commit()
    await session.refresh(svc)
    await session.refresh(member)

    salon = SalonHours(day_of_week=0, is_open=True, open_time=time(9, 0), close_time=time(18, 0))
    wh = WorkingHours(team_member_id=member.id, day_of_week=0, start_time=time(9, 0), end_time=time(17, 0))
    session.add_all([salon, wh])
    await session.commit()

    return {"service": svc, "member": member}


MONDAY_10 = datetime(2026, 7, 13, 10, 0, tzinfo=timezone.utc)  # a Monday


# ── T038 tests ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_admin_walkin_creates_confirmed_appointment(
    client: AsyncClient, base_data: dict
):
    svc = base_data["service"]
    member = base_data["member"]

    response = await client.post(
        "/api/v1/appointments",
        json={
            "service_id": str(svc.id),
            "team_member_id": str(member.id),
            "starts_at": MONDAY_10.isoformat(),
            "admin_override": True,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == AppointmentStatus.confirmed.value
    assert data["team_member_id"] == str(member.id)


@pytest.mark.asyncio
async def test_admin_walkin_blocks_slot_for_second_attempt(
    client: AsyncClient, base_data: dict
):
    svc = base_data["service"]
    member = base_data["member"]

    payload = {
        "service_id": str(svc.id),
        "team_member_id": str(member.id),
        "starts_at": MONDAY_10.isoformat(),
        "admin_override": True,
    }
    first = await client.post("/api/v1/appointments", json=payload)
    assert first.status_code == 201

    second = await client.post("/api/v1/appointments", json=payload)
    assert second.status_code == 409
    assert second.json()["detail"] == "BOOKING_CONFLICT"


@pytest.mark.asyncio
async def test_admin_override_skips_schedule_check_but_not_double_booking(
    client: AsyncClient, base_data: dict
):
    svc = base_data["service"]
    member = base_data["member"]

    # Saturday — salon has no SalonHours seeded → would fail schedule check
    saturday = datetime(2026, 7, 18, 10, 0, tzinfo=timezone.utc)

    # Without override → 422
    no_override = await client.post(
        "/api/v1/appointments",
        json={
            "service_id": str(svc.id),
            "team_member_id": str(member.id),
            "starts_at": saturday.isoformat(),
            "admin_override": False,
        },
    )
    assert no_override.status_code == 422

    # With override → 201
    with_override = await client.post(
        "/api/v1/appointments",
        json={
            "service_id": str(svc.id),
            "team_member_id": str(member.id),
            "starts_at": saturday.isoformat(),
            "admin_override": True,
        },
    )
    assert with_override.status_code == 201

    # Same slot again with override → still 409 (double-booking always enforced)
    duplicate = await client.post(
        "/api/v1/appointments",
        json={
            "service_id": str(svc.id),
            "team_member_id": str(member.id),
            "starts_at": saturday.isoformat(),
            "admin_override": True,
        },
    )
    assert duplicate.status_code == 409


@pytest.mark.asyncio
async def test_customer_search_by_phone_prefix(client: AsyncClient, session: AsyncSession):
    from app.domains.booking.models import Customer

    c1 = Customer(name="Anna Müller", email="anna@test.de", phone="0151234")
    c2 = Customer(name="Bob Schmidt", email="bob@test.de", phone="0179999")
    c3 = Customer(name="Carol", email="carol@test.de", phone=None)
    session.add_all([c1, c2, c3])
    await session.commit()

    # Phone prefix search
    resp = await client.get("/api/v1/customers?search=015")
    assert resp.status_code == 200
    names = [c["name"] for c in resp.json()["items"]]
    assert "Anna Müller" in names
    assert "Bob Schmidt" not in names

    # Name prefix search
    resp2 = await client.get("/api/v1/customers?search=bob")
    assert resp2.status_code == 200
    names2 = [c["name"] for c in resp2.json()["items"]]
    assert "Bob Schmidt" in names2
    assert "Anna Müller" not in names2


@pytest.mark.asyncio
async def test_customers_endpoint_rejects_unauthenticated(public_client: AsyncClient):
    """GET /customers serves customer PII — must require an admin session."""
    resp = await public_client.get("/api/v1/customers")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_delete_customer_anonymizes_pii_via_api(client: AsyncClient, session: AsyncSession):
    """DELETE /customers/{id} (M10) must clear name, email and phone on the raw row,
    not just exclude the customer from the active list."""
    from sqlalchemy import select
    from app.domains.booking.models import Customer

    customer = Customer(name="Test User", email="test@example.com", phone="123456789")
    session.add(customer)
    await session.commit()
    await session.refresh(customer)
    customer_id = customer.id

    resp = await client.delete(f"/api/v1/customers/{customer_id}")
    assert resp.status_code == 204

    stmt = select(Customer).where(Customer.id == customer_id)
    raw_customer = (await session.execute(stmt)).scalar_one()

    assert raw_customer.name == "[anonymisiert]"
    assert raw_customer.email.startswith("[anonymisiert]")
    assert raw_customer.phone == "[anonymisiert]"
    assert raw_customer.anonymized_at is not None


# ── T050 PDF tests ────────────────────────────────────────────────────────────

PDF_DATE = "2026-07-13"  # Monday matching MONDAY_10 fixture date


@pytest.fixture
async def pdf_data(client: AsyncClient, session: AsyncSession, base_data: dict):
    """Seed one confirmed appointment with notes on PDF_DATE."""
    svc = base_data["service"]
    member = base_data["member"]
    resp = await client.post(
        "/api/v1/appointments",
        json={
            "service_id": str(svc.id),
            "team_member_id": str(member.id),
            "starts_at": MONDAY_10.isoformat(),
            "guest_name": "Test Gast",
            "notes": "Geheimer Hinweis",
            "admin_override": True,
        },
    )
    assert resp.status_code == 201
    return {"appointment": resp.json(), "service": svc, "member": member}


@pytest.mark.asyncio
async def test_pdf_returns_pdf_content_type(client: AsyncClient, pdf_data: dict):
    resp = await client.get(f"/api/v1/admin/daily-plan/pdf?date={PDF_DATE}")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert "tagesplan" in resp.headers["content-disposition"]


@pytest.mark.asyncio
async def test_pdf_excludes_notes_by_default(client: AsyncClient, pdf_data: dict):
    resp = await client.get(f"/api/v1/admin/daily-plan/pdf?date={PDF_DATE}")
    assert resp.status_code == 200
    # PDF binary should not contain the notes text (fpdf2 embeds text as-is)
    assert b"Notiz" not in resp.content
    assert b"Geheimer Hinweis" not in resp.content


@pytest.mark.asyncio
async def test_pdf_includes_notes_when_opted_in(client: AsyncClient, pdf_data: dict):
    resp = await client.get(
        f"/api/v1/admin/daily-plan/pdf?date={PDF_DATE}&include_notes=true"
    )
    assert resp.status_code == 200
    assert b"Notiz" in resp.content
    assert b"Geheimer Hinweis" in resp.content


@pytest.mark.asyncio
async def test_pdf_filters_by_team_member(
    client: AsyncClient, session: AsyncSession, pdf_data: dict, base_data: dict
):
    other = TeamMember(name="OtherBarber")
    session.add(other)
    await session.commit()
    await session.refresh(other)

    # PDF for the other member should have no appointment rows
    resp = await client.get(
        f"/api/v1/admin/daily-plan/pdf?date={PDF_DATE}&team_member_id={other.id}"
    )
    assert resp.status_code == 200
    # The seeded guest name should not appear
    assert b"Test Gast" not in resp.content


@pytest.mark.asyncio
async def test_pdf_not_stored_on_filesystem(
    client: AsyncClient, pdf_data: dict, tmp_path
):
    before = set(os.listdir("."))
    await client.get(f"/api/v1/admin/daily-plan/pdf?date={PDF_DATE}")
    after = set(os.listdir("."))
    new_files = {f for f in (after - before) if f.endswith(".pdf")}
    assert not new_files, f"PDF was written to disk: {new_files}"
