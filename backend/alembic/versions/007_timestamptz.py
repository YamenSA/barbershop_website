"""convert timestamp columns to timezone-aware

Revision ID: 007
Revises: 006
Create Date: 2026-06-09 20:05:00.000000

The application consistently works with timezone-aware UTC datetimes, but the
columns were created as TIMESTAMP WITHOUT TIME ZONE. On PostgreSQL (asyncpg)
this rejects aware datetimes. Convert all such columns to TIMESTAMPTZ,
interpreting the existing naive values as UTC.
"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


# table -> list of timestamp columns
COLUMNS = {
    "admin_accounts": ["created_at", "updated_at"],
    "appointments": ["created_at", "updated_at", "starts_at", "ends_at"],
    "customers": ["created_at", "updated_at", "anonymized_at", "last_active_at"],
    "day_overrides": ["created_at"],
    "salon_closures": ["created_at", "updated_at"],
    "services": ["created_at", "updated_at"],
    "team_members": ["created_at", "updated_at"],
    "working_exceptions": ["created_at", "updated_at", "starts_at", "ends_at"],
}


def upgrade() -> None:
    # The double-booking exclusion constraint uses tsrange() which requires
    # plain timestamp columns. Drop it before altering the column types.
    op.execute(
        "ALTER TABLE appointments "
        "DROP CONSTRAINT no_overlapping_confirmed_appointments"
    )

    for table, columns in COLUMNS.items():
        for col in columns:
            op.execute(
                f"ALTER TABLE {table} ALTER COLUMN {col} "
                f"TYPE TIMESTAMPTZ USING {col} AT TIME ZONE 'UTC'"
            )

    # Recreate the constraint using tstzrange for the now timezone-aware columns.
    op.execute("""
        ALTER TABLE appointments
        ADD CONSTRAINT no_overlapping_confirmed_appointments
        EXCLUDE USING GIST (
            team_member_id WITH =,
            tstzrange(starts_at, ends_at, '[)') WITH &&
        ) WHERE (status = 'confirmed')
    """)


def downgrade() -> None:
    op.execute(
        "ALTER TABLE appointments "
        "DROP CONSTRAINT no_overlapping_confirmed_appointments"
    )

    for table, columns in COLUMNS.items():
        for col in columns:
            op.execute(
                f"ALTER TABLE {table} ALTER COLUMN {col} "
                f"TYPE TIMESTAMP USING {col} AT TIME ZONE 'UTC'"
            )

    op.execute("""
        ALTER TABLE appointments
        ADD CONSTRAINT no_overlapping_confirmed_appointments
        EXCLUDE USING GIST (
            team_member_id WITH =,
            tsrange(starts_at, ends_at, '[)') WITH &&
        ) WHERE (status = 'confirmed')
    """)
