import os

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.domains.auth.dependencies import get_current_admin
from app.domains.auth.models import AdminAccount
from app.main import app


# Default: in-memory SQLite. PostgreSQL mode (tests marked `postgres`, e.g. the
# EXCLUDE-constraint test) is opt-in via TEST_DATABASE_URL and expects a database
# that `alembic upgrade head` has already been applied to — create_all() cannot
# create the EXCLUDE constraint. See CLAUDE.md "Tests: SQLite und PostgreSQL" and
# scripts/run_pg_tests.sh.
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "sqlite+aiosqlite:///:memory:")
IS_PG = TEST_DATABASE_URL.startswith("postgresql")

if IS_PG:
    # The PG fixture TRUNCATEs every table after each test — refuse anything that
    # is not clearly a disposable test database (never a dev/prod database).
    _db_name = TEST_DATABASE_URL.rsplit("/", 1)[-1].split("?")[0]
    if not _db_name.endswith("_test"):
        raise RuntimeError(
            f"Refusing to run PG tests against database '{_db_name}': "
            "TEST_DATABASE_URL must point at a database whose name ends in '_test'."
        )
    engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True, poolclass=NullPool)
else:
    engine = create_async_engine(TEST_DATABASE_URL, echo=False, future=True)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def pytest_collection_modifyitems(config, items):
    skip_pg = pytest.mark.skip(
        reason="needs PostgreSQL: set TEST_DATABASE_URL=postgresql+asyncpg://…/<name>_test "
        "and run `pytest -m postgres` (see scripts/run_pg_tests.sh)"
    )
    skip_sqlite_suite = pytest.mark.skip(reason="PG mode runs only tests marked `postgres`")
    for item in items:
        is_pg_test = item.get_closest_marker("postgres") is not None
        if is_pg_test and not IS_PG:
            item.add_marker(skip_pg)
        elif IS_PG and not is_pg_test:
            item.add_marker(skip_sqlite_suite)


@pytest.fixture(name="session")
async def session_fixture():
    if IS_PG:
        async with async_session() as session:
            yield session
            await session.rollback()
            tables = (
                await session.execute(
                    text("SELECT quote_ident(tablename) FROM pg_tables "
                         "WHERE schemaname = 'public' AND tablename <> 'alembic_version'")
                )
            ).scalars().all()
            if tables:
                await session.execute(text(f"TRUNCATE {', '.join(tables)} RESTART IDENTITY CASCADE"))
            await session.commit()
        return

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


@pytest.fixture(name="public_client")
async def public_client_fixture(session: AsyncSession):
    """Unauthenticated client for public endpoints — uses test in-memory session."""
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
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
