"""working hours intervals model

Revision ID: 016
Revises: 015
Create Date: 2026-07-19
"""
from alembic import op
import sqlalchemy as sa
from uuid import uuid4

revision = '016'
down_revision = '015'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Neue Tabellen
    op.create_table('working_day_schedules',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('team_member_id', sa.UUID(), nullable=False),
        sa.Column('day_of_week', sa.Integer(), nullable=False),
        sa.Column('is_working', sa.Boolean(), nullable=False, server_default='false'),
        sa.ForeignKeyConstraint(['team_member_id'], ['team_members.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('team_member_id', 'day_of_week', name='uq_working_day_schedule_member_day'),
    )
    op.create_index(op.f('ix_working_day_schedules_id'), 'working_day_schedules', ['id'], unique=False)

    op.create_table('working_intervals',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('schedule_id', sa.UUID(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['schedule_id'], ['working_day_schedules.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_working_intervals_id'), 'working_intervals', ['id'], unique=False)

    # 2. Daten migrieren
    conn = op.get_bind()
    old_rows = conn.execute(sa.text(
        'SELECT team_member_id, day_of_week, start_time, end_time FROM working_hours ORDER BY team_member_id, day_of_week, start_time'
    )).fetchall()

    schedules = {}
    for row in old_rows:
        key = (str(row.team_member_id), row.day_of_week)
        if key not in schedules:
            schedules[key] = {
                'id': str(uuid4()),
                'intervals': []
            }
        schedules[key]['intervals'].append({
            'start_time': row.start_time,
            'end_time': row.end_time
        })

    for key, data in schedules.items():
        member_id, dow = key
        schedule_id = data['id']
        conn.execute(sa.text(
            'INSERT INTO working_day_schedules (id, team_member_id, day_of_week, is_working) '
            'VALUES (:id, :member_id, :dow, true)'
        ), {'id': schedule_id, 'member_id': member_id, 'dow': dow})
        
        for idx, interval in enumerate(data['intervals']):
            conn.execute(sa.text(
                'INSERT INTO working_intervals (id, schedule_id, start_time, end_time, sort_order) '
                'VALUES (:id, :schedule_id, :start, :end, :sort)'
            ), {
                'id': str(uuid4()),
                'schedule_id': schedule_id,
                'start': interval['start_time'],
                'end': interval['end_time'],
                'sort': idx
            })


def downgrade() -> None:
    op.drop_index(op.f('ix_working_intervals_id'), table_name='working_intervals')
    op.drop_table('working_intervals')
    op.drop_index(op.f('ix_working_day_schedules_id'), table_name='working_day_schedules')
    op.drop_table('working_day_schedules')
