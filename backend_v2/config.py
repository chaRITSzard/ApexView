"""
Configuration for the ApexView backend
"""
import os
from functools import lru_cache
from pydantic import BaseModel

# Base directory for the application
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

class Settings(BaseModel):
    """API settings configuration"""
    # Application settings
    APP_NAME: str = "ApexView F1 API"
    API_PREFIX: str = "/api"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Cache settings
    CACHE_DIR: str = os.path.join(os.path.dirname(BASE_DIR), "f1_cache")
    IN_MEMORY_CACHE_SIZE: int = 512
    RACE_CACHE_TTL: int = 60 * 60 * 24 * 7  # 1 week
    SESSION_CACHE_TTL: int = 60 * 60 * 24 * 2  # 2 days
    DRIVER_CACHE_TTL: int = 60 * 60 * 24  # 1 day
    
    # CORS settings
    CORS_ORIGINS: list = ["*"]
    CORS_METHODS: list = ["*"]
    
    # Performance settings
    TELEMETRY_DATA_LIMIT: int = 200
    PREFETCH_YEARS: list = [2021, 2022, 2023, 2024, 2025]

@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
