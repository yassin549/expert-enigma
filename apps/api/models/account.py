"""
Account Model - Trading Accounts with Virtual Balance System
"""

from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal


class Account(SQLModel, table=True):
    """
    Trading account with CRITICAL separation of real and virtual money
    
    CRITICAL FIELDS:
    - deposited_amount: Real money deposited by user (in business wallet)
    - virtual_balance: Simulated trading balance (what user sees and trades with)
    
    These are COMPLETELY SEPARATE:
    - User deposits $500 (deposited_amount = 500)
    - Admin gives $10,000 virtual balance (virtual_balance = 10000)
    - User trades with $10,000 virtual
    - Admin manually updates virtual_balance based on external trading results
    """
    __tablename__ = "accounts"
    
    # Primary Key
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Foreign Keys
    user_id: int = Field(foreign_key="users.id", index=True)
    
    # Account Info
    name: str = Field(max_length=100, default="Main Account")
    base_currency: str = Field(default="USD", max_length=10)
    
    # CRITICAL: Real Money vs Virtual Money Separation
    deposited_amount: Decimal = Field(
        default=Decimal("0.00"),
        decimal_places=2,
        description="Real money deposited (held in business wallet)"
    )
    
    virtual_balance: Decimal = Field(
        default=Decimal("0.00"),
        decimal_places=2,
        description="Virtual trading balance (what user sees and trades with)"
    )
    
    # Cached Equity (for performance)
    equity_cached: Decimal = Field(
        default=Decimal("0.00"),
        decimal_places=2,
        description="Cached equity: virtual_balance + unrealized_pnl"
    )
    
    # Margin Management
    margin_used: Decimal = Field(
        default=Decimal("0.00"),
        decimal_places=2
    )
    
    margin_available: Decimal = Field(
        default=Decimal("0.00"),
        decimal_places=2
    )
    
    # Performance Tracking
    total_trades: int = Field(default=0)
    winning_trades: int = Field(default=0)
    losing_trades: int = Field(default=0)
    
    total_pnl: Decimal = Field(
        default=Decimal("0.00"),
        decimal_places=2,
        description="Total realized P&L (from closed trades)"
    )
    
    # Status
    is_active: bool = Field(default=True)
    is_frozen: bool = Field(default=False)  # Admin can freeze account
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_trade_at: Optional[datetime] = Field(default=None)
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "name": "Main Account",
                "deposited_amount": "500.00",
                "virtual_balance": "10000.00",
                "equity_cached": "10000.00",
            }
        }
