"""
Integration tests for marketing domain: Promotions CRUD (admin) and
GET /public/promotions returning only visible promotions (T018).
"""
from datetime import date, timedelta
from unittest.mock import patch

import pytest
from httpx import AsyncClient


# ---------------------------------------------------------------------------
# Helper: patch get_berlin_today in the service module
# ---------------------------------------------------------------------------
def _patch_berlin_today(d: date):
    return patch(
        "app.domains.marketing.service.get_berlin_today",
        return_value=d,
    )


# ---------------------------------------------------------------------------
# T018a — Admin CRUD
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_promotion(client: AsyncClient):
    payload = {
        "title": "Sommer-Special",
        "description": "10% auf alle Farbbehandlungen",
        "starts_on": "2026-07-01",
        "ends_on": "2026-07-31",
        "is_active": True,
    }
    resp = await client.post("/api/v1/promotions", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Sommer-Special"
    assert "effective_status" in data
    assert "id" in data


@pytest.mark.asyncio
async def test_create_promotion_invalid_dates(client: AsyncClient):
    """ends_on < starts_on → 422."""
    payload = {
        "title": "Bad Dates",
        "description": "ends before starts",
        "starts_on": "2026-08-01",
        "ends_on": "2026-07-31",
        "is_active": True,
    }
    resp = await client.post("/api/v1/promotions", json=payload)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_promotions_admin(client: AsyncClient):
    # Create two promotions
    for title in ["Aktion A", "Aktion B"]:
        await client.post("/api/v1/promotions", json={
            "title": title,
            "description": "Beschreibung",
            "starts_on": "2026-07-01",
            "ends_on": "2026-07-31",
            "is_active": True,
        })
    resp = await client.get("/api/v1/promotions")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 2
    # Each item must have effective_status
    for item in data:
        assert "effective_status" in item


@pytest.mark.asyncio
async def test_get_promotion_not_found(client: AsyncClient):
    resp = await client.get("/api/v1/promotions/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_promotion(client: AsyncClient):
    create_resp = await client.post("/api/v1/promotions", json={
        "title": "Ursprünglich",
        "description": "Original",
        "starts_on": "2026-07-01",
        "ends_on": "2026-07-31",
        "is_active": True,
    })
    promotion_id = create_resp.json()["id"]

    update_resp = await client.put(f"/api/v1/promotions/{promotion_id}", json={
        "title": "Geändert",
    })
    assert update_resp.status_code == 200
    assert update_resp.json()["title"] == "Geändert"


@pytest.mark.asyncio
async def test_update_promotion_invalid_dates(client: AsyncClient):
    create_resp = await client.post("/api/v1/promotions", json={
        "title": "Test",
        "description": "Desc",
        "starts_on": "2026-07-01",
        "ends_on": "2026-07-31",
        "is_active": True,
    })
    promotion_id = create_resp.json()["id"]

    # Attempt to set ends_on before starts_on
    resp = await client.put(f"/api/v1/promotions/{promotion_id}", json={
        "ends_on": "2026-06-01",
    })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_delete_promotion(client: AsyncClient):
    create_resp = await client.post("/api/v1/promotions", json={
        "title": "Zum Löschen",
        "description": "Weg damit",
        "starts_on": "2026-07-01",
        "ends_on": "2026-07-31",
        "is_active": True,
    })
    promotion_id = create_resp.json()["id"]

    del_resp = await client.delete(f"/api/v1/promotions/{promotion_id}")
    assert del_resp.status_code == 204

    get_resp = await client.get(f"/api/v1/promotions/{promotion_id}")
    assert get_resp.status_code == 404


# ---------------------------------------------------------------------------
# T018b — GET /public/promotions — only visible (active + date range covers today)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_public_promotions_returns_only_visible(
    client: AsyncClient, public_client: AsyncClient
):
    today = date(2026, 7, 15)

    # Visible: active, covers today
    await client.post("/api/v1/promotions", json={
        "title": "Sichtbar",
        "description": "Heute gültig",
        "starts_on": str(today - timedelta(days=5)),
        "ends_on": str(today + timedelta(days=5)),
        "is_active": True,
    })
    # Expired: active, ended yesterday
    await client.post("/api/v1/promotions", json={
        "title": "Abgelaufen",
        "description": "Gestern war der letzte Tag",
        "starts_on": str(today - timedelta(days=10)),
        "ends_on": str(today - timedelta(days=1)),
        "is_active": True,
    })
    # Scheduled: active, starts tomorrow
    await client.post("/api/v1/promotions", json={
        "title": "Geplant",
        "description": "Morgen erst",
        "starts_on": str(today + timedelta(days=1)),
        "ends_on": str(today + timedelta(days=10)),
        "is_active": True,
    })
    # Hidden: inactive but in range
    await client.post("/api/v1/promotions", json={
        "title": "Versteckt",
        "description": "Deaktiviert",
        "starts_on": str(today - timedelta(days=5)),
        "ends_on": str(today + timedelta(days=5)),
        "is_active": False,
    })

    with _patch_berlin_today(today):
        resp = await public_client.get("/api/v1/public/promotions")

    assert resp.status_code == 200
    titles = [p["title"] for p in resp.json()]
    assert "Sichtbar" in titles
    assert "Abgelaufen" not in titles
    assert "Geplant" not in titles
    assert "Versteckt" not in titles


@pytest.mark.asyncio
async def test_public_promotions_empty_when_none_active(
    client: AsyncClient, public_client: AsyncClient
):
    today = date(2026, 9, 1)
    await client.post("/api/v1/promotions", json={
        "title": "Alt",
        "description": "Längst abgelaufen",
        "starts_on": "2026-01-01",
        "ends_on": "2026-01-31",
        "is_active": True,
    })

    with _patch_berlin_today(today):
        resp = await public_client.get("/api/v1/public/promotions")

    assert resp.status_code == 200
    assert resp.json() == []
