"""
Support Ticket Model - Customer Support System
"""

from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class TicketStatus(str, Enum):
    """Support ticket status"""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    WAITING_USER = "waiting_user"
    RESOLVED = "resolved"
    CLOSED = "closed"


class TicketPriority(str, Enum):
    """Support ticket priority"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class SupportTicket(SQLModel, table=True):
    """
    Customer support tickets
    
    Users can:
    - Report issues
    - Request assistance
    - Dispute transactions
    - Ask questions
    """
    __tablename__ = "support_tickets"
    
    # Primary Key
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Foreign Keys
    user_id: int = Field(foreign_key="users.id", index=True)
    
    # Ticket Details
    subject: str = Field(
        max_length=200,
        description="Ticket subject/title"
    )
    
    description: str = Field(
        max_length=5000,
        description="Detailed description of the issue"
    )
    
    category: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Ticket category (account, deposit, withdrawal, trading, etc.)"
    )
    
    # Status & Priority
    status: TicketStatus = Field(default=TicketStatus.OPEN, index=True)
    priority: TicketPriority = Field(default=TicketPriority.MEDIUM, index=True)
    
    # Assignment
    assigned_to: Optional[int] = Field(
        default=None,
        foreign_key="users.id",
        description="Admin assigned to this ticket"
    )
    
    # Resolution
    resolution: Optional[str] = Field(
        default=None,
        max_length=5000,
        description="Resolution details"
    )
    
    # Related Objects
    related_type: Optional[str] = Field(
        default=None,
        max_length=50,
        description="Related object type (deposit, withdrawal, order, etc.)"
    )
    
    related_id: Optional[int] = Field(
        default=None,
        description="Related object ID"
    )
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = Field(default=None)
    closed_at: Optional[datetime] = Field(default=None)
    
    # SLA tracking
    first_response_at: Optional[datetime] = Field(default=None)
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "subject": "Withdrawal not received",
                "description": "I requested a withdrawal 3 days ago but haven't received it yet",
                "category": "withdrawal",
                "status": "open",
                "priority": "high",
            }
        }
