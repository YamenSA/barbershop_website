"""phase2 salon profile

Revision ID: 008
Revises: 007
Create Date: 2026-06-10 10:00:00.000000

"""
import uuid
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'salon_profile',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('street', sa.String(), nullable=False),
        sa.Column('postal_code', sa.String(), nullable=False),
        sa.Column('city', sa.String(), nullable=False),
        sa.Column('country', sa.String(), nullable=False, server_default='DE'),
        sa.Column('phone', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_salon_profile_id'), 'salon_profile', ['id'], unique=False)

    profile_id = str(uuid.uuid4())
    op.execute(
        sa.text(
            "INSERT INTO salon_profile "
            "(id, name, street, postal_code, city, country, phone, created_at, updated_at) "
            "VALUES (CAST(:id AS uuid), :name, :street, :postal_code, :city, :country, :phone, NOW(), NOW())"
        ).bindparams(
            id=profile_id,
            name="Azzam Barbershop",
            street="Sielower Ch 38",
            postal_code="03044",
            city="Cottbus",
            country="DE",
            phone="+49 355 1234567",
        )
    )


def downgrade() -> None:
    op.drop_index(op.f('ix_salon_profile_id'), table_name='salon_profile')
    op.drop_table('salon_profile')
