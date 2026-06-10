"""phase3 booking notifications

Revision ID: 009
Revises: 008
Create Date: 2026-06-10

(a) Add cancellation_token (unique) and origin (enum, default walk_in) to appointments.
(b) Create notification_logs table with FK + index on appointment_id.
(c) D1-Fix: tstzrange constraint already corrected in migration 007 — no action needed.
(d) A1-Idempotenz: partial unique index uq_reminder_sent on notification_logs.
"""
import sqlalchemy as sa
from alembic import op


revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # (a) New columns on appointments
    appointment_origin = sa.Enum("online", "walk_in", name="appointmentorigin")
    appointment_origin.create(op.get_bind())

    op.add_column("appointments", sa.Column("cancellation_token", sa.String(), nullable=True))
    op.create_unique_constraint(
        "uq_appointments_cancellation_token", "appointments", ["cancellation_token"]
    )
    op.add_column(
        "appointments",
        sa.Column(
            "origin",
            sa.Enum("online", "walk_in", name="appointmentorigin", create_type=False),
            nullable=False,
            server_default="walk_in",
        ),
    )

    # (b) notification_logs table
    notification_kind = sa.Enum("confirmation", "reminder", name="notificationkind")
    notification_channel = sa.Enum("email", name="notificationchannel")
    notification_status = sa.Enum("sent", "failed", "skipped", name="notificationstatus")
    notification_kind.create(op.get_bind())
    notification_channel.create(op.get_bind())
    notification_status.create(op.get_bind())

    op.create_table(
        "notification_logs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("appointment_id", sa.UUID(), nullable=False),
        sa.Column(
            "kind",
            sa.Enum("confirmation", "reminder", name="notificationkind", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "channel",
            sa.Enum("email", name="notificationchannel", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum("sent", "failed", "skipped", name="notificationstatus", create_type=False),
            nullable=False,
        ),
        sa.Column("error", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["appointment_id"], ["appointments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_notification_logs_appointment_id", "notification_logs", ["appointment_id"]
    )

    # (d) Partial unique index — prevents duplicate reminders (DB-side idempotency)
    op.create_index(
        "uq_reminder_sent",
        "notification_logs",
        ["appointment_id"],
        unique=True,
        postgresql_where=sa.text("kind = 'reminder' AND status = 'sent'"),
    )


def downgrade() -> None:
    op.drop_index("uq_reminder_sent", table_name="notification_logs")
    op.drop_index("ix_notification_logs_appointment_id", table_name="notification_logs")
    op.drop_table("notification_logs")
    sa.Enum(name="notificationkind").drop(op.get_bind())
    sa.Enum(name="notificationchannel").drop(op.get_bind())
    sa.Enum(name="notificationstatus").drop(op.get_bind())

    op.drop_constraint("uq_appointments_cancellation_token", "appointments", type_="unique")
    op.drop_column("appointments", "origin")
    op.drop_column("appointments", "cancellation_token")
    sa.Enum(name="appointmentorigin").drop(op.get_bind())
