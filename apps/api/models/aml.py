"""
AML Alert Model - Anti-Money Laundering Monitoring
"""

from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class AMLSeverity(str, Enum):
    """AML alert severity"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AMLAlert(SQLModel, table=True):
    """
    AML alerts for suspicious activity monitoring
    
    Auto-generated based on rules:
    - Large deposits (> $10k)
    - Rapid in/out patterns
    - Multiple failed withdrawals
    - Unusual trading patterns
    - Velocity checks
    """
    __tablename__ = "aml_alerts"
    
    # Primary Key
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Foreign Keys
    user_id: int = Field(foreign_key="users.id", index=True)
    
    # Alert Details
    type: str = Field(
        max_length=100,
        index=True,
        description="Alert type (e.g., large_deposit, rapid_withdrawal)"
    )
    
    severity: AMLSeverity = Field(index=True)
    
    # Transaction Reference
    tx_id: Optional[int] = Field(
        default=None,
        description="Related transaction ID"
    )
    
    tx_type: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Transaction type (deposit, withdrawal, etc.)"
    )
    
    # Details
    details: Dict[str, Any] = Field(
        default={},
        sa_column=Column(JSON),
        description="Alert details and triggering data"
    )
    
    description: str = Field(
        max_length=1000,
        description="Human-readable alert description"
    )
    
    # Review Status
    status: str = Field(
        default="pending",
        max_length=50,
        index=True,
        description="pending, under_review, resolved, escalated"
    )
    
    reviewed_by: Optional[int] = Field(
        default=None,
        foreign_key="users.id",
        description="Admin who reviewed the alert"
    )
    
    reviewed_at: Optional[datetime] = Field(default=None)
    
    resolution_notes: Optional[str] = Field(
        default=None,
        max_length=2000
    )
    
    # Actions Taken
    action_taken: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Actions taken (e.g., account frozen, withdrawal blocked)"
    )
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    resolved_at: Optional[datetime] = Field(default=None)
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "type": "large_deposit",
                "severity": "medium",
                "description": "Large deposit of $15,000 detected",
                "status": "pending",
                "details": {
                    "amount": 15000,
                    "threshold": 10000,
                    "currency": "USD"
                }
            }
        }
