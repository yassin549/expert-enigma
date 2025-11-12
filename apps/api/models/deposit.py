"""
Deposit Model - User Crypto Deposits via NOWPayments
"""

from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON, Numeric
from typing import Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
from enum import Enum


class DepositStatus(str, Enum):
    """Deposit status"""
    PENDING = "pending"  # Waiting for blockchain confirmation
    CONFIRMING = "confirming"  # Confirmations in progress
    CONFIRMED = "confirmed"  # Confirmed and credited
    FAILED = "failed"  # Failed or expired
    REFUNDED = "refunded"  # Refunded to user


class Deposit(SQLModel, table=True):
    """
    Crypto deposits via NOWPayments.io
    
    Workflow:
    1. User requests deposit (amount + cryptocurrency)
    2. System creates NOWPayments payment
    3. Deposit record created with status=pending
    4. User sends crypto to payment address
    5. NOWPayments webhook updates status
    6. On confirmed: credit deposited_amount, set can_access_trading=TRUE
    """
    __tablename__ = "deposits"
    
    # Primary Key
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Foreign Keys
    user_id: int = Field(foreign_key="users.id", index=True)
    
    # Deposit Details
    amount: Decimal = Field(
        sa_column=Column(Numeric(20, 8)),
        description="Amount in cryptocurrency"
    )
    
    amount_usd: Decimal = Field(
        sa_column=Column(Numeric(20, 2)),
        description="Amount in USD equivalent"
    )
    
    currency: str = Field(
        max_length=10,
        description="Cryptocurrency (BTC, ETH, USDT, etc.)"
    )
    
    # Status
    status: DepositStatus = Field(default=DepositStatus.PENDING, index=True)
    
    # NOWPayments Integration
    nowpayments_payment_id: Optional[str] = Field(
        default=None,
        max_length=100,
        index=True,
        description="NOWPayments payment ID"
    )
    
    payment_address: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Crypto address to send payment"
    )
    
    # Transaction Details
    tx_hash: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Blockchain transaction hash"
    )
    
    confirmations: int = Field(
        default=0,
        description="Number of blockchain confirmations"
    )
    
    required_confirmations: int = Field(
        default=3,
        description="Required confirmations for this cryptocurrency"
    )
    
    # Metadata (store full NOWPayments webhook data)
    tx_meta: Dict[str, Any] = Field(
        default={},
        sa_column=Column(JSON),
        description="Full transaction metadata from NOWPayments"
    )
    
    # Network Fees
    network_fee: Optional[Decimal] = Field(
        default=None,
        sa_column=Column(Numeric(20, 8))
    )
    
    # Reconciliation
    reconciled: bool = Field(default=False)
    reconciled_at: Optional[datetime] = Field(default=None)
    
    # Timestamps
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        index=True
    )
    confirmed_at: Optional[datetime] = Field(default=None)
    expired_at: Optional[datetime] = Field(default=None)
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "amount": "0.01500000",
                "amount_usd": "500.00",
                "currency": "BTC",
                "status": "confirmed",
                "nowpayments_payment_id": "5849048569",
            }
        }
