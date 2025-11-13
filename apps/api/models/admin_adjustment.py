"""
Admin Adjustment Model - Manual Returns Management
CRITICAL TABLE for admin-managed returns system
"""

from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal
from enum import Enum


class AdjustmentType(str, Enum):
    """Type of admin adjustment"""
    MANUAL_PROFIT = "manual_profit"  # Credit profits from external trading
    MANUAL_LOSS = "manual_loss"  # Debit losses from external trading
    RETURN_UPDATE = "return_update"  # Apply % return to account
    EQUITY_ADJUSTMENT = "equity_adjustment"  # General equity adjustment
    CORRECTION = "correction"  # Correction of errors
    BONUS = "bonus"  # Promotional bonus
    PENALTY = "penalty"  # Penalty or fee


class AdminAdjustment(SQLModel, table=True):
    """
    Complete audit trail for all manual balance adjustments
    
    This table is CRITICAL for:
    1. Admin manually updating user virtual balances
    2. Tracking all changes with before/after snapshots
    3. Compliance and regulator reporting
    4. Dispute resolution
    
    Workflow:
    1. Admin reviews external trading results
    2. Admin calculates profits/losses for user accounts
    3. Admin adjusts virtual_balance with reason
    4. System creates AdminAdjustment record
    5. Complete audit trail maintained
    """
    __tablename__ = "admin_adjustments"
    
    # Primary Key
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Foreign Keys
    account_id: int = Field(foreign_key="accounts.id", index=True)
    admin_user_id: int = Field(
        foreign_key="users.id",
        index=True,
        description="Admin who made the adjustment"
    )
    
    # Adjustment Details
    adjustment_type: AdjustmentType = Field(index=True)
    
    amount: Decimal = Field(
        description="Amount adjusted (positive for credit, negative for debit)"
    )
    
    # Audit Trail - Before/After Snapshots
    previous_balance: Decimal = Field(
        description="Virtual balance before adjustment"
    )
    
    new_balance: Decimal = Field(
        description="Virtual balance after adjustment"
    )
    
    # Justification (REQUIRED for compliance)
    reason: str = Field(
        max_length=1000,
        description="Detailed reason for adjustment (required for audit)"
    )
    
    # Optional: Reference to external data
    reference_id: Optional[str] = Field(
        default=None,
        max_length=100,
        description="External reference (e.g., trade ID, batch ID)"
    )
    
    # Metadata
    ip_address: Optional[str] = Field(default=None, max_length=50)
    user_agent: Optional[str] = Field(default=None, max_length=500)
    
    # Approval (for large adjustments)
    requires_approval: bool = Field(default=False)
    approved_by: Optional[int] = Field(default=None, foreign_key="users.id")
    approved_at: Optional[datetime] = Field(default=None)
    
    # Timestamps
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        index=True,
        description="When adjustment was made"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "account_id": 1,
                "admin_user_id": 2,
                "adjustment_type": "manual_profit",
                "amount": "150.00",
                "previous_balance": "10000.00",
                "new_balance": "10150.00",
                "reason": "Applied +1.5% return from Conservative AI plan for January 2025",
            }
        }
