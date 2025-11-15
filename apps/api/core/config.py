"""
Application Configuration
Centralized settings management using Pydantic
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union
from functools import lru_cache
import json


class Settings(BaseSettings):
    """Application settings"""
    
    # Application
    APP_NAME: str = "Topcoin API"
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "DEBUG"
    API_URL: str = "http://localhost:8000"
    WEB_URL: str = "http://localhost:3000"
    
    # Database
    DATABASE_URL: str
    DB_ECHO: bool = False
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # JWT Authentication
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # NOWPayments.io (Critical - Crypto deposits)
    NOWPAYMENTS_API_KEY: str
    NOWPAYMENTS_PUBLIC_KEY: str
    NOWPAYMENTS_IPN_SECRET: str
    NOWPAYMENTS_SANDBOX: bool = True
    NOWPAYMENTS_API_URL: str = "https://api.nowpayments.io/v1"
    
    # CORS - Can be set via environment variable as comma-separated list or JSON array
    # Example: CORS_ORIGINS=["http://localhost:3000","https://example.com"] or CORS_ORIGINS=http://localhost:3000,https://example.com
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:8000", "http://localhost:8080"]
    
    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """Parse CORS origins from environment variable"""
        if isinstance(v, str):
            # Try to parse as JSON array first
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                pass
            # If not JSON, treat as comma-separated string
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v if isinstance(v, list) else []
    
    # Admin
    ADMIN_EMAIL: str = "admin@topcoin.local"
    ADMIN_PASSWORD: str
    ADMIN_IP_WHITELIST: List[str] = ["127.0.0.1", "::1"]
    
    # Security
    SESSION_SECRET: str
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1"]
    
    # Feature Flags
    ENABLE_KYC_AUTO_APPROVAL: bool = True
    ENABLE_DEMO_ACCOUNTS: bool = False
    ENABLE_AI_INVESTMENT_PLANS: bool = True
    ENABLE_2FA: bool = True
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000
    
    # AML Configuration
    AML_THRESHOLD_USD: float = 10000.0
    AML_VELOCITY_CHECK_HOURS: int = 24
    AML_RAPID_WITHDRAWAL_COUNT: int = 3
    
    # Withdrawal Limits
    WITHDRAWAL_MIN_USD: float = 10.0
    WITHDRAWAL_MAX_USD: float = 100000.0
    WITHDRAWAL_DAILY_LIMIT_USD: float = 50000.0
    
    # Business Wallet
    BUSINESS_WALLET_INITIAL_BALANCE: float = 250000.0
    BUSINESS_WALLET_RESERVE_PERCENT: float = 20.0
    
    # Regulatory
    CMF_LICENSE_NUMBER: str = "CMF-2024-001"
    MSB_REGISTRATION_NUMBER: str = "MSB-2024-TOPCOIN-001"
    
    # Monitoring
    SENTRY_DSN: str = ""
    PROMETHEUS_ENABLED: bool = True
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Global settings instance
settings = get_settings()
