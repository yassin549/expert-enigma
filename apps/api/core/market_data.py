"""
Market Data Service
Centralized service for fetching current market prices
Supports both mock data (for development) and real market data (for production)
"""

from decimal import Decimal
from datetime import datetime, timedelta
from typing import Optional, Dict
from sqlmodel import Session, select
import logging
from functools import lru_cache

from models.instrument import Instrument
from models.candle import Candle

logger = logging.getLogger(__name__)


class MarketDataService:
    """Service for fetching current market prices and data"""
    
    # Base mock prices (can be updated dynamically)
    _mock_prices: Dict[str, Decimal] = {
        "BTC/USD": Decimal("50000.00"),
        "ETH/USD": Decimal("3000.00"),
        "EUR/USD": Decimal("1.0850"),
        "GBP/USD": Decimal("1.2500"),
        "USD/JPY": Decimal("150.00"),
        "GOLD": Decimal("1950.00"),
        "SPX": Decimal("4200.00"),
        "NASDAQ": Decimal("14000.00"),
        "AAPL": Decimal("180.00"),
        "TSLA": Decimal("250.00"),
    }
    
    # Spread percentages by instrument type
    _spreads: Dict[str, Decimal] = {
        "crypto": Decimal("0.1"),      # 0.1%
        "forex": Decimal("0.02"),      # 0.02%
        "stock": Decimal("0.05"),      # 0.05%
        "index": Decimal("0.03"),      # 0.03%
        "commodity": Decimal("0.08")   # 0.08%
    }
    
    @classmethod
    def get_current_price(
        cls,
        symbol: str,
        session: Optional[Session] = None
    ) -> Decimal:
        """
        Get current market price for a symbol
        
        Priority:
        1. Latest candle from database (if available)
        2. Mock price (for development)
        3. Default fallback price
        
        Args:
            symbol: Trading symbol (e.g., "BTC/USD")
            session: Database session (optional, for real data)
            
        Returns:
            Current price as Decimal
        """
        symbol_upper = symbol.upper()
        
        # Try to get from database first
        if session:
            try:
                # Find instrument
                instrument = session.exec(
                    select(Instrument).where(Instrument.symbol == symbol_upper)
                ).first()
                
                if instrument:
                    # Get latest candle
                    latest_candle = session.exec(
                        select(Candle)
                        .where(Candle.instrument_id == instrument.id)
                        .order_by(Candle.timestamp.desc())
                        .limit(1)
                    ).first()
                    
                    if latest_candle:
                        logger.debug(f"Got price from database for {symbol}: {latest_candle.close}")
                        return latest_candle.close
            except Exception as e:
                logger.warning(f"Failed to get price from database for {symbol}: {e}")
        
        # Fall back to mock price
        price = cls._mock_prices.get(symbol_upper)
        if price:
            logger.debug(f"Using mock price for {symbol}: {price}")
            return price
        
        # Default fallback
        logger.warning(f"No price found for {symbol}, using default 100.00")
        return Decimal("100.00")
    
    @classmethod
    def get_bid_ask(
        cls,
        symbol: str,
        session: Optional[Session] = None
    ) -> tuple[Decimal, Decimal]:
        """
        Get bid and ask prices for a symbol
        
        Returns:
            Tuple of (bid, ask) prices
        """
        current_price = cls.get_current_price(symbol, session)
        
        # Get instrument type for spread calculation
        spread_pct = Decimal("0.1")  # Default spread
        if session:
            try:
                instrument = session.exec(
                    select(Instrument).where(Instrument.symbol == symbol.upper())
                ).first()
                if instrument:
                    spread_pct = cls._spreads.get(instrument.type, Decimal("0.1"))
            except Exception:
                pass
        
        spread = current_price * spread_pct / Decimal("100")
        bid = current_price - (spread / Decimal("2"))
        ask = current_price + (spread / Decimal("2"))
        
        return (bid, ask)
    
    @classmethod
    def update_mock_price(cls, symbol: str, price: Decimal) -> None:
        """
        Update mock price (useful for testing or simulation)
        
        Args:
            symbol: Trading symbol
            price: New price
        """
        cls._mock_prices[symbol.upper()] = price
        logger.info(f"Updated mock price for {symbol}: {price}")
    
    @classmethod
    def get_all_mock_prices(cls) -> Dict[str, Decimal]:
        """Get all current mock prices"""
        return cls._mock_prices.copy()
    
    @classmethod
    def get_price_for_instrument(
        cls,
        instrument_id: int,
        session: Session
    ) -> Decimal:
        """
        Get current price for an instrument by ID
        
        Args:
            instrument_id: Instrument database ID
            session: Database session
            
        Returns:
            Current price as Decimal
        """
        try:
            instrument = session.get(Instrument, instrument_id)
            if not instrument:
                logger.warning(f"Instrument {instrument_id} not found")
                return Decimal("100.00")
            
            return cls.get_current_price(instrument.symbol, session)
        except Exception as e:
            logger.error(f"Error getting price for instrument {instrument_id}: {e}")
            return Decimal("100.00")


# Global instance
market_data_service = MarketDataService()

# Convenience functions
def get_current_price(symbol: str, session: Optional[Session] = None) -> Decimal:
    """Get current price for a symbol"""
    return market_data_service.get_current_price(symbol, session)


def get_bid_ask(symbol: str, session: Optional[Session] = None) -> tuple[Decimal, Decimal]:
    """Get bid and ask prices for a symbol"""
    return market_data_service.get_bid_ask(symbol, session)


def get_price_for_instrument(instrument_id: int, session: Session) -> Decimal:
    """Get current price for an instrument by ID"""
    return market_data_service.get_price_for_instrument(instrument_id, session)

