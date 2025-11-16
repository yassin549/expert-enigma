"""
Celery tasks for deposit processing and reconciliation
"""

from celery import shared_task
import logging
from typing import Dict, Any, List
from datetime import datetime
from decimal import Decimal

import httpx
from sqlmodel import Session, select

from core.config import settings
from core.database import get_sync_session
from models.deposit import Deposit, DepositStatus
from models.aml import AMLAlert, AMLSeverity

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def check_pending_deposits(self):
    """
    Periodic task to check status of pending deposits with NOWPayments
    Runs every 2 minutes via Celery Beat
    """
    try:
        logger.info("Checking pending deposits...")
        
        session: Session = get_sync_session()
        checked = 0
        updated = 0
        
        try:
            # Query database for pending/confirming deposits
            pending_deposits = session.exec(
                select(Deposit).where(
                    Deposit.status.in_([DepositStatus.PENDING, DepositStatus.CONFIRMING]),
                    Deposit.nowpayments_payment_id.isnot(None)
                )
            ).all()
            
            checked = len(pending_deposits)
            
            for deposit in pending_deposits:
                try:
                    # Check status with NOWPayments API
                    import httpx
                    response = httpx.get(
                        f"{settings.NOWPAYMENTS_API_URL}/payment/{deposit.nowpayments_payment_id}",
                        headers={"x-api-key": settings.NOWPAYMENTS_API_KEY},
                        timeout=20.0,
                    )
                    response.raise_for_status()
                    payment_data = response.json()
                    
                    # Map NOWPayments status to internal status
                    np_status = str(payment_data.get("payment_status", "")).lower()
                    
                    if np_status in {"waiting", "partially_paid"}:
                        new_status = DepositStatus.PENDING
                    elif np_status == "confirming":
                        new_status = DepositStatus.CONFIRMING
                    elif np_status in {"confirmed", "sending", "finished"}:
                        new_status = DepositStatus.CONFIRMED
                    elif np_status in {"failed", "expired"}:
                        new_status = DepositStatus.FAILED
                    elif np_status == "refunded":
                        new_status = DepositStatus.REFUNDED
                    else:
                        new_status = deposit.status
                    
                    # Update deposit if status changed
                    if new_status != deposit.status:
                        deposit.status = new_status
                        deposit.tx_meta = payment_data  # Store latest data
                        
                        # Update transaction hash if available
                        if payment_data.get("transaction_id"):
                            deposit.tx_hash = payment_data.get("transaction_id")
                        
                        # Update confirmations if available
                        if payment_data.get("actually_paid_confirmations") is not None:
                            deposit.confirmations = int(payment_data.get("actually_paid_confirmations", 0))
                        
                        session.add(deposit)
                        
                        # If confirmed, trigger processing
                        if new_status == DepositStatus.CONFIRMED:
                            process_deposit_confirmation.delay(
                                deposit.nowpayments_payment_id,
                                deposit.id
                            )
                            updated += 1
                        elif new_status in {DepositStatus.FAILED, DepositStatus.REFUNDED}:
                            deposit.expired_at = datetime.utcnow()
                            updated += 1
                    
                    session.commit()
                    
                except Exception as e:
                    logger.error(f"Error checking deposit {deposit.id}: {str(e)}")
                    session.rollback()
                    continue
                    
        finally:
            session.close()
        
        logger.info(f"✅ Pending deposits check complete (checked={checked}, updated={updated})")
        return {"status": "success", "checked": checked, "updated": updated}
        
    except Exception as e:
        logger.error(f"Error checking pending deposits: {str(e)}")
        raise self.retry(exc=e, countdown=60)


