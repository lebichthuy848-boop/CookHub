from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]
MEDIA_ROOT = BACKEND_DIR / 'media'

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / '.env', extra='ignore')
    database_url: str
    cors_origins: list[str] = ['http://localhost:5173', 'http://127.0.0.1:5173']
    cookie_secure: bool = False
    session_hours: int = 12
    frontend_url: str = 'http://127.0.0.1:5173'
    smtp_host: str = ''
    smtp_port: int = 587
    smtp_username: str = ''
    smtp_password: str = ''
    smtp_from: str = ''
    smtp_starttls: bool = True

settings = Settings()

