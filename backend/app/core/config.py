from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    RETENTION_GUEST_MONTHS: int = 12
    RETENTION_CUSTOMER_MONTHS: int = 24

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
