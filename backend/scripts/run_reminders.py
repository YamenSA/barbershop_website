import asyncio
import json
import sys
from pathlib import Path

# Ensure the backend package is importable when run from the repo root.
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.domains.notifications.reminders import run_reminder_job


async def main() -> None:
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        result = await run_reminder_job(session)
        print(json.dumps(result.model_dump()))


if __name__ == "__main__":
    asyncio.run(main())
