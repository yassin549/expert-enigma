"""Payments API Routes – Crypto deposits via NOWPayments"""

from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any, Dict, List, Optional
from uuid import uuid4
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Header, status
from pydantic import BaseModel, Field, condecimal, validator
from sqlmodel import Session, select

from core.config import settings
from core.database import get_session
from core.dependencies import get_current_user
from models.account import Account
from models.deposit import Deposit, DepositStatus
from models.ledger import LedgerEntry, EntryType
from models.user import User
from payments.nowpayments import nowpayments_client

logger = logging.getLogger(__name__)

router = APIRouter()


class CurrencyResponse(BaseModel):
    currencies: List[str]


class CreateDepositRequest(BaseModel):
    amount_usd: condecimal(gt=Decimal("0"), decimal_places=2) = Field(
        ..., description="Deposit amount priced in USD"
    )
    pay_currency: str = Field(
        ..., min_length=2, max_length=10, description="Cryptocurrency code (btc, eth, usdt, etc.)"
    )

    @validator("pay_currency")
    def normalize_currency(cls, value: str) -> str:
        return value.strip().lower()


class DepositInstructionResponse(BaseModel):
    deposit_id: int
    payment_id: str
    order_id: str
    status: DepositStatus
    pay_currency: str
    pay_amount: Decimal
    pay_address: Optional[str]
    price_amount: Decimal
    price_currency: str
    nowpayments_payload: Dict[str, Any]


class DepositRecordResponse(BaseModel):
    id: int
    status: DepositStatus
    currency: str
    amount: Decimal
    amount_usd: Decimal
    created_at: str
    nowpayments_payment_id: Optional[str]


@router.get("/currencies", response_model=CurrencyResponse)
async def list_supported_currencies() -> CurrencyResponse:
    """Return the list of NOWPayments supported cryptocurrencies."""
    currencies = await nowpayments_client.get_available_currencies()
    return CurrencyResponse(currencies=currencies)


