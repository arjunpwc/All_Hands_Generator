from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "AllHands Web"
    data_dir: str = "../data"  # override with DATA_DIR env var
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    host_key: str = "change-me-in-production"

    @property
    def sessions_dir(self) -> str:
        return f"{self.data_dir}/sessions"

    @property
    def uploads_dir(self) -> str:
        return f"{self.data_dir}/uploads"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    class Config:
        env_file = ".env"


settings = Settings()
