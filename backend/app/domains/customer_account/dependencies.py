from uuid import UUID

from fastapi import Cookie, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.domains.auth.service import validate_customer_token
from app.domains.booking.models import Customer


async def get_current_customer(
    customer_session: str = Cookie(default=None),
    session: AsyncSession = Depends(get_session),
) -> Customer:
    if not customer_session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="NOT_AUTHENTICATED")

    customer_id_str = validate_customer_token(customer_session)

    customer = await session.get(Customer, UUID(customer_id_str))
    if not customer or customer.anonymized_at or not customer.hashed_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="NOT_AUTHENTICATED")
    return customer
