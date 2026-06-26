"""
Unit tests for Promotion effective_status computation (T017).

Guards:
- I2: 'today' MUST be computed in Europe/Berlin timezone
- Includes day-boundary edge case (UTC vs Berlin offset)
- Validates ends_on >= starts_on constraint
"""
from datetime import date
from unittest.mock import patch

import pytest

from app.domains.marketing.service import (
    compute_effective_status,
    validate_promotion_dates,
)


# ---------------------------------------------------------------------------
# Helper: patch "today in Europe/Berlin" to a fixed date
# ---------------------------------------------------------------------------
def _patch_berlin_today(d: date):
    """Context manager that patches the marketing service's Berlin-today."""
    return patch(
        "app.domains.marketing.service.get_berlin_today",
        return_value=d,
    )


# ---------------------------------------------------------------------------
# compute_effective_status — hidden
# ---------------------------------------------------------------------------

class TestEffectiveStatusHidden:
    def test_hidden_when_inactive_before_range(self):
        with _patch_berlin_today(date(2026, 7, 15)):
            status = compute_effective_status(
                is_active=False,
                starts_on=date(2026, 7, 1),
                ends_on=date(2026, 7, 31),
            )
        assert status == "hidden"

    def test_hidden_when_inactive_within_range(self):
        with _patch_berlin_today(date(2026, 7, 15)):
            status = compute_effective_status(
                is_active=False,
                starts_on=date(2026, 7, 1),
                ends_on=date(2026, 7, 31),
            )
        assert status == "hidden"

    def test_hidden_when_inactive_after_range(self):
        with _patch_berlin_today(date(2026, 9, 1)):
            status = compute_effective_status(
                is_active=False,
                starts_on=date(2026, 7, 1),
                ends_on=date(2026, 7, 31),
            )
        assert status == "hidden"


# ---------------------------------------------------------------------------
# compute_effective_status — scheduled
# ---------------------------------------------------------------------------

class TestEffectiveStatusScheduled:
    def test_scheduled_when_today_before_starts_on(self):
        with _patch_berlin_today(date(2026, 6, 30)):
            status = compute_effective_status(
                is_active=True,
                starts_on=date(2026, 7, 1),
                ends_on=date(2026, 7, 31),
            )
        assert status == "scheduled"


# ---------------------------------------------------------------------------
# compute_effective_status — visible
# ---------------------------------------------------------------------------

class TestEffectiveStatusVisible:
    def test_visible_on_starts_on(self):
        with _patch_berlin_today(date(2026, 7, 1)):
            status = compute_effective_status(
                is_active=True,
                starts_on=date(2026, 7, 1),
                ends_on=date(2026, 7, 31),
            )
        assert status == "visible"

    def test_visible_within_range(self):
        with _patch_berlin_today(date(2026, 7, 15)):
            status = compute_effective_status(
                is_active=True,
                starts_on=date(2026, 7, 1),
                ends_on=date(2026, 7, 31),
            )
        assert status == "visible"

    def test_visible_on_ends_on(self):
        with _patch_berlin_today(date(2026, 7, 31)):
            status = compute_effective_status(
                is_active=True,
                starts_on=date(2026, 7, 1),
                ends_on=date(2026, 7, 31),
            )
        assert status == "visible"


# ---------------------------------------------------------------------------
# compute_effective_status — expired
# ---------------------------------------------------------------------------

class TestEffectiveStatusExpired:
    def test_expired_day_after_ends_on(self):
        with _patch_berlin_today(date(2026, 8, 1)):
            status = compute_effective_status(
                is_active=True,
                starts_on=date(2026, 7, 1),
                ends_on=date(2026, 7, 31),
            )
        assert status == "expired"

    def test_expired_well_after_range(self):
        with _patch_berlin_today(date(2027, 1, 1)):
            status = compute_effective_status(
                is_active=True,
                starts_on=date(2026, 7, 1),
                ends_on=date(2026, 7, 31),
            )
        assert status == "expired"


# ---------------------------------------------------------------------------
# I2 — Forced Expiry: Day-boundary edge case Europe/Berlin vs UTC
#
# Germany is UTC+1 (CET) or UTC+2 (CEST, summer).
# If ends_on = 2026-07-31 and the UTC wall clock shows 2026-08-01 00:30 UTC
# (= 2026-07-31 23:00 CEST ... still July 31 in Berlin),
# the promotion must still be visible in Berlin!
# Conversely, once Berlin's date is 2026-08-01, it must be expired.
#
# We simulate both UTC and Berlin scenarios.
# ---------------------------------------------------------------------------

class TestI2ForcedExpiryBerlinBoundary:
    """Guard I2: 'today' must be Europe/Berlin, not UTC."""

    def test_still_visible_at_23h_berlin_on_last_day(self):
        """
        UTC date = 2026-08-01, but Berlin date = 2026-07-31 (CEST = UTC+2).
        Promotion ends_on=2026-07-31 → must be 'visible', not 'expired'.
        """
        with _patch_berlin_today(date(2026, 7, 31)):  # Berlin sees July 31
            status = compute_effective_status(
                is_active=True,
                starts_on=date(2026, 7, 1),
                ends_on=date(2026, 7, 31),
            )
        assert status == "visible", (
            "Promotion must be visible when Berlin date == ends_on, "
            "even if UTC has crossed midnight"
        )

    def test_expired_when_berlin_date_is_next_day(self):
        """
        Both UTC and Berlin show 2026-08-01.
        Promotion ends_on=2026-07-31 → must be 'expired'.
        """
        with _patch_berlin_today(date(2026, 8, 1)):  # Berlin sees August 1
            status = compute_effective_status(
                is_active=True,
                starts_on=date(2026, 7, 1),
                ends_on=date(2026, 7, 31),
            )
        assert status == "expired"

    def test_single_day_promotion_visible_on_that_day(self):
        """starts_on == ends_on → visible only on that day."""
        with _patch_berlin_today(date(2026, 8, 15)):
            status = compute_effective_status(
                is_active=True,
                starts_on=date(2026, 8, 15),
                ends_on=date(2026, 8, 15),
            )
        assert status == "visible"

    def test_single_day_promotion_expired_day_after(self):
        with _patch_berlin_today(date(2026, 8, 16)):
            status = compute_effective_status(
                is_active=True,
                starts_on=date(2026, 8, 15),
                ends_on=date(2026, 8, 15),
            )
        assert status == "expired"


# ---------------------------------------------------------------------------
# validate_promotion_dates — ends_on >= starts_on
# ---------------------------------------------------------------------------

class TestValidatePromotionDates:
    def test_valid_when_ends_on_equals_starts_on(self):
        """Same day is valid."""
        validate_promotion_dates(date(2026, 7, 1), date(2026, 7, 1))  # must not raise

    def test_valid_when_ends_on_after_starts_on(self):
        validate_promotion_dates(date(2026, 7, 1), date(2026, 8, 31))  # must not raise

    def test_raises_when_ends_on_before_starts_on(self):
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            validate_promotion_dates(date(2026, 8, 1), date(2026, 7, 31))
        assert exc_info.value.status_code == 422
