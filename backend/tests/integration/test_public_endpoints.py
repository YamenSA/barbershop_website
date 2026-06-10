"""Integration tests for unauthenticated public read endpoints.

Constitution critical path (Prinzip IX + II):
- Public endpoints readable without auth
- PUT /salon-profile requires admin (401 without auth)
- /public/salon-hours returns all 7 days
"""
from datetime import time

import pytest
from httpx import AsyncClient, ASGITransport
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.domains.stammdaten.models import SalonHours, SalonProfile, Service, TeamMember, TeamMemberServiceLink
from app.main import app


@pytest.fixture(name="public_client")
async def public_client_fixture(session: AsyncSession):
    """HTTP client with session override but NO auth override — real auth runs."""
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(name="seeded_salon")
async def seeded_salon_fixture(session: AsyncSession):
    """Seed a salon profile and 7 salon hours rows."""
    profile = SalonProfile(
        name="Test Barbershop",
        street="Teststraße 1",
        postal_code="10115",
        city="Berlin",
        country="DE",
        phone="+49 30 1234567",
    )
    session.add(profile)

    for day in range(7):
        session.add(SalonHours(
            day_of_week=day,
            is_open=True,
            open_time=time(9, 0),
            close_time=time(18, 0),
        ))

    await session.commit()
    return profile


@pytest.mark.asyncio
async def test_public_salon_profile_readable_without_auth(
    public_client: AsyncClient, seeded_salon: SalonProfile
):
    response = await public_client.get("/api/v1/public/salon-profile")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Barbershop"
    assert data["street"] == "Teststraße 1"
    assert data["city"] == "Berlin"
    assert "phone" in data


@pytest.mark.asyncio
async def test_admin_salon_profile_update_requires_auth(public_client: AsyncClient):
    response = await public_client.put(
        "/api/v1/salon-profile",
        json={"phone": "+49 30 9999999"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_public_salon_hours_returns_7_entries(
    public_client: AsyncClient, seeded_salon: SalonProfile
):
    response = await public_client.get("/api/v1/public/salon-hours")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 7
    days = [entry["day_of_week"] for entry in data]
    assert days == list(range(7))
    for entry in data:
        assert "is_open" in entry
        assert "day_of_week" in entry


@pytest.fixture(name="seeded_services")
async def seeded_services_fixture(session: AsyncSession):
    """Seed one active and one inactive service."""
    active = Service(
        name="Herrenhaarschnitt",
        duration_minutes=30,
        price_cents=2900,
        description="Waschen, Schneiden, Styling.",
        is_active=True,
    )
    inactive = Service(
        name="Archiviert",
        duration_minutes=20,
        price_cents=1500,
        is_active=False,
    )
    session.add(active)
    session.add(inactive)
    await session.commit()
    return active


@pytest.mark.asyncio
async def test_public_services_readable_without_auth(
    public_client: AsyncClient, seeded_services: Service
):
    response = await public_client.get("/api/v1/public/services")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Herrenhaarschnitt"
    assert data[0]["price_cents"] == 2900
    assert data[0]["duration_minutes"] == 30


@pytest.mark.asyncio
async def test_public_services_excludes_inactive(
    public_client: AsyncClient, seeded_services: Service
):
    response = await public_client.get("/api/v1/public/services")
    assert response.status_code == 200
    names = [s["name"] for s in response.json()]
    assert "Archiviert" not in names


@pytest.mark.asyncio
async def test_public_services_no_is_active_field(
    public_client: AsyncClient, seeded_services: Service
):
    response = await public_client.get("/api/v1/public/services")
    assert response.status_code == 200
    for service in response.json():
        assert "is_active" not in service


@pytest.fixture(name="seeded_team")
async def seeded_team_fixture(session: AsyncSession):
    """Seed active + inactive team member; link one active service to the active member."""
    svc = Service(
        name="Herrenhaarschnitt",
        duration_minutes=30,
        price_cents=2900,
        is_active=True,
    )
    session.add(svc)

    active = TeamMember(name="Max Mustermann", bio="Erfahrener Barbier.", is_active=True)
    inactive = TeamMember(name="Archiviert Person", is_active=False)
    session.add(active)
    session.add(inactive)
    await session.flush()

    link = TeamMemberServiceLink(team_member_id=active.id, service_id=svc.id)
    session.add(link)
    await session.commit()
    return active


@pytest.mark.asyncio
async def test_public_team_readable_without_auth(
    public_client: AsyncClient, seeded_team: TeamMember
):
    response = await public_client.get("/api/v1/public/team")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Max Mustermann"
    assert data[0]["bio"] == "Erfahrener Barbier."
    assert isinstance(data[0]["services"], list)


@pytest.mark.asyncio
async def test_public_team_excludes_inactive(
    public_client: AsyncClient, seeded_team: TeamMember
):
    response = await public_client.get("/api/v1/public/team")
    assert response.status_code == 200
    names = [m["name"] for m in response.json()]
    assert "Archiviert Person" not in names


@pytest.mark.asyncio
async def test_public_team_null_photo_url_tolerated(
    public_client: AsyncClient, seeded_team: TeamMember
):
    response = await public_client.get("/api/v1/public/team")
    assert response.status_code == 200
    assert response.json()[0]["photo_url"] is None


@pytest.mark.asyncio
async def test_public_team_no_is_active_field(
    public_client: AsyncClient, seeded_team: TeamMember
):
    response = await public_client.get("/api/v1/public/team")
    assert response.status_code == 200
    for member in response.json():
        assert "is_active" not in member
