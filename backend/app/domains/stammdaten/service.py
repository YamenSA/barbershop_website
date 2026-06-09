from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.domains.stammdaten.models import (
    SalonClosure,
    SalonHours,
    Service,
    TeamMember,
    TeamMemberServiceLink,
    WorkingException,
    WorkingHours,
)
from app.domains.stammdaten.schemas import (
    SalonClosureCreate,
    SalonHoursUpdate,
    ServiceCreate,
    ServiceUpdate,
    TeamMemberCreate,
    TeamMemberUpdate,
    WorkingExceptionCreate,
    WorkingHoursUpdate,
)


class StammdatenService:
    @staticmethod
    async def create_service(session: AsyncSession, service_in: ServiceCreate) -> Service:
        service = Service.model_validate(service_in)
        session.add(service)
        await session.commit()
        await session.refresh(service)
        return service

    @staticmethod
    async def get_services(session: AsyncSession) -> List[Service]:
        statement = select(Service).where(Service.is_active == True)
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
    async def get_team_members(session: AsyncSession) -> List[TeamMember]:
        statement = select(TeamMember).where(TeamMember.is_active == True)
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
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Salon hours not found"
            )
        
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
        closure = SalonClosure.model_validate(closure_in)
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
    async def update_working_hours(
        session: AsyncSession, member_id: UUID, day_of_week: int, hours_in: WorkingHoursUpdate
    ) -> WorkingHours:
        statement = select(WorkingHours).where(
            WorkingHours.team_member_id == member_id,
            WorkingHours.day_of_week == day_of_week
        )
        result = await session.execute(statement)
        hours = result.scalar_one_or_none()
        
        if not hours:
            hours = WorkingHours(
                team_member_id=member_id,
                day_of_week=day_of_week,
                start_time=hours_in.start_time,
                end_time=hours_in.end_time
            )
        else:
            update_data = hours_in.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(hours, key, value)
        
        session.add(hours)
        await session.commit()
        await session.refresh(hours)
        return hours

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
