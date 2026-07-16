"""service price_is_from flag + Azzam Salon service catalogue seed

Revision ID: 014
Revises: 013
Create Date: 2026-07-03

Adds services.price_is_from (starting-price flag, "ab X €") and seeds the full
Azzam Salon price boards (Damen + Herren) into the services table so the public
price list and the booking engine share a single source of truth.

Durations are sensible PLACEHOLDERS (salon has not provided exact minutes yet)
and are meant to be corrected via the admin UI.
"""
import uuid

import sqlalchemy as sa
from alembic import op

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


# (name, duration_minutes, price_euro, price_is_from, target_group, service_kind, description)
# Durations are placeholders to be refined in the admin UI.
SEED = [
    # ---------------- DAMEN — Stylen & Schneiden ----------------
    ("Waschen, Föhnen & Stylen (Kurz)", 30, 25.00, False, "DAMEN", "STYLING", None),
    ("Waschen, Föhnen & Stylen (Mittel)", 40, 35.00, False, "DAMEN", "STYLING", None),
    ("Waschen, Föhnen & Stylen (Lang)", 50, 43.00, False, "DAMEN", "STYLING", None),
    ("Schneiden, Waschen, Föhnen & Style (Kurz)", 45, 25.00, True, "DAMEN", "SCHNITT", None),
    ("Schneiden, Waschen, Föhnen & Style (Mittel)", 55, 45.00, False, "DAMEN", "SCHNITT", None),
    ("Schneiden, Waschen, Föhnen & Style (Lang)", 65, 55.00, False, "DAMEN", "SCHNITT", None),
    ("Volumenwelle", 60, 30.00, True, "DAMEN", "STYLING", None),
    ("Dauerwelle", 90, 45.00, True, "DAMEN", "STYLING", None),
    ("Augenbrauen zupfen", 15, 10.00, False, "DAMEN", "SONSTIGES", None),
    # ---------------- DAMEN — Färben ----------------
    ("Neufärbung", 90, 50.00, True, "DAMEN", "FARBE", None),
    ("Tönung", 60, 26.00, True, "DAMEN", "FARBE", None),
    ("Intensivtönung", 75, 39.00, True, "DAMEN", "FARBE", None),
    ("Blondierung", 120, 45.00, True, "DAMEN", "FARBE", None),
    ("Foliensträhnen mehrfarbig", 120, 50.00, True, "DAMEN", "FARBE", None),
    ("Wimpern färben", 15, 13.00, False, "DAMEN", "FARBE", None),
    ("Augenbrauen färben", 15, 11.00, False, "DAMEN", "FARBE", None),
    # ---------------- DAMEN — Pflege & Entspannung ----------------
    ("Kur", 20, 20.00, True, "DAMEN", "SONSTIGES", None),
    ("Kopfmassage", 15, 10.00, False, "DAMEN", "SONSTIGES", None),
    # ---------------- DAMEN — Brautstyling ----------------
    ("Brautstyling inkl. Beratung", 120, 180.00, True, "DAMEN", "STYLING", None),
    # ---------------- HERREN — Haare & Bart ----------------
    ("Schneiden, Föhnen & Stylen", 30, 20.00, False, "HERREN", "SCHNITT", None),
    ("Schneiden, Föhnen & Bart", 45, 30.00, False, "HERREN", "SCHNITT", None),
    ("Schneiden Style 1-12 Jahre", 30, 15.00, False, "HERREN", "SCHNITT", "Kinderhaarschnitt (1–12 Jahre)"),
    ("Maschinenschnitt", 20, 15.00, False, "HERREN", "SCHNITT", None),
    ("Bart", 20, 15.00, False, "HERREN", "BART", None),
    ("Bartrasur", 15, 10.00, False, "HERREN", "BART", None),
    ("Haaremuster", 15, 5.00, True, "HERREN", "SCHNITT", None),
    # ---------------- HERREN — Gesichtspflege ----------------
    ("Augenbrauen zupfen (Fadentechnik)", 10, 7.00, False, "HERREN", "SONSTIGES", None),
    ("Gesichtshaarentfernung", 10, 5.00, False, "HERREN", "SONSTIGES", None),
    ("Nasenhaarentfernung", 5, 3.00, False, "HERREN", "SONSTIGES", None),
    ("Ohrenhaarentfernung", 5, 3.00, False, "HERREN", "SONSTIGES", None),
    ("Gesichtsdampfer", 15, 10.00, False, "HERREN", "SONSTIGES", None),
    ("Gesichtspflege Komplettpaket", 30, 23.00, False, "HERREN", "SONSTIGES", None),
    ("Gesichtsmaske", 10, 3.00, False, "HERREN", "SONSTIGES", None),
    # ---------------- HERREN — Premium Paket ----------------
    (
        "Premium-Paket (Rundum-Verwöhnung)",
        60,
        40.00,
        False,
        "HERREN",
        "SONSTIGES",
        "Waschen, Schneiden, Bart, Ohren- & Nasenhaarentfernung, Augenbrauen",
    ),
]


def upgrade() -> None:
    # 1. New starting-price flag; server_default backfills existing rows to False.
    op.add_column(
        "services",
        sa.Column(
            "price_is_from",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )

    # 2. Seed the Azzam Salon catalogue. Existing names are skipped up front so
    #    re-running (or an already-populated DB) never trips the unique(name)
    #    constraint. Plain INSERT ... VALUES lets Postgres infer every column
    #    type (incl. the enum columns) unambiguously.
    bind = op.get_bind()
    existing = {row[0] for row in bind.execute(sa.text("SELECT name FROM services"))}
    insert = sa.text(
        """
        INSERT INTO services
            (id, name, duration_minutes, price_cents, price_is_from,
             description, is_active, target_group, service_kind,
             created_at, updated_at)
        VALUES
            (:id, :name, :duration_minutes, :price_cents, :price_is_from,
             :description, true, :target_group, :service_kind,
             CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """
    )
    for name, duration, price_euro, price_is_from, target_group, service_kind, description in SEED:
        if name in existing:
            continue
        bind.execute(
            insert,
            {
                "id": str(uuid.uuid4()),
                "name": name,
                "duration_minutes": duration,
                "price_cents": int(round(price_euro * 100)),
                "price_is_from": price_is_from,
                "description": description,
                "target_group": target_group,
                "service_kind": service_kind,
            },
        )


def downgrade() -> None:
    bind = op.get_bind()
    names = [row[0] for row in SEED]
    bind.execute(
        sa.text("DELETE FROM services WHERE name IN :names").bindparams(
            sa.bindparam("names", value=names, expanding=True)
        )
    )
    op.drop_column("services", "price_is_from")
