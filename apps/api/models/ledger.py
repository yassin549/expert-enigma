"""
Ledger Entry Model - Immutable Audit Trail
"""

from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON
from typing import Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
from enum import Enum


class EntryType(str, Enum):
    """Ledger entry type"""
    DEPOSIT = "deposit"  # User deposit credited
    WITHDRAWAL = "withdrawal"  # User withdrawal debited
    ADMIN_ADJUSTMENT = "admin_adjustment"  # Admin manual adjustment
    TRADE_PNL = "trade_pnl"  # Realized P&L from trade
    FEE = "fee"  # Trading or processing fee
    BONUS = "bonus"  # Promotional bonus
    CORRECTION = "correction"  # Error correction
    # AI Investment Plan Entries
    INVESTMENT_ALLOCATION = "investment_allocation"  # Allocation to AI plan
    INVESTMENT_RETURN = "investment_return"  # Return from AI plan
    INVESTMENT_WITHDRAWAL = "investment_withdrawal"  # Withdrawal from AI plan


class LedgerEntry(SQLModel, table=True):
    """
    Immutable ledger for complete audit trail
    
    Every transaction that affects account balance must create a ledger entry:
    - Deposits
    - Withdrawals
    - Admin adjustments
    - Trade P&L
    - Fees
    
    This provides:
    - Complete transaction history
    - Audit trail for regulators
    - Balance reconciliation
    - Dispute resolution evidence
    """
    __tablename__ = "ledger_entries"
    
    # Primary Key
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Foreign Keys
    account_id: int = Field(foreign_key="accounts.id", index=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    
    # Entry Details
    entry_type: EntryType = Field(index=True)
    
    amount: Decimal = Field(
        max_digits=20,
        decimal_places=2,
        description="Amount (positive = credit, negative = debit)"
    )
    
    balance_after: Decimal = Field(
        max_digits=20,
        decimal_places=2,
        description="Account virtual_balance after this entry"
    )
    
    # Description
    description: str = Field(
        max_length=500,
        description="Human-readable description"
    )
    
    # Reference to Source Transaction
    reference_type: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Type of source (deposit, withdrawal, order, etc.)"
    )
    
    reference_id: Optional[int] = Field(
        default=None,
        description="ID of source transaction"
    )
    
    # Metadata (store additional context)
    meta: Dict[str, Any] = Field(
        default={},
        sa_column=Column(JSON),
        description="Additional metadata"
    )
    
    # Timestamps (immutable - no updates allowed)
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        index=True,
        description="Entry timestamp (immutable)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "account_id": 1,
                "user_id": 1,
                "entry_type": "admin_adjustment",
                "amount": "150.00",
                "balance_after": "10150.00",
                "description": "Admin applied +1.5% return from Conservative AI plan",
                "reference_type": "admin_adjustment",
                "reference_id": 42,
            }
        }
