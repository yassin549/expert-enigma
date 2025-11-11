"""
Withdrawal Model - User Payout Requests
"""

from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON
from typing import Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
from enum import Enum


class WithdrawalStatus(str, Enum):
    """Withdrawal status"""
    PENDING = "pending"  # Awaiting admin review
    APPROVED = "approved"  # Admin approved, ready to send
    PROCESSING = "processing"  # Payment being sent
    COMPLETED = "completed"  # Successfully sent
    REJECTED = "rejected"  # Rejected by admin
    FAILED = "failed"  # Payment failed


class Withdrawal(SQLModel, table=True):
    """
    User withdrawal/payout requests
    
    Workflow:
    1. User requests withdrawal (amount + crypto address)
    2. System validates: KYC approved, sufficient virtual_balance, no AML flags
    3. Create withdrawal record with status=pending
    4. Admin reviews (checks balance, AML, available funds)
    5. Admin approves/rejects
    6. On approval: deduct virtual_balance, send crypto, create ledger entry
    """
    __tablename__ = "withdrawals"
    
    # Primary Key
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Foreign Keys
    user_id: int = Field(foreign_key="users.id", index=True)
    
    # Withdrawal Details
    amount_requested: Decimal = Field(
        max_digits=20,
        decimal_places=2,
        description="Amount requested in USD"
    )
    
    amount_approved: Optional[Decimal] = Field(
        default=None,
        max_digits=20,
        decimal_places=2,
        description="Amount approved by admin (may differ from requested)"
    )
    
    amount_sent: Optional[Decimal] = Field(
        default=None,
        max_digits=20,
        decimal_places=8,
        description="Amount actually sent in cryptocurrency"
    )
    
    currency: str = Field(
        max_length=10,
        description="Cryptocurrency for payout (BTC, ETH, USDT, etc.)"
    )
    
    # Status
    status: WithdrawalStatus = Field(default=WithdrawalStatus.PENDING, index=True)
    
    # Payout Address
    payout_address: str = Field(
        max_length=500,
        description="User's crypto address for payout"
    )
    
    # Admin Review
    admin_review_id: Optional[int] = Field(
        default=None,
        foreign_key="users.id",
        description="Admin who reviewed the withdrawal"
    )
    
    admin_notes: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Admin review notes"
    )
    
    rejection_reason: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Reason for rejection"
    )
    
    # Transaction Details
    tx_hash: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Blockchain transaction hash"
    )
    
    tx_meta: Dict[str, Any] = Field(
        default={},
        sa_column=Column(JSON),
        description="Transaction metadata"
    )
    
    # Fees
    network_fee: Optional[Decimal] = Field(
        default=None,
        max_digits=20,
        decimal_places=8
    )
    
    processing_fee: Optional[Decimal] = Field(
        default=None,
        max_digits=20,
        decimal_places=2,
        description="Platform processing fee"
    )
    
    # Timestamps
    requested_at: datetime = Field(
        default_factory=datetime.utcnow,
        index=True
    )
    reviewed_at: Optional[datetime] = Field(default=None)
    processed_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "amount_requested": "1000.00",
                "amount_approved": "1000.00",
                "currency": "USDT",
                "status": "approved",
                "payout_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            }
        }
