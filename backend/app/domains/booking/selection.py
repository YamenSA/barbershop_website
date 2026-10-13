"""Server-owned selection, prices and immutable details for combined visits."""
from uuid import UUID

from fastapi import HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession

from app.domains.stammdaten.models import Service

MAX_BOOKING_SERVICES = 20


def selection_ids(service_id: UUID | None, service_ids: list[UUID] | None) -> list[UUID]:
    if service_id is not None and service_ids is not None:
        raise HTTPException(422, "Bitte entweder service_id oder service_ids angeben")
    ids = service_ids if service_ids is not None else ([service_id] if service_id else [])
    if not ids or len(ids) > MAX_BOOKING_SERVICES or len(set(ids)) != len(ids):
        raise HTTPException(422, "Bitte 1 bis 20 unterschiedliche Leistungen auswählen")
    return ids


async def load_selected_services(session: AsyncSession, ids: list[UUID]) -> list[Service]:
    services = []
    for service_id in ids:
        service = await session.get(Service, service_id)
        if not service or not service.is_active:
            raise HTTPException(404, "Eine gewählte Leistung ist nicht mehr verfügbar")
        if service.duration_minutes <= 0:
            raise HTTPException(422, "Leistungsdauer ist nicht buchbar")
        services.append(service)
    return services


def service_snapshots(services: list[Service]) -> list[dict]:
    return [{"id": str(s.id), "name": s.name, "duration_minutes": s.duration_minutes,
             "price_cents": s.price_cents, "price_is_from": s.price_is_from} for s in services]
