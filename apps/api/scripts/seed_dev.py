"""
Development Database Seeder
Seeds demo data for development and testing
"""

import sys
import os
from datetime import datetime, timedelta
from decimal import Decimal
import random

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from core.database import get_sync_session
from models import *
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed_database():
    """Seed development database with demo data"""
    print("🌱 Seeding Topcoin development database...")
    
    session = get_sync_session()
    
    try:
        # ====================
        # 1. Create Admin User
        # ====================
        print("Creating admin user...")
        admin_user = User(
            email="admin@topcoin.local",
            hashed_password=pwd_context.hash("Admin123!"),
            display_name="Admin User",
            kyc_status=KYCStatus.APPROVED,
            kyc_submitted_at=datetime.utcnow() - timedelta(days=30),
            kyc_reviewed_at=datetime.utcnow() - timedelta(days=29),
            can_access_trading=True,
            is_admin=True,
            is_active=True,
            created_at=datetime.utcnow() - timedelta(days=90),
        )
        session.add(admin_user)
        session.flush()  # Get admin_user.id
        
        # ====================
        # 2. Create Demo User
        # ====================
        print("Creating demo user...")
        demo_user = User(
            email="demo@topcoin.local",
            hashed_password=pwd_context.hash("Demo123!"),
            display_name="Demo User",
            region="US",
            kyc_status=KYCStatus.AUTO_APPROVED,
            kyc_submitted_at=datetime.utcnow() - timedelta(days=7),
            can_access_trading=True,  # Has deposited
            is_active=True,
            created_at=datetime.utcnow() - timedelta(days=30),
            last_login=datetime.utcnow() - timedelta(hours=2),
        )
        session.add(demo_user)
        session.flush()
        
        # ====================
        # 3. Create Business Wallet
        # ====================
        print("Creating business wallet...")
        business_wallet = Wallet(
            type=WalletType.BUSINESS_DEPOSIT,
            balance=Decimal("250000.00"),
            currency="USD",
            reserved_amount=Decimal("0.00"),
            available_balance=Decimal("250000.00"),
            reconciled_at=datetime.utcnow(),
            reconciliation_status="ok",
        )
        session.add(business_wallet)
        
        # ====================
        # 4. Create Demo Account with CRITICAL separation
        # ====================
        print("Creating demo account...")
        demo_account = Account(
            user_id=demo_user.id,
            name="Main Account",
            base_currency="USD",
            deposited_amount=Decimal("500.00"),  # Real money deposited
            virtual_balance=Decimal("10000.00"),  # Virtual trading balance (admin-set)
            equity_cached=Decimal("10000.00"),
            margin_used=Decimal("0.00"),
            margin_available=Decimal("10000.00"),
            total_trades=0,
            is_active=True,
            created_at=datetime.utcnow() - timedelta(days=7),
        )
        session.add(demo_account)
        session.flush()
        
        # ====================
        # 5. Create Instruments
        # ====================
        print("Creating instruments...")
        instruments_data = [
            {
                "symbol": "BTC/USD",
                "name": "Bitcoin / US Dollar",
                "type": InstrumentType.CRYPTO,
                "min_size": Decimal("0.001"),
                "max_size": Decimal("100.0"),
                "tick_size": Decimal("0.01"),
                "spread_pct": Decimal("0.001"),
                "max_leverage": 100,
            },
            {
                "symbol": "ETH/USD",
                "name": "Ethereum / US Dollar",
                "type": InstrumentType.CRYPTO,
                "min_size": Decimal("0.01"),
                "max_size": Decimal("1000.0"),
                "tick_size": Decimal("0.01"),
                "spread_pct": Decimal("0.001"),
                "max_leverage": 50,
            },
            {
                "symbol": "EUR/USD",
                "name": "Euro / US Dollar",
                "type": InstrumentType.FOREX,
                "min_size": Decimal("1000"),
                "max_size": Decimal("10000000"),
                "tick_size": Decimal("0.00001"),
                "spread_pct": Decimal("0.0002"),
                "max_leverage": 100,
            },
            {
                "symbol": "XAU/USD",
                "name": "Gold / US Dollar",
                "type": InstrumentType.COMMODITY,
                "min_size": Decimal("0.1"),
                "max_size": Decimal("1000.0"),
                "tick_size": Decimal("0.01"),
                "spread_pct": Decimal("0.0005"),
                "max_leverage": 50,
            },
            {
                "symbol": "SPX",
                "name": "S&P 500 Index",
                "type": InstrumentType.INDEX,
                "min_size": Decimal("0.1"),
                "max_size": Decimal("100.0"),
                "tick_size": Decimal("0.01"),
                "spread_pct": Decimal("0.0003"),
                "max_leverage": 20,
            },
        ]
        
        instruments = []
        for i, inst_data in enumerate(instruments_data):
            inst = Instrument(
                display_order=i,
                is_active=True,
                is_tradeable=True,
                **inst_data
            )
            session.add(inst)
            instruments.append(inst)
        
        session.flush()
        
        # ====================
        # 6. Generate 30 Days of Candle Data (1-minute)
        # ====================
        print("Generating 30 days of 1-minute candles...")
        start_date = datetime.utcnow() - timedelta(days=30)
        
        # Base prices for each instrument
        base_prices = {
            "BTC/USD": Decimal("45000.00"),
            "ETH/USD": Decimal("2500.00"),
            "EUR/USD": Decimal("1.0850"),
            "XAU/USD": Decimal("2050.00"),
            "SPX": Decimal("4800.00"),
        }
        
        for instrument in instruments:
            print(f"  Generating candles for {instrument.symbol}...")
            base_price = base_prices[instrument.symbol]
            current_price = base_price
            
            # Generate 30 days of 1-minute candles (43,200 candles per instrument)
            # For demo, we'll generate fewer (1 per hour = 720 candles)
            for hour in range(30 * 24):  # 720 hours
                timestamp = start_date + timedelta(hours=hour)
                
                # Simulate price movement (random walk)
                change_pct = Decimal(str(random.uniform(-0.02, 0.02)))  # ±2%
                current_price = current_price * (1 + change_pct)
                
                open_price = current_price
                high_price = current_price * Decimal("1.005")  # +0.5%
                low_price = current_price * Decimal("0.995")   # -0.5%
                close_price = current_price * (1 + Decimal(str(random.uniform(-0.01, 0.01))))
                
                candle = Candle(
                    instrument_id=instrument.id,
                    timestamp=timestamp,
                    timeframe=Timeframe.H1,
                    open=open_price,
                    high=high_price,
                    low=low_price,
                    close=close_price,
                    volume=Decimal(str(random.uniform(100, 1000))),
                    num_trades=random.randint(50, 500),
                )
                session.add(candle)
                
                current_price = close_price
        
        # ====================
        # 7. Create AI Investment Plans
        # ====================
        print("Creating AI investment plans...")
        ai_plans = [
            AIInvestmentPlan(
                name="Conservative AI Plan",
                risk_profile=RiskProfile.CONSERVATIVE,
                description="Low-risk AI trading strategy focused on capital preservation with consistent returns. Ideal for risk-averse investors.",
                current_return_pct=Decimal("5.50"),
                monthly_return_pct=Decimal("1.20"),
                quarterly_return_pct=Decimal("3.80"),
                ytd_return_pct=Decimal("5.50"),
                equity_curve_data=[
                    {"date": "2025-01-01", "value": 100.0},
                    {"date": "2025-01-15", "value": 101.5},
                    {"date": "2025-02-01", "value": 103.2},
                ],
                total_invested=Decimal("50000.00"),
                active_investors=25,
                min_investment=Decimal("100.00"),
                is_active=True,
                is_accepting_investments=True,
            ),
            AIInvestmentPlan(
                name="Balanced AI Plan",
                risk_profile=RiskProfile.BALANCED,
                description="Medium-risk strategy balancing growth and stability. Diversified across multiple markets.",
                current_return_pct=Decimal("12.80"),
                monthly_return_pct=Decimal("2.50"),
                quarterly_return_pct=Decimal("8.20"),
                ytd_return_pct=Decimal("12.80"),
                equity_curve_data=[
                    {"date": "2025-01-01", "value": 100.0},
                    {"date": "2025-01-15", "value": 103.5},
                    {"date": "2025-02-01", "value": 107.8},
                ],
                total_invested=Decimal("120000.00"),
                active_investors=48,
                min_investment=Decimal("500.00"),
                is_active=True,
                is_accepting_investments=True,
            ),
            AIInvestmentPlan(
                name="Aggressive AI Plan",
                risk_profile=RiskProfile.AGGRESSIVE,
                description="High-risk, high-reward strategy leveraging advanced AI algorithms. For experienced investors only.",
                current_return_pct=Decimal("24.50"),
                monthly_return_pct=Decimal("4.80"),
                quarterly_return_pct=Decimal("16.20"),
                ytd_return_pct=Decimal("24.50"),
                equity_curve_data=[
                    {"date": "2025-01-01", "value": 100.0},
                    {"date": "2025-01-15", "value": 108.5},
                    {"date": "2025-02-01", "value": 118.2},
                ],
                total_invested=Decimal("80000.00"),
                active_investors=15,
                min_investment=Decimal("1000.00"),
                is_active=True,
                is_accepting_investments=True,
            ),
        ]
        
        for plan in ai_plans:
            session.add(plan)
        
        # ====================
        # 8. Create Demo Deposit
        # ====================
        print("Creating demo deposit...")
        demo_deposit = Deposit(
            user_id=demo_user.id,
            amount=Decimal("0.01500000"),  # BTC amount
            amount_usd=Decimal("500.00"),
            currency="BTC",
            status=DepositStatus.CONFIRMED,
            nowpayments_payment_id="DEMO_PAYMENT_123",
            payment_address="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
            tx_hash="demo_tx_hash_123456",
            confirmations=6,
            required_confirmations=3,
            tx_meta={"demo": True},
            reconciled=True,
            reconciled_at=datetime.utcnow() - timedelta(days=7),
            created_at=datetime.utcnow() - timedelta(days=7),
            confirmed_at=datetime.utcnow() - timedelta(days=7, hours=1),
        )
        session.add(demo_deposit)
        session.flush()
        
        # ====================
        # 9. Create Ledger Entry for Deposit
        # ====================
        print("Creating ledger entry for deposit...")
        ledger_deposit = LedgerEntry(
            account_id=demo_account.id,
            user_id=demo_user.id,
            entry_type=EntryType.DEPOSIT,
            amount=Decimal("500.00"),
            balance_after=Decimal("500.00"),
            description="Crypto deposit confirmed (BTC)",
            reference_type="deposit",
            reference_id=demo_deposit.id,
            meta={"currency": "BTC", "tx_hash": "demo_tx_hash_123456"},
            created_at=demo_deposit.confirmed_at,
        )
        session.add(ledger_deposit)
        
        # ====================
        # 10. Create Admin Adjustment (Setting initial virtual balance)
        # ====================
        print("Creating admin adjustment (initial virtual balance)...")
        admin_adjustment = AdminAdjustment(
            account_id=demo_account.id,
            admin_user_id=admin_user.id,
            adjustment_type=AdjustmentType.EQUITY_ADJUSTMENT,
            amount=Decimal("9500.00"),  # 500 → 10000
            previous_balance=Decimal("500.00"),
            new_balance=Decimal("10000.00"),
            reason="Initial virtual balance allocation for new user - welcome bonus and trading capital",
            reference_id="INITIAL_SETUP",
            created_at=datetime.utcnow() - timedelta(days=7),
        )
        session.add(admin_adjustment)
        session.flush()
        
        # ====================
        # 11. Create Ledger Entry for Admin Adjustment
        # ====================
        ledger_adjustment = LedgerEntry(
            account_id=demo_account.id,
            user_id=demo_user.id,
            entry_type=EntryType.ADMIN_ADJUSTMENT,
            amount=Decimal("9500.00"),
            balance_after=Decimal("10000.00"),
            description="Admin allocated initial virtual trading balance",
            reference_type="admin_adjustment",
            reference_id=admin_adjustment.id,
            meta={"adjustment_type": "equity_adjustment"},
            created_at=admin_adjustment.created_at,
        )
        session.add(ledger_adjustment)
        
        # ====================
        # 12. Create Audit Entry
        # ====================
        print("Creating audit trail...")
        audit = Audit(
            actor_user_id=admin_user.id,
            action="adjust_balance",
            object_type="account",
            object_id=demo_account.id,
            diff={
                "virtual_balance": {
                    "before": "500.00",
                    "after": "10000.00"
                }
            },
            reason="Initial virtual balance allocation",
            ip_address="127.0.0.1",
            created_at=admin_adjustment.created_at,
        )
        session.add(audit)
        
        # ====================
        # Commit All Changes
        # ====================
        print("Committing database changes...")
        session.commit()
        
        print("\n✅ Database seeding complete!")
        print("\n📊 Summary:")
        print(f"  - Admin user: admin@topcoin.local (password: Admin123!)")
        print(f"  - Demo user: demo@topcoin.local (password: Demo123!)")
        print(f"  - Business wallet: $250,000")
        print(f"  - Demo account: $500 deposited, $10,000 virtual balance")
        print(f"  - Instruments: 5 (BTC/USD, ETH/USD, EUR/USD, Gold, SPX)")
        print(f"  - Candles: 30 days of hourly data (3,600 total)")
        print(f"  - AI plans: 3 (Conservative, Balanced, Aggressive)")
        print(f"  - Ledger entries: 2 (deposit + admin adjustment)")
        print(f"  - Admin adjustments: 1 (initial allocation)")
        
    except Exception as e:
        print(f"\n❌ Error seeding database: {str(e)}")
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_database()
