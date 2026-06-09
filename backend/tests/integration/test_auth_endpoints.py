import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext

from app.domains.auth.models import AdminAccount

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

TEST_USERNAME = "testadmin"
TEST_PASSWORD = "securepassword123"


@pytest.fixture
async def admin_account(session: AsyncSession) -> AdminAccount:
    admin = AdminAccount(
        username=TEST_USERNAME,
        hashed_password=_pwd.hash(TEST_PASSWORD),
    )
    session.add(admin)
    await session.commit()
    await session.refresh(admin)
    return admin


@pytest.mark.asyncio
async def test_login_success_sets_cookie(auth_client: AsyncClient, admin_account: AdminAccount):
    response = await auth_client.post(
        "/api/v1/auth/login",
        json={"username": TEST_USERNAME, "password": TEST_PASSWORD},
    )
    assert response.status_code == 200
    assert response.json()["username"] == TEST_USERNAME
    assert "session" in response.cookies


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401_generic_message(
    auth_client: AsyncClient, admin_account: AdminAccount
):
    response = await auth_client.post(
        "/api/v1/auth/login",
        json={"username": TEST_USERNAME, "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid username or password"


@pytest.mark.asyncio
async def test_logout_clears_cookie(auth_client: AsyncClient, admin_account: AdminAccount):
    login = await auth_client.post(
        "/api/v1/auth/login",
        json={"username": TEST_USERNAME, "password": TEST_PASSWORD},
    )
    assert login.status_code == 200

    response = await auth_client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    # Cookie is deleted — value is empty string in Set-Cookie: session=""
    assert auth_client.cookies.get("session") is None or auth_client.cookies.get("session") == ""


@pytest.mark.asyncio
async def test_protected_endpoint_without_cookie_returns_401(auth_client: AsyncClient):
    response = await auth_client.get("/api/v1/services")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoint_with_cookie_returns_200(
    auth_client: AsyncClient, admin_account: AdminAccount
):
    await auth_client.post(
        "/api/v1/auth/login",
        json={"username": TEST_USERNAME, "password": TEST_PASSWORD},
    )
    response = await auth_client.get("/api/v1/services")
    assert response.status_code == 200
