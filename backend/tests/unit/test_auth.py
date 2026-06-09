import pytest
from fastapi import HTTPException
from app.domains.auth.service import (
    create_session_token,
    validate_session_token,
    compute_delay,
    record_failed_attempt,
    verify_password,
    pwd_context,
    failed_attempts_cache,
)


def test_create_and_validate_token():
    username = "admin"
    token = create_session_token(username)
    assert isinstance(token, str)
    
    validated_username = validate_session_token(token)
    assert validated_username == username


def test_validate_invalid_token():
    with pytest.raises(HTTPException) as exc:
        validate_session_token("invalid-token")
    assert exc.value.status_code == 401


def test_compute_delay():
    ip = "1.2.3.4"
    # Clear cache for test
    failed_attempts_cache.clear()
    
    assert compute_delay(ip) == 0.0
    
    record_failed_attempt(ip)
    assert compute_delay(ip) == 1.0 # 2^(1-1) = 1
    
    record_failed_attempt(ip)
    assert compute_delay(ip) == 2.0 # 2^(2-1) = 2
    
    record_failed_attempt(ip)
    assert compute_delay(ip) == 4.0 # 2^(3-1) = 4
    
    # Test cap at 30s
    for _ in range(10):
        record_failed_attempt(ip)
    assert compute_delay(ip) == 30.0


def test_verify_password():
    password = "secret-password"
    hashed = pwd_context.hash(password)
    
    assert verify_password(password, hashed) is True
    assert verify_password("wrong-password", hashed) is False
