"""
User Model - Authentication and KYC
"""

from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
from enum import Enum


class KYCStatus(str, Enum):
    """KYC verification status"""
    PENDING = "pending"
    AUTO_APPROVED = "auto_approved"  # Instant approval, admin reviews later
    APPROVED = "approved"  # Explicitly approved by admin
    REJECTED = "rejected"


class User(SQLModel, table=True):
    """
    User account with authentication and KYC
    
    Critical fields:
    - can_access_trading: FALSE until first deposit confirmed
    - kyc_status: Auto-approved on submission, admin reviews post-approval
    """
    __tablename__ = "users"
    
    # Primary Key
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Authentication
    email: str = Field(unique=True, index=True, max_length=255)
    hashed_password: str = Field(max_length=255)
    
    # Profile
    display_name: Optional[str] = Field(default=None, max_length=100)
    region: Optional[str] = Field(default=None, max_length=50)
    
    # KYC Fields
    kyc_status: KYCStatus = Field(default=KYCStatus.PENDING)
    kyc_submitted_at: Optional[datetime] = Field(default=None)
    kyc_reviewed_at: Optional[datetime] = Field(default=None)
    kyc_reviewed_by: Optional[int] = Field(default=None, foreign_key="users.id")  # Admin user ID
    kyc_rejection_reason: Optional[str] = Field(default=None, max_length=500)
    
    # KYC Documents (stored as JSON paths or URLs)
    kyc_id_document: Optional[str] = Field(default=None, max_length=500)
    kyc_selfie: Optional[str] = Field(default=None, max_length=500)
    kyc_proof_of_address: Optional[str] = Field(default=None, max_length=500)
    
    # Access Control
    can_access_trading: bool = Field(default=False)  # Set to TRUE after first deposit
    is_admin: bool = Field(default=False)
    is_active: bool = Field(default=True)
    is_banned: bool = Field(default=False)
    
    # Investment Plan
    plan_id: Optional[int] = Field(default=None, foreign_key="ai_investment_plans.id")
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = Field(default=None)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships (will be defined with back_populates)
    # accounts: List["Account"] = Relationship(back_populates="user")
    # deposits: List["Deposit"] = Relationship(back_populates="user")
    # withdrawals: List["Withdrawal"] = Relationship(back_populates="user")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "display_name": "John Doe",
                "kyc_status": "auto_approved",
                "can_access_trading": True,
            }
        }
