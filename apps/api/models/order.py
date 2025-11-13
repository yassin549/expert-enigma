"""
Order Model - Simulated Trading Orders
"""

from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal
from enum import Enum


class OrderSide(str, Enum):
    """Order side"""
    BUY = "buy"
    SELL = "sell"


class OrderType(str, Enum):
    """Order type"""
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"
    TAKE_PROFIT = "take_profit"
    TRAILING_STOP = "trailing_stop"
    OCO = "oco"  # One-Cancels-Other


class OrderStatus(str, Enum):
    """Order status"""
    PENDING = "pending"
    FILLED = "filled"
    PARTIALLY_FILLED = "partially_filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"
    EXPIRED = "expired"


class Order(SQLModel, table=True):
    """
    Simulated trading orders
    
    IMPORTANT: All orders are virtual_trade = TRUE
    NO orders are sent to real brokers
    All fills are simulated using our trading engine
    """
    __tablename__ = "orders"
    
    # Primary Key
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Foreign Keys
    account_id: int = Field(foreign_key="accounts.id", index=True)
    instrument_id: int = Field(foreign_key="instruments.id", index=True)
    
    # Order Details
    side: OrderSide = Field(index=True)
    type: OrderType = Field(index=True)
    
    size: Decimal = Field(
        description="Order size/quantity"
    )
    
    # Prices
    price: Optional[Decimal] = Field(
        default=None,
        description="Limit price (for limit orders)"
    )
    
    stop_price: Optional[Decimal] = Field(
        default=None,
        description="Stop price (for stop orders)"
    )
    
    # Fill Details
    fill_price: Optional[Decimal] = Field(
        default=None,
        description="Actual fill price"
    )
    
    filled_size: Decimal = Field(
        default=Decimal("0"),
        description="Size filled so far"
    )
    
    # Slippage & Fees
    slippage: Decimal = Field(
        default=Decimal("0"),
        description="Slippage in price"
    )
    
    fee: Decimal = Field(
        default=Decimal("0"),
        description="Trading fee"
    )
    
    # P&L (for closed positions)
    pnl: Optional[Decimal] = Field(
        default=None,
        description="Realized P&L from this order"
    )
    
    # Status
    status: OrderStatus = Field(default=OrderStatus.PENDING, index=True)
    
    # CRITICAL: All trades are virtual
    virtual_trade: bool = Field(
        default=True,
        description="Always TRUE - no real broker integration"
    )
    
    # Stop Loss / Take Profit
    sl_price: Optional[Decimal] = Field(
        default=None,
        description="Stop loss price"
    )
    
    tp_price: Optional[Decimal] = Field(
        default=None,
        description="Take profit price"
    )
    
    # Leverage
    leverage: int = Field(default=1, description="Leverage multiplier")
    
    # Margin
    margin_required: Decimal = Field(
        default=Decimal("0"),
    )
    
    # Timestamps
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        index=True
    )
    filled_at: Optional[datetime] = Field(default=None)
    cancelled_at: Optional[datetime] = Field(default=None)
    expires_at: Optional[datetime] = Field(default=None)
    
    class Config:
        json_schema_extra = {
            "example": {
                "account_id": 1,
                "instrument_id": 1,
                "side": "buy",
                "type": "market",
                "size": "0.1",
                "status": "filled",
                "fill_price": "45000.00",
                "virtual_trade": True,
            }
        }
