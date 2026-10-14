"""Combined visits: real scheduling/transactions, isolated test DB and no mail I/O."""
from datetime import time, timedelta
from uuid import UUID, uuid4

import pytest
from sqlalchemy import func
from sqlmodel import select

from app.core.time import combine_local, salon_today
from app.domains.booking.models import Appointment, Customer
from app.domains.stammdaten.models import (
    Service, TeamMember, TeamMemberServiceLink, SalonHours,
    WorkingDaySchedule, WorkingInterval, SalonClosure,
)

BASE = "/api/v1/public/booking"


@pytest.fixture
async def combined(session, monkeypatch):
    mails = []
    monkeypatch.setattr("app.domains.notifications.service.send_email", mails.append)
    services = [Service(name="Schnitt", duration_minutes=30, price_cents=2000),
                Service(name="Bart", duration_minutes=45, price_cents=1500, price_is_from=True)]
    members = [TeamMember(name="Alle Leistungen"), TeamMember(name="Nur Schnitt")]
    session.add_all(services + members)
    await session.flush()
    for member in members:
        for service in services if member == members[0] else services[:1]:
            session.add(TeamMemberServiceLink(team_member_id=member.id, service_id=service.id))
        for weekday in range(7):
            schedule = WorkingDaySchedule(team_member_id=member.id, day_of_week=weekday, is_working=True)
            session.add(schedule)
            await session.flush()
            session.add_all([
                WorkingInterval(schedule_id=schedule.id, start_time=time(9), end_time=time(11)),
                WorkingInterval(schedule_id=schedule.id, start_time=time(11, 30), end_time=time(18), sort_order=1),
            ])
    for weekday in range(7):
        session.add(SalonHours(day_of_week=weekday, is_open=True, open_time=time(9), close_time=time(18)))
    await session.commit()
    return {"services": services, "members": members, "day": salon_today() + timedelta(days=7), "mails": mails}


def params(data, **extra):
    return [("date", data["day"].isoformat()),
            *(("service_ids", str(s.id)) for s in data["services"]),
            *extra.items()]


def payload(data, **extra):
    return {"service_ids": [str(s.id) for s in data["services"]],
            "starts_at": combine_local(data["day"], time(12)).isoformat(),
            "customer": {"name": "Testgast", "email": "combined@example.com"},
            "privacy_acknowledged": True, **extra}


async def test_combined_slots_cover_full_duration_and_staff_intersection(public_client, combined):
    response = await public_client.get(BASE + "/availability", params=params(combined))
    assert response.status_code == 200
    slots = response.json()["slots"]
    assert slots
    from datetime import datetime
    for slot in slots:
        assert slot["team_member_id"] == str(combined["members"][0].id)
        start, end = map(datetime.fromisoformat, (slot["starts_at"], slot["ends_at"]))
        assert end - start == timedelta(minutes=75)
        assert not (start.time() < time(11, 30) and end.time() > time(11))
        assert end.time() <= time(18)


async def test_combined_booking_persists_snapshot_mail_and_cancellation(public_client, combined, session):
    response = await public_client.post(BASE + "/appointments", json=payload(combined))
    assert response.status_code == 201
    result = response.json()
    assert [s["name"] for s in result["selected_services"]] == ["Schnitt", "Bart"]
    assert sum(s["price_cents"] for s in result["selected_services"]) == 3500
    appointment = await session.get(Appointment, UUID(result["id"]))
    assert appointment.ends_at - appointment.starts_at == timedelta(minutes=75)
    assert appointment.team_member_id == combined["members"][0].id
    assert len(combined["mails"]) == 1
    assert "Schnitt" in combined["mails"][0].html_body and "Bart" in combined["mails"][0].html_body
    cancel = await public_client.get(BASE + "/cancel/" + result["cancellation_token"])
    assert cancel.status_code == 200
    assert cancel.json()["service_name"] == "Schnitt + Bart"
    cancelled = await public_client.post(BASE + "/cancel/" + result["cancellation_token"])
    assert cancelled.status_code == 200 and cancelled.json()["status"] == "cancelled"


@pytest.mark.parametrize("change", ["duplicate", "empty", "unknown", "mixed_contract", "inactive"])
async def test_invalid_selection_rejected_before_customer_write(public_client, combined, session, change):
    data = payload(combined)
    if change == "duplicate":
        data["service_ids"] *= 2
    elif change == "empty":
        data["service_ids"] = []
    elif change == "unknown":
        data["service_ids"] = [str(uuid4())]
    elif change == "mixed_contract":
        data["service_id"] = data["service_ids"][0]
    else:
        combined["services"][1].is_active = False
        session.add(combined["services"][1])
        await session.commit()
    response = await public_client.post(BASE + "/appointments", json=data)
    assert response.status_code in (404, 422)
    assert await session.scalar(select(func.count()).select_from(Customer)) == 0


@pytest.mark.parametrize("invalid", ["ineligible", "break", "closing", "closed"])
async def test_unavailable_combination_cannot_be_forged(public_client, combined, session, invalid):
    data = payload(combined)
    if invalid == "ineligible":
        data["team_member_id"] = str(combined["members"][1].id)
    elif invalid == "break":
        data["starts_at"] = combine_local(combined["day"], time(10)).isoformat()
    elif invalid == "closing":
        data["starts_at"] = combine_local(combined["day"], time(17)).isoformat()
    else:
        session.add(SalonClosure(date=combined["day"], reason="Test-Schließung"))
        await session.commit()
    response = await public_client.post(BASE + "/appointments", json=data)
    assert response.status_code == 409
    assert await session.scalar(select(func.count()).select_from(Customer)) == 0


