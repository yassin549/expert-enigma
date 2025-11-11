"""
Test suite for Prompt 3 implementation
Tests core trading functionality and admin features
"""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, create_engine, SQLModel
from decimal import Decimal
import json

from main import app
from core.database import get_session
from models.user import User, KYCStatus
from models.account import Account
from models.instrument import Instrument
from models.admin_adjustment import AdminAdjustment, AdjustmentType
from core.security import hash_password


# Test database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})


def get_test_session():
    with Session(engine) as session:
        yield session


app.dependency_overrides[get_session] = get_test_session


@pytest.fixture(scope="module")
def setup_database():
    """Setup test database"""
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)


@pytest.fixture
def client():
    """Test client"""
    return TestClient(app)


@pytest.fixture
def test_user(setup_database):
    """Create test user"""
    with Session(engine) as session:
        user = User(
            email="test@topcoin.local",
            hashed_password=hash_password("testpass123"),
            display_name="Test User",
            kyc_status=KYCStatus.AUTO_APPROVED,
            can_access_trading=True,
            is_admin=False
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user


@pytest.fixture
def admin_user(setup_database):
    """Create admin user"""
    with Session(engine) as session:
        admin = User(
            email="admin@topcoin.local",
            hashed_password=hash_password("adminpass123"),
            display_name="Admin User",
            kyc_status=KYCStatus.APPROVED,
            can_access_trading=True,
            is_admin=True
        )
        session.add(admin)
        session.commit()
        session.refresh(admin)
        return admin


@pytest.fixture
def test_account(test_user):
    """Create test account"""
    with Session(engine) as session:
        account = Account(
            user_id=test_user.id,
            name="Test Account",
            deposited_amount=Decimal("500.00"),
            virtual_balance=Decimal("10000.00")
        )
        session.add(account)
        session.commit()
        session.refresh(account)
        return account


@pytest.fixture
def test_instrument():
    """Create test instrument"""
    with Session(engine) as session:
        instrument = Instrument(
            symbol="BTC/USD",
            name="Bitcoin USD",
            type="crypto",
            min_size=Decimal("0.001"),
            max_size=Decimal("100.0"),
            tick_size=Decimal("0.01"),
            is_active=True
        )
        session.add(instrument)
        session.commit()
        session.refresh(instrument)
        return instrument


def get_auth_headers(client, email, password):
    """Get authentication headers"""
    response = client.post("/api/auth/login", json={
        "email": email,
        "password": password
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_signup(self, client):
        """Test user signup"""
        response = client.post("/api/auth/signup", json={
            "email": "newuser@topcoin.local",
            "password": "newpass123",
            "display_name": "New User"
        })
        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
    
    def test_login(self, client, test_user):
        """Test user login"""
        response = client.post("/api/auth/login", json={
            "email": test_user.email,
            "password": "testpass123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
    
    def test_get_current_user(self, client, test_user):
        """Test get current user info"""
        headers = get_auth_headers(client, test_user.email, "testpass123")
        response = client.get("/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert data["can_access_trading"] == True


class TestAccountManagement:
    """Test account management endpoints"""
    
    def test_create_account(self, client, test_user):
        """Test account creation"""
        headers = get_auth_headers(client, test_user.email, "testpass123")
        response = client.post("/api/accounts/", json={
            "name": "Trading Account",
            "base_currency": "USD"
        }, headers=headers)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Trading Account"
        assert data["user_id"] == test_user.id
    
    def test_get_account_balance(self, client, test_user, test_account):
        """Test get account balance"""
        headers = get_auth_headers(client, test_user.email, "testpass123")
        response = client.get(f"/api/accounts/{test_account.id}/balance", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert float(data["virtual_balance"]) == 10000.00
        assert float(data["deposited_amount"]) == 500.00


class TestTradingSimulation:
    """Test trading simulation functionality"""
    
    def test_place_market_order(self, client, test_user, test_account, test_instrument):
        """Test placing a market order"""
        headers = get_auth_headers(client, test_user.email, "testpass123")
        response = client.post(f"/api/trading/accounts/{test_account.id}/orders", json={
            "instrument_id": test_instrument.id,
            "side": "buy",
            "order_type": "market",
            "size": "0.01",
            "leverage": 1
        }, headers=headers)
        assert response.status_code == 201
        data = response.json()
        assert data["side"] == "buy"
        assert data["order_type"] == "market"
        assert data["virtual_trade"] == True
    
    def test_get_orders(self, client, test_user, test_account):
        """Test getting order history"""
        headers = get_auth_headers(client, test_user.email, "testpass123")
        response = client.get(f"/api/trading/accounts/{test_account.id}/orders", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_positions(self, client, test_user, test_account):
        """Test getting open positions"""
        headers = get_auth_headers(client, test_user.email, "testpass123")
        response = client.get(f"/api/trading/accounts/{test_account.id}/positions", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestMarketData:
    """Test market data endpoints"""
    
    def test_get_instruments(self, client, test_instrument):
        """Test get instruments list"""
        response = client.get("/api/market/instruments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
    
    def test_get_ticker(self, client, test_instrument):
        """Test get ticker data"""
        response = client.get(f"/api/market/{test_instrument.symbol}/ticker")
        assert response.status_code == 200
        data = response.json()
        assert data["symbol"] == test_instrument.symbol
        assert "price" in data
        assert "bid" in data
        assert "ask" in data
    
    def test_get_candles(self, client, test_instrument):
        """Test get candle data"""
        response = client.get(f"/api/market/{test_instrument.symbol}/candles?timeframe=1m&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 10


class TestAdminFunctionality:
    """Test admin account management"""
    
    def test_list_all_accounts(self, client, admin_user, test_account):
        """Test admin list all accounts"""
        headers = get_auth_headers(client, admin_user.email, "adminpass123")
        response = client.get("/api/admin/accounts", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_adjust_account_balance(self, client, admin_user, test_account):
        """Test admin balance adjustment"""
        headers = get_auth_headers(client, admin_user.email, "adminpass123")
        response = client.post(f"/api/admin/accounts/{test_account.id}/adjust", json={
            "adjustment_type": "manual_profit",
            "amount": "100.00",
            "reason": "Test profit adjustment",
            "apply_percentage": False
        }, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "adjustment_amount" in data
        assert float(data["adjustment_amount"]) == 100.00
    
    def test_get_adjustment_history(self, client, admin_user, test_account):
        """Test get adjustment history"""
        headers = get_auth_headers(client, admin_user.email, "adminpass123")
        response = client.get(f"/api/admin/accounts/{test_account.id}/adjustments", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_admin_statistics(self, client, admin_user):
        """Test admin statistics overview"""
        headers = get_auth_headers(client, admin_user.email, "adminpass123")
        response = client.get("/api/admin/statistics/overview", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_deposits" in data
        assert "total_virtual_balances" in data
        assert "delta" in data


class TestAccessControl:
    """Test access control system"""
    
    def test_trading_access_denied_without_deposit(self, client):
        """Test that users without deposits cannot access trading"""
        # Create user without trading access
        with Session(engine) as session:
            user = User(
                email="notrading@topcoin.local",
                hashed_password=hash_password("testpass123"),
                can_access_trading=False
            )
            session.add(user)
            session.commit()
        
        headers = get_auth_headers(client, "notrading@topcoin.local", "testpass123")
        
        # Try to access trading endpoint - should be denied
        response = client.get("/api/trading/accounts/1/orders", headers=headers)
        assert response.status_code == 403
        assert "Trading access denied" in response.json()["detail"]
    
    def test_admin_access_required(self, client, test_user):
        """Test that non-admin users cannot access admin endpoints"""
        headers = get_auth_headers(client, test_user.email, "testpass123")
        response = client.get("/api/admin/accounts", headers=headers)
        assert response.status_code == 403
        assert "Admin access required" in response.json()["detail"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
