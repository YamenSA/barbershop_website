"""booking entities and exclude constraint

Revision ID: 005
Revises: 004
Create Date: 2026-06-09 13:20:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- Customers ---
    op.create_table('customers',
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
    sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('email', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('phone', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('last_active_at', sa.DateTime(), nullable=False),
    sa.Column('anonymized_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_customers_email'), 'customers', ['email'], unique=True)
    op.create_index(op.f('ix_customers_id'), 'customers', ['id'], unique=False)

    # --- Appointments ---
    op.create_table('appointments',
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.Column('id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
    sa.Column('team_member_id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
    sa.Column('service_id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
    sa.Column('customer_id', sqlmodel.sql.sqltypes.GUID(), nullable=True),
    sa.Column('guest_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('guest_phone', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('starts_at', sa.DateTime(), nullable=False),
    sa.Column('ends_at', sa.DateTime(), nullable=False),
    sa.Column('status', sa.Enum('confirmed', 'completed', 'cancelled', 'no_show', name='appointmentstatus'), nullable=False),
    sa.Column('notes', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ),
    sa.ForeignKeyConstraint(['service_id'], ['services.id'], ),
    sa.ForeignKeyConstraint(['team_member_id'], ['team_members.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_appointments_id'), 'appointments', ['id'], unique=False)

    # --- Constraints ---
    # Customer XOR Guest
    op.create_check_constraint(
        'customer_xor_guest',
        'appointments',
        '(customer_id IS NOT NULL AND guest_name IS NULL AND guest_phone IS NULL) OR '
        '(customer_id IS NULL AND guest_name IS NOT NULL AND guest_phone IS NOT NULL)'
    )
    
    # Ends after starts
    op.create_check_constraint(
        'ends_after_starts',
        'appointments',
        'ends_at > starts_at'
    )

    # Double-booking protection (PostgreSQL specific)
    # Using raw SQL because Alembic's op.create_exclude_constraint is limited
    op.execute("""
        ALTER TABLE appointments
        ADD CONSTRAINT no_overlapping_confirmed_appointments
        EXCLUDE USING GIST (
            team_member_id WITH =,
            tstzrange(starts_at, ends_at, '[)') WITH &&
        ) WHERE (status = 'confirmed')
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE appointments DROP CONSTRAINT no_overlapping_confirmed_appointments")
    op.drop_index(op.f('ix_appointments_id'), table_name='appointments')
    op.drop_table('appointments')
    op.drop_index(op.f('ix_customers_id'), table_name='customers')
    op.drop_index(op.f('ix_customers_email'), table_name='customers')
    op.drop_table('customers')
    op.execute("DROP TYPE appointmentstatus")
