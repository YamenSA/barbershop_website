from fastapi import APIRouter, Depends, HTTPException, Query, Security, Request
from fastapi.security import APIKeyHeader
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.core.database import get_session
from app.core.config import settings
from app.core.limiter import limiter
from app.domains.maintenance.schemas import RetentionResultOut
from app.domains.maintenance.service import MaintenanceService

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])
logger = logging.getLogger(__name__)

api_key_header = APIKeyHeader(name="Authorization", auto_error=False)

async def verify_cron_secret(api_key: str = Security(api_key_header)):
    if not settings.RETENTION_CRON_SECRET:
        raise HTTPException(status_code=500, detail="Cron secret not configured")
    
    # Allow passing as Bearer token or directly
    token = api_key
    if token and token.startswith("Bearer "):
        token = token.replace("Bearer ", "")
        
    if token != settings.RETENTION_CRON_SECRET:
        logger.warning("Unauthorized access attempt to maintenance endpoint")
        raise HTTPException(status_code=403, detail="Invalid token")
    return token

@router.post("/retention", response_model=RetentionResultOut)
@limiter.limit("5/day")
async def run_retention(
    request: Request,
    dry_run: bool = Query(True, description="Run in dry-run mode (no changes to DB)"),
    token: str = Depends(verify_cron_secret),
    session: AsyncSession = Depends(get_session)
):
    """
    Run retention job to anonymize inactive customers and walk-in guests.
    Must be called with a valid RETENTION_CRON_SECRET.
    """
    try:
        return await MaintenanceService.run_retention(session, dry_run=dry_run)
    except Exception as e:
        logger.error(f"Retention job failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Retention job failed")
