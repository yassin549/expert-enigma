"""Payouts API Routes – User withdrawal requests"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, condecimal
from sqlmodel import Session, select

from core.config import settings
from core.database import get_session
from core.dependencies import get_current_user
from models.account import Account
from models.aml import AMLAlert, AMLSeverity
from models.user import User, KYCStatus
from models.withdrawal import Withdrawal, WithdrawalStatus

logger = logging.getLogger(__name__)

router = APIRouter()


class WithdrawalRequest(BaseModel):
    amount_usd: condecimal(gt=Decimal("0"), decimal_places=2) = Field(
        ..., description="Withdrawal amount in USD"
    )
    currency: str = Field(
        ..., min_length=2, max_length=10, description="Payout cryptocurrency code (BTC, ETH, USDT, etc.)"
    )
    payout_address: str = Field(
        ..., min_length=10, max_length=500, description="Destination crypto address"
    )


class WithdrawalResponse(BaseModel):
    id: int
    amount_requested: Decimal
    currency: str
    status: WithdrawalStatus
    payout_address: str
    requested_at: datetime


@router.post("/request", response_model=WithdrawalResponse, status_code=status.HTTP_201_CREATED)
def request_withdrawal(
    request: WithdrawalRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Create a new withdrawal request with KYC, AML, and balance checks."""

    # KYC must be approved or auto_approved
    if current_user.kyc_status not in {KYCStatus.APPROVED, KYCStatus.AUTO_APPROVED}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="KYC verification required before requesting withdrawals.",
        )

    # Fetch user's trading account
    account = session.exec(
        select(Account).where(Account.user_id == current_user.id)
    ).first()

    if not account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trading account not found.",
        )

    amount = Decimal(request.amount_usd)

    # Enforce platform withdrawal limits
    min_amount = Decimal(str(settings.WITHDRAWAL_MIN_USD))
    max_amount = Decimal(str(settings.WITHDRAWAL_MAX_USD))

    if amount < min_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum withdrawal amount is {min_amount} USD.",
        )

    if amount > max_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum withdrawal amount is {max_amount} USD.",
        )

    # User cannot withdraw more than current virtual_balance
    if amount > account.virtual_balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient virtual balance for this withdrawal amount.",
        )

    # Rate limit: max 3 withdrawal requests per 24 hours
    window_start = datetime.utcnow() - timedelta(hours=24)
    recent_withdrawals = session.exec(
        select(Withdrawal)
        .where(Withdrawal.user_id == current_user.id)
        .where(Withdrawal.requested_at >= window_start)
        .where(
            Withdrawal.status.in_(
                [
                    WithdrawalStatus.PENDING,
                    WithdrawalStatus.APPROVED,
                    WithdrawalStatus.PROCESSING,
                    WithdrawalStatus.COMPLETED,
                ]
            )
        )
    )
    if recent_withdrawals.count() >= 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily withdrawal request limit reached (max 3 per 24 hours).",
        )

    # Block if there are unresolved AML alerts
    open_aml_alerts = session.exec(
        select(AMLAlert)
        .where(AMLAlert.user_id == current_user.id)
        .where(AMLAlert.status.in_(["pending", "under_review", "escalated"]))
    ).all()

    if open_aml_alerts:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Withdrawals are temporarily blocked pending AML review.",
        )

    # Create withdrawal record
    withdrawal = Withdrawal(
        user_id=current_user.id,
        amount_requested=amount,
        currency=request.currency.upper(),
        status=WithdrawalStatus.PENDING,
        payout_address=request.payout_address,
    )

    session.add(withdrawal)

    # Large withdrawal AML alert
    threshold = Decimal(str(settings.AML_THRESHOLD_USD))
    if amount >= threshold:
        aml_alert = AMLAlert(
            user_id=current_user.id,
            type="large_withdrawal",
            severity=AMLSeverity.HIGH,
            tx_id=None,
            tx_type="withdrawal",
            details={
                "amount": float(amount),
                "threshold": float(threshold),
                "currency": "USD",
            },
            description=f"Large withdrawal request of {amount} USD detected",
        )
        session.add(aml_alert)

    session.commit()
    session.refresh(withdrawal)

    logger.info(
        "User %s requested withdrawal %s %s to %s (id=%s)",
        current_user.id,
        amount,
        withdrawal.currency,
        withdrawal.payout_address,
        withdrawal.id,
    )

    return WithdrawalResponse(
        id=withdrawal.id,
        amount_requested=withdrawal.amount_requested,
        currency=withdrawal.currency,
        status=withdrawal.status,
        payout_address=withdrawal.payout_address,
        requested_at=withdrawal.requested_at,
    )


@router.get("/withdrawals", response_model=List[WithdrawalResponse])
def list_user_withdrawals(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """List recent withdrawal requests for the authenticated user."""

    withdrawals = session.exec(
        select(Withdrawal)
        .where(Withdrawal.user_id == current_user.id)
        .order_by(Withdrawal.requested_at.desc())
        .limit(50)
    ).all()

    return [
        WithdrawalResponse(
            id=w.id,
            amount_requested=w.amount_requested,
            currency=w.currency,
            status=w.status,
            payout_address=w.payout_address,
            requested_at=w.requested_at,
        )
        for w in withdrawals
    ]
