"""
AML Rules Engine - Real-time transaction monitoring
Config-driven rules that raise aml_alerts on suspicious patterns
"""

from decimal import Decimal
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlmodel import Session, select, func
import logging

from models.aml import AMLAlert, AMLSeverity
from models.deposit import Deposit
from models.withdrawal import Withdrawal
from models.account import Account
from models.order import Order
from models.ledger import LedgerEntry, EntryType
from core.config import settings

logger = logging.getLogger(__name__)


class AMLRulesEngine:
    """Config-driven AML rules engine for real-time monitoring"""
    
    def __init__(self, session: Session):
        self.session = session
    
    def check_deposit(self, deposit: Deposit, user_id: int) -> Optional[AMLAlert]:
        """Check deposit against AML rules"""
        alerts = []
        
        # Rule 1: Large deposit (> $10k)
        threshold = Decimal(str(getattr(settings, 'AML_THRESHOLD_USD', 10000)))
        if deposit.amount_usd >= threshold:
            alerts.append(AMLAlert(
                user_id=user_id,
                type="large_deposit",
                severity=AMLSeverity.HIGH if deposit.amount_usd >= threshold * 2 else AMLSeverity.MEDIUM,
                tx_id=deposit.id,
                tx_type="deposit",
                details={
                    "amount": float(deposit.amount_usd),
                    "threshold": float(threshold),
                    "currency": "USD",
                    "payment_id": deposit.nowpayments_payment_id
                },
                description=f"Large deposit of ${deposit.amount_usd:,.2f} detected (threshold: ${threshold:,.2f})",
                status="pending"
            ))
        
        # Rule 2: Rapid deposit pattern (multiple deposits in short time)
        window_start = datetime.utcnow() - timedelta(hours=24)
        recent_deposits = self.session.exec(
            select(Deposit)
            .where(Deposit.user_id == user_id)
            .where(Deposit.created_at >= window_start)
            .where(Deposit.status == "confirmed")
        ).all()
        
        if len(recent_deposits) >= 5:
            total_amount = sum(d.amount_usd for d in recent_deposits)
            alerts.append(AMLAlert(
                user_id=user_id,
                type="rapid_deposits",
                severity=AMLSeverity.MEDIUM,
                tx_id=deposit.id,
                tx_type="deposit",
                details={
                    "count": len(recent_deposits),
                    "total_amount": float(total_amount),
                    "window_hours": 24
                },
                description=f"Rapid deposit pattern: {len(recent_deposits)} deposits in 24 hours totaling ${total_amount:,.2f}",
                status="pending"
            ))
        
        return alerts[0] if alerts else None
    
    def check_withdrawal(self, withdrawal: Withdrawal, user_id: int) -> Optional[AMLAlert]:
        """Check withdrawal against AML rules"""
        alerts = []
        
        # Rule 1: Large withdrawal (> $10k)
        threshold = Decimal(str(getattr(settings, 'AML_THRESHOLD_USD', 10000)))
        if withdrawal.amount_requested >= threshold:
            alerts.append(AMLAlert(
                user_id=user_id,
                type="large_withdrawal",
                severity=AMLSeverity.HIGH if withdrawal.amount_requested >= threshold * 2 else AMLSeverity.MEDIUM,
                tx_id=withdrawal.id,
                tx_type="withdrawal",
                details={
                    "amount": float(withdrawal.amount_requested),
                    "threshold": float(threshold),
                    "currency": "USD"
                },
                description=f"Large withdrawal request of ${withdrawal.amount_requested:,.2f} detected",
                status="pending"
            ))
        
        # Rule 2: Rapid in/out pattern (deposit then immediate withdrawal)
        account = self.session.exec(
            select(Account).where(Account.user_id == user_id)
        ).first()
        
        if account:
            # Check for recent deposits
            window_start = datetime.utcnow() - timedelta(days=7)
            recent_deposits = self.session.exec(
                select(Deposit)
                .where(Deposit.user_id == user_id)
                .where(Deposit.created_at >= window_start)
                .where(Deposit.status == "confirmed")
            ).all()
            
            if recent_deposits:
                # Check if withdrawal is close to deposit amount (round-trip)
                total_deposited = sum(d.amount_usd for d in recent_deposits)
                if withdrawal.amount_requested >= total_deposited * Decimal("0.9"):  # 90% or more
                    alerts.append(AMLAlert(
                        user_id=user_id,
                        type="round_trip_transfer",
                        severity=AMLSeverity.HIGH,
                        tx_id=withdrawal.id,
                        tx_type="withdrawal",
                        details={
                            "withdrawal_amount": float(withdrawal.amount_requested),
                            "recent_deposits": float(total_deposited),
                            "ratio": float(withdrawal.amount_requested / total_deposited * 100)
                        },
                        description=f"Potential round-trip transfer: ${withdrawal.amount_requested:,.2f} withdrawal after ${total_deposited:,.2f} in recent deposits",
                        status="pending"
                    ))
        
        # Rule 3: Multiple failed withdrawal attempts
        window_start = datetime.utcnow() - timedelta(hours=24)
        failed_withdrawals = self.session.exec(
            select(Withdrawal)
            .where(Withdrawal.user_id == user_id)
            .where(Withdrawal.requested_at >= window_start)
            .where(Withdrawal.status == "rejected")
        ).all()
        
        if len(failed_withdrawals) >= 3:
            alerts.append(AMLAlert(
                user_id=user_id,
                type="multiple_failed_withdrawals",
                severity=AMLSeverity.MEDIUM,
                tx_id=withdrawal.id,
                tx_type="withdrawal",
                details={
                    "failed_count": len(failed_withdrawals),
                    "window_hours": 24
                },
                description=f"Multiple failed withdrawal attempts: {len(failed_withdrawals)} rejections in 24 hours",
                status="pending"
            ))
        
        return alerts[0] if alerts else None
    
    def check_trading_patterns(self, user_id: int, account_id: int) -> List[AMLAlert]:
        """Check for suspicious trading patterns"""
        alerts = []
        
        # Rule: Wash trading pattern (rapid buy/sell of same instrument)
        window_start = datetime.utcnow() - timedelta(hours=1)
        recent_orders = self.session.exec(
            select(Order)
            .where(Order.account_id == account_id)
            .where(Order.created_at >= window_start)
            .where(Order.status == "filled")
        ).all()
        
        # Group by instrument and check for rapid round-trips
        instrument_trades: Dict[str, List[Order]] = {}
        for order in recent_orders:
            if order.instrument_id not in instrument_trades:
                instrument_trades[order.instrument_id] = []
            instrument_trades[order.instrument_id].append(order)
        
        for instrument_id, orders in instrument_trades.items():
            if len(orders) >= 10:  # 10+ trades in 1 hour on same instrument
                buy_count = sum(1 for o in orders if o.side == "buy")
                sell_count = sum(1 for o in orders if o.side == "sell")
                
                if buy_count >= 5 and sell_count >= 5:  # Balanced buy/sell
                    alerts.append(AMLAlert(
                        user_id=user_id,
                        type="wash_trading_pattern",
                        severity=AMLSeverity.HIGH,
                        tx_id=None,
                        tx_type="trading",
                        details={
                            "instrument_id": instrument_id,
                            "trade_count": len(orders),
                            "buy_count": buy_count,
                            "sell_count": sell_count,
                            "window_hours": 1
                        },
                        description=f"Potential wash trading: {len(orders)} rapid trades on same instrument in 1 hour",
                        status="pending"
                    ))
        
        # Rule: Abnormal P&L spikes for new accounts
        account = self.session.get(Account, account_id)
        if account:
            account_age_days = (datetime.utcnow() - account.created_at).days
            if account_age_days <= 7:  # New account (less than 7 days)
                if account.total_pnl > Decimal("10000"):  # Large profit on new account
                    alerts.append(AMLAlert(
                        user_id=user_id,
                        type="abnormal_pnl_new_account",
                        severity=AMLSeverity.MEDIUM,
                        tx_id=None,
                        tx_type="trading",
                        details={
                            "account_age_days": account_age_days,
                            "total_pnl": float(account.total_pnl),
                            "total_trades": account.total_trades
                        },
                        description=f"Abnormal P&L spike: ${account.total_pnl:,.2f} profit on {account_age_days}-day-old account",
                        status="pending"
                    ))
        
        return alerts
    
    def check_velocity(self, user_id: int) -> Optional[AMLAlert]:
        """Check transaction velocity (rapid activity)"""
        window_start = datetime.utcnow() - timedelta(hours=24)
        
        # Count all transactions in 24h
        deposit_count = self.session.exec(
            select(func.count(Deposit.id))
            .where(Deposit.user_id == user_id)
            .where(Deposit.created_at >= window_start)
        ).one()
        
        withdrawal_count = self.session.exec(
            select(func.count(Withdrawal.id))
            .where(Withdrawal.user_id == user_id)
            .where(Withdrawal.requested_at >= window_start)
        ).one()
        
        total_activity = deposit_count + withdrawal_count
        
        if total_activity >= 10:  # 10+ transactions in 24h
            return AMLAlert(
                user_id=user_id,
                type="high_velocity",
                severity=AMLSeverity.MEDIUM,
                tx_id=None,
                tx_type="velocity",
                details={
                    "deposit_count": deposit_count,
                    "withdrawal_count": withdrawal_count,
                    "total_activity": total_activity,
                    "window_hours": 24
                },
                description=f"High transaction velocity: {total_activity} transactions in 24 hours",
                status="pending"
            )
        
        return None


