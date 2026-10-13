"""Persist server-owned service snapshots for combined appointments.

Revision ID: 018
Revises: 017
No timestamp or existing appointment values are rewritten.
"""
import sqlalchemy as sa
from alembic import op

revision = "018"
down_revision = "017"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("appointments", sa.Column("service_selection", sa.JSON(none_as_null=True), nullable=True))


def downgrade():
    # A code rollback can leave the additive column in place. Dropping it after
    # combined bookings would destroy their details, so require an empty column.
    connection = op.get_bind()
    if connection.execute(sa.text("SELECT 1 FROM appointments WHERE service_selection IS NOT NULL AND CAST(service_selection AS TEXT) <> 'null' LIMIT 1")).first():
        raise RuntimeError("Migration 018 enthält Buchungsdetails; erst sichern, keine automatische Löschung")
    op.drop_column("appointments", "service_selection")
