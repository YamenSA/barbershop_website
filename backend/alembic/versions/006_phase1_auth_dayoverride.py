"""phase1 auth and dayoverride

Revision ID: 006
Revises: 005
Create Date: 2026-06-09 15:40:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel
import os
import bcrypt


# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add description to services
    op.add_column('services', sa.Column('description', sa.Text(), nullable=True))

    # 2. Create admin_accounts table
    op.create_table('admin_accounts',
    sa.Column('id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
    sa.Column('username', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('hashed_password', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('username')
    )
    op.create_index(op.f('ix_admin_accounts_id'), 'admin_accounts', ['id'], unique=False)
    op.create_index(op.f('ix_admin_accounts_username'), 'admin_accounts', ['username'], unique=True)

    # 3. Create day_overrides table
    op.create_table('day_overrides',
    sa.Column('id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
    sa.Column('team_member_id', sqlmodel.sql.sqltypes.GUID(), nullable=False),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('override_type', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('custom_start_time', sa.Time(), nullable=True),
    sa.Column('custom_end_time', sa.Time(), nullable=True),
    sa.Column('reason', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['team_member_id'], ['team_members.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('team_member_id', 'date')
    )
    op.create_index(op.f('ix_day_overrides_id'), 'day_overrides', ['id'], unique=False)
    op.create_index('ix_day_overrides_team_member_date', 'day_overrides', ['team_member_id', 'date'], unique=False)

    # Check constraints for day_overrides
    op.create_check_constraint(
        'valid_override_type',
        'day_overrides',
        "override_type IN ('day_off', 'extra_hours')"
    )
    op.create_check_constraint(
        'valid_override_times',
        'day_overrides',
        "(override_type = 'day_off' AND custom_start_time IS NULL AND custom_end_time IS NULL) OR "
        "(override_type = 'extra_hours' AND custom_start_time IS NOT NULL AND custom_end_time IS NOT NULL AND custom_end_time > custom_start_time)"
    )

    # 4. Index on customers(phone)
    op.create_index('ix_customers_phone', 'customers', ['phone'], unique=False)

    # 5. Seed AdminAccount
    admin_user = os.getenv("ADMIN_USERNAME", "admin")
    admin_pass = os.getenv("ADMIN_PASSWORD", "change_this_password")
    hashed_pass = bcrypt.hashpw(admin_pass.encode(), bcrypt.gensalt()).decode()
    
    # Generate a UUID for the admin
    import uuid
    admin_id = str(uuid.uuid4())
    
    op.execute(
        sa.text(
            "INSERT INTO admin_accounts (id, username, hashed_password, created_at, updated_at) "
            "VALUES (:id, :username, :hashed_password, NOW(), NOW())"
        ).bindparams(id=admin_id, username=admin_user, hashed_password=hashed_pass)
    )


def downgrade() -> None:
    op.drop_index('ix_customers_phone', table_name='customers')
    op.drop_index('ix_day_overrides_team_member_date', table_name='day_overrides')
    op.drop_index(op.f('ix_day_overrides_id'), table_name='day_overrides')
    op.drop_table('day_overrides')
    op.drop_index(op.f('ix_admin_accounts_username'), table_name='admin_accounts')
    op.drop_index(op.f('ix_admin_accounts_id'), table_name='admin_accounts')
    op.drop_table('admin_accounts')
    op.drop_column('services', 'description')
