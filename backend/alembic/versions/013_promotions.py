"""promotions table

Revision ID: 013
Revises: 012
Create Date: 2026-06-13

Create 'promotions' table for marketing domain.
"""
import sqlalchemy as sa
from alembic import op

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "promotions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=False),
        sa.Column("starts_on", sa.Date(), nullable=False),
        sa.Column("ends_on", sa.Date(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_promotions_id", "promotions", ["id"], unique=False)
    op.create_index("ix_promotions_starts_on", "promotions", ["starts_on"])
    op.create_index("ix_promotions_ends_on", "promotions", ["ends_on"])


def downgrade() -> None:
    op.drop_index("ix_promotions_ends_on", table_name="promotions")
    op.drop_index("ix_promotions_starts_on", table_name="promotions")
    op.drop_index("ix_promotions_id", table_name="promotions")
    op.drop_table("promotions")
