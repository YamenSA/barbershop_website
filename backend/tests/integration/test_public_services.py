import pytest
from httpx import AsyncClient, ASGITransport
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.domains.stammdaten.models import Service
from app.main import app


@pytest.fixture(name="public_client")
async def public_client_fixture(session: AsyncSession):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_public_services_include_target_group_and_service_kind(
    public_client: AsyncClient, session: AsyncSession
):
    # Seed a service with target_group and service_kind (using dict/attributes once defined)
    # For now, we seed it manually to check if the public endpoint returns them.
    service = Service(
        name="Premium Schnitt",
        duration_minutes=45,
        price_cents=3500,
        is_active=True,
        target_group="HERREN",
        service_kind="SCHNITT",
    )
    session.add(service)
    await session.commit()

    response = await public_client.get("/api/v1/public/services")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    
    # Check that both fields are present and not null
    assert "target_group" in data[0]
    assert "service_kind" in data[0]
    assert data[0]["target_group"] == "HERREN"
    assert data[0]["service_kind"] == "SCHNITT"
