from datetime import date, datetime, time, timedelta, timezone
from io import BytesIO
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from fpdf import FPDF
from fpdf.enums import XPos, YPos
from sqlalchemy.orm import selectinload
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import get_session
from app.domains.auth.dependencies import get_current_admin
from app.domains.booking.models import Appointment, AppointmentStatus
from app.domains.booking.schemas import DashboardResponse, AppointmentSummary, WorkingMemberSummary
from app.domains.stammdaten.models import (
    DayOverride,
    SalonClosure,
    SalonHours,
    TeamMember,
    WorkingDaySchedule,
    WorkingHours,
    Service,
)

router = APIRouter(prefix="/admin", dependencies=[Depends(get_current_admin)])


async def _get_working_today(session: AsyncSession, target: date) -> List[WorkingMemberSummary]:
    weekday = target.weekday()

    closure_stmt = select(SalonClosure).where(SalonClosure.date == target)
    if (await session.execute(closure_stmt)).first():
        return []

    salon_stmt = select(SalonHours).where(SalonHours.day_of_week == weekday)
    salon_hours = (await session.execute(salon_stmt)).scalar_one_or_none()
    if not salon_hours or not salon_hours.is_open:
        return []

    members_stmt = select(TeamMember).where(TeamMember.is_active == True)
    members = (await session.execute(members_stmt)).scalars().all()

    result: List[WorkingMemberSummary] = []
    for member in members:
        override_stmt = select(DayOverride).where(
            DayOverride.team_member_id == member.id,
            DayOverride.date == target,
        )
        override = (await session.execute(override_stmt)).scalar_one_or_none()

        if override:
            if override.override_type == "day_off":
                continue
            eff_start = override.custom_start_time
            eff_end = override.custom_end_time
        else:
            sched_stmt = select(WorkingDaySchedule).where(
                WorkingDaySchedule.team_member_id == member.id,
                WorkingDaySchedule.day_of_week == weekday,
            )
            schedule = (await session.execute(sched_stmt)).scalar_one_or_none()
            if not schedule or not schedule.is_working or not schedule.intervals:
                continue
            # Combine all intervals into an effective range for the summary
            eff_start = min(iv.start_time for iv in schedule.intervals)
            eff_end = max(iv.end_time for iv in schedule.intervals)

        start = max(salon_hours.open_time, eff_start)
        end = min(salon_hours.close_time, eff_end)
        if start >= end:
            continue

        result.append(
            WorkingMemberSummary(
                team_member_id=member.id,
                name=member.name,
                start_time=start.strftime("%H:%M"),
                end_time=end.strftime("%H:%M"),
            )
        )

    return result


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    date: Optional[date] = Query(default=None),
    session: AsyncSession = Depends(get_session),
):
    target = date or datetime.now(timezone.utc).date()

    from_dt = datetime.combine(target, time.min, tzinfo=timezone.utc)
    to_dt = datetime.combine(target + timedelta(days=1), time.min, tzinfo=timezone.utc)

    appt_stmt = (
        select(Appointment)
        .options(selectinload(Appointment.customer))
        .where(
            Appointment.status == AppointmentStatus.confirmed,
            Appointment.starts_at >= from_dt,
            Appointment.starts_at < to_dt,
        )
        .order_by(Appointment.starts_at)
    )
    appts = (await session.execute(appt_stmt)).scalars().all()

    working_today = await _get_working_today(session, target)

    return DashboardResponse(
        date=target.isoformat(),
        appointments=[AppointmentSummary.model_validate(a) for a in appts],
        working_today=working_today,
    )


@router.get("/daily-plan/pdf")
async def daily_plan_pdf(
    date: date = Query(...),
    team_member_id: Optional[UUID] = Query(default=None),
    include_notes: bool = Query(default=False),
    session: AsyncSession = Depends(get_session),
):
    from_dt = datetime.combine(date, time.min, tzinfo=timezone.utc)
    to_dt = datetime.combine(date + timedelta(days=1), time.min, tzinfo=timezone.utc)

    appt_stmt = (
        select(Appointment)
        .options(selectinload(Appointment.customer))
        .where(
            Appointment.starts_at >= from_dt,
            Appointment.starts_at < to_dt,
        )
        .order_by(Appointment.starts_at)
    )
    if team_member_id:
        appt_stmt = appt_stmt.where(Appointment.team_member_id == team_member_id)

    appts = (await session.execute(appt_stmt)).scalars().all()

    # Lookup maps
    service_ids = {a.service_id for a in appts}
    member_ids = {a.team_member_id for a in appts}

    svc_map: dict[UUID, str] = {}
    if service_ids:
        svcs = (await session.execute(select(Service).where(Service.id.in_(service_ids)))).scalars().all()
        svc_map = {s.id: s.name for s in svcs}

    member_map: dict[UUID, str] = {}
    if member_ids:
        mems = (await session.execute(select(TeamMember).where(TeamMember.id.in_(member_ids)))).scalars().all()
        member_map = {m.id: m.name for m in mems}

    # Build PDF — compression disabled so content is text-searchable in tests
    pdf = FPDF()
    pdf.compress = False
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(
        0, 10, f"Tagesplan - {date.strftime('%d.%m.%Y')}",
        new_x=XPos.LMARGIN, new_y=YPos.NEXT,
    )
    pdf.ln(2)

    pdf.set_font("Helvetica", "B", 9)
    col_w = [25, 55, 45, 55]
    headers = ["Uhrzeit", "Dienstleistung", "Stylist", "Kunde"]
    if include_notes:
        col_w = [22, 45, 38, 45, 40]
        headers.append("Notiz")

    for i, h in enumerate(headers):
        pdf.cell(col_w[i], 7, h, border=1)
    pdf.ln()

    pdf.set_font("Helvetica", "", 8)
    for a in appts:
        local_time = a.starts_at.strftime("%H:%M")
        service_name = svc_map.get(a.service_id, str(a.service_id))
        stylist = member_map.get(a.team_member_id, str(a.team_member_id))
        customer = a.guest_name or a.customer_name or "–"

        row = [local_time, service_name, stylist, customer]
        if include_notes:
            row.append(a.notes or "")

        for i, val in enumerate(row):
            pdf.cell(col_w[i], 6, val[:30], border=1)
        pdf.ln()

    buf = BytesIO(bytes(pdf.output()))
    filename = f"tagesplan-{date.isoformat()}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
