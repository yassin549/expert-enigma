"""
Account Management API Routes
Trading accounts with virtual balance system
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from core.database import get_session
from core.dependencies import get_current_user, require_trading_access
from models.user import User
from models.account import Account
from models.ledger import LedgerEntry, EntryType
from models.audit import Audit, AuditAction

logger = logging.getLogger(__name__)
router = APIRouter()


# Pydantic models for request/response
from pydantic import BaseModel


class CreateAccountRequest(BaseModel):
    name: str = "Main Account"
    base_currency: str = "USD"


class AccountResponse(BaseModel):
    id: int
    user_id: int
    name: str
    base_currency: str
    deposited_amount: Decimal
    virtual_balance: Decimal
    equity_cached: Decimal
    margin_used: Decimal
    margin_available: Decimal
    total_trades: int
    winning_trades: int
    losing_trades: int
    total_pnl: Decimal
    is_active: bool
    is_frozen: bool
    created_at: datetime
    updated_at: datetime
    last_trade_at: Optional[datetime]


class BalanceResponse(BaseModel):
    virtual_balance: Decimal
    deposited_amount: Decimal
    equity: Decimal
    margin_used: Decimal
    margin_available: Decimal
    unrealized_pnl: Decimal


class EquityCurvePoint(BaseModel):
    timestamp: datetime
    equity: Decimal
    balance: Decimal
    pnl: Decimal


class EquityCurveResponse(BaseModel):
    points: List[EquityCurvePoint]
    total_return_pct: Decimal
    max_drawdown_pct: Decimal
    sharpe_ratio: Optional[Decimal]


@router.post("/", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(
    request: CreateAccountRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Create new trading account
    Only created after first deposit is confirmed
    """
    logger.info(f"Creating account for user {current_user.id}")
    
    # Check if user already has an account
    existing_account = session.exec(
        select(Account).where(Account.user_id == current_user.id)
    ).first()
    
    if existing_account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has a trading account"
        )
    
    # Create new account
    new_account = Account(
        user_id=current_user.id,
        name=request.name,
        base_currency=request.base_currency,
        deposited_amount=Decimal("0.00"),
        virtual_balance=Decimal("0.00"),
        equity_cached=Decimal("0.00"),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    session.add(new_account)
    session.commit()
    session.refresh(new_account)
    
    # Create audit log
    audit = Audit(
        actor_user_id=current_user.id,
        action=AuditAction.ACCOUNT_CREATED,
        object_type="account",
        object_id=new_account.id,
        reason="Account creation"
    )
    session.add(audit)
    session.commit()
    
    logger.info(f"Account created successfully: {new_account.id}")
    
    return AccountResponse(
        id=new_account.id,
        user_id=new_account.user_id,
        name=new_account.name,
        base_currency=new_account.base_currency,
        deposited_amount=new_account.deposited_amount,
        virtual_balance=new_account.virtual_balance,
        equity_cached=new_account.equity_cached,
        margin_used=new_account.margin_used,
        margin_available=new_account.margin_available,
        total_trades=new_account.total_trades,
        winning_trades=new_account.winning_trades,
        losing_trades=new_account.losing_trades,
        total_pnl=new_account.total_pnl,
        is_active=new_account.is_active,
        is_frozen=new_account.is_frozen,
        created_at=new_account.created_at,
        updated_at=new_account.updated_at,
        last_trade_at=new_account.last_trade_at
    )


@router.get("/{account_id}", response_model=AccountResponse)
def get_account(
    account_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get account details
    """
    # Fetch account
    account = session.get(Account, account_id)
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Check ownership (non-admin users can only see their own accounts)
    if not current_user.is_admin and account.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    return AccountResponse(
        id=account.id,
        user_id=account.user_id,
        name=account.name,
        base_currency=account.base_currency,
        deposited_amount=account.deposited_amount,
        virtual_balance=account.virtual_balance,
        equity_cached=account.equity_cached,
        margin_used=account.margin_used,
        margin_available=account.margin_available,
        total_trades=account.total_trades,
        winning_trades=account.winning_trades,
        losing_trades=account.losing_trades,
        total_pnl=account.total_pnl,
        is_active=account.is_active,
        is_frozen=account.is_frozen,
        created_at=account.created_at,
        updated_at=account.updated_at,
        last_trade_at=account.last_trade_at
    )


@router.get("/{account_id}/balance", response_model=BalanceResponse)
def get_account_balance(
    account_id: int,
    current_user: User = Depends(require_trading_access),
    session: Session = Depends(get_session)
):
    """
    Get account balance and equity information
    Requires trading access (user must have deposited)
    """
    # Fetch account
    account = session.get(Account, account_id)
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Check ownership
    if account.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Calculate unrealized P&L from open positions
    # TODO: Implement position P&L calculation
    unrealized_pnl = Decimal("0.00")
    
    # Calculate current equity
    equity = account.virtual_balance + unrealized_pnl
    
    # Update cached equity
    account.equity_cached = equity
    account.updated_at = datetime.utcnow()
    session.add(account)
    session.commit()
    
    return BalanceResponse(
        virtual_balance=account.virtual_balance,
        deposited_amount=account.deposited_amount,
        equity=equity,
        margin_used=account.margin_used,
        margin_available=account.margin_available,
        unrealized_pnl=unrealized_pnl
    )


@router.get("/{account_id}/equity-curve", response_model=EquityCurveResponse)
def get_equity_curve(
    account_id: int,
    days: int = 30,
    current_user: User = Depends(require_trading_access),
    session: Session = Depends(get_session)
):
    """
    Get account equity curve over time
    Shows balance and P&L progression
    """
    # Fetch account
    account = session.get(Account, account_id)
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Check ownership
    if account.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Get date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)
    
    # Fetch ledger entries for the period
    ledger_entries = session.exec(
        select(LedgerEntry)
        .where(LedgerEntry.account_id == account_id)
        .where(LedgerEntry.created_at >= start_date)
        .where(LedgerEntry.created_at <= end_date)
        .order_by(LedgerEntry.created_at)
    ).all()
    
    # Build equity curve points
    points = []
    running_balance = account.deposited_amount  # Start with deposited amount
    running_pnl = Decimal("0.00")
    
    for entry in ledger_entries:
        if entry.entry_type in [EntryType.DEPOSIT, EntryType.ADMIN_ADJUSTMENT]:
            running_balance += entry.amount
        elif entry.entry_type == EntryType.TRADE_PNL:
            running_pnl += entry.amount
        
        equity = running_balance + running_pnl
        
        points.append(EquityCurvePoint(
            timestamp=entry.created_at,
            equity=equity,
            balance=running_balance,
            pnl=running_pnl
        ))
    
    # Add current point if no recent entries
    if not points or (end_date - points[-1].timestamp).total_seconds() > 3600:
        points.append(EquityCurvePoint(
            timestamp=end_date,
            equity=account.equity_cached,
            balance=account.virtual_balance,
            pnl=account.total_pnl
        ))
    
    # Calculate performance metrics
    if len(points) > 1:
        initial_equity = points[0].equity if points[0].equity > 0 else Decimal("1.00")
        final_equity = points[-1].equity
        total_return_pct = ((final_equity - initial_equity) / initial_equity) * 100
        
        # Simple max drawdown calculation
        peak_equity = initial_equity
        max_drawdown_pct = Decimal("0.00")
        
        for point in points:
            if point.equity > peak_equity:
                peak_equity = point.equity
            
            drawdown = ((peak_equity - point.equity) / peak_equity) * 100
            if drawdown > max_drawdown_pct:
                max_drawdown_pct = drawdown
    else:
        total_return_pct = Decimal("0.00")
        max_drawdown_pct = Decimal("0.00")
    
    return EquityCurveResponse(
        points=points,
        total_return_pct=total_return_pct,
        max_drawdown_pct=max_drawdown_pct,
        sharpe_ratio=None  # TODO: Implement Sharpe ratio calculation
    )


@router.get("/", response_model=List[AccountResponse])
def list_user_accounts(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    List all accounts for current user
    """
    accounts = session.exec(
        select(Account).where(Account.user_id == current_user.id)
    ).all()
    
    return [
        AccountResponse(
            id=account.id,
            user_id=account.user_id,
            name=account.name,
            base_currency=account.base_currency,
            deposited_amount=account.deposited_amount,
            virtual_balance=account.virtual_balance,
            equity_cached=account.equity_cached,
            margin_used=account.margin_used,
            margin_available=account.margin_available,
            total_trades=account.total_trades,
            winning_trades=account.winning_trades,
            losing_trades=account.losing_trades,
            total_pnl=account.total_pnl,
            is_active=account.is_active,
            is_frozen=account.is_frozen,
            created_at=account.created_at,
            updated_at=account.updated_at,
            last_trade_at=account.last_trade_at
        )
        for account in accounts
    ]
