"""customer account

Revision ID: 011
Revises: 010
Create Date: 2026-06-10

Add hashed_password and email_verified_at to customers; create customer_tokens table.
"""
import sqlalchemy as sa
from alembic import op

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("customers", sa.Column("hashed_password", sa.String(), nullable=True))
    op.add_column(
        "customers",
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "customer_tokens",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("customer_id", sa.UUID(), nullable=False),
        sa.Column("token_hash", sa.String(), nullable=False),
        sa.Column(
            "purpose",
            sa.Enum("email_verification", "password_reset", name="tokenpurpose", create_type=True),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_customer_tokens_customer_id", "customer_tokens", ["customer_id"])
    op.create_index("ix_customer_tokens_token_hash", "customer_tokens", ["token_hash"])


def downgrade() -> None:
    op.drop_index("ix_customer_tokens_token_hash", table_name="customer_tokens")
    op.drop_index("ix_customer_tokens_customer_id", table_name="customer_tokens")
    op.drop_table("customer_tokens")
    sa.Enum(name="tokenpurpose").drop(op.get_bind())
    op.drop_column("customers", "email_verified_at")
    op.drop_column("customers", "hashed_password")
