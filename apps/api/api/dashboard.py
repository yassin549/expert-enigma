"""
Dashboard API Routes
Real-time dashboard statistics with real deposit data and AI engine metrics
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from core.database import get_session
from core.dependencies import get_current_user, get_optional_current_user
from models.user import User
from models.account import Account
from models.deposit import Deposit, DepositStatus
from models.ledger import LedgerEntry, EntryType
from models.ai_plan import AIInvestmentPlan, UserInvestment
from models.order import Order, OrderStatus

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic models for request/response
from pydantic import BaseModel


class DashboardStatsResponse(BaseModel):
    # Real deposit data
    total_deposited: float
    total_deposits_count: int
    last_deposit_date: Optional[datetime]
    last_deposit_amount: Optional[float]
    
    # AI Engine Statistics
    total_ai_investments: float
    active_ai_plans: int
    total_ai_returns: float
    total_ai_return_pct: float
    ai_growth_7d: float
    ai_growth_30d: float
    
    # Live Transactions
    recent_transactions: List[Dict[str, Any]]
    transaction_count_24h: int
    transaction_volume_24h: float
    
    # Performance Metrics
    total_pnl: float
    total_return_pct: float
    win_rate: float
    total_trades: int
    
    # Account Status
    has_deposits: bool
    can_trade: bool
    account_created_at: Optional[datetime]


class CryptoPriceResponse(BaseModel):
    symbol: str
    name: str
    price: float
    change_24h: float
    change_24h_pct: float
    volume_24h: float
    market_cap: Optional[float]
    high_24h: float
    low_24h: float
    last_updated: datetime


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get comprehensive dashboard statistics with real deposit data and AI engine metrics
    """
    logger.info(f"Fetching dashboard stats for user {current_user.id}")
    
    try:
        # Get user's account
        result = await session.execute(
            select(Account).where(Account.user_id == current_user.id)
        )
        account = result.scalar_one_or_none()
        
        # Get all confirmed deposits (confirmed deposits should always have confirmed_at)
        deposits_result = await session.execute(
            select(Deposit)
            .where(Deposit.user_id == current_user.id)
            .where(Deposit.status == DepositStatus.CONFIRMED)
            .order_by(Deposit.confirmed_at.desc())
        )
        deposits = deposits_result.scalars().all()
        
        # Filter out any deposits without confirmed_at (shouldn't happen, but safety check)
        deposits = [d for d in deposits if d.confirmed_at is not None]
        
        # Calculate real deposit totals
        total_deposited = sum(d.amount_usd for d in deposits) if deposits else Decimal("0.00")
        total_deposits_count = len(deposits)
        last_deposit = deposits[0] if deposits else None
        last_deposit_date = last_deposit.confirmed_at if last_deposit else None
        last_deposit_amount = last_deposit.amount_usd if last_deposit else None
        
        # Get AI Investment statistics
        investments_result = await session.execute(
            select(UserInvestment)
            .where(UserInvestment.user_id == current_user.id)
            .where(UserInvestment.is_active == True)
        )
        user_investments_list = investments_result.scalars().all()
        
        # Get plan details for each investment
        total_ai_investments = Decimal("0.00")
        total_ai_current_value = Decimal("0.00")
        active_plan_ids = set()
        
        for inv in user_investments_list:
            plan_result = await session.execute(
                select(AIInvestmentPlan).where(AIInvestmentPlan.id == inv.plan_id)
            )
            plan = plan_result.scalar_one_or_none()
            if plan:
                total_ai_investments += inv.allocated_amount
                total_ai_current_value += inv.current_value
                active_plan_ids.add(inv.plan_id)
        
        total_ai_returns = total_ai_current_value - total_ai_investments
        total_ai_return_pct = (total_ai_returns / total_ai_investments * 100) if total_ai_investments > 0 else Decimal("0.00")
        active_ai_plans = len(active_plan_ids)
        
        # Calculate AI growth over time periods
        now = datetime.utcnow()
        seven_days_ago = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)
        
        # Get ledger entries for AI returns in last 7 days
        ai_returns_7d_result = await session.execute(
            select(LedgerEntry)
            .where(LedgerEntry.user_id == current_user.id)
            .where(LedgerEntry.entry_type == EntryType.INVESTMENT_RETURN)
            .where(LedgerEntry.created_at >= seven_days_ago)
        )
        ai_returns_7d = ai_returns_7d_result.scalars().all()
        ai_growth_7d = sum(entry.amount for entry in ai_returns_7d) if ai_returns_7d else Decimal("0.00")
        
        # Get ledger entries for AI returns in last 30 days
        ai_returns_30d_result = await session.execute(
            select(LedgerEntry)
            .where(LedgerEntry.user_id == current_user.id)
            .where(LedgerEntry.entry_type == EntryType.INVESTMENT_RETURN)
            .where(LedgerEntry.created_at >= thirty_days_ago)
        )
        ai_returns_30d = ai_returns_30d_result.scalars().all()
        ai_growth_30d = sum(entry.amount for entry in ai_returns_30d) if ai_returns_30d else Decimal("0.00")
        
        # Get recent transactions (last 10)
        recent_ledger_result = await session.execute(
            select(LedgerEntry)
            .where(LedgerEntry.user_id == current_user.id)
            .order_by(LedgerEntry.created_at.desc())
            .limit(10)
        )
        recent_ledger_entries = recent_ledger_result.scalars().all()
        
        recent_transactions = []
        for entry in recent_ledger_entries:
            recent_transactions.append({
                "id": entry.id,
                "type": entry.entry_type.value,
                "amount": float(entry.amount),
                "description": entry.description,
                "timestamp": entry.created_at.isoformat(),
                "balance_after": float(entry.balance_after)
            })
        
        # Get transaction stats for last 24 hours
        twenty_four_hours_ago = now - timedelta(hours=24)
        transactions_24h_result = await session.execute(
            select(LedgerEntry)
            .where(LedgerEntry.user_id == current_user.id)
            .where(LedgerEntry.created_at >= twenty_four_hours_ago)
        )
        transactions_24h = transactions_24h_result.scalars().all()
        
        transaction_count_24h = len(transactions_24h)
        transaction_volume_24h = sum(abs(entry.amount) for entry in transactions_24h) if transactions_24h else Decimal("0.00")
        
        # Get trading performance metrics
        if account:
            total_pnl = account.total_pnl
            total_trades = account.total_trades
            winning_trades = account.winning_trades
            win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else Decimal("0.00")
            
            # Calculate total return percentage based on deposits
            total_return_pct = (total_pnl / total_deposited * 100) if total_deposited > 0 else Decimal("0.00")
            can_trade = account.deposited_amount > 0
            account_created_at = account.created_at
        else:
            total_pnl = Decimal("0.00")
            total_trades = 0
            win_rate = Decimal("0.00")
            total_return_pct = Decimal("0.00")
            can_trade = False
            account_created_at = None
        
        # Convert Decimal to float for JSON serialization
        response_data = DashboardStatsResponse(
            total_deposited=float(total_deposited),
            total_deposits_count=total_deposits_count,
            last_deposit_date=last_deposit_date,
            last_deposit_amount=float(last_deposit_amount) if last_deposit_amount else None,
            total_ai_investments=float(total_ai_investments),
            active_ai_plans=active_ai_plans,
            total_ai_returns=float(total_ai_returns),
            total_ai_return_pct=float(total_ai_return_pct),
            ai_growth_7d=float(ai_growth_7d),
            ai_growth_30d=float(ai_growth_30d),
            recent_transactions=recent_transactions,
            transaction_count_24h=transaction_count_24h,
            transaction_volume_24h=float(transaction_volume_24h),
            total_pnl=float(total_pnl),
            total_return_pct=float(total_return_pct),
            win_rate=float(win_rate),
            total_trades=total_trades,
            has_deposits=total_deposits_count > 0,
            can_trade=can_trade,
            account_created_at=account_created_at
        )
        return response_data
    except HTTPException:
        # Re-raise HTTP exceptions (like auth errors)
        raise
    except Exception as e:
        logger.error(f"Error fetching dashboard stats for user {current_user.id}: {str(e)}", exc_info=True)
        # Return a default response instead of raising an error
        # This ensures the dashboard can still load even if there's a data issue
        return DashboardStatsResponse(
            total_deposited=0.0,
            total_deposits_count=0,
            last_deposit_date=None,
            last_deposit_amount=None,
            total_ai_investments=0.0,
            active_ai_plans=0,
            total_ai_returns=0.0,
            total_ai_return_pct=0.0,
            ai_growth_7d=0.0,
            ai_growth_30d=0.0,
            recent_transactions=[],
            transaction_count_24h=0,
            transaction_volume_24h=0.0,
            total_pnl=0.0,
            total_return_pct=0.0,
            win_rate=0.0,
            total_trades=0,
            has_deposits=False,
            can_trade=False,
            account_created_at=None
        )


