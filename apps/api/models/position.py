"""
Position Model - Open Trading Positions
"""

from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal
from enum import Enum


class PositionStatus(str, Enum):
    """Position status"""
    OPEN = "open"
    CLOSED = "closed"


class PositionSide(str, Enum):
    """Position side"""
    BUY = "buy"  # Long position
    SELL = "sell"  # Short position


class Position(SQLModel, table=True):
    """
    Open simulated trading positions
    
    Tracks:
    - Entry price and current price
    - Real-time unrealized P&L
    - Position size and leverage
    - Stop loss / Take profit levels
    """
    __tablename__ = "positions"
    
    # Primary Key
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Foreign Keys
    account_id: int = Field(foreign_key="accounts.id", index=True)
    instrument_id: int = Field(foreign_key="instruments.id", index=True)
    
    # Position Details
    side: str = Field(
        max_length=10,
        description="buy (long) or sell (short)"
    )
    
    size: Decimal = Field(
        max_digits=20,
        decimal_places=8,
        description="Position size"
    )
    
    # Prices
    entry_price: Decimal = Field(
        max_digits=20,
        decimal_places=8,
        description="Average entry price"
    )
    
    current_price: Decimal = Field(
        max_digits=20,
        decimal_places=8,
        description="Current market price (updated real-time)"
    )
    
    # P&L
    unrealized_pnl: Decimal = Field(
        default=Decimal("0"),
        max_digits=20,
        decimal_places=2,
        description="Unrealized profit/loss"
    )
    
    unrealized_pnl_pct: Decimal = Field(
        default=Decimal("0"),
        max_digits=10,
        decimal_places=2,
        description="Unrealized P&L percentage"
    )
    
    realized_pnl: Optional[Decimal] = Field(
        default=None,
        max_digits=20,
        decimal_places=2,
        description="Realized P&L (when closed)"
    )
    
    # Risk Management
    sl_price: Optional[Decimal] = Field(
        default=None,
        max_digits=20,
        decimal_places=8,
        description="Stop loss price"
    )
    
    tp_price: Optional[Decimal] = Field(
        default=None,
        max_digits=20,
        decimal_places=8,
        description="Take profit price"
    )
    
    # Leverage & Margin
    leverage: int = Field(default=1)
    
    margin_used: Decimal = Field(
        default=Decimal("0"),
        max_digits=20,
        decimal_places=2
    )
    
    # Status
    status: PositionStatus = Field(default=PositionStatus.OPEN, index=True)
    
    # Timestamps
    opened_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    closed_at: Optional[datetime] = Field(default=None)
    last_updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "account_id": 1,
                "instrument_id": 1,
                "side": "buy",
                "size": "0.1",
                "entry_price": "45000.00",
                "current_price": "45500.00",
                "unrealized_pnl": "50.00",
                "unrealized_pnl_pct": "1.11",
                "status": "open",
            }
        }
