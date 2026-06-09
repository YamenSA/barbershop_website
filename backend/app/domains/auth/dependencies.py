from fastapi import Request, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.core.database import get_session
from app.domains.auth.service import validate_session_token
from app.domains.auth.models import AdminAccount


async def get_current_admin(
    request: Request, db: AsyncSession = Depends(get_session)
) -> AdminAccount:
    session_token = request.cookies.get("session")
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    username = validate_session_token(session_token)
    
    statement = select(AdminAccount).where(AdminAccount.username == username)
    result = await db.execute(statement)
    admin = result.scalar_one_or_none()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin account not found",
        )

    return admin
