"""deactivate services that are not on the Azzam Salon price boards

Revision ID: 015
Revises: 014
Create Date: 2026-07-13

Legacy placeholder services (seeded before the 014 Azzam catalogue) are not
printed on the physical Herren/Damen price boards. This deactivates every
service whose name is not part of the canonical board catalogue, so the public
price list and the booking engine only ever offer services that actually exist
on the boards.

Deactivation (is_active = False) mirrors the admin "delete" behaviour
(StammdatenService.deactivate_service) instead of a hard DELETE, so appointment
history and team links referencing these services stay intact.

Idempotent: on a fresh database seeded only from migration 014 the non-board
set is empty, so this is a no-op there.
"""
import sqlalchemy as sa
from alembic import op

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


# Canonical Azzam Salon catalogue — must stay in sync with the 014 seed and the
# physical price boards (Herren + Damen). Anything active but not in this set is
# a leftover placeholder and gets deactivated.
BOARD_SERVICES = [
    # --- HERREN — Haare & Bart ---
    "Schneiden, Föhnen & Stylen",
    "Schneiden, Föhnen & Bart",
    "Schneiden Style 1-12 Jahre",
    "Maschinenschnitt",
    "Bart",
    "Bartrasur",
    "Haaremuster",
    # --- HERREN — Gesichtspflege ---
    "Augenbrauen zupfen (Fadentechnik)",
    "Gesichtshaarentfernung",
    "Nasenhaarentfernung",
    "Ohrenhaarentfernung",
    "Gesichtsdampfer",
    "Gesichtspflege Komplettpaket",
    "Gesichtsmaske",
    # --- HERREN — Premium ---
    "Premium-Paket (Rundum-Verwöhnung)",
    # --- DAMEN — Stylen & Schneiden ---
    "Waschen, Föhnen & Stylen (Kurz)",
    "Waschen, Föhnen & Stylen (Mittel)",
    "Waschen, Föhnen & Stylen (Lang)",
    "Schneiden, Waschen, Föhnen & Style (Kurz)",
    "Schneiden, Waschen, Föhnen & Style (Mittel)",
    "Schneiden, Waschen, Föhnen & Style (Lang)",
    "Volumenwelle",
    "Dauerwelle",
    "Augenbrauen zupfen",
    # --- DAMEN — Färben ---
    "Neufärbung",
    "Tönung",
    "Intensivtönung",
    "Blondierung",
    "Foliensträhnen mehrfarbig",
    "Wimpern färben",
    "Augenbrauen färben",
    # --- DAMEN — Pflege & Entspannung ---
    "Kur",
    "Kopfmassage",
    # --- DAMEN — Brautstyling ---
    "Brautstyling inkl. Beratung",
]


def upgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "UPDATE services SET is_active = false, updated_at = CURRENT_TIMESTAMP "
            "WHERE is_active = true AND name NOT IN :names"
        ).bindparams(sa.bindparam("names", value=BOARD_SERVICES, expanding=True))
    )


def downgrade() -> None:
    # Reactivate the non-board services (symmetric with upgrade). This may also
    # reactivate rows an admin deactivated for other reasons, which is an
    # acceptable trade-off for a downgrade path.
    bind = op.get_bind()
    bind.execute(
        sa.text(
            "UPDATE services SET is_active = true, updated_at = CURRENT_TIMESTAMP "
            "WHERE is_active = false AND name NOT IN :names"
        ).bindparams(sa.bindparam("names", value=BOARD_SERVICES, expanding=True))
    )
