import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.domains.auth.dependencies import get_current_admin
from app.domains.auth.models import AdminAccount
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(name="session")
async def session_fixture():
    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    async with async_session() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest.fixture(name="mock_admin")
def mock_admin_fixture() -> AdminAccount:
    return AdminAccount(username="testadmin", hashed_password="irrelevant-mocked")


@pytest.fixture(name="client")
async def client_fixture(session: AsyncSession, mock_admin: AdminAccount):
    """Authenticated client — get_current_admin always returns mock_admin."""
    def get_session_override():
        return session

    async def get_admin_override():
        return mock_admin

    app.dependency_overrides[get_session] = get_session_override
    app.dependency_overrides[get_current_admin] = get_admin_override
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="auth_client")
async def auth_client_fixture(session: AsyncSession):
    """Unauthenticated client — real get_current_admin for auth endpoint tests.
    Uses https:// so httpx honours Secure cookie attribute on subsequent requests."""
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    async with AsyncClient(transport=ASGITransport(app=app), base_url="https://test") as client:
        yield client
    app.dependency_overrides.clear()
