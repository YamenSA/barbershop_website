import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.stammdaten.models import TeamMember, WorkingDaySchedule

@pytest.mark.asyncio
async def test_p0_2_acceptance(client: AsyncClient, session: AsyncSession):
    # Setup team member
    member = TeamMember(name="Test Barber", is_active=True, email="test@barber.com")
    session.add(member)
    await session.commit()
    await session.refresh(member)
    member_id = member.id

    print("\n--- Test 1: Montag auf 9:00-18:00 ---")
    payload1 = {
        "days": [
            {"is_working": True, "intervals": [{"start_time": "09:00:00", "end_time": "18:00:00"}]},
            {"is_working": False, "intervals": []},
            {"is_working": False, "intervals": []},
            {"is_working": False, "intervals": []},
            {"is_working": False, "intervals": []},
            {"is_working": False, "intervals": []},
            {"is_working": False, "intervals": []},
        ]
    }
    print("REQUEST:", payload1)
    resp1 = await client.put(f"/api/v1/team-members/{member_id}/working-schedules", json=payload1)
    print("RESPONSE STATUS:", resp1.status_code)
    print("RESPONSE:", resp1.json())

    resp1_reload = await client.get(f"/api/v1/team-members/{member_id}/working-schedules")
    print("RELOAD:", resp1_reload.json())

    print("\n--- Test 3: 18:00-9:00 -> abgelehnt ---")
    payload2 = {
        "days": [
            {"is_working": True, "intervals": [{"start_time": "18:00:00", "end_time": "09:00:00"}]},
            {"is_working": False, "intervals": []},
            {"is_working": False, "intervals": []},
            {"is_working": False, "intervals": []},
            {"is_working": False, "intervals": []},
            {"is_working": False, "intervals": []},
            {"is_working": False, "intervals": []},
        ]
    }
    print("REQUEST:", payload2)
    resp2 = await client.put(f"/api/v1/team-members/{member_id}/working-schedules", json=payload2)
    print("RESPONSE STATUS:", resp2.status_code)
    print("RESPONSE:", resp2.json())

    print("\n--- Test 4: 'Arbeitet' aus ---")
    payload3 = {
        "days": [
            {"is_working": False, "intervals": []},
            {"is_working": False, "intervals": []},
            {"is_working": False, "intervals": []},
            {"is_working": False, "intervals": []},
            {"is_working": False, "intervals": []},
            {"is_working": False, "intervals": []},
            {"is_working": False, "intervals": []},
        ]
    }
    print("REQUEST:", payload3)
    resp3 = await client.put(f"/api/v1/team-members/{member_id}/working-schedules", json=payload3)
    print("RESPONSE STATUS:", resp3.status_code)

    resp3_reload = await client.get(f"/api/v1/team-members/{member_id}/working-schedules")
    print("RELOAD:", resp3_reload.json())