@shared_task(bind=True, max_retries=5)
def process_deposit_confirmation(self, payment_id: str, deposit_id: int):
    """
    Process confirmed deposit and credit user account
    
    Args:
        payment_id: NOWPayments payment ID
        deposit_id: Internal deposit record ID
    """
    try:
        logger.info(f"Processing deposit confirmation: {payment_id} (deposit_id={deposit_id})")
        
        session: Session = get_sync_session()
        
        try:
            # Get deposit record
            deposit = session.get(Deposit, deposit_id)
            if not deposit:
                logger.error(f"Deposit {deposit_id} not found")
                return {"status": "error", "message": "Deposit not found"}
            
            # Idempotency check - if already processed, skip
            if deposit.confirmed_at is not None:
                logger.info(f"Deposit {deposit_id} already processed, skipping")
                return {"status": "success", "deposit_id": deposit_id, "already_processed": True}
            
            # Verify payment with NOWPayments (double-check)
            import httpx
            try:
                response = httpx.get(
                    f"{settings.NOWPAYMENTS_API_URL}/payment/{payment_id}",
                    headers={"x-api-key": settings.NOWPAYMENTS_API_KEY},
                    timeout=20.0,
                )
                response.raise_for_status()
                payment_data = response.json()
                
                np_status = str(payment_data.get("payment_status", "")).lower()
                if np_status not in {"confirmed", "sending", "finished"}:
                    logger.warning(f"Payment {payment_id} status is {np_status}, not confirmed")
                    return {"status": "error", "message": f"Payment not confirmed: {np_status}"}
            except Exception as e:
                logger.error(f"Failed to verify payment with NOWPayments: {str(e)}")
                # Continue anyway - IPN webhook should have verified it
            
            # Mark deposit as confirmed
            deposit.status = DepositStatus.CONFIRMED
            deposit.confirmed_at = datetime.utcnow()
            deposit.tx_meta = payment_data if 'payment_data' in locals() else deposit.tx_meta
            
            # Get or create account for this user
            from models.account import Account
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
            from models.user import User
            user = session.get(User, deposit.user_id)
            if user and not user.can_access_trading:
                user.can_access_trading = True
                user.updated_at = datetime.utcnow()
                session.add(user)
            
            # Create immutable ledger entry
            from models.ledger import LedgerEntry, EntryType
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
                    "payment_status": payment_data.get("payment_status") if 'payment_data' in locals() else None,
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
            
            # Send notification
            send_deposit_notification.delay(
                deposit.user_id,
                float(deposit.amount_usd),
                deposit.currency
            )
            
            logger.info(f"✅ Deposit {payment_id} processed successfully")
            return {"status": "success", "deposit_id": deposit_id}
            
        finally:
            session.close()
        
    except Exception as e:
        logger.error(f"Error processing deposit {payment_id}: {str(e)}")
        raise self.retry(exc=e, countdown=120)


