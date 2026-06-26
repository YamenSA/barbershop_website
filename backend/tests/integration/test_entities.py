import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.domains.stammdaten.models import Service, TeamMember
from app.main import app


@pytest.mark.asyncio
async def test_create_service(client: AsyncClient):
    response = await client.post(
        "/api/v1/services",
        json={
            "name": "Herrenschnitt",
            "duration_minutes": 45,
            "price_cents": 2500,
            "target_group": "HERREN",
            "service_kind": "SCHNITT",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Herrenschnitt"
    assert data["duration_minutes"] == 45
    assert data["price_cents"] == 2500
    assert data["is_active"] is True
    assert "id" in data


@pytest.mark.asyncio
async def test_get_services(client: AsyncClient, session: AsyncSession):
    service = Service(name="Bartpflege", duration_minutes=30, price_cents=1500)
    session.add(service)
    await session.commit()

    response = await client.get("/api/v1/services")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any(s["name"] == "Bartpflege" for s in data)


@pytest.mark.asyncio
async def test_update_service(client: AsyncClient, session: AsyncSession):
    service = Service(name="Old Name", duration_minutes=30, price_cents=1500)
    session.add(service)
    await session.commit()
    await session.refresh(service)

    response = await client.put(
        f"/api/v1/services/{service.id}",
        json={"name": "New Name", "price_cents": 2000},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Name"
    assert data["price_cents"] == 2000


@pytest.mark.asyncio
async def test_deactivate_service(client: AsyncClient, session: AsyncSession):
    service = Service(name="To Deactivate", duration_minutes=30, price_cents=1500)
    session.add(service)
    await session.commit()
    await session.refresh(service)

    response = await client.delete(f"/api/v1/services/{service.id}")
    assert response.status_code == 204

    # Verify soft delete
    await session.refresh(service)
    assert service.is_active is False


@pytest.mark.asyncio
async def test_create_team_member(client: AsyncClient):
    response = await client.post(
        "/api/v1/team-members",
        json={"name": "John Doe", "bio": "Master Barber"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "John Doe"
    assert data["bio"] == "Master Barber"
    assert "id" in data


@pytest.mark.asyncio
async def test_assign_services_to_team_member(
    client: AsyncClient, session: AsyncSession
):
    service = Service(name="Service 1", duration_minutes=30, price_cents=1000)
    member = TeamMember(name="Barber 1")
    session.add(service)
    session.add(member)
    await session.commit()
    await session.refresh(service)
    await session.refresh(member)

    response = await client.put(
        f"/api/v1/team-members/{member.id}/services",
        json={"service_ids": [str(service.id)]},
    )
    assert response.status_code == 200
    
    # Verify assignment
    response = await client.get(f"/api/v1/team-members/{member.id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data["services"]) == 1
    assert data["services"][0]["id"] == str(service.id)
