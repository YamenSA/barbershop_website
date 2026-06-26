"""
T042: Unit tests — password validator (≥10 chars) and token hashing/expiry/single-use.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import pytest
from pydantic import ValidationError


# ---------------------------------------------------------------------------
# Password validator
# ---------------------------------------------------------------------------


def test_password_too_short():
    from app.domains.customer_account.schemas import RegisterRequest
    with pytest.raises(ValidationError) as exc_info:
        RegisterRequest(name="Test", email="t@example.com", password="short")
    assert "WEAK_PASSWORD" in str(exc_info.value)


def test_password_exactly_10_chars():
    from app.domains.customer_account.schemas import RegisterRequest
    r = RegisterRequest(name="Test", email="t@example.com", password="1234567890")
    assert r.password == "1234567890"


def test_reset_password_short():
    from app.domains.customer_account.schemas import ResetPasswordRequest
    with pytest.raises(ValidationError):
        ResetPasswordRequest(password="short")


# ---------------------------------------------------------------------------
# Token hashing
# ---------------------------------------------------------------------------


def test_hash_token_deterministic():
    from app.domains.customer_account.service import _hash_token
    plaintext = "test_token_abc"
    h1 = _hash_token(plaintext)
    h2 = _hash_token(plaintext)
    assert h1 == h2
    assert h1 == hashlib.sha256(plaintext.encode()).hexdigest()


def test_hash_token_different_inputs():
    from app.domains.customer_account.service import _hash_token
    assert _hash_token("a") != _hash_token("b")


# ---------------------------------------------------------------------------
# issue_token / consume_token (async, in-memory DB)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_issue_token_creates_record(session):
    from app.domains.booking.models import Customer
    from app.domains.customer_account.models import CustomerToken, TokenPurpose
    from app.domains.customer_account.service import issue_token
    from sqlmodel import select

    customer = Customer(name="Test", email="tok_test@example.com")
    session.add(customer)
    await session.commit()

    plaintext = await issue_token(session, customer.id, TokenPurpose.email_verification)
    await session.commit()

    stmt = select(CustomerToken).where(CustomerToken.customer_id == customer.id)
    result = await session.execute(stmt)
    token = result.scalar_one()

    assert token.purpose == TokenPurpose.email_verification
    assert token.used_at is None
    expected_hash = hashlib.sha256(plaintext.encode()).hexdigest()
    assert token.token_hash == expected_hash


@pytest.mark.asyncio
async def test_consume_token_marks_used(session):
    from app.domains.booking.models import Customer
    from app.domains.customer_account.models import TokenPurpose
    from app.domains.customer_account.service import consume_token, issue_token

    customer = Customer(name="Test2", email="tok_consume@example.com")
    session.add(customer)
    await session.commit()

    plaintext = await issue_token(session, customer.id, TokenPurpose.password_reset)
    await session.commit()

    token = await consume_token(session, plaintext, TokenPurpose.password_reset)
    await session.commit()
    assert token.used_at is not None


@pytest.mark.asyncio
async def test_consume_token_single_use(session):
    from fastapi import HTTPException
    from app.domains.booking.models import Customer
    from app.domains.customer_account.models import TokenPurpose
    from app.domains.customer_account.service import consume_token, issue_token

    customer = Customer(name="Test3", email="tok_single@example.com")
    session.add(customer)
    await session.commit()

    plaintext = await issue_token(session, customer.id, TokenPurpose.email_verification)
    await session.commit()

    await consume_token(session, plaintext, TokenPurpose.email_verification)
    await session.commit()

    with pytest.raises(HTTPException) as exc_info:
        await consume_token(session, plaintext, TokenPurpose.email_verification)
    assert exc_info.value.status_code == 410
    assert exc_info.value.detail == "TOKEN_USED"


@pytest.mark.asyncio
async def test_consume_token_expired(session):
    from fastapi import HTTPException
    from app.domains.booking.models import Customer
    from app.domains.customer_account.models import CustomerToken, TokenPurpose
    from app.domains.customer_account.service import _hash_token

    customer = Customer(name="Test4", email="tok_expired@example.com")
    session.add(customer)
    await session.commit()

    plaintext = secrets.token_urlsafe(32)
    expired_token = CustomerToken(
        customer_id=customer.id,
        token_hash=_hash_token(plaintext),
        purpose=TokenPurpose.password_reset,
        expires_at=datetime(2020, 1, 1, tzinfo=timezone.utc),
    )
    session.add(expired_token)
    await session.commit()

    with pytest.raises(HTTPException) as exc_info:
        from app.domains.customer_account.service import consume_token
        await consume_token(session, plaintext, TokenPurpose.password_reset)
    assert exc_info.value.status_code == 410
    assert exc_info.value.detail == "TOKEN_EXPIRED"


@pytest.mark.asyncio
async def test_consume_token_not_found(session):
    from fastapi import HTTPException
    from app.domains.customer_account.models import TokenPurpose
    from app.domains.customer_account.service import consume_token

    with pytest.raises(HTTPException) as exc_info:
        await consume_token(session, "nonexistent_token", TokenPurpose.email_verification)
    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "TOKEN_NOT_FOUND"


@pytest.mark.asyncio
async def test_issue_token_invalidates_previous(session):
    from app.domains.booking.models import Customer
    from app.domains.customer_account.models import CustomerToken, TokenPurpose
    from app.domains.customer_account.service import issue_token
    from sqlmodel import select

    customer = Customer(name="Test5", email="tok_invalidate@example.com")
    session.add(customer)
    await session.commit()

    first = await issue_token(session, customer.id, TokenPurpose.password_reset)
    await session.commit()

    second = await issue_token(session, customer.id, TokenPurpose.password_reset)
    await session.commit()

    # First token should be invalidated (used_at set)
    first_hash = hashlib.sha256(first.encode()).hexdigest()
    stmt = select(CustomerToken).where(CustomerToken.token_hash == first_hash)
    result = await session.execute(stmt)
    old_token = result.scalar_one()
    assert old_token.used_at is not None
