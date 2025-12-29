"""
Centralized Configuration for CDRRMO File Manager

This module provides a single source of truth for all application settings.
Using Pydantic Settings ensures type safety and automatic environment variable loading.

WHY THIS FILE EXISTS:
- Before: Settings were scattered across multiple files (main.py, security.py, files.py)
- After: All settings in one place, easy to manage and modify

USAGE:
    from config import settings
    print(settings.SECRET_KEY)
    print(settings.MAX_FILE_SIZE)
"""

import os
from pydantic_settings import BaseSettings
from typing import Set


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.
    
    All settings have sensible defaults for development.
    In production, set these via .env file or environment variables.
    """
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/cdrrmo_db"
    
    # Security
    SECRET_KEY: str = ""  # Must be set in production!
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    
    # File Storage
    BASE_DIR: str = "CDRRMO files"
    VERSIONS_DIR: str = "file_versions"
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100 MB
    
    # Allowed file extensions (stored as comma-separated string, converted to set)
    ALLOWED_EXTENSIONS_STR: str = ".pdf,.docx,.xlsx,.pptx"
    
    @property
    def ALLOWED_EXTENSIONS(self) -> Set[str]:
        """Convert comma-separated extensions to a set."""
        return set(ext.strip() for ext in self.ALLOWED_EXTENSIONS_STR.split(","))
    
    @property
    def CORS_ORIGINS_LIST(self) -> list:
        """Convert comma-separated origins to a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    def validate_secret_key(self) -> None:
        """
        Ensure SECRET_KEY is set and secure.
        Called during application startup.
        """
        if not self.SECRET_KEY:
            raise ValueError(
                "SECRET_KEY environment variable is required. "
                "Generate one with: openssl rand -hex 32"
            )
        if len(self.SECRET_KEY) < 32:
            raise ValueError(
                "SECRET_KEY must be at least 32 characters for security. "
                "Generate one with: openssl rand -hex 32"
            )
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra env vars


# Create global settings instance
settings = Settings()
