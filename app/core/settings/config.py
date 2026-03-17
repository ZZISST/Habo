from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


def find_dotenv(filename=".env", max_parent_levels=5) -> str | None:
    """
    Finds the .env file by searching upwards in the directory tree.
    """
    current_dir = Path(__file__).parent.resolve()
    for _ in range(max_parent_levels):
        env_path = current_dir / filename
        if env_path.exists():
            return str(env_path)
        current_dir = current_dir.parent
    return None


class Settings(BaseSettings):
    """
    Application configuration settings loaded from environment variables.
    """
    _env_file = find_dotenv()

    model_config = SettingsConfigDict(
        env_file=_env_file if _env_file else None,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database settings
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    DB_SERVER: str = "localhost"
    POSTGRES_DB: str = "habo_db"
    POSTGRES_PORT: int = 5432

    # Security settings
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Redis settings
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str = ""

    # Ollama settings
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"
    OLLAMA_TIMEOUT: int = 60

    # Application settings
    APP_NAME: str = "HABO Financial Manager"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://"
            f"{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@"
            f"{self.DB_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def REDIS_URL(self) -> str:
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"


# Create settings instance
settings = Settings()