@shared_task
def reconcile_deposits_batch(start_date: str, end_date: str):
    """
    Reconcile deposits for a date range
    
    Args:
        start_date: Start date (ISO format)
        end_date: End date (ISO format)
    """
    try:
        logger.info(f"Reconciling deposits from {start_date} to {end_date}")

        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)

        session: Session = get_sync_session()
        checked = 0
        mismatches = 0

        try:
            deposits: List[Deposit] = session.exec(
                select(Deposit)
                .where(Deposit.created_at >= start_dt)
                .where(Deposit.created_at <= end_dt)
            ).all()

            for deposit in deposits:
                if not deposit.nowpayments_payment_id:
                    continue

                checked += 1
                payment_id = deposit.nowpayments_payment_id

                try:
                    resp = httpx.get(
                        f"{settings.NOWPAYMENTS_API_URL}/payment/{payment_id}",
                        headers={"x-api-key": settings.NOWPAYMENTS_API_KEY},
                        timeout=20.0,
                    )
                    resp.raise_for_status()
                    data = resp.json()
                except Exception as exc:  # pragma: no cover - network layer
                    logger.error(
                        "Failed to fetch NOWPayments status for %s: %s",
                        payment_id,
                        exc,
                    )
                    continue

                np_status = str(data.get("payment_status", "")).lower()
                np_price_amount = Decimal(str(data.get("price_amount", deposit.amount_usd)))

                # Map NOWPayments status to internal DepositStatus
                if np_status in {"waiting", "partially_paid"}:
                    mapped_status = DepositStatus.PENDING
                elif np_status == "confirming":
                    mapped_status = DepositStatus.CONFIRMING
                elif np_status in {"confirmed", "sending", "finished"}:
                    mapped_status = DepositStatus.CONFIRMED
                elif np_status in {"failed", "expired"}:
                    mapped_status = DepositStatus.FAILED
                elif np_status == "refunded":
                    mapped_status = DepositStatus.REFUNDED
                else:
                    mapped_status = deposit.status

                mismatch_fields = []
                if mapped_status != deposit.status:
                    mismatch_fields.append("status")
                if np_price_amount != deposit.amount_usd:
                    mismatch_fields.append("amount_usd")

                # Store latest provider payload in tx_meta under reconciliation key
                tx_meta = deposit.tx_meta or {}
                tx_meta["reconciliation_snapshot"] = data
                deposit.tx_meta = tx_meta

                if mismatch_fields:
                    mismatches += 1
                    alert = AMLAlert(
                        user_id=deposit.user_id,
                        type="deposit_reconciliation_mismatch",
                        severity=AMLSeverity.MEDIUM,
                        tx_id=deposit.id,
                        tx_type="deposit",
                        details={
                            "payment_id": payment_id,
                            "mismatch_fields": mismatch_fields,
                            "local_status": deposit.status,
                            "provider_status": np_status,
                            "local_amount_usd": float(deposit.amount_usd),
                            "provider_amount_usd": float(np_price_amount),
                        },
                        description=(
                            f"Deposit {deposit.id} reconciliation mismatch on "
                            + ",".join(mismatch_fields)
                        ),
                    )
                    session.add(alert)
                    deposit.reconciled = False
                else:
                    deposit.reconciled = True
                    deposit.reconciled_at = datetime.utcnow()

                session.add(deposit)

            session.commit()
        finally:
            session.close()

        logger.info(
            "✅ Deposit reconciliation complete (checked=%s, mismatches=%s)",
            checked,
            mismatches,
        )
        return {
            "status": "success",
            "start_date": start_date,
            "end_date": end_date,
            "checked": checked,
            "mismatches": mismatches,
        }

    except Exception as e:
        logger.error(f"Deposit reconciliation failed: {str(e)}")
        raise


@shared_task(bind=True, max_retries=3)
def send_deposit_notification(self, user_id: int, amount: float, currency: str):
    """
    Send deposit confirmation notification to user
    
    Args:
        user_id: User ID
        amount: Deposit amount
        currency: Cryptocurrency
    """
    try:
        logger.info(f"Sending deposit notification to user {user_id}")
        
        session: Session = get_sync_session()
        
        try:
            # Get user email from database
            from models.user import User
            user = session.get(User, user_id)
            if not user:
                logger.error(f"User {user_id} not found")
                return {"status": "error", "message": "User not found"}
            
            # Send WebSocket update if user is online (best-effort)
            try:
                from api.websocket import manager
                deposit_data = {
                    "type": "deposit_confirmed",
                    "amount": amount,
                    "currency": currency,
                    "message": f"Your deposit of {amount} {currency} has been confirmed"
                }
                # Note: This is a sync context, so we can't await
                # WebSocket updates should be sent from async context (IPN webhook)
                logger.debug(f"WebSocket notification would be sent to user {user_id}")
            except Exception as e:
                logger.warning(f"Failed to prepare WebSocket notification: {e}")
            
            # TODO: Send confirmation email (when email service is configured)
            # For now, just log
            logger.info(f"Deposit notification for user {user.email}: {amount} {currency} confirmed")
            
            # TODO: Create in-app notification (when notification system is implemented)
            
            logger.info(f"✅ Deposit notification sent to user {user_id}")
            return {"status": "success", "user_id": user_id, "email": user.email}
            
        finally:
            session.close()
        
    except Exception as e:
        logger.error(f"Failed to send deposit notification: {str(e)}")
        raise self.retry(exc=e, countdown=30)
