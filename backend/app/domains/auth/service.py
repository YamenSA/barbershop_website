import datetime as dt
from typing import Optional
from jose import jwt, JWTError
from passlib.context import CryptContext
from cachetools import TTLCache
from fastapi import HTTPException, status
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 10-minute window for failed attempts tracking
failed_attempts_cache = TTLCache(maxsize=1000, ttl=600)

ALGORITHM = "HS256"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_session_token(username: str) -> str:
    expires_delta = dt.timedelta(hours=settings.SESSION_EXPIRE_HOURS)
    expire = dt.datetime.now(dt.timezone.utc) + expires_delta
    to_encode = {"sub": username, "exp": expire}
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def validate_session_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid session token",
            )
        return username
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
        )


def create_customer_token(customer_id: str, remember: bool = False) -> str:
    if remember:
        expires_delta = dt.timedelta(days=settings.CUSTOMER_REMEMBER_EXPIRE_DAYS)
    else:
        expires_delta = dt.timedelta(hours=settings.CUSTOMER_SESSION_EXPIRE_HOURS)
    expire = dt.datetime.now(dt.timezone.utc) + expires_delta
    to_encode = {"sub": str(customer_id), "typ": "customer", "exp": expire}
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)


def validate_customer_token(token: str) -> str:
    """Returns customer_id (UUID string) or raises 401."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("typ") != "customer":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="NOT_AUTHENTICATED")
        customer_id: str = payload.get("sub")
        if not customer_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="NOT_AUTHENTICATED")
        return customer_id
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="NOT_AUTHENTICATED")


def record_failed_attempt(ip: str):
    count = failed_attempts_cache.get(ip, 0)
    failed_attempts_cache[ip] = count + 1


def compute_delay(ip: str) -> float:
    count = failed_attempts_cache.get(ip, 0)
    if count == 0:
        return 0.0
    # min(2^(count-1), 30)
    delay = min(2 ** (count - 1), 30)
    return float(delay)
