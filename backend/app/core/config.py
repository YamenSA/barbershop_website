from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    RETENTION_GUEST_MONTHS: int = 12
    RETENTION_CUSTOMER_MONTHS: int = 24

    # Phase 1: Admin & Auth
    JWT_SECRET_KEY: str
    SESSION_EXPIRE_HOURS: int = 8
    ADMIN_USERNAME: str
    ADMIN_PASSWORD: str
    RATE_LIMIT_LOGIN_PER_MINUTE: int = 20

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