def check_and_create_aml_alerts(
    session: Session,
    event_type: str,
    user_id: int,
    tx_id: Optional[int] = None,
    account_id: Optional[int] = None
) -> List[AMLAlert]:
    """
    Main entry point for AML checking
    Called after deposits, withdrawals, or trading activity
    """
    engine = AMLRulesEngine(session)
    alerts = []
    
    try:
        if event_type == "deposit" and tx_id:
            deposit = session.get(Deposit, tx_id)
            if deposit:
                alert = engine.check_deposit(deposit, user_id)
                if alert:
                    alerts.append(alert)
        
        elif event_type == "withdrawal" and tx_id:
            withdrawal = session.get(Withdrawal, tx_id)
            if withdrawal:
                alert = engine.check_withdrawal(withdrawal, user_id)
                if alert:
                    alerts.append(alert)
        
        elif event_type == "trading" and account_id:
            trading_alerts = engine.check_trading_patterns(user_id, account_id)
            alerts.extend(trading_alerts)
        
        # Always check velocity
        velocity_alert = engine.check_velocity(user_id)
        if velocity_alert:
            alerts.append(velocity_alert)
        
        # Save alerts to database
        for alert in alerts:
            session.add(alert)
        
        if alerts:
            session.commit()
            logger.info(f"Created {len(alerts)} AML alert(s) for user {user_id}")
        
    except Exception as e:
        logger.error(f"Error checking AML rules for user {user_id}: {e}", exc_info=True)
        # Don't fail the transaction if AML check fails
    
    return alerts

