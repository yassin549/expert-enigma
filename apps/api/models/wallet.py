"""
Wallet Model - Business Custody Wallet
"""

from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal
from enum import Enum


class WalletType(str, Enum):
    """Wallet type"""
    BUSINESS_DEPOSIT = "business_deposit"  # Pooled user deposits


class Wallet(SQLModel, table=True):
    """
    Business wallet for custody of pooled user deposits
    
    All user deposits go into this business wallet.
    Payouts are sent from this wallet.
    Must maintain sufficient balance for pending withdrawals.
    """
    __tablename__ = "wallets"
    
    # Primary Key
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Wallet Type
    type: WalletType = Field(default=WalletType.BUSINESS_DEPOSIT, index=True)
    
    # External Reference (e.g., crypto wallet address)
    external_ref: Optional[str] = Field(
        default=None,
        max_length=500,
        description="External wallet address or ID"
    )
    
    # Balance
    balance: Decimal = Field(
        default=Decimal("0.00"),
        description="Current wallet balance"
    )
    
    currency: str = Field(default="USD", max_length=10)
    
    # Reserved for pending withdrawals
    reserved_amount: Decimal = Field(
        default=Decimal("0.00"),
        description="Amount reserved for pending withdrawals"
    )
    
    # Available balance
    available_balance: Decimal = Field(
        default=Decimal("0.00"),
        description="Balance - Reserved = Available"
    )
    
    # Reconciliation
    reconciled_at: Optional[datetime] = Field(
        default=None,
        description="Last reconciliation timestamp"
    )
    
    reconciliation_status: Optional[str] = Field(
        default=None,
        max_length=50
    )
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "type": "business_deposit",
                "balance": "250000.00",
                "currency": "USD",
                "reserved_amount": "5000.00",
                "available_balance": "245000.00",
            }
        }
