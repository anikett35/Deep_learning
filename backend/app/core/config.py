"""
Application configuration for ModelGuard Backend.
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "ModelGuard — Model Protection & Extraction Verification Service"
    API_V1_STR: str = "/api/v1"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # Paths
    PROJECT_ROOT: Path = PROJECT_ROOT
    ARTIFACTS_DIR: Path = PROJECT_ROOT / "artifacts"
    VICTIM_CHECKPOINT: Path = PROJECT_ROOT / "artifacts" / "models" / "watermarked_victim" / "best.pt"
    BASELINE_CHECKPOINT: Path = PROJECT_ROOT / "artifacts" / "models" / "baseline" / "best.pt"
    TRIGGERS_PATH: Path = PROJECT_ROOT / "artifacts" / "triggers" / "secret_triggers.pt"
    TRIGGER_MANIFEST: Path = PROJECT_ROOT / "artifacts" / "triggers" / "trigger_manifest.json"
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:Aniket2325@localhost:5432/modelguard")
    
    # Security & Rate Limiting
    MAX_BATCH_SIZE: int = 128
    
    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
