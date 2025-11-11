"""
Audit Model - Complete Admin Action Trail
"""

from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON
from typing import Optional, Dict, Any
from datetime import datetime


class Audit(SQLModel, table=True):
    """
    Audit log for all administrative actions
    
    Tracks:
    - Who performed the action
    - What action was performed
    - When it was performed
    - What changed (before/after diff)
    - Why it was performed (reason)
    
    Used for:
    - Regulatory compliance
    - Security monitoring
    - Dispute resolution
    - Admin accountability
    """
    __tablename__ = "audits"
    
    # Primary Key
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Actor (who performed the action)
    actor_user_id: int = Field(
        foreign_key="users.id",
        index=True,
        description="Admin user who performed the action"
    )
    
    # Action Details
    action: str = Field(
        max_length=100,
        index=True,
        description="Action type (e.g., adjust_balance, approve_withdrawal)"
    )
    
    # Target Object
    object_type: str = Field(
        max_length=50,
        index=True,
        description="Type of object (user, account, withdrawal, etc.)"
    )
    
    object_id: int = Field(
        index=True,
        description="ID of the affected object"
    )
    
    # Changes (before/after diff)
    diff: Dict[str, Any] = Field(
        default={},
        sa_column=Column(JSON),
        description="Before/after changes"
    )
    
    # Justification
    reason: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Reason for the action"
    )
    
    # Context
    ip_address: Optional[str] = Field(
        default=None,
        max_length=50
    )
    
    user_agent: Optional[str] = Field(
        default=None,
        max_length=500
    )
    
    # Additional Metadata
    metadata: Dict[str, Any] = Field(
        default={},
        sa_column=Column(JSON)
    )
    
    # Timestamp
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        index=True
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "actor_user_id": 2,
                "action": "adjust_balance",
                "object_type": "account",
                "object_id": 1,
                "diff": {
                    "virtual_balance": {
                        "before": "10000.00",
                        "after": "10150.00"
                    }
                },
                "reason": "Applied +1.5% monthly return",
                "ip_address": "192.168.1.1"
            }
        }