async def test_combination_blocks_tail_and_double_booking(public_client, combined):
    first = await public_client.post(BASE + "/appointments", json=payload(combined))
    assert first.status_code == 201
    # Second visit overlaps only the extra service, after the original 30 min.
    second = await public_client.post(BASE + "/appointments", json=payload(combined,
        starts_at=combine_local(combined["day"], time(12, 45)).isoformat()))
    assert second.status_code == 409


async def test_admin_move_preserves_booked_duration_despite_price_list_change(public_client, client, combined, session):
    first = await public_client.post(BASE + "/appointments", json=payload(combined))
    assert first.status_code == 201
    for service in combined["services"]:
        service.duration_minutes = 5
        service.price_cents = 999
        session.add(service)
    await session.commit()
    moved = await client.patch("/api/v1/appointments/" + first.json()["id"], json={
        "starts_at": combine_local(combined["day"], time(14)).isoformat()})
    assert moved.status_code == 200
    from datetime import datetime
    assert datetime.fromisoformat(moved.json()["ends_at"]) - datetime.fromisoformat(moved.json()["starts_at"]) == timedelta(minutes=75)
    assert sum(s["price_cents"] for s in moved.json()["selected_services"]) == 3500
    invalid = await client.patch("/api/v1/appointments/" + first.json()["id"], json={
        "team_member_id": str(combined["members"][1].id)})
    assert invalid.status_code == 409


async def test_account_move_preserves_combination_and_customer_list(public_client, combined, session):
    from app.domains.booking.service import list_customer_appointments, reschedule_appointment
    first = await public_client.post(BASE + "/appointments", json=payload(combined))
    assert first.status_code == 201
    appointment = await session.get(Appointment, UUID(first.json()["id"]))
    account = await list_customer_appointments(session, appointment.customer_id)
    assert account.upcoming[0].service_name == "Schnitt + Bart"
    moved = await reschedule_appointment(session, appointment.customer_id, appointment.id,
                                       combine_local(combined["day"], time(14)), None)
    assert moved.service_name == "Schnitt + Bart"
    assert moved.ends_at - moved.starts_at == timedelta(minutes=75)
    replacement = await session.get(Appointment, moved.id)
    assert replacement.service_selection == appointment.service_selection


async def test_calendar_pdf_and_reminder_show_all_services(public_client, client, combined, session):
    from app.domains.notifications.service import send_reminder
    first = await public_client.post(BASE + "/appointments", json=payload(combined))
    assert first.status_code == 201
    appointment = await session.get(Appointment, UUID(first.json()["id"]))
    await send_reminder(session, appointment)
    assert "Schnitt" in combined["mails"][-1].html_body and "Bart" in combined["mails"][-1].html_body
    listed = await client.get("/api/v1/appointments")
    assert listed.json()[0]["service_names"] == ["Schnitt", "Bart"]
    pdf = await client.get("/api/v1/admin/daily-plan/pdf", params={"date": combined["day"].isoformat()})
    assert pdf.status_code == 200
    assert b"Schnitt + Bart" in pdf.content
    # Long descriptions must not hide the second service behind truncation.
    snapshot = [dict(s) for s in appointment.service_selection]
    snapshot[0]["name"] = "Sehr lange Leistungsbeschreibung " * 5
    snapshot[1]["name"] = "ZUSATZ-SERVICE"
    appointment.service_selection = snapshot
    session.add(appointment)
    await session.commit()
    complete_pdf = await client.get("/api/v1/admin/daily-plan/pdf", params={"date": combined["day"].isoformat()})
    assert complete_pdf.status_code == 200 and b"ZUSATZ-SERVICE" in complete_pdf.content


async def test_public_days_hide_closure_reasons(public_client, combined, session):
    session.add(SalonClosure(date=combined["day"], reason="Interner Testgrund"))
    await session.commit()
    response = await public_client.get(BASE + "/days", params={"from_date": combined["day"].isoformat(),
                                                              "to_date": combined["day"].isoformat()})
    assert response.json() == [{"date": combined["day"].isoformat(), "is_open": False}]


async def test_changed_quote_rejected_without_customer_or_appointment(public_client, combined, session):
    response = await public_client.post(BASE + "/appointments", json=payload(combined,
        expected_total_price_cents=1, expected_total_duration_minutes=75))
    assert response.status_code == 409 and response.json()["detail"] == "SELECTION_CHANGED"
    assert await session.scalar(select(func.count()).select_from(Customer)) == 0
    assert await session.scalar(select(func.count()).select_from(Appointment)) == 0


@pytest.mark.postgres
async def test_pg_combined_booking_snapshot_and_tail_constraint(public_client, combined, session):
    from sqlalchemy.exc import IntegrityError
    first = await public_client.post(BASE + "/appointments", json=payload(combined))
    assert first.status_code == 201
    appointment = await session.get(Appointment, UUID(first.json()["id"]))
    assert len(appointment.service_selection) == 2
    import subprocess
    import sys
    from sqlalchemy import text
    downgrade = subprocess.run([sys.executable, "-m", "alembic", "downgrade", "017"], capture_output=True, text=True)
    assert downgrade.returncode != 0 and "Buchungsdetails" in downgrade.stderr
    assert await session.scalar(text("SELECT version_num FROM alembic_version")) == "018"
    # Bypass the application precheck to exercise the real DB guarantee over
    # the portion covered only by the second service.
    conflict = Appointment(team_member_id=appointment.team_member_id, service_id=appointment.service_id,
                           customer_id=appointment.customer_id,
                           starts_at=combine_local(combined["day"], time(12, 45)),
                           ends_at=combine_local(combined["day"], time(13, 15)))
    session.add(conflict)
    with pytest.raises(IntegrityError, match="no_overlapping_confirmed_appointments"):
        await session.commit()
    await session.rollback()
