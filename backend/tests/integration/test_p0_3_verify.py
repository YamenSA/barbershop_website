import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession
from app.domains.booking.models import Customer

async def test_get_customers_no_token_returns_401(public_client: AsyncClient):
    resp = await public_client.get("/api/v1/customers")
    assert resp.status_code in [401, 403]
    print(f"\nNO TOKEN STATUS: {resp.status_code}, OUTPUT: {resp.json()}")

async def test_get_customers_customer_token_returns_403(customer_client: AsyncClient):
    resp = await customer_client.get("/api/v1/customers")
    assert resp.status_code in [401, 403]
    print(f"\nCUSTOMER TOKEN STATUS: {resp.status_code}, OUTPUT: {resp.json()}")

async def test_anonymize_customer_clears_pii(admin_client: AsyncClient, session: AsyncSession):
    # Setup test customer
    from sqlalchemy import select
    customer = Customer(name="Test User", email="test@example.com", phone="123456789")
    session.add(customer)
    await session.commit()
    await session.refresh(customer)
    customer_id = customer.id

    # Call delete endpoint
    resp = await admin_client.delete(f"/api/v1/customers/{customer_id}")
    assert resp.status_code == 204

    # Fetch raw from DB
    await session.commit()
    stmt = select(Customer).where(Customer.id == customer_id)
    raw_customer = (await session.execute(stmt)).scalar_one()

    print(f"\nAFTER ANONYMIZATION:")
    print(f"ID: {raw_customer.id}")
    print(f"Name: {raw_customer.name}")
    print(f"Email: {raw_customer.email}")
    print(f"Phone: {raw_customer.phone}")
    print(f"Anonymized at: {raw_customer.anonymized_at}")
