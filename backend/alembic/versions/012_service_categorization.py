"""service categorization

Revision ID: 012
Revises: 011
Create Date: 2026-06-13

Add target_group and service_kind enums and columns to services table with backfill.
"""
import sqlalchemy as sa
from alembic import op

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create Enums first
    target_group_enum = sa.Enum("HERREN", "DAMEN", "KINDER", name="targetgroup")
    service_kind_enum = sa.Enum("SCHNITT", "BART", "FARBE", "STYLING", "SONSTIGES", name="servicekind")
    
    target_group_enum.create(op.get_bind(), checkfirst=True)
    service_kind_enum.create(op.get_bind(), checkfirst=True)

    # Add columns as nullable
    op.add_column(
        "services",
        sa.Column(
            "target_group",
            sa.Enum("HERREN", "DAMEN", "KINDER", name="targetgroup"),
            nullable=True,
        ),
    )
    op.add_column(
        "services",
        sa.Column(
            "service_kind",
            sa.Enum("SCHNITT", "BART", "FARBE", "STYLING", "SONSTIGES", name="servicekind"),
            nullable=True,
        ),
    )

    # Perform custom backfill based on service names
    bind = op.get_bind()
    
    # 1. Bartpflegen (Herren, Bart)
    bind.execute(sa.text(
        "UPDATE services SET target_group = 'HERREN', service_kind = 'BART' "
        "WHERE LOWER(name) LIKE '%bart%'"
    ))
    
    # 2. Damen Schnitt
    bind.execute(sa.text(
        "UPDATE services SET target_group = 'DAMEN', service_kind = 'SCHNITT' "
        "WHERE LOWER(name) LIKE '%damen%' AND (LOWER(name) LIKE '%schnitt%' OR LOWER(name) LIKE '%haarschnitt%')"
    ))
    
    # 3. Damen Farbe
    bind.execute(sa.text(
        "UPDATE services SET target_group = 'DAMEN', service_kind = 'FARBE' "
        "WHERE LOWER(name) LIKE '%damen%' AND (LOWER(name) LIKE '%farb%' OR LOWER(name) LIKE '%tönung%' OR LOWER(name) LIKE '%strähnen%')"
    ))
    
    # 4. Damen Styling
    bind.execute(sa.text(
        "UPDATE services SET target_group = 'DAMEN', service_kind = 'STYLING' "
        "WHERE LOWER(name) LIKE '%damen%' AND (LOWER(name) LIKE '%style%' OR LOWER(name) LIKE '%föhn%')"
    ))
    
    # 5. Damen Sonstiges
    bind.execute(sa.text(
        "UPDATE services SET target_group = 'DAMEN', service_kind = 'SONSTIGES' "
        "WHERE LOWER(name) LIKE '%damen%' AND target_group IS NULL"
    ))
    
    # 6. Kinder
    bind.execute(sa.text(
        "UPDATE services SET target_group = 'KINDER', service_kind = 'SCHNITT' "
        "WHERE LOWER(name) LIKE '%kinder%'"
    ))
    
    # 7. Herren Schnitt
    bind.execute(sa.text(
        "UPDATE services SET target_group = 'HERREN', service_kind = 'SCHNITT' "
        "WHERE target_group IS NULL AND (LOWER(name) LIKE '%schnitt%' OR LOWER(name) LIKE '%haarschnitt%')"
    ))
    
    # 8. Herren Farbe
    bind.execute(sa.text(
        "UPDATE services SET target_group = 'HERREN', service_kind = 'FARBE' "
        "WHERE target_group IS NULL AND (LOWER(name) LIKE '%farb%' OR LOWER(name) LIKE '%tönung%')"
    ))
    
    # 9. Herren Styling
    bind.execute(sa.text(
        "UPDATE services SET target_group = 'HERREN', service_kind = 'STYLING' "
        "WHERE target_group IS NULL AND (LOWER(name) LIKE '%style%' OR LOWER(name) LIKE '%föhn%')"
    ))
    
    # 10. Fallback Herren/Sonstiges
    bind.execute(sa.text(
        "UPDATE services SET target_group = 'HERREN', service_kind = 'SONSTIGES' "
        "WHERE target_group IS NULL"
    ))

    # Set columns as NOT NULL
    op.alter_column("services", "target_group", nullable=False)
    op.alter_column("services", "service_kind", nullable=False)


def downgrade() -> None:
    op.drop_column("services", "service_kind")
    op.drop_column("services", "target_group")
    
    # Drop Enums
    sa.Enum(name="servicekind").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="targetgroup").drop(op.get_bind(), checkfirst=True)
