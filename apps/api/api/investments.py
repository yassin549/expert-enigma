"""
AI Investment Plans API Routes
Admin management and user investment operations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session, select
from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
import logging

from core.database import get_session
from core.dependencies import get_current_user, get_current_admin_user
from models.user import User
from models.account import Account
from models.ai_plan import AIInvestmentPlan, UserInvestment, RiskProfile
from models.admin_adjustment import AdminAdjustment, AdjustmentType
from models.ledger import LedgerEntry, EntryType
from models.audit import Audit, AuditAction

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models for request/response
from pydantic import BaseModel


class InvestmentPlanResponse(BaseModel):
    id: int
    name: str
    risk_profile: RiskProfile
    description: str
    current_return_pct: Decimal
    monthly_return_pct: Decimal
    quarterly_return_pct: Decimal
    ytd_return_pct: Decimal
    total_invested: Decimal
    active_investors: int
    min_investment: Decimal
    max_investment: Optional[Decimal]
    is_active: bool
    is_accepting_investments: bool
    performance_notes: Optional[str]
    equity_curve_data: List[Dict[str, Any]]
    last_updated_at: datetime


class UpdatePlanReturnsRequest(BaseModel):
    current_return_pct: Optional[Decimal] = None
    monthly_return_pct: Optional[Decimal] = None
    quarterly_return_pct: Optional[Decimal] = None
    ytd_return_pct: Optional[Decimal] = None
    performance_notes: Optional[str] = None
    market_commentary: Optional[str] = None
    reason: str


class UpdateEquityCurveRequest(BaseModel):
    equity_curve_data: List[Dict[str, Any]]
    reason: str


class BulkUpdateReturnsRequest(BaseModel):
    plan_ids: List[int]
    return_percentage: Decimal
    reason: str


class InvestmentAllocationRequest(BaseModel):
    plan_id: int
    amount: Decimal


class UserInvestmentResponse(BaseModel):
    id: int
    plan_id: int
    plan_name: str
    risk_profile: RiskProfile
    allocated_amount: Decimal
    current_value: Decimal
    return_pct: Decimal
    unrealized_pnl: Decimal
    is_active: bool
    started_at: datetime
    last_updated_at: datetime


class InvestmentStatsResponse(BaseModel):
    total_aum: Decimal
    total_investors: int
    average_return_pct: Decimal
    best_performing_plan: str
    plans_summary: List[Dict[str, Any]]


# ============================================================================
# ADMIN ENDPOINTS - Investment Plan Management
# ============================================================================

@router.get("/admin/plans", response_model=List[InvestmentPlanResponse])
def get_all_investment_plans_admin(
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """
    Admin: Get all AI investment plans with detailed metrics
    """
    logger.info(f"Admin {admin_user.id} fetching all investment plans")
    
    plans = session.exec(select(AIInvestmentPlan)).all()
    
    return [
        InvestmentPlanResponse(
            id=plan.id,
            name=plan.name,
            risk_profile=plan.risk_profile,
            description=plan.description,
            current_return_pct=plan.current_return_pct,
            monthly_return_pct=plan.monthly_return_pct,
            quarterly_return_pct=plan.quarterly_return_pct,
            ytd_return_pct=plan.ytd_return_pct,
            total_invested=plan.total_invested,
            active_investors=plan.active_investors,
            min_investment=plan.min_investment,
            max_investment=plan.max_investment,
            is_active=plan.is_active,
            is_accepting_investments=plan.is_accepting_investments,
            performance_notes=plan.performance_notes,
            equity_curve_data=plan.equity_curve_data,
            last_updated_at=plan.last_updated_at
        )
        for plan in plans
    ]


@router.post("/admin/plans/{plan_id}/update-returns", response_model=dict)
def update_plan_returns(
    plan_id: int,
    request: UpdatePlanReturnsRequest,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session),
    http_request: Request = None
):
    """
    Admin: Update AI investment plan returns and performance data
    Automatically updates all user investments in this plan
    """
    logger.info(f"Admin {admin_user.id} updating returns for plan {plan_id}")
    
    # Fetch plan
    plan = session.get(AIInvestmentPlan, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investment plan not found"
        )
    
    # Store previous values for audit
    previous_return = plan.current_return_pct
    
    # Update plan performance data
    if request.current_return_pct is not None:
        plan.current_return_pct = request.current_return_pct
    if request.monthly_return_pct is not None:
        plan.monthly_return_pct = request.monthly_return_pct
    if request.quarterly_return_pct is not None:
        plan.quarterly_return_pct = request.quarterly_return_pct
    if request.ytd_return_pct is not None:
        plan.ytd_return_pct = request.ytd_return_pct
    if request.performance_notes is not None:
        plan.performance_notes = request.performance_notes
    
    plan.last_updated_at = datetime.utcnow()
    
    # Update all user investments in this plan
    user_investments = session.exec(
        select(UserInvestment).where(
            UserInvestment.plan_id == plan_id,
            UserInvestment.is_active == True
        )
    ).all()
    
    updated_users = 0
    total_value_change = Decimal("0.00")
    
    for investment in user_investments:
        # Calculate new current value based on updated return
        new_current_value = investment.allocated_amount * (1 + plan.current_return_pct / 100)
        value_change = new_current_value - investment.current_value
        
        # Update investment
        investment.current_value = new_current_value
        investment.return_pct = plan.current_return_pct
        investment.unrealized_pnl = new_current_value - investment.allocated_amount
        investment.last_updated_at = datetime.utcnow()
        
        # Update user's account virtual balance
        account = session.exec(
            select(Account).where(Account.user_id == investment.user_id)
        ).first()
        if account:
            account.virtual_balance += value_change
            account.equity_cached = account.virtual_balance
            account.updated_at = datetime.utcnow()
            session.add(account)
            
            # Create ledger entry for the balance change
            ledger_entry = LedgerEntry(
                account_id=account.id,
                user_id=account.user_id,
                entry_type=EntryType.INVESTMENT_RETURN,
                amount=value_change,
                balance_after=account.virtual_balance,
                description=f"AI Investment return update: {plan.name}",
                reference_type="investment_plan_update",
                reference_id=plan_id
            )
            session.add(ledger_entry)
        
        session.add(investment)
        updated_users += 1
        total_value_change += value_change
    
    # Update plan statistics
    plan.active_investors = updated_users
    plan.total_invested = sum(inv.allocated_amount for inv in user_investments)
    
    # Create audit log
    audit = Audit(
        actor_user_id=admin_user.id,
        action=AuditAction.INVESTMENT_PLAN_UPDATED,
        object_type="ai_investment_plan",
        object_id=plan_id,
        diff={
            "previous_return_pct": str(previous_return),
            "new_return_pct": str(plan.current_return_pct),
            "users_affected": updated_users,
            "total_value_change": str(total_value_change)
        },
        reason=request.reason,
        ip_address=http_request.client.host if http_request else None
    )
    
    session.add(plan)
    session.add(audit)
    session.commit()
    
    logger.info(f"Plan {plan_id} returns updated: {updated_users} users affected, total value change: {total_value_change}")
    
    return {
        "message": "Investment plan returns updated successfully",
        "plan_id": plan_id,
        "users_affected": updated_users,
        "total_value_change": total_value_change,
        "new_return_pct": plan.current_return_pct
    }


@router.post("/admin/plans/{plan_id}/update-equity-curve", response_model=dict)
def update_equity_curve(
    plan_id: int,
    request: UpdateEquityCurveRequest,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """
    Admin: Update equity curve data for investment plan
    """
    logger.info(f"Admin {admin_user.id} updating equity curve for plan {plan_id}")
    
    plan = session.get(AIInvestmentPlan, plan_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investment plan not found"
        )
    
    # Store previous equity curve for audit
    previous_curve = plan.equity_curve_data
    
    # Update equity curve
    plan.equity_curve_data = request.equity_curve_data
    plan.last_updated_at = datetime.utcnow()
    
    # Create audit log
    audit = Audit(
        actor_user_id=admin_user.id,
        action=AuditAction.EQUITY_CURVE_UPDATED,
        object_type="ai_investment_plan",
        object_id=plan_id,
        diff={
            "data_points_added": len(request.equity_curve_data),
            "previous_data_points": len(previous_curve) if previous_curve else 0
        },
        reason=request.reason
    )
    
    session.add(plan)
    session.add(audit)
    session.commit()
    
    return {
        "message": "Equity curve updated successfully",
        "plan_id": plan_id,
        "data_points": len(request.equity_curve_data)
    }


@router.post("/admin/plans/bulk-update-returns", response_model=dict)
def bulk_update_returns(
    request: BulkUpdateReturnsRequest,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """
    Admin: Apply same return percentage to multiple investment plans
    """
    logger.info(f"Admin {admin_user.id} bulk updating returns for {len(request.plan_ids)} plans")
    
    if len(request.plan_ids) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot bulk update more than 10 plans at once"
        )
    
    # Fetch all plans
    plans = session.exec(
        select(AIInvestmentPlan).where(AIInvestmentPlan.id.in_(request.plan_ids))
    ).all()
    
    if len(plans) != len(request.plan_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some investment plans not found"
        )
    
    total_users_affected = 0
    total_value_change = Decimal("0.00")
    
    # Update each plan
    for plan in plans:
        previous_return = plan.current_return_pct
        plan.current_return_pct = request.return_percentage
        plan.last_updated_at = datetime.utcnow()
        
        # Update user investments for this plan
        user_investments = session.exec(
            select(UserInvestment).where(
                UserInvestment.plan_id == plan.id,
                UserInvestment.is_active == True
            )
        ).all()
        
        for investment in user_investments:
            new_current_value = investment.allocated_amount * (1 + request.return_percentage / 100)
            value_change = new_current_value - investment.current_value
            
            investment.current_value = new_current_value
            investment.return_pct = request.return_percentage
            investment.unrealized_pnl = new_current_value - investment.allocated_amount
            investment.last_updated_at = datetime.utcnow()
            
            session.add(investment)
            total_users_affected += 1
            total_value_change += value_change
        
        session.add(plan)
    
    # Create audit log
    audit = Audit(
        actor_user_id=admin_user.id,
        action=AuditAction.BULK_PLAN_UPDATE,
        object_type="ai_investment_plans",
        object_id=None,
        diff={
            "plans_updated": len(plans),
            "new_return_pct": str(request.return_percentage),
            "users_affected": total_users_affected,
            "total_value_change": str(total_value_change)
        },
        reason=request.reason
    )
    
    session.add(audit)
    session.commit()
    
    return {
        "message": "Bulk update completed successfully",
        "plans_updated": len(plans),
        "users_affected": total_users_affected,
        "total_value_change": total_value_change
    }


# ============================================================================
# USER ENDPOINTS - Investment Operations
# ============================================================================

@router.get("/plans", response_model=List[InvestmentPlanResponse])
def get_investment_plans(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get all active AI investment plans for users
    """
    plans = session.exec(
        select(AIInvestmentPlan).where(
            AIInvestmentPlan.is_active == True,
            AIInvestmentPlan.is_accepting_investments == True
        )
    ).all()
    
    return [
        InvestmentPlanResponse(
            id=plan.id,
            name=plan.name,
            risk_profile=plan.risk_profile,
            description=plan.description,
            current_return_pct=plan.current_return_pct,
            monthly_return_pct=plan.monthly_return_pct,
            quarterly_return_pct=plan.quarterly_return_pct,
            ytd_return_pct=plan.ytd_return_pct,
            total_invested=plan.total_invested,
            active_investors=plan.active_investors,
            min_investment=plan.min_investment,
            max_investment=plan.max_investment,
            is_active=plan.is_active,
            is_accepting_investments=plan.is_accepting_investments,
            performance_notes=plan.performance_notes,
            equity_curve_data=plan.equity_curve_data,
            last_updated_at=plan.last_updated_at
        )
        for plan in plans
    ]


