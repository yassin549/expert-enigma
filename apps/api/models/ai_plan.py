"""
AI Investment Plan Models
"""

from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON
from typing import Optional, Dict, Any, List
from datetime import datetime
from decimal import Decimal
from enum import Enum


class RiskProfile(str, Enum):
    """Investment plan risk profile"""
    CONSERVATIVE = "conservative"  # Low risk, stable returns
    BALANCED = "balanced"  # Medium risk, balanced approach
    AGGRESSIVE = "aggressive"  # High risk, higher potential returns


class AIInvestmentPlan(SQLModel, table=True):
    """
    AI-powered investment plans with admin-managed returns
    
    Admin manually updates:
    - current_return_pct (monthly, quarterly, YTD)
    - equity_curve_data (historical performance)
    - Performance notes and commentary
    """
    __tablename__ = "ai_investment_plans"
    
    # Primary Key
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Plan Info
    name: str = Field(
        max_length=100,
        description="Plan name (e.g., Conservative AI Plan)"
    )
    
    risk_profile: RiskProfile = Field(index=True)
    
    description: str = Field(
        max_length=1000,
        description="Plan description and strategy"
    )
    
    # Performance (Admin-Managed)
    current_return_pct: Decimal = Field(
        default=Decimal("0.00"),
        max_digits=10,
        decimal_places=2,
        description="Current return percentage (e.g., 5.50 = +5.5%)"
    )
    
    monthly_return_pct: Decimal = Field(
        default=Decimal("0.00"),
        max_digits=10,
        decimal_places=2,
        description="Monthly return %"
    )
    
    quarterly_return_pct: Decimal = Field(
        default=Decimal("0.00"),
        max_digits=10,
        decimal_places=2,
        description="Quarterly return %"
    )
    
    ytd_return_pct: Decimal = Field(
        default=Decimal("0.00"),
        max_digits=10,
        decimal_places=2,
        description="Year-to-date return %"
    )
    
    # Equity Curve (Historical Performance)
    equity_curve_data: List[Dict[str, Any]] = Field(
        default=[],
        sa_column=Column(JSON),
        description="Array of {date, value} for equity curve chart"
    )
    
    # Statistics
    total_invested: Decimal = Field(
        default=Decimal("0.00"),
        max_digits=20,
        decimal_places=2,
        description="Total amount invested by all users"
    )
    
    active_investors: int = Field(
        default=0,
        description="Number of active investors"
    )
    
    # Admin Notes
    performance_notes: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Admin performance commentary"
    )
    
    # Status
    is_active: bool = Field(default=True)
    is_accepting_investments: bool = Field(default=True)
    
    # Limits
    min_investment: Decimal = Field(
        default=Decimal("100.00"),
        max_digits=20,
        decimal_places=2
    )
    
    max_investment: Optional[Decimal] = Field(
        default=None,
        max_digits=20,
        decimal_places=2
    )
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_updated_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Last time returns were updated by admin"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "Conservative AI Plan",
                "risk_profile": "conservative",
                "description": "Low-risk AI trading with stable returns",
                "current_return_pct": "5.50",
                "monthly_return_pct": "1.20",
                "total_invested": "50000.00",
                "active_investors": 25,
            }
        }


class UserInvestment(SQLModel, table=True):
    """
    User allocation to AI investment plans
    
    Tracks:
    - Initial allocation amount
    - Current value (updated when admin updates plan returns)
    - Return %
    """
    __tablename__ = "user_investments"
    
    # Primary Key
    id: Optional[int] = Field(default=None, primary_key=True)
    
    # Foreign Keys
    user_id: int = Field(foreign_key="users.id", index=True)
    plan_id: int = Field(foreign_key="ai_investment_plans.id", index=True)
    
    # Investment Amount
    allocated_amount: Decimal = Field(
        max_digits=20,
        decimal_places=2,
        description="Amount allocated from virtual_balance"
    )
    
    current_value: Decimal = Field(
        max_digits=20,
        decimal_places=2,
        description="Current value (updated when plan returns updated)"
    )
    
    # Performance
    return_pct: Decimal = Field(
        default=Decimal("0.00"),
        max_digits=10,
        decimal_places=2,
        description="Return % since investment started"
    )
    
    unrealized_pnl: Decimal = Field(
        default=Decimal("0.00"),
        max_digits=20,
        decimal_places=2,
        description="Unrealized P&L: current_value - allocated_amount"
    )
    
    # Status
    is_active: bool = Field(default=True)
    
    # Timestamps
    started_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    ended_at: Optional[datetime] = Field(default=None)
    last_updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "plan_id": 1,
                "allocated_amount": "1000.00",
                "current_value": "1055.00",
                "return_pct": "5.50",
                "unrealized_pnl": "55.00",
            }
        }
