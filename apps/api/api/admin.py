"""
Admin API Routes
Account management, balance adjustments, and administrative controls
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlmodel import Session, select
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, date
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
from models.aml import AMLAlert, AMLSeverity

logger = logging.getLogger(__name__)
router = APIRouter()


# Pydantic models for request/response
from pydantic import BaseModel, Field


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
        select(User).where(User.kyc_status.in_(["pending", "auto_approved"]))
    ).count()
    
    # Count pending AML alerts
    from models.aml import AMLAlert
    aml_alerts = session.exec(
        select(AMLAlert).where(AMLAlert.status == "pending")
    ).count() if session.exec(select(AMLAlert)).first() else 0
    
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


@router.get("/aml/alerts", response_model=List[dict])
def get_aml_alerts(
    status_filter: Optional[str] = None,
    severity_filter: Optional[str] = None,
    limit: int = 100,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """Get AML alerts with optional filtering"""
    query = select(AMLAlert)
    
    if status_filter:
        query = query.where(AMLAlert.status == status_filter)
    if severity_filter:
        query = query.where(AMLAlert.severity == severity_filter)
    
    query = query.order_by(AMLAlert.created_at.desc()).limit(limit)
    alerts = session.exec(query).all()
    
    return [
        {
            "id": alert.id,
            "user_id": alert.user_id,
            "type": alert.type,
            "severity": alert.severity.value,
            "description": alert.description,
            "status": alert.status,
            "details": alert.details,
            "created_at": alert.created_at.isoformat(),
            "reviewed_at": alert.reviewed_at.isoformat() if alert.reviewed_at else None,
            "action_taken": alert.action_taken
        }
        for alert in alerts
    ]


@router.post("/aml/alerts/{alert_id}/resolve", response_model=dict)
def resolve_aml_alert(
    alert_id: int,
    resolution_notes: str,
    action_taken: Optional[str] = None,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """Resolve an AML alert"""
    alert = session.get(AMLAlert, alert_id)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AML alert not found"
        )
    
    alert.status = "resolved"
    alert.reviewed_by = admin_user.id
    alert.reviewed_at = datetime.utcnow()
    alert.resolution_notes = resolution_notes
    if action_taken:
        alert.action_taken = action_taken
    alert.resolved_at = datetime.utcnow()
    
    # Create audit log
    audit = Audit(
        actor_user_id=admin_user.id,
        action=AuditAction.ADMIN_ACTION,
        object_type="aml_alert",
        object_id=alert.id,
        reason=f"AML alert resolved: {resolution_notes}"
    )
    
    session.add(alert)
    session.add(audit)
    session.commit()
    
    return {
        "message": "AML alert resolved successfully",
        "alert_id": alert.id
    }


# ============================================================================
# RECONCILIATION TOOLS
# ============================================================================

@router.get("/reconciliation/dashboard", response_model=dict)
def get_reconciliation_dashboard(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """
    Get reconciliation dashboard data
    Compares NOWPayments deposits vs database, payouts vs database, business wallet balance
    """
    from models.wallet import Wallet
    
    # Default to last 7 days if not specified
    if not end_date:
        end_dt = datetime.utcnow()
    else:
        end_dt = datetime.fromisoformat(end_date)
    
    if not start_date:
        start_dt = end_dt - timedelta(days=7)
    else:
        start_dt = datetime.fromisoformat(start_date)
    
    # Get all deposits in date range
    deposits = session.exec(
        select(Deposit)
        .where(Deposit.created_at >= start_dt)
        .where(Deposit.created_at <= end_dt)
    ).all()
    
    # Get all withdrawals in date range
    withdrawals = session.exec(
        select(Withdrawal)
        .where(Withdrawal.requested_at >= start_dt)
        .where(Withdrawal.requested_at <= end_dt)
    ).all()
    
    # Calculate totals
    total_deposits_db = sum(d.amount_usd for d in deposits if d.status == "confirmed")
    total_withdrawals_db = sum(
        w.amount_approved or w.amount_requested 
        for w in withdrawals 
        if w.status in ["approved", "completed"]
    )
    
    # Get business wallet
    business_wallet = session.exec(
        select(Wallet).where(Wallet.type == "business_deposit")
    ).first()
    
    # Calculate expected balance
    initial_balance = Decimal(str(settings.BUSINESS_WALLET_INITIAL_BALANCE))
    expected_balance = initial_balance + total_deposits_db - total_withdrawals_db
    
    # Count unreconciled deposits
    unreconciled_deposits = sum(1 for d in deposits if not d.reconciled)
    
    # Get all accounts for virtual balance calculation
    accounts = session.exec(select(Account)).all()
    total_deposited_amount = sum(account.deposited_amount for account in accounts)
    total_virtual_balances = sum(account.virtual_balance for account in accounts)
    
    return {
        "period": {
            "start_date": start_dt.isoformat(),
            "end_date": end_dt.isoformat()
        },
        "deposits": {
            "total_count": len(deposits),
            "total_amount_usd": float(total_deposits_db),
            "confirmed_count": sum(1 for d in deposits if d.status == "confirmed"),
            "unreconciled_count": unreconciled_deposits
        },
        "withdrawals": {
            "total_count": len(withdrawals),
            "total_amount_usd": float(total_withdrawals_db),
            "approved_count": sum(1 for w in withdrawals if w.status in ["approved", "completed"])
        },
        "business_wallet": {
            "current_balance": float(business_wallet.balance) if business_wallet else 0.0,
            "expected_balance": float(expected_balance),
            "discrepancy": float((business_wallet.balance if business_wallet else Decimal("0")) - expected_balance)
        },
        "account_totals": {
            "total_deposited_amount": float(total_deposited_amount),
            "total_virtual_balances": float(total_virtual_balances),
            "delta": float(total_virtual_balances - total_deposited_amount)
        },
        "ledger_verification": {
            "total_ledger_entries": session.exec(select(LedgerEntry)).count(),
            "deposit_entries": session.exec(
                select(LedgerEntry)
                .where(LedgerEntry.entry_type == EntryType.DEPOSIT)
                .where(LedgerEntry.created_at >= start_dt)
            ).count(),
            "withdrawal_entries": session.exec(
                select(LedgerEntry)
                .where(LedgerEntry.entry_type == EntryType.WITHDRAWAL)
                .where(LedgerEntry.created_at >= start_dt)
            ).count()
        }
    }


@router.post("/reconciliation/run", response_model=dict)
def run_reconciliation(
    start_date: str,
    end_date: str,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """
    Trigger reconciliation job for date range
    This will call the Celery task to reconcile deposits with NOWPayments
    """
    from worker.tasks.deposits import reconcile_deposits_batch
    
    # Trigger async reconciliation task
    task = reconcile_deposits_batch.delay(start_date, end_date)
    
    # Create audit log
    audit = Audit(
        actor_user_id=admin_user.id,
        action=AuditAction.ADMIN_ACTION,
        object_type="reconciliation",
        object_id=0,
        reason=f"Manual reconciliation triggered for {start_date} to {end_date}"
    )
    session.add(audit)
    session.commit()
    
    return {
        "message": "Reconciliation job started",
        "task_id": task.id,
        "start_date": start_date,
        "end_date": end_date
    }


# ============================================================================
# EMERGENCY CONTROLS
# ============================================================================

class EmergencyControlRequest(BaseModel):
    reason: str = Field(..., min_length=10, max_length=500, description="Reason for emergency action")


@router.post("/emergency/pause-deposits", response_model=dict)
def pause_deposits(
    request: EmergencyControlRequest,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """Pause new deposit processing (maintenance mode)"""
    # In a real implementation, this would set a flag in Redis or database
    # For now, we'll log it and create an audit entry
    
    audit = Audit(
        actor_user_id=admin_user.id,
        action=AuditAction.ADMIN_ACTION,
        object_type="platform",
        object_id=0,
        reason=f"Emergency: Pause deposits - {request.reason}",
        extra_metadata={"action": "pause_deposits", "timestamp": datetime.utcnow().isoformat()}
    )
    session.add(audit)
    session.commit()
    
    logger.warning(f"Admin {admin_user.id} paused deposits: {request.reason}")
    
    return {
        "message": "Deposits paused",
        "reason": request.reason,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.post("/emergency/resume-deposits", response_model=dict)
def resume_deposits(
    request: EmergencyControlRequest,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """Resume deposit processing"""
    audit = Audit(
        actor_user_id=admin_user.id,
        action=AuditAction.ADMIN_ACTION,
        object_type="platform",
        object_id=0,
        reason=f"Emergency: Resume deposits - {request.reason}",
        extra_metadata={"action": "resume_deposits", "timestamp": datetime.utcnow().isoformat()}
    )
    session.add(audit)
    session.commit()
    
    logger.info(f"Admin {admin_user.id} resumed deposits: {request.reason}")
    
    return {
        "message": "Deposits resumed",
        "reason": request.reason,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.post("/emergency/pause-withdrawals", response_model=dict)
def pause_withdrawals(
    request: EmergencyControlRequest,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """Pause withdrawal processing"""
    audit = Audit(
        actor_user_id=admin_user.id,
        action=AuditAction.ADMIN_ACTION,
        object_type="platform",
        object_id=0,
        reason=f"Emergency: Pause withdrawals - {request.reason}",
        extra_metadata={"action": "pause_withdrawals", "timestamp": datetime.utcnow().isoformat()}
    )
    session.add(audit)
    session.commit()
    
    logger.warning(f"Admin {admin_user.id} paused withdrawals: {request.reason}")
    
    return {
        "message": "Withdrawals paused",
        "reason": request.reason,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.post("/emergency/resume-withdrawals", response_model=dict)
def resume_withdrawals(
    request: EmergencyControlRequest,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """Resume withdrawal processing"""
    audit = Audit(
        actor_user_id=admin_user.id,
        action=AuditAction.ADMIN_ACTION,
        object_type="platform",
        object_id=0,
        reason=f"Emergency: Resume withdrawals - {request.reason}",
        extra_metadata={"action": "resume_withdrawals", "timestamp": datetime.utcnow().isoformat()}
    )
    session.add(audit)
    session.commit()
    
    logger.info(f"Admin {admin_user.id} resumed withdrawals: {request.reason}")
    
    return {
        "message": "Withdrawals resumed",
        "reason": request.reason,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.post("/emergency/pause-trading", response_model=dict)
def pause_trading(
    request: EmergencyControlRequest,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """Pause trading platform access"""
    audit = Audit(
        actor_user_id=admin_user.id,
        action=AuditAction.ADMIN_ACTION,
        object_type="platform",
        object_id=0,
        reason=f"Emergency: Pause trading - {request.reason}",
        extra_metadata={"action": "pause_trading", "timestamp": datetime.utcnow().isoformat()}
    )
    session.add(audit)
    session.commit()
    
    logger.warning(f"Admin {admin_user.id} paused trading: {request.reason}")
    
    return {
        "message": "Trading paused",
        "reason": request.reason,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.post("/emergency/resume-trading", response_model=dict)
def resume_trading(
    request: EmergencyControlRequest,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """Resume trading platform access"""
    audit = Audit(
        actor_user_id=admin_user.id,
        action=AuditAction.ADMIN_ACTION,
        object_type="platform",
        object_id=0,
        reason=f"Emergency: Resume trading - {request.reason}",
        extra_metadata={"action": "resume_trading", "timestamp": datetime.utcnow().isoformat()}
    )
    session.add(audit)
    session.commit()
    
    logger.info(f"Admin {admin_user.id} resumed trading: {request.reason}")
    
    return {
        "message": "Trading resumed",
        "reason": request.reason,
        "timestamp": datetime.utcnow().isoformat()
    }


@router.post("/emergency/freeze-account/{account_id}", response_model=dict)
def freeze_account(
    account_id: int,
    request: EmergencyControlRequest,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """Freeze a specific user account"""
    account = session.get(Account, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    account.is_frozen = True
    account.updated_at = datetime.utcnow()
    
    audit = Audit(
        actor_user_id=admin_user.id,
        action=AuditAction.ADMIN_ACTION,
        object_type="account",
        object_id=account_id,
        reason=f"Emergency: Freeze account - {request.reason}",
        diff={"is_frozen": {"before": False, "after": True}}
    )
    
    session.add(account)
    session.add(audit)
    session.commit()
    
    logger.warning(f"Admin {admin_user.id} froze account {account_id}: {request.reason}")
    
    return {
        "message": "Account frozen",
        "account_id": account_id,
        "reason": request.reason
    }


@router.post("/emergency/unfreeze-account/{account_id}", response_model=dict)
def unfreeze_account(
    account_id: int,
    request: EmergencyControlRequest,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """Unfreeze a specific user account"""
    account = session.get(Account, account_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    account.is_frozen = False
    account.updated_at = datetime.utcnow()
    
    audit = Audit(
        actor_user_id=admin_user.id,
        action=AuditAction.ADMIN_ACTION,
        object_type="account",
        object_id=account_id,
        reason=f"Emergency: Unfreeze account - {request.reason}",
        diff={"is_frozen": {"before": True, "after": False}}
    )
    
    session.add(account)
    session.add(audit)
    session.commit()
    
    logger.info(f"Admin {admin_user.id} unfroze account {account_id}: {request.reason}")
    
    return {
        "message": "Account unfrozen",
        "account_id": account_id,
        "reason": request.reason
    }


# ============================================================================
# COMPLIANCE & REPORTING
# ============================================================================

@router.get("/reports/daily-summary", response_model=dict)
def get_daily_summary(
    date: Optional[str] = None,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """Generate daily deposit/withdrawal summary for regulators"""
    if not date:
        target_date = datetime.utcnow().date()
    else:
        target_date = datetime.fromisoformat(date).date()
    
    start_dt = datetime.combine(target_date, datetime.min.time())
    end_dt = datetime.combine(target_date, datetime.max.time())
    
    # Get all deposits
    deposits = session.exec(
        select(Deposit)
        .where(Deposit.created_at >= start_dt)
        .where(Deposit.created_at <= end_dt)
    ).all()
    
    # Get all withdrawals
    withdrawals = session.exec(
        select(Withdrawal)
        .where(Withdrawal.requested_at >= start_dt)
        .where(Withdrawal.requested_at <= end_dt)
    ).all()
    
    # Get all accounts
    accounts = session.exec(select(Account)).all()
    
    return {
        "report_date": target_date.isoformat(),
        "generated_at": datetime.utcnow().isoformat(),
        "deposits": {
            "total_count": len(deposits),
            "total_amount_usd": float(sum(d.amount_usd for d in deposits)),
            "confirmed_count": sum(1 for d in deposits if d.status == "confirmed"),
            "confirmed_amount_usd": float(sum(d.amount_usd for d in deposits if d.status == "confirmed")),
            "by_currency": {}
        },
        "withdrawals": {
            "total_count": len(withdrawals),
            "total_amount_usd": float(sum(w.amount_approved or w.amount_requested for w in withdrawals)),
            "approved_count": sum(1 for w in withdrawals if w.status in ["approved", "completed"]),
            "approved_amount_usd": float(sum(
                w.amount_approved or w.amount_requested 
                for w in withdrawals 
                if w.status in ["approved", "completed"]
            ))
        },
        "accounts": {
            "total_count": len(accounts),
            "total_deposited_amount": float(sum(a.deposited_amount for a in accounts)),
            "total_virtual_balances": float(sum(a.virtual_balance for a in accounts)),
            "active_count": sum(1 for a in accounts if a.is_active and not a.is_frozen)
        },
        "users": {
            "total_count": session.exec(select(User)).count(),
            "active_count": session.exec(select(User).where(User.is_active == True)).count(),
            "kyc_approved_count": session.exec(
                select(User).where(User.kyc_status.in_(["approved", "auto_approved"]))
            ).count()
        }
    }


@router.get("/reports/monthly-statement/{user_id}", response_model=dict)
def get_user_monthly_statement(
    user_id: int,
    year: int,
    month: int,
    admin_user: User = Depends(get_current_admin_user),
    session: Session = Depends(get_session)
):
    """Generate monthly statement for a user (regulator-ready)"""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get account
    account = session.exec(
        select(Account).where(Account.user_id == user_id)
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Date range for the month
    start_dt = datetime(year, month, 1)
    if month == 12:
        end_dt = datetime(year + 1, 1, 1) - timedelta(seconds=1)
    else:
        end_dt = datetime(year, month + 1, 1) - timedelta(seconds=1)
    
    # Get ledger entries
    ledger_entries = session.exec(
        select(LedgerEntry)
        .where(LedgerEntry.account_id == account.id)
        .where(LedgerEntry.created_at >= start_dt)
        .where(LedgerEntry.created_at <= end_dt)
        .order_by(LedgerEntry.created_at)
    ).all()
    
    # Get deposits
    deposits = session.exec(
        select(Deposit)
        .where(Deposit.user_id == user_id)
        .where(Deposit.created_at >= start_dt)
        .where(Deposit.created_at <= end_dt)
    ).all()
    
    # Get withdrawals
    withdrawals = session.exec(
        select(Withdrawal)
        .where(Withdrawal.user_id == user_id)
        .where(Withdrawal.requested_at >= start_dt)
        .where(Withdrawal.requested_at <= end_dt)
    ).all()
    
    return {
        "user_id": user_id,
        "user_email": user.email,
        "statement_period": {
            "year": year,
            "month": month,
            "start_date": start_dt.isoformat(),
            "end_date": end_dt.isoformat()
        },
        "account": {
            "account_id": account.id,
            "opening_balance": float(account.deposited_amount),  # Simplified
            "closing_balance": float(account.virtual_balance),
            "total_deposited": float(account.deposited_amount)
        },
        "transactions": {
            "deposits": [
                {
                    "id": d.id,
                    "amount_usd": float(d.amount_usd),
                    "currency": d.currency,
                    "status": d.status.value,
                    "created_at": d.created_at.isoformat()
                }
                for d in deposits
            ],
            "withdrawals": [
                {
                    "id": w.id,
                    "amount_requested": float(w.amount_requested),
                    "amount_approved": float(w.amount_approved) if w.amount_approved else None,
                    "status": w.status.value,
                    "requested_at": w.requested_at.isoformat()
                }
                for w in withdrawals
            ],
            "ledger_entries": [
                {
                    "id": le.id,
                    "entry_type": le.entry_type.value,
                    "amount": float(le.amount),
                    "balance_after": float(le.balance_after),
                    "description": le.description,
                    "created_at": le.created_at.isoformat()
                }
                for le in ledger_entries
            ]
        },
        "generated_at": datetime.utcnow().isoformat()
    }
