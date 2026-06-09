import asyncio
import json
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.domains.booking.retention import run_retention_job


async def main():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        result = await run_retention_job(session)
        print(json.dumps(result.model_dump()))


if __name__ == "__main__":
    asyncio.run(main())