@router.post(
    "/deposits",
    response_model=DepositInstructionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_deposit(
    request: CreateDepositRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Create a crypto deposit intent and return payment instructions."""

    order_id = f"deposit-{current_user.id}-{uuid4().hex[:10]}"
    callback_url = f"{settings.API_URL}/api/payments/nowpayments/ipn"

    try:
        payment_payload = await nowpayments_client.create_payment(
            price_amount=float(request.amount_usd),
            price_currency="usd",
            pay_currency=request.pay_currency,
            order_id=order_id,
            order_description=f"Topcoin deposit for user {current_user.id}",
            ipn_callback_url=callback_url,
        )
    except Exception as exc:  # HTTP errors are logged in client
        logger.exception("Failed to create NOWPayments payment")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to create crypto payment. Please try again shortly.",
        ) from exc

    payment_id = str(payment_payload.get("payment_id"))
    if not payment_id:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Invalid response from payment provider: missing payment_id",
        )

    pay_amount = Decimal(str(payment_payload.get("pay_amount", "0")))
    price_amount = Decimal(str(payment_payload.get("price_amount", request.amount_usd)))
    pay_currency_response = str(payment_payload.get("pay_currency", request.pay_currency)).upper()

    deposit = Deposit(
        user_id=current_user.id,
        amount=pay_amount,
        amount_usd=price_amount,
        currency=pay_currency_response,
        status=DepositStatus.PENDING,
        nowpayments_payment_id=payment_id,
        payment_address=payment_payload.get("pay_address"),
        tx_meta=payment_payload,
    )

    session.add(deposit)
    session.commit()
    session.refresh(deposit)

    logger.info(
        "Created deposit %s for user %s (%s %s)",
        deposit.id,
        current_user.id,
        pay_currency_response,
        pay_amount,
    )

    return DepositInstructionResponse(
        deposit_id=deposit.id,
        payment_id=payment_id,
        order_id=order_id,
        status=deposit.status,
        pay_currency=pay_currency_response,
        pay_amount=pay_amount,
        pay_address=deposit.payment_address,
        price_amount=price_amount,
        price_currency="USD",
        nowpayments_payload=payment_payload,
    )


@router.get("/deposits", response_model=List[DepositRecordResponse])
def list_user_deposits(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Return recent deposit intents for the authenticated user."""

    deposits = session.exec(
        select(Deposit)
        .where(Deposit.user_id == current_user.id)
        .order_by(Deposit.created_at.desc())
        .limit(50)
    ).all()

    return [
        DepositRecordResponse(
            id=dep.id,
            status=dep.status,
            currency=dep.currency,
            amount=dep.amount,
            amount_usd=dep.amount_usd,
            created_at=dep.created_at.isoformat(),
            nowpayments_payment_id=dep.nowpayments_payment_id,
        )
        for dep in deposits
    ]


class NowpaymentsIPN(BaseModel):
    """Minimal NOWPayments IPN payload model.

    We only validate the critical fields and allow extra keys passthrough.
    """

    payment_id: str
    payment_status: str

    class Config:
        extra = "allow"


def map_nowpayments_status(payment_status: str) -> DepositStatus:
    """Map NOWPayments payment_status string to internal DepositStatus.

    Keeps logic tolerant to new/unknown statuses by defaulting to PENDING.
    """

    status_lower = payment_status.lower()

    if status_lower in {"waiting", "partially_paid"}:
        return DepositStatus.PENDING
    if status_lower == "confirming":
        return DepositStatus.CONFIRMING
    if status_lower in {"confirmed", "sending", "finished"}:
        return DepositStatus.CONFIRMED
    if status_lower in {"failed", "expired"}:
        return DepositStatus.FAILED
    if status_lower == "refunded":
        return DepositStatus.REFUNDED

    # Fallback – treat unknown statuses as pending for safety
    return DepositStatus.PENDING


async def _process_confirmed_deposit(
    deposit: Deposit,
    ipn_payload: Dict[str, Any],
    session: Session,
) -> None:
    """Apply side effects for a newly confirmed deposit.

    - Mark deposit as confirmed (idempotent)
    - Create or fetch trading account
    - Increment deposited_amount (real money)
    - Enable can_access_trading on the user
    - Create immutable ledger entry
    - Emit WebSocket deposit update
    """

    # Idempotency: if already processed, do nothing
    if deposit.confirmed_at is not None:
        return

    deposit.confirmed_at = datetime.utcnow()

    # Get or create account for this user
    account = session.exec(
        select(Account).where(Account.user_id == deposit.user_id)
    ).first()

    if account is None:
        account = Account(
            user_id=deposit.user_id,
            name="Main Account",
            base_currency="USD",
            deposited_amount=Decimal("0.00"),
            virtual_balance=Decimal("0.00"),
            equity_cached=Decimal("0.00"),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        session.add(account)
        session.commit()
        session.refresh(account)

    # Update deposited_amount in USD (real money, not virtual balance)
    previous_deposited = account.deposited_amount
    account.deposited_amount = previous_deposited + deposit.amount_usd
    account.updated_at = datetime.utcnow()

    # Enable trading access on first confirmed deposit
    user = session.get(User, deposit.user_id)
    if user and not user.can_access_trading:
        user.can_access_trading = True
        user.updated_at = datetime.utcnow()
        session.add(user)

    # Create immutable ledger entry for this deposit
    ledger_entry = LedgerEntry(
        account_id=account.id,
        user_id=deposit.user_id,
        entry_type=EntryType.DEPOSIT,
        amount=deposit.amount_usd,
        balance_after=account.deposited_amount,
        description=f"Deposit confirmed via NOWPayments ({deposit.currency} {deposit.amount})",
        reference_type="deposit",
        reference_id=deposit.id,
        meta={
            "payment_id": deposit.nowpayments_payment_id,
            "payment_status": ipn_payload.get("payment_status"),
            "tx_hash": deposit.tx_hash,
        },
    )

    session.add(account)
    session.add(deposit)
    session.add(ledger_entry)
    session.commit()
    
    # Check AML rules after deposit
    try:
        from core.aml_rules import check_and_create_aml_alerts
        check_and_create_aml_alerts(
            session=session,
            event_type="deposit",
            user_id=deposit.user_id,
            tx_id=deposit.id
        )
    except Exception as e:
        logger.error(f"Failed to run AML checks for deposit {deposit.id}: {e}")

    # Emit WebSocket update for real-time UX (best-effort)
    try:
        from api.websocket import notify_deposit_update

        deposit_data = {
            "id": deposit.id,
            "status": deposit.status,
            "currency": deposit.currency,
            "amount": str(deposit.amount),
            "amount_usd": str(deposit.amount_usd),
            "nowpayments_payment_id": deposit.nowpayments_payment_id,
            "confirmed_at": deposit.confirmed_at.isoformat()
            if deposit.confirmed_at
            else None,
        }

        await notify_deposit_update(deposit.user_id, deposit_data)
    except Exception:
        # Do not break IPN processing if WebSocket notification fails
        logger.exception("Failed to send deposit WebSocket update")


@router.post("/nowpayments/ipn", status_code=status.HTTP_200_OK)
async def nowpayments_ipn_webhook(
    request: Request,
    x_nowpayments_sig: Optional[str] = Header(default=None),
    session: Session = Depends(get_session),
):
    """NOWPayments IPN webhook.

    Flow:
    - Verify HMAC signature using NOWPAYMENTS_IPN_SECRET
    - Locate Deposit by payment_id
    - Update Deposit status + metadata from IPN
    - On confirmed: credit deposited_amount, set can_access_trading, create ledger entry
    - Best-effort WebSocket notification for real-time UI updates
    """

    raw_body = await request.body()

    # Verify IPN signature (protects from spoofed callbacks)
    if not x_nowpayments_sig or not nowpayments_client.verify_ipn_signature(
        raw_body, x_nowpayments_sig
    ):
        logger.warning("Received NOWPayments IPN with invalid signature")
        # Return 200 but ignore to avoid leaking details
        return {"status": "ignored"}

    try:
        payload_dict = await request.json()
        ipn = NowpaymentsIPN(**payload_dict)
    except Exception as exc:
        logger.error("Failed to parse NOWPayments IPN payload: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid IPN payload",
        )

    payment_id = ipn.payment_id
    payment_status = ipn.payment_status

    # Locate matching deposit by NOWPayments payment_id
    deposit = session.exec(
        select(Deposit).where(Deposit.nowpayments_payment_id == payment_id)
    ).first()

    if not deposit:
        logger.error("NOWPayments IPN for unknown payment_id %s", payment_id)
        return {"status": "ignored"}

    # Always store latest raw payload
    deposit.tx_meta = payload_dict

    # Optional fields: transaction hash, confirmations
    tx_hash = payload_dict.get("transaction_id")
    if tx_hash:
        deposit.tx_hash = tx_hash

    confirmations = payload_dict.get("actually_paid_confirmations")
    if confirmations is not None:
        try:
            deposit.confirmations = int(confirmations)
        except (TypeError, ValueError):
            pass

    mapped_status = map_nowpayments_status(payment_status)

    # If deposit was already finalized, keep it immutable apart from metadata
    if deposit.status in {
        DepositStatus.CONFIRMED,
        DepositStatus.FAILED,
        DepositStatus.REFUNDED,
    }:
        session.add(deposit)
        session.commit()
        return {"status": "ok"}

    deposit.status = mapped_status

    # Handle terminal statuses
    if mapped_status == DepositStatus.CONFIRMED:
        await _process_confirmed_deposit(deposit, payload_dict, session)
    elif mapped_status in {DepositStatus.FAILED, DepositStatus.REFUNDED}:
        if deposit.expired_at is None:
            deposit.expired_at = datetime.utcnow()
        session.add(deposit)
        session.commit()
    else:
        # Intermediate status update (pending/confirming)
        session.add(deposit)
        session.commit()

    return {"status": "ok"}

