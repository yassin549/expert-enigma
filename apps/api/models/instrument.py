"""
Instrument Model - Tradeable Financial Instruments
"""

from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal
from enum import Enum


class InstrumentType(str, Enum):
    """Financial instrument type"""
    FOREX = "forex"
    CRYPTO = "crypto"
    STOCK = "stock"
    INDEX = "index"
    COMMODITY = "commodity"


class Instrument(SQLModel, table=True):
    """
    Tradeable instruments (currency pairs, crypto, stocks, etc.)
    """
    __tablename__ = "instruments"
    
    # Primary Key
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Instrument Info
    symbol: str = Field(
        unique=True,
        index=True,
        max_length=20,
        description="Trading symbol (e.g., BTC/USD, EUR/USD)"
    )
    
    name: str = Field(
        max_length=100,
        description="Full name (e.g., Bitcoin / US Dollar)"
    )
    
    type: InstrumentType = Field(index=True)
    
    # Trading Parameters
    min_size: Decimal = Field(
        description="Minimum order size"
    )
    
    max_size: Decimal = Field(
        description="Maximum order size"
    )
    
    tick_size: Decimal = Field(
        description="Minimum price increment"
    )
    
    # Spread & Commission
    spread_pct: Decimal = Field(
        default=Decimal("0.001"),
        description="Spread percentage (e.g., 0.001 = 0.1%)"
    )
    
    commission_pct: Decimal = Field(
        default=Decimal("0.001"),
        description="Commission percentage"
    )
    
    # Leverage
    max_leverage: int = Field(
        default=100,
        description="Maximum leverage allowed"
    )
    
    # Status
    is_active: bool = Field(default=True)
    is_tradeable: bool = Field(default=True)
    
    # Market Hours (JSON would be better, but keeping simple)
    trading_hours: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Trading hours description"
    )
    
    # Display
    display_order: int = Field(default=0)
    icon_url: Optional[str] = Field(default=None, max_length=500)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "symbol": "BTC/USD",
                "name": "Bitcoin / US Dollar",
                "type": "crypto",
                "min_size": "0.001",
                "max_size": "100.0",
                "tick_size": "0.01",
                "max_leverage": 100,
            }
        }
