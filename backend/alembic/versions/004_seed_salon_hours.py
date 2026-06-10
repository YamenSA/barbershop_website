"""seed salon hours

Revision ID: 004
Revises: 003
Create Date: 2026-06-09 13:05:00.000000

"""
from datetime import time
import uuid
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Seed salon hours for Mo-So (0-6)
    # Using raw SQL for the seed
    for day in range(7):
        id_ = str(uuid.uuid4())
        is_open = "true" if day < 6 else "false"
        op.execute(
            f"INSERT INTO salon_hours (id, day_of_week, is_open, open_time, close_time) "
            f"VALUES ('{id_}', {day}, {is_open}, '09:00:00', '18:00:00')"
        )


def downgrade() -> None:
    op.execute("DELETE FROM salon_hours")
