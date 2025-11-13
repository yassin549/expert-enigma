"""
Candle Model - OHLCV Market Data
"""

from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal
from enum import Enum


class Timeframe(str, Enum):
    """Candle timeframe"""
    M1 = "1m"   # 1 minute
    M5 = "5m"   # 5 minutes
    M15 = "15m" # 15 minutes
    M30 = "30m" # 30 minutes
    H1 = "1h"   # 1 hour
    H4 = "4h"   # 4 hours
    D1 = "1d"   # 1 day
    W1 = "1w"   # 1 week


class Candle(SQLModel, table=True):
    """
    OHLCV candle data for charts and technical analysis
    
    Indexed on (instrument_id, timestamp, timeframe) for fast queries
    """
    __tablename__ = "candles"
    
    # Primary Key
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Foreign Keys
    instrument_id: int = Field(foreign_key="instruments.id", index=True)
    
    # Timestamp (indexed for time-based queries)
    timestamp: datetime = Field(index=True, description="Candle start time")
    
    # Timeframe
    timeframe: Timeframe = Field(index=True)
    
    # OHLC Prices
    open: Decimal = Field(
        description="Open price"
    )
    
    high: Decimal = Field(
        description="High price"
    )
    
    low: Decimal = Field(
        description="Low price"
    )
    
    close: Decimal = Field(
        description="Close price"
    )
    
    # Volume
    volume: Decimal = Field(
        default=Decimal("0"),
        description="Trading volume"
    )
    
    # Additional Data
    num_trades: Optional[int] = Field(
        default=None,
        description="Number of trades in this candle"
    )
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "instrument_id": 1,
                "timestamp": "2025-01-01T00:00:00Z",
                "timeframe": "1h",
                "open": "45000.00",
                "high": "45500.00",
                "low": "44800.00",
                "close": "45200.00",
                "volume": "125.5",
            }
        }
