"""update address and hours

Revision ID: 010
Revises: 009
Create Date: 2026-06-10 14:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Update Salon Profile
    op.execute(
        "UPDATE salon_profile SET "
        "street = 'Sielower Ch 38', "
        "postal_code = '03044', "
        "city = 'Cottbus', "
        "phone = '+49 355 1234567'"
    )
    
    # Update Salon Hours: set Sunday (6) to closed
    op.execute(
        "UPDATE salon_hours SET is_open = false WHERE day_of_week = 6"
    )


def downgrade() -> None:
    # Revert to Berlin default
    op.execute(
        "UPDATE salon_profile SET "
        "street = 'Musterstraße 1', "
        "postal_code = '10115', "
        "city = 'Berlin', "
        "phone = '+49 30 1234567'"
    )
    
    # Revert Sunday to open
    op.execute(
        "UPDATE salon_hours SET is_open = true WHERE day_of_week = 6"
    )
