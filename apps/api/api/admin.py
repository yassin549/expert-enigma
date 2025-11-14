"""
Admin API Routes
Account management, balance adjustments, and administrative controls
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session, select
from typing import List, Optional, Dict, Any
from datetime import datetime
from decimal import Decimal
import logging

from core.database import get_session
from core.dependencies import get_current_admin_user
from models.user import User
from models.account import Account
from models.admin_adjustment import AdminAdjustment, AdjustmentType
from models.ledger import LedgerEntry, EntryType
from models.audit import Audit, AuditAction
from models.withdrawal import Withdrawal
from models.deposit import Deposit

logger = logging.getLogger(__name__)
router = APIRouter()


# Pydantic models for request/response
from pydantic import BaseModel


class AdminAccountResponse(BaseModel):
    id: int
    user_id: int
    user_email: str
    name: str
    deposited_amount: Decimal
    virtual_balance: Decimal
    equity_cached: Decimal
    return_pct: Decimal
    total_trades: int
    total_pnl: Decimal
    is_active: bool
    is_frozen: bool
    created_at: datetime
    last_trade_at: Optional[datetime]


class AdjustBalanceRequest(BaseModel):
    adjustment_type: AdjustmentType
    amount: Decimal
    reason: str
    apply_percentage: bool = False  # If true, amount is treated as percentage


class BatchAdjustmentRequest(BaseModel):
    account_ids: List[int]
    adjustment_type: AdjustmentType
    amount: Decimal
    reason: str
    apply_percentage: bool = False


class AdjustmentHistoryResponse(BaseModel):
    id: int
    account_id: int
    admin_user_id: int
    admin_email: str
    adjustment_type: AdjustmentType
    amount: Decimal
    previous_balance: Decimal
    new_balance: Decimal
    reason: str
    created_at: datetime


class AdminStatsResponse(BaseModel):
    total_deposits: Decimal
    total_virtual_balances: Decimal
    delta: Decimal
    delta_pct: Decimal
    active_users: int
    total_users: int
    pending_withdrawals: int
    pending_kyc: int
    aml_alerts: int


class WithdrawalApprovalRequest(BaseModel):
    action: str  # "approve" or "reject"
    amount_approved: Optional[Decimal] = None  # For partial approvals
    reason: Optional[str] = None


@router.get("/accounts", response_model=List[AdminAccountResponse])
def list_all_accounts(
    sort_by: str = "created_at",
    order: str = "desc",
    limit: int = 100,
    offset: int = 0,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """
    List all user accounts with virtual vs deposited amounts
    Admin-only endpoint for account management
    """
    logger.info(f"Admin {admin_user.id} listing all accounts")
    
    # Build query with user join
    query = select(Account, User).join(User, Account.user_id == User.id)
    
    # Apply sorting
    if sort_by == "return_pct":
        # Calculate return percentage for sorting
        query = query.order_by(
            ((Account.virtual_balance - Account.deposited_amount) / Account.deposited_amount * 100).desc()
            if order == "desc" else
            ((Account.virtual_balance - Account.deposited_amount) / Account.deposited_amount * 100).asc()
        )
    elif sort_by == "virtual_balance":
        query = query.order_by(Account.virtual_balance.desc() if order == "desc" else Account.virtual_balance.asc())
    elif sort_by == "deposited_amount":
        query = query.order_by(Account.deposited_amount.desc() if order == "desc" else Account.deposited_amount.asc())
    else:
        query = query.order_by(Account.created_at.desc() if order == "desc" else Account.created_at.asc())
    
    # Apply pagination
    query = query.offset(offset).limit(limit)
    
    results = session.exec(query).all()
    
    accounts = []
    for account, user in results:
        # Calculate return percentage
        if account.deposited_amount > 0:
            return_pct = ((account.virtual_balance - account.deposited_amount) / account.deposited_amount) * 100
        else:
            return_pct = Decimal("0.00")
        
        accounts.append(AdminAccountResponse(
            id=account.id,
            user_id=account.user_id,
            user_email=user.email,
            name=account.name,
            deposited_amount=account.deposited_amount,
            virtual_balance=account.virtual_balance,
            equity_cached=account.equity_cached,
            return_pct=return_pct,
            total_trades=account.total_trades,
            total_pnl=account.total_pnl,
            is_active=account.is_active,
            is_frozen=account.is_frozen,
            created_at=account.created_at,
            last_trade_at=account.last_trade_at
        ))
    
    return accounts


@router.post("/accounts/{account_id}/adjust", response_model=dict)
def adjust_account_balance(
    account_id: int,
    request: AdjustBalanceRequest,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session),
    http_request: Request = None
):
    """
    Manually adjust account virtual balance
    Creates complete audit trail
    """
    logger.info(f"Admin {admin_user.id} adjusting account {account_id}")
    
    # Fetch account
    account = session.get(Account, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Calculate adjustment amount
    previous_balance = account.virtual_balance
    
    if request.apply_percentage:
        # Apply percentage adjustment
        adjustment_amount = account.virtual_balance * (request.amount / 100)
    else:
        # Apply fixed amount
        adjustment_amount = request.amount
    
    new_balance = previous_balance + adjustment_amount
    
    # Validate new balance
    if new_balance < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Adjustment would result in negative balance"
        )
    
    # Update account balance
    account.virtual_balance = new_balance
    account.equity_cached = new_balance  # Update cached equity
    account.updated_at = datetime.utcnow()
    
    # Create admin adjustment record
    admin_adjustment = AdminAdjustment(
        account_id=account_id,
        admin_user_id=admin_user.id,
        adjustment_type=request.adjustment_type,
        amount=adjustment_amount,
        reason=request.reason,
        previous_balance=previous_balance,
        new_balance=new_balance,
        created_at=datetime.utcnow()
    )
    
    # Create ledger entry
    ledger_entry = LedgerEntry(
        account_id=account_id,
        user_id=account.user_id,
        entry_type=EntryType.ADMIN_ADJUSTMENT,
        amount=adjustment_amount,
        balance_after=new_balance,
        description=f"Admin adjustment: {request.reason}",
        reference_type="admin_adjustment",
        reference_id=None  # Will be set after admin_adjustment is saved
    )
    
    # Create audit log
    audit = Audit(
        actor_user_id=admin_user.id,
        action=AuditAction.BALANCE_ADJUSTED,
        object_type="account",
        object_id=account_id,
        diff={
            "previous_balance": str(previous_balance),
            "new_balance": str(new_balance),
            "adjustment_amount": str(adjustment_amount),
            "adjustment_type": request.adjustment_type.value
        },
        reason=request.reason,
        ip_address=http_request.client.host if http_request else None
    )
    
    # Save all changes
    session.add(account)
    session.add(admin_adjustment)
    session.add(audit)
    session.commit()
    session.refresh(admin_adjustment)
    
    # Update ledger entry with admin_adjustment ID
    ledger_entry.reference_id = admin_adjustment.id
    session.add(ledger_entry)
    session.commit()
    
    logger.info(f"Account {account_id} balance adjusted from {previous_balance} to {new_balance}")
    
    return {
        "message": "Balance adjusted successfully",
        "previous_balance": previous_balance,
        "new_balance": new_balance,
        "adjustment_amount": adjustment_amount,
        "adjustment_id": admin_adjustment.id
    }


@router.post("/accounts/batch-adjust", response_model=dict)
def batch_adjust_balances(
    request: BatchAdjustmentRequest,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session),
    http_request: Request = None
):
    """
    Apply same adjustment to multiple accounts
    Useful for applying returns to investment plan users
    """
    logger.info(f"Admin {admin_user.id} batch adjusting {len(request.account_ids)} accounts")
    
    if len(request.account_ids) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot adjust more than 100 accounts at once"
        )
    
    # Fetch all accounts
    accounts = session.exec(
        select(Account).where(Account.id.in_(request.account_ids))
    ).all()
    
    if len(accounts) != len(request.account_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Some accounts not found"
        )
    
    adjustments_made = []
    
    # Process each account
    for account in accounts:
        previous_balance = account.virtual_balance
        
        if request.apply_percentage:
            adjustment_amount = account.virtual_balance * (request.amount / 100)
        else:
            adjustment_amount = request.amount
        
        new_balance = previous_balance + adjustment_amount
        
        # Skip if would result in negative balance
        if new_balance < 0:
            logger.warning(f"Skipping account {account.id} - would result in negative balance")
            continue
        
        # Update account
        account.virtual_balance = new_balance
        account.equity_cached = new_balance
        account.updated_at = datetime.utcnow()
        
        # Create admin adjustment record
        admin_adjustment = AdminAdjustment(
            account_id=account.id,
            admin_user_id=admin_user.id,
            adjustment_type=request.adjustment_type,
            amount=adjustment_amount,
            reason=request.reason,
            previous_balance=previous_balance,
            new_balance=new_balance,
            created_at=datetime.utcnow()
        )
        
        # Create ledger entry
        ledger_entry = LedgerEntry(
            account_id=account.id,
            user_id=account.user_id,
            entry_type=EntryType.ADMIN_ADJUSTMENT,
            amount=adjustment_amount,
            balance_after=new_balance,
            description=f"Batch adjustment: {request.reason}",
            reference_type="admin_adjustment"
        )
        
        # Create audit log
        audit = Audit(
            actor_user_id=admin_user.id,
            action=AuditAction.BALANCE_ADJUSTED,
            object_type="account",
            object_id=account.id,
            diff={
                "previous_balance": str(previous_balance),
                "new_balance": str(new_balance),
                "adjustment_amount": str(adjustment_amount),
                "batch_operation": True
            },
            reason=f"Batch: {request.reason}",
            ip_address=http_request.client.host if http_request else None
        )
        
        session.add(account)
        session.add(admin_adjustment)
        session.add(ledger_entry)
        session.add(audit)
        
        adjustments_made.append({
            "account_id": account.id,
            "previous_balance": previous_balance,
            "new_balance": new_balance,
            "adjustment_amount": adjustment_amount
        })
    
    session.commit()
    
    logger.info(f"Batch adjustment completed: {len(adjustments_made)} accounts processed")
    
    return {
        "message": f"Batch adjustment completed",
        "accounts_processed": len(adjustments_made),
        "accounts_skipped": len(request.account_ids) - len(adjustments_made),
        "adjustments": adjustments_made
    }


@router.get("/accounts/{account_id}/adjustments", response_model=List[AdjustmentHistoryResponse])
def get_adjustment_history(
    account_id: int,
    limit: int = 50,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """
    Get complete adjustment history for account
    """
    # Verify account exists
    account = session.get(Account, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Fetch adjustments with admin user info
    adjustments = session.exec(
        select(AdminAdjustment, User)
        .join(User, AdminAdjustment.admin_user_id == User.id)
        .where(AdminAdjustment.account_id == account_id)
        .order_by(AdminAdjustment.created_at.desc())
        .limit(limit)
    ).all()
    
    return [
        AdjustmentHistoryResponse(
            id=adjustment.id,
            account_id=adjustment.account_id,
            admin_user_id=adjustment.admin_user_id,
            admin_email=admin_user.email,
            adjustment_type=adjustment.adjustment_type,
            amount=adjustment.amount,
            previous_balance=adjustment.previous_balance,
            new_balance=adjustment.new_balance,
            reason=adjustment.reason,
            created_at=adjustment.created_at
        )
        for adjustment, admin_user in adjustments
    ]


@router.get("/statistics/overview", response_model=AdminStatsResponse)
def get_admin_statistics(
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """
    Get overview statistics for admin dashboard
    """
    logger.info(f"Admin {admin_user.id} fetching overview statistics")
    
    # Calculate totals
    accounts = session.exec(select(Account)).all()
    
    total_deposits = sum(account.deposited_amount for account in accounts)
    total_virtual_balances = sum(account.virtual_balance for account in accounts)
    delta = total_virtual_balances - total_deposits
    delta_pct = (delta / total_deposits * 100) if total_deposits > 0 else Decimal("0.00")
    
    # User counts
    total_users = session.exec(select(User)).count()
    active_users = session.exec(
        select(User).where(User.can_access_trading == True)
    ).count()
    
    # Pending items (mock counts for now)
    pending_withdrawals = session.exec(
        select(Withdrawal).where(Withdrawal.status == "pending")
    ).count() if session.exec(select(Withdrawal)).first() else 0
    
    pending_kyc = session.exec(
        select(User).where(User.kyc_status == "pending")
    ).count()
    
    aml_alerts = 0  # TODO: Implement AML alerts count
    
    return AdminStatsResponse(
        total_deposits=total_deposits,
        total_virtual_balances=total_virtual_balances,
        delta=delta,
        delta_pct=delta_pct,
        active_users=active_users,
        total_users=total_users,
        pending_withdrawals=pending_withdrawals,
        pending_kyc=pending_kyc,
        aml_alerts=aml_alerts
    )


@router.get("/withdrawals/pending", response_model=List[dict])
def get_pending_withdrawals(
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """
    Get all pending withdrawal requests for admin review
    """
    logger.info(f"Admin {admin_user.id} fetching pending withdrawals")

    results = session.exec(
        select(Withdrawal, User, Account)
        .join(User, Withdrawal.user_id == User.id)
        .join(Account, Account.user_id == User.id)
        .where(Withdrawal.status == "pending")
        .order_by(Withdrawal.requested_at)
    ).all()

    pending: List[Dict[str, Any]] = []
    for withdrawal, user, account in results:
        pending.append(
            {
                "id": withdrawal.id,
                "user_id": user.id,
                "email": user.email,
                "kyc_status": user.kyc_status,
                "amount_requested": withdrawal.amount_requested,
                "currency": withdrawal.currency,
                "status": withdrawal.status,
                "payout_address": withdrawal.payout_address,
                "requested_at": withdrawal.requested_at,
                "virtual_balance": account.virtual_balance,
                "deposited_amount": account.deposited_amount,
            }
        )

    return pending


@router.post("/withdrawals/{withdrawal_id}/review", response_model=dict)
def review_withdrawal(
    withdrawal_id: int,
    request: WithdrawalApprovalRequest,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """
    Approve or reject withdrawal request
    """
    withdrawal = session.get(Withdrawal, withdrawal_id)
    if not withdrawal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Withdrawal not found",
        )

    if withdrawal.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Withdrawal has already been reviewed",
        )

    if request.action not in {"approve", "reject"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Must be 'approve' or 'reject'",
        )

    user = session.get(User, withdrawal.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found for withdrawal",
        )

    account = session.exec(
        select(Account).where(Account.user_id == user.id)
    ).first()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trading account not found for user",
        )

    if request.action == "reject":
        withdrawal.status = "rejected"
        withdrawal.admin_review_id = admin_user.id
        withdrawal.reviewed_at = datetime.utcnow()
        withdrawal.rejection_reason = request.reason

        audit = Audit(
            actor_user_id=admin_user.id,
            action=AuditAction.WITHDRAWAL_REJECTED,
            object_type="withdrawal",
            object_id=withdrawal.id,
            diff={"status": {"before": "pending", "after": "rejected"}},
            reason=request.reason or "Withdrawal rejected by admin",
        )

        session.add(withdrawal)
        session.add(audit)
        session.commit()

        logger.info("Admin %s rejected withdrawal %s", admin_user.id, withdrawal.id)
        return {"message": "Withdrawal rejected", "withdrawal_id": withdrawal.id}

    # Approve path
    amount_to_approve = (
        request.amount_approved
        if request.amount_approved is not None
        else withdrawal.amount_requested
    )

    if amount_to_approve <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Approved amount must be positive",
        )

    if amount_to_approve > withdrawal.amount_requested:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Approved amount cannot exceed requested amount",
        )

    if amount_to_approve > account.virtual_balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have sufficient virtual balance",
        )

    previous_balance = account.virtual_balance
    new_balance = previous_balance - amount_to_approve
    if new_balance < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Withdrawal would result in negative virtual balance",
        )

    account.virtual_balance = new_balance
    account.equity_cached = new_balance
    account.updated_at = datetime.utcnow()

    withdrawal.status = "approved"
    withdrawal.amount_approved = amount_to_approve
    withdrawal.admin_review_id = admin_user.id
    withdrawal.reviewed_at = datetime.utcnow()
    withdrawal.admin_notes = request.reason

    ledger_entry = LedgerEntry(
        account_id=account.id,
        user_id=user.id,
        entry_type=EntryType.WITHDRAWAL,
        amount=-amount_to_approve,
        balance_after=new_balance,
        description=f"Withdrawal payout of {amount_to_approve} USD approved",
        reference_type="withdrawal",
        reference_id=withdrawal.id,
    )

    audit = Audit(
        actor_user_id=admin_user.id,
        action=AuditAction.WITHDRAWAL_APPROVED,
        object_type="withdrawal",
        object_id=withdrawal.id,
        diff={
            "virtual_balance": {
                "before": str(previous_balance),
                "after": str(new_balance),
            },
            "amount_approved": str(amount_to_approve),
        },
        reason=request.reason or "Withdrawal approved by admin",
    )

    session.add(account)
    session.add(withdrawal)
    session.add(ledger_entry)
    session.add(audit)
    session.commit()

    logger.info(
        "Admin %s approved withdrawal %s for user %s (amount=%s)",
        admin_user.id,
        withdrawal.id,
        user.id,
        amount_to_approve,
    )

    return {
        "message": "Withdrawal approved",
        "withdrawal_id": withdrawal.id,
        "amount_approved": amount_to_approve,
    }


@router.get("/kyc/pending", response_model=List[dict])
def get_pending_kyc(
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """
    Get all pending KYC submissions for review
    """
    pending_users = session.exec(
        select(User).where(User.kyc_status.in_(["pending", "auto_approved"]))
    ).all()
    
    return [
        {
            "user_id": user.id,
            "email": user.email,
            "kyc_status": user.kyc_status,
            "kyc_submitted_at": user.kyc_submitted_at,
            "created_at": user.created_at
        }
        for user in pending_users
    ]


@router.post("/kyc/{user_id}/review", response_model=dict)
def review_kyc(
    user_id: int,
    action: str,  # "approve" or "reject"
    reason: Optional[str] = None,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """
    Approve or reject KYC submission
    """
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if action == "approve":
        user.kyc_status = "approved"
        user.kyc_reviewed_at = datetime.utcnow()
        user.kyc_reviewed_by = admin_user.id
        audit_action = AuditAction.KYC_APPROVED
    elif action == "reject":
        user.kyc_status = "rejected"
        user.kyc_reviewed_at = datetime.utcnow()
        user.kyc_reviewed_by = admin_user.id
        user.kyc_rejection_reason = reason
        audit_action = AuditAction.KYC_REJECTED
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Must be 'approve' or 'reject'"
        )
    
    # Create audit log
    audit = Audit(
        actor_user_id=admin_user.id,
        action=audit_action,
        object_type="user",
        object_id=user.id,
        reason=reason or f"KYC {action}d by admin"
    )
    
    session.add(user)
    session.add(audit)
    session.commit()
    
    return {
        "message": f"KYC {action}d successfully",
        "user_id": user.id,
        "new_status": user.kyc_status
    }