@router.post("/allocate", response_model=dict)
def allocate_to_investment_plan(
    request: InvestmentAllocationRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Allocate virtual balance to AI investment plan
    """
    logger.info(f"User {user.id} allocating {request.amount} to plan {request.plan_id}")
    
    # Get user's account
    account = session.exec(
        select(Account).where(Account.user_id == user.id)
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Verify sufficient balance
    if account.virtual_balance < request.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient virtual balance"
        )
    
    # Get investment plan
    plan = session.get(AIInvestmentPlan, request.plan_id)
    if not plan or not plan.is_active or not plan.is_accepting_investments:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Investment plan not available"
        )
    
    # Check minimum investment
    if request.amount < plan.min_investment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum investment is {plan.min_investment}"
        )
    
    # Check maximum investment if set
    if plan.max_investment and request.amount > plan.max_investment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum investment is {plan.max_investment}"
        )
    
    # Deduct from virtual balance
    account.virtual_balance -= request.amount
    account.equity_cached = account.virtual_balance
    account.updated_at = datetime.utcnow()
    
    # Create user investment
    current_value = request.amount * (1 + plan.current_return_pct / 100)
    
    user_investment = UserInvestment(
        user_id=user.id,
        plan_id=request.plan_id,
        allocated_amount=request.amount,
        current_value=current_value,
        return_pct=plan.current_return_pct,
        unrealized_pnl=current_value - request.amount,
        is_active=True,
        started_at=datetime.utcnow(),
        last_updated_at=datetime.utcnow()
    )
    
    # Create ledger entry
    ledger_entry = LedgerEntry(
        account_id=account.id,
        user_id=user.id,
        entry_type=EntryType.INVESTMENT_ALLOCATION,
        amount=-request.amount,  # Negative because it's deducted from balance
        balance_after=account.virtual_balance,
        description=f"Investment allocation to {plan.name}",
        reference_type="user_investment",
        reference_id=None  # Will be set after investment is saved
    )
    
    # Update plan statistics
    plan.total_invested += request.amount
    plan.active_investors = session.exec(
        select(UserInvestment).where(
            UserInvestment.plan_id == request.plan_id,
            UserInvestment.is_active == True
        )
    ).count() + 1  # +1 for the new investment
    
    session.add(account)
    session.add(user_investment)
    session.add(plan)
    session.commit()
    session.refresh(user_investment)
    
    # Update ledger entry with investment ID
    ledger_entry.reference_id = user_investment.id
    session.add(ledger_entry)
    session.commit()
    
    logger.info(f"User {user.id} successfully allocated {request.amount} to plan {request.plan_id}")
    
    return {
        "message": "Investment allocation successful",
        "investment_id": user_investment.id,
        "allocated_amount": request.amount,
        "current_value": current_value,
        "return_pct": plan.current_return_pct,
        "remaining_balance": account.virtual_balance
    }


@router.get("/my-investments", response_model=List[UserInvestmentResponse])
def get_user_investments(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get user's active investment allocations
    """
    investments = session.exec(
        select(UserInvestment, AIInvestmentPlan)
        .join(AIInvestmentPlan, UserInvestment.plan_id == AIInvestmentPlan.id)
        .where(
            UserInvestment.user_id == user.id,
            UserInvestment.is_active == True
        )
    ).all()
    
    return [
        UserInvestmentResponse(
            id=investment.id,
            plan_id=investment.plan_id,
            plan_name=plan.name,
            risk_profile=plan.risk_profile,
            allocated_amount=investment.allocated_amount,
            current_value=investment.current_value,
            return_pct=investment.return_pct,
            unrealized_pnl=investment.unrealized_pnl,
            is_active=investment.is_active,
            started_at=investment.started_at,
            last_updated_at=investment.last_updated_at
        )
        for investment, plan in investments
    ]


@router.get("/stats", response_model=InvestmentStatsResponse)
def get_investment_stats(
    session: Session = Depends(get_session)
):
    """
    Get public investment statistics for landing page
    """
    plans = session.exec(select(AIInvestmentPlan).where(AIInvestmentPlan.is_active == True)).all()
    
    total_aum = sum(plan.total_invested for plan in plans)
    total_investors = sum(plan.active_investors for plan in plans)
    
    # Calculate average return
    if plans:
        average_return = sum(plan.current_return_pct for plan in plans) / len(plans)
        best_plan = max(plans, key=lambda p: p.current_return_pct)
        best_performing_plan = best_plan.name
    else:
        average_return = Decimal("0.00")
        best_performing_plan = "N/A"
    
    plans_summary = [
        {
            "name": plan.name,
            "risk_profile": plan.risk_profile.value,
            "return_pct": plan.current_return_pct,
            "aum": plan.total_invested,
            "investors": plan.active_investors
        }
        for plan in plans
    ]
    
    return InvestmentStatsResponse(
        total_aum=total_aum,
        total_investors=total_investors,
        average_return_pct=average_return,
        best_performing_plan=best_performing_plan,
        plans_summary=plans_summary
    )
