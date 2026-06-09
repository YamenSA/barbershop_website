import pytest
from httpx import AsyncClient
from datetime import date, datetime, timezone
from app.domains.stammdaten.models import Service, TeamMember, SalonHours, WorkingHours
from app.domains.booking.models import Customer, Appointment, AppointmentStatus

@pytest.mark.asyncio
async def test_quickstart_scenario_full_flow(client: AsyncClient, session):
    # 1. Setup Data (S5 CRUD)
    # Service
    resp = await client.post("/api/v1/services", json={"name": "Herrenschnitt", "duration_minutes": 45, "price_cents": 2500})
    assert resp.status_code == 201
    service_id = resp.json()["id"]

    # Team Member
    resp = await client.post("/api/v1/team-members", json={"name": "Hans Master"})
    assert resp.status_code == 201
    member_id = resp.json()["id"]

    # Assign Service
    resp = await client.put(f"/api/v1/team-members/{member_id}/services", json={"service_ids": [service_id]})
    assert resp.status_code == 200

    # Salon Hours (Monday is day 0)
    session.add(SalonHours(day_of_week=0, is_open=True, open_time=datetime.strptime("09:00:00", "%H:%M:%S").time(), close_time=datetime.strptime("18:00:00", "%H:%M:%S").time()))
    await session.commit()

    # Working Hours
    resp = await client.put(f"/api/v1/team-members/{member_id}/working-hours/0", json={"day_of_week": 0, "start_time": "10:00:00", "end_time": "16:00:00"})
    assert resp.status_code == 200

    # 2. Check Availability (S3)
    test_date = "2026-07-13" # A Monday
    resp = await client.get(f"/api/v1/availability?service_id={service_id}&team_member_id={member_id}&target_date={test_date}")
    assert resp.status_code == 200
    slots = resp.json()
    assert len(slots) > 0
    # First slot should be 10:00
    assert slots[0]["starts_at"].startswith("2026-07-13T10:00:00")

    # 3. Create Appointment (S2)
    start_at = "2026-07-13T10:00:00Z"
    resp = await client.post("/api/v1/appointments", json={
        "team_member_id": member_id,
        "service_id": service_id,
        "guest_name": "Test Guest",
        "guest_phone": "+49123",
        "starts_at": start_at
    })
    assert resp.status_code == 201

    # 4. Double Booking Protection (S2)
    resp = await client.post("/api/v1/appointments", json={
        "team_member_id": member_id,
        "service_id": service_id,
        "guest_name": "Another Guest",
        "guest_phone": "+49456",
        "starts_at": "2026-07-13T10:30:00Z" # Overlaps 10:00-10:45
    })
    assert resp.status_code == 409

    # 5. Customer Lifecycle (S6)
    resp = await client.post("/api/v1/customers", json={"name": "Hans Customer", "email": "hans@example.com"})
    assert resp.status_code == 201
    customer_id = resp.json()["id"]

    resp = await client.delete(f"/api/v1/customers/{customer_id}")
    assert resp.status_code == 204

    resp = await client.get(f"/api/v1/customers/{customer_id}")
    assert resp.status_code == 404 # Anonymized/Deleted should not be found in active list
