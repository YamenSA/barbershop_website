from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    RETENTION_GUEST_MONTHS: int = 12
    RETENTION_CUSTOMER_MONTHS: int = 12
    RETENTION_CRON_SECRET: str
    SQL_ECHO: bool = False

    # Phase 1: Admin & Auth
    JWT_SECRET_KEY: str
    SESSION_EXPIRE_HOURS: int = 8
    ADMIN_USERNAME: str
    ADMIN_PASSWORD: str
    RATE_LIMIT_LOGIN_PER_MINUTE: int = 20
    # Phase 2 / Public booking settings
    BREVO_API_KEY: str | None = None
    EMAIL_FROM: str
    EMAIL_FROM_NAME: str = "Azzam Barbershop"
    EMAIL_REPLY_TO: str
    PUBLIC_BASE_URL: str
    BOOKING_MIN_LEAD_HOURS: int = 2
    BOOKING_MAX_HORIZON_DAYS: int = 60
    REMINDER_LEAD_HOURS: int = 24
    REMINDER_SCAN_INTERVAL_HOURS: int = 1
    CANCELLATION_CUTOFF_HOURS: int = 24
    RATE_LIMIT_BOOKING_PER_MINUTE: int = 10

    # Phase 5: Customer account settings
    CUSTOMER_SESSION_EXPIRE_HOURS: int = 8
    CUSTOMER_REMEMBER_EXPIRE_DAYS: int = 30
    CUSTOMER_VERIFY_TOKEN_HOURS: int = 24
    CUSTOMER_RESET_TOKEN_HOURS: int = 1
    RATE_LIMIT_ACCOUNT_PER_MINUTE: int = 10

    # Set False for local HTTP development so the session cookie is stored
    # by the browser; MUST be True in production (HTTPS).
    COOKIE_SECURE: bool = False

    # CORS: the browser sends the session cookie (credentials: 'include'), so
    # the allowed origins MUST be listed explicitly — "*" is rejected by the
    # browser together with credentials. Override in production via env
    # (JSON list, e.g. CORS_ORIGINS='["https://salon.example"]').
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
