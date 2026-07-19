from datetime import date, datetime, timezone, time as time_type
from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.domains.stammdaten.models import (
    DayOverride,
    SalonClosure,
    SalonHours,
    SalonProfile,
    Service,
    TeamMember,
    TeamMemberServiceLink,
    WorkingException,
    WorkingHours,
)
from app.domains.stammdaten.schemas import (
    DayOverrideCreate,
    SalonClosureCreate,
    SalonHoursUpdate,
    SalonProfileUpdate,
    ServiceCreate,
    ServiceUpdate,
    TeamMemberCreate,
    TeamMemberUpdate,
    WorkingExceptionCreate,
    WorkingHoursUpdate,
    WorkingDayScheduleIn,
    WorkingWeekScheduleIn,
)


class StammdatenService:
    @staticmethod
    async def create_service(session: AsyncSession, service_in: ServiceCreate) -> Service:
        if service_in.target_group is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="target_group cannot be null"
            )
        if service_in.service_kind is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="service_kind cannot be null"
            )
        service = Service.model_validate(service_in)
        session.add(service)
        await session.commit()
        await session.refresh(service)
        return service

    @staticmethod
    async def get_services(session: AsyncSession, active_only: bool = True) -> List[Service]:
        statement = select(Service)
        if active_only:
            statement = statement.where(Service.is_active == True)
        results = await session.execute(statement)
        return results.scalars().all()

    @staticmethod
    async def get_service(session: AsyncSession, service_id: UUID) -> Service:
        service = await session.get(Service, service_id)
        if not service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Service not found"
            )
        return service

    @staticmethod
    async def update_service(
        session: AsyncSession, service_id: UUID, service_in: ServiceUpdate
    ) -> Service:
        service = await StammdatenService.get_service(session, service_id)
        update_data = service_in.model_dump(exclude_unset=True)
        if "target_group" in update_data and update_data["target_group"] is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="target_group cannot be null"
            )
        if "service_kind" in update_data and update_data["service_kind"] is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="service_kind cannot be null"
            )
        for key, value in update_data.items():
            setattr(service, key, value)
        session.add(service)
        await session.commit()
        await session.refresh(service)
        return service

    @staticmethod
    async def deactivate_service(session: AsyncSession, service_id: UUID) -> None:
        service = await StammdatenService.get_service(session, service_id)
        service.is_active = False
        session.add(service)
        await session.commit()

    @staticmethod
    async def create_team_member(
        session: AsyncSession, member_in: TeamMemberCreate
    ) -> TeamMember:
        member = TeamMember.model_validate(member_in)
        session.add(member)
        await session.commit()
        await session.refresh(member)
        return member

    @staticmethod
    async def get_team_members(session: AsyncSession, active_only: bool = True) -> List[TeamMember]:
        statement = select(TeamMember)
        if active_only:
            statement = statement.where(TeamMember.is_active == True)
        results = await session.execute(statement)
        return results.scalars().all()

    @staticmethod
    async def get_team_member(session: AsyncSession, member_id: UUID) -> TeamMember:
        member = await session.get(TeamMember, member_id)
        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Team member not found"
            )
        return member

    @staticmethod
    async def update_team_member(
        session: AsyncSession, member_id: UUID, member_in: TeamMemberUpdate
    ) -> TeamMember:
        member = await StammdatenService.get_team_member(session, member_id)
        update_data = member_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(member, key, value)
        session.add(member)
        await session.commit()
        await session.refresh(member)
        return member

    @staticmethod
    async def assign_services(
        session: AsyncSession, member_id: UUID, service_ids: List[UUID]
    ) -> TeamMember:
        member = await StammdatenService.get_team_member(session, member_id)
        
        # Remove existing links
        delete_stmt = select(TeamMemberServiceLink).where(
            TeamMemberServiceLink.team_member_id == member_id
        )
        existing_links = await session.execute(delete_stmt)
        for link in existing_links.scalars().all():
            await session.delete(link)

        # Add new links
        for s_id in service_ids:
            link = TeamMemberServiceLink(team_member_id=member_id, service_id=s_id)
            session.add(link)
        
        await session.commit()
        await session.refresh(member)
        return member

    @staticmethod
    async def get_salon_hours(session: AsyncSession) -> List[SalonHours]:
        statement = select(SalonHours).order_by(SalonHours.day_of_week)
        results = await session.execute(statement)
        return results.scalars().all()

    @staticmethod
    async def update_salon_hours(
        session: AsyncSession, day_of_week: int, hours_in: SalonHoursUpdate
    ) -> SalonHours:
        statement = select(SalonHours).where(SalonHours.day_of_week == day_of_week)
        result = await session.execute(statement)
        hours = result.scalar_one_or_none()
        if not hours:
            hours = SalonHours(day_of_week=day_of_week)

        update_data = hours_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(hours, key, value)

        session.add(hours)
        await session.commit()
        await session.refresh(hours)
        return hours

    @staticmethod
    async def create_salon_closure(
        session: AsyncSession, closure_in: SalonClosureCreate
    ) -> SalonClosure:
        from datetime import datetime, timezone, time as time_type
        from app.domains.booking.models import Appointment, AppointmentStatus

        if not closure_in.force:
            day_start = datetime.combine(closure_in.date, time_type.min).replace(tzinfo=timezone.utc)
            day_end = datetime.combine(closure_in.date, time_type.max).replace(tzinfo=timezone.utc)
            stmt = select(Appointment).where(
                Appointment.status == AppointmentStatus.confirmed,
                Appointment.starts_at >= day_start,
                Appointment.starts_at <= day_end,
            )
            result = await session.execute(stmt)
            conflicting = result.scalars().all()
            if conflicting:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail={
                        "code": "CLOSURE_CONFLICT_WARNING",
                        "conflicting_appointment_count": len(conflicting),
                        "requires_confirmation": True,
                    },
                )

        closure = SalonClosure(date=closure_in.date, reason=closure_in.reason)
        session.add(closure)
        await session.commit()
        await session.refresh(closure)
        return closure

    @staticmethod
    async def get_salon_closures(session: AsyncSession) -> List[SalonClosure]:
        statement = select(SalonClosure).order_by(SalonClosure.date)
        results = await session.execute(statement)
        return results.scalars().all()

    @staticmethod
    async def delete_salon_closure(session: AsyncSession, closure_id: UUID) -> None:
        closure = await session.get(SalonClosure, closure_id)
        if not closure:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Salon closure not found"
            )
        await session.delete(closure)
        await session.commit()

    @staticmethod
    async def get_working_day_schedules(
        session: AsyncSession, member_id: UUID
    ) -> List["WorkingDaySchedule"]:
        """Alle 7 Tagespläne eines Mitarbeiters (ggf. leer für nicht konfigurierte Tage)."""
        from app.domains.stammdaten.models import WorkingDaySchedule
        statement = (
            select(WorkingDaySchedule)
            .where(WorkingDaySchedule.team_member_id == member_id)
            .order_by(WorkingDaySchedule.day_of_week)
        )
        result = await session.execute(statement)
        return result.scalars().all()

    @staticmethod
    async def update_working_day_schedule(
        session: AsyncSession, member_id: UUID, day_of_week: int,
        schedule_in: "WorkingDayScheduleIn"
    ) -> "WorkingDaySchedule":
        """Upsert: Setzt den Tagesplan für einen Mitarbeiter an einem Wochentag."""
        from app.domains.stammdaten.models import WorkingDaySchedule, WorkingInterval

        statement = select(WorkingDaySchedule).where(
            WorkingDaySchedule.team_member_id == member_id,
            WorkingDaySchedule.day_of_week == day_of_week,
        )
        result = await session.execute(statement)
        schedule = result.scalar_one_or_none()

        if not schedule:
            schedule = WorkingDaySchedule(
                team_member_id=member_id,
                day_of_week=day_of_week,
                is_working=schedule_in.is_working,
            )
            session.add(schedule)
            await session.flush()  # need the ID for intervals
        else:
            schedule.is_working = schedule_in.is_working
            # Remove old intervals
            for old_interval in list(schedule.intervals):
                await session.delete(old_interval)
            await session.flush()

        # Add new intervals
        if schedule_in.is_working:
            for i, iv in enumerate(sorted(schedule_in.intervals, key=lambda x: x.start_time)):
                interval = WorkingInterval(
                    schedule_id=schedule.id,
                    start_time=iv.start_time,
                    end_time=iv.end_time,
                    sort_order=i,
                )
                session.add(interval)

        await session.commit()
        await session.refresh(schedule)
        return schedule

    @staticmethod
    async def update_working_week_schedule(
        session: AsyncSession, member_id: UUID,
        week_in: "WorkingWeekScheduleIn"
    ) -> List["WorkingDaySchedule"]:
        """Bulk-Update: Setzt alle 7 Tagespläne auf einmal."""
        from app.domains.stammdaten.schemas import WorkingDayScheduleIn
        results = []
        for day_index, day_schedule in enumerate(week_in.days):
            result = await StammdatenService.update_working_day_schedule(
                session, member_id, day_index, day_schedule
            )
            results.append(result)
        return results

    @staticmethod
    async def create_working_exception(
        session: AsyncSession, member_id: UUID, exception_in: WorkingExceptionCreate
    ) -> WorkingException:
        exception = WorkingException.model_validate(exception_in)
        exception.team_member_id = member_id
        session.add(exception)
        await session.commit()
        await session.refresh(exception)
        return exception

    @staticmethod
    async def get_working_exceptions(
        session: AsyncSession, member_id: UUID
    ) -> List[WorkingException]:
        statement = select(WorkingException).where(
            WorkingException.team_member_id == member_id
        ).order_by(WorkingException.starts_at)
        results = await session.execute(statement)
        return results.scalars().all()

    @staticmethod
    async def delete_working_exception(session: AsyncSession, exception_id: UUID) -> None:
        exception = await session.get(WorkingException, exception_id)
        if not exception:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Working exception not found"
            )
        await session.delete(exception)
        await session.commit()

    @staticmethod
    async def list_day_overrides(
        session: AsyncSession,
        member_id: UUID,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None
    ) -> List[DayOverride]:
        statement = select(DayOverride).where(DayOverride.team_member_id == member_id)
        if from_date:
            statement = statement.where(DayOverride.date >= from_date)
        if to_date:
            statement = statement.where(DayOverride.date <= to_date)
        statement = statement.order_by(DayOverride.date)
        results = await session.execute(statement)
        return results.scalars().all()

    @staticmethod
    async def create_day_override(
        session: AsyncSession, member_id: UUID, override_in: DayOverrideCreate
    ) -> DayOverride:
        # Check for duplicate date
        statement = select(DayOverride).where(
            DayOverride.team_member_id == member_id,
            DayOverride.date == override_in.date
        )
        result = await session.execute(statement)
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An override already exists for member {member_id} on {override_in.date}"
            )

        override = DayOverride.model_validate(override_in)
        override.team_member_id = member_id
        session.add(override)
        await session.commit()
        await session.refresh(override)
        return override

    @staticmethod
    async def delete_day_override(session: AsyncSession, override_id: UUID) -> None:
        override = await session.get(DayOverride, override_id)
        if not override:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Day override not found"
            )
        await session.delete(override)
        await session.commit()

    # --- Salon Profile ---

    @staticmethod
    async def get_salon_profile(session: AsyncSession) -> SalonProfile:
        result = await session.execute(select(SalonProfile))
        profile = result.scalar_one_or_none()
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Salon profile not found"
            )
        return profile

    @staticmethod
    async def update_salon_profile(
        session: AsyncSession, profile_in: SalonProfileUpdate
    ) -> SalonProfile:
        profile = await StammdatenService.get_salon_profile(session)
        update_data = profile_in.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(profile, key, value)
        session.add(profile)
        await session.commit()
        await session.refresh(profile)
        return profile

    @staticmethod
    async def get_public_salon_hours(session: AsyncSession) -> List[SalonHours]:
        statement = select(SalonHours).order_by(SalonHours.day_of_week)
        results = await session.execute(statement)
        return results.scalars().all()

    @staticmethod
    async def get_active_services_public(session: AsyncSession) -> List[Service]:
        statement = select(Service).where(Service.is_active == True).order_by(Service.name)
        results = await session.execute(statement)
        return results.scalars().all()

    @staticmethod
    async def get_active_team_public(session: AsyncSession) -> List[dict]:
        member_stmt = (
            select(TeamMember)
            .where(TeamMember.is_active == True)
            .order_by(TeamMember.name)
        )
        member_results = await session.execute(member_stmt)
        members = member_results.scalars().all()

        out = []
        for member in members:
            svc_stmt = (
                select(Service)
                .join(TeamMemberServiceLink, Service.id == TeamMemberServiceLink.service_id)
                .where(TeamMemberServiceLink.team_member_id == member.id)
                .where(Service.is_active == True)
                .order_by(Service.name)
            )
            svc_results = await session.execute(svc_stmt)
            active_services = svc_results.scalars().all()
            out.append({
                "id": member.id,
                "name": member.name,
                "bio": member.bio,
                "photo_url": member.photo_url,
                "services": [{"id": s.id, "name": s.name} for s in active_services],
            })
        return out
