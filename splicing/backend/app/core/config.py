import os

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Splicing"
    REDIS_URL: str = Field(default="redis://localhost:6379", env="REDIS_URL")
    SOURCE_DIR: str = Field(
        default=os.path.dirname(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        ),
        env="PROJECT_SOURCE_DIR",
    )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
