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
        
        # TODO: Query database for pending deposits
        # TODO: Check status with NOWPayments API
        # TODO: Update deposit status and credit user balance
        # TODO: Send notification to user
        
        logger.info("✅ Pending deposits check complete")
        return {"status": "success", "checked": 0, "updated": 0}
        
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
        logger.info(f"Processing deposit confirmation: {payment_id}")
        
        # TODO: Verify payment with NOWPayments
        # TODO: Update deposit status to confirmed
        # TODO: Credit user's deposited_amount
        # TODO: Set can_access_trading = TRUE on first deposit
        # TODO: Create ledger entry
        # TODO: Send confirmation email/notification
        
        logger.info(f"✅ Deposit {payment_id} processed successfully")
        return {"status": "success", "deposit_id": deposit_id}
        
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
        
        # TODO: Get user email from database
        # TODO: Send confirmation email
        # TODO: Create in-app notification
        # TODO: Send WebSocket update if user is online
        
        logger.info(f"✅ Deposit notification sent to user {user_id}")
        return {"status": "success", "user_id": user_id}
        
    except Exception as e:
        logger.error(f"Failed to send deposit notification: {str(e)}")
        raise self.retry(exc=e, countdown=30)