@router.get("/crypto-prices", response_model=List[CryptoPriceResponse])
async def get_crypto_prices(
    current_user: Optional[User] = Depends(get_optional_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    Get current prices for major cryptocurrencies
    Uses CoinGecko API or mock data if unavailable
    """
    import httpx
    import asyncio
    
    # Major cryptocurrencies to track
    coins = [
        {"id": "bitcoin", "symbol": "BTC", "name": "Bitcoin"},
        {"id": "ethereum", "symbol": "ETH", "name": "Ethereum"},
        {"id": "tether", "symbol": "USDT", "name": "Tether"},
        {"id": "binancecoin", "symbol": "BNB", "name": "BNB"},
        {"id": "solana", "symbol": "SOL", "name": "Solana"},
        {"id": "ripple", "symbol": "XRP", "name": "XRP"},
        {"id": "cardano", "symbol": "ADA", "name": "Cardano"},
        {"id": "dogecoin", "symbol": "DOGE", "name": "Dogecoin"},
    ]
    
    try:
        # Try to fetch from CoinGecko API
        coin_ids = ",".join([coin["id"] for coin in coins])
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={coin_ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true"
        
        # Use httpx for synchronous request
        with httpx.Client(timeout=5.0) as client:
            response = client.get(url)
            if response.status_code == 200:
                data = response.json()
                
                prices = []
                for coin in coins:
                    coin_id = coin["id"]
                    if coin_id in data:
                        coin_data = data[coin_id]
                        price = Decimal(str(coin_data.get("usd", 0)))
                        change_24h_pct = Decimal(str(coin_data.get("usd_24h_change", 0)))
                        change_24h = price * change_24h_pct / 100
                        
                        prices.append(CryptoPriceResponse(
                            symbol=coin["symbol"],
                            name=coin["name"],
                            price=float(price),
                            change_24h=float(change_24h),
                            change_24h_pct=float(change_24h_pct),
                            volume_24h=float(coin_data.get("usd_24h_vol", 0)),
                            market_cap=float(coin_data.get("usd_market_cap", 0)) if coin_data.get("usd_market_cap") else None,
                            high_24h=float(price * Decimal("1.05")),  # Approximate high
                            low_24h=float(price * Decimal("0.95")),   # Approximate low
                            last_updated=datetime.utcnow()
                        ))
                
                return prices
    except Exception as e:
        logger.warning(f"Failed to fetch crypto prices from CoinGecko: {e}")
    
    # Fallback to mock data
    mock_prices = {
        "BTC": {"price": 45000, "change": 2.5, "vol": 25000000000, "high": 46000, "low": 44000},
        "ETH": {"price": 2800, "change": 3.2, "vol": 12000000000, "high": 2900, "low": 2700},
        "USDT": {"price": 1.00, "change": 0.01, "vol": 50000000000, "high": 1.001, "low": 0.999},
        "BNB": {"price": 320, "change": 1.8, "vol": 2000000000, "high": 330, "low": 310},
        "SOL": {"price": 95, "change": 4.5, "vol": 1500000000, "high": 100, "low": 90},
        "XRP": {"price": 0.62, "change": -1.2, "vol": 800000000, "high": 0.65, "low": 0.60},
        "ADA": {"price": 0.48, "change": 2.1, "vol": 400000000, "high": 0.50, "low": 0.46},
        "DOGE": {"price": 0.085, "change": 5.3, "vol": 600000000, "high": 0.090, "low": 0.080},
    }
    
    prices = []
    for coin in coins:
        symbol = coin["symbol"]
        if symbol in mock_prices:
            mock = mock_prices[symbol]
            prices.append(CryptoPriceResponse(
                symbol=symbol,
                name=coin["name"],
                price=float(mock["price"]),
                change_24h=float(mock["change"]),
                change_24h_pct=float(mock["change"]),
                volume_24h=float(mock["vol"]),
                market_cap=None,
                high_24h=float(mock["high"]),
                low_24h=float(mock["low"]),
                last_updated=datetime.utcnow()
            ))
    
    return prices


