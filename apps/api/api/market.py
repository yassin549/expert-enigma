"""
Market Data API Routes
Real-time market data for trading platform
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from core.database import get_session
from core.dependencies import get_optional_current_user
from models.user import User
from models.instrument import Instrument
from models.candle import Candle

logger = logging.getLogger(__name__)
router = APIRouter()


# Pydantic models for request/response
from pydantic import BaseModel


class InstrumentResponse(BaseModel):
    id: int
    symbol: str
    name: str
    type: str
    min_size: Decimal
    max_size: Decimal
    tick_size: Decimal
    is_active: bool
    created_at: datetime


class TickerResponse(BaseModel):
    symbol: str
    price: Decimal
    bid: Decimal
    ask: Decimal
    spread: Decimal
    spread_pct: Decimal
    volume_24h: Decimal
    change_24h: Decimal
    change_24h_pct: Decimal
    high_24h: Decimal
    low_24h: Decimal
    timestamp: datetime


class CandleResponse(BaseModel):
    timestamp: datetime
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: Decimal
    timeframe: str


class MarketStatsResponse(BaseModel):
    total_instruments: int
    active_instruments: int
    total_volume_24h: Decimal
    top_gainers: List[dict]
    top_losers: List[dict]


@router.get("/instruments", response_model=List[InstrumentResponse])
def get_instruments(
    type_filter: Optional[str] = Query(None, alias="type"),
    active_only: bool = Query(True),
    current_user: Optional[User] = Depends(get_optional_current_user),
    session: Session = Depends(get_session)
):
    """
    Get all tradeable instruments
    Public endpoint with optional authentication
    """
    logger.info("Fetching instruments list")
    
    # Build query
    query = select(Instrument)
    
    if active_only:
        query = query.where(Instrument.is_active == True)
    
    if type_filter:
        query = query.where(Instrument.type == type_filter)
    
    query = query.order_by(Instrument.symbol)
    
    instruments = session.exec(query).all()
    
    return [
        InstrumentResponse(
            id=instrument.id,
            symbol=instrument.symbol,
            name=instrument.name,
            type=instrument.type,
            min_size=instrument.min_size,
            max_size=instrument.max_size,
            tick_size=instrument.tick_size,
            is_active=instrument.is_active,
            created_at=instrument.created_at
        )
        for instrument in instruments
    ]


@router.get("/{symbol}/ticker", response_model=TickerResponse)
def get_ticker(
    symbol: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    session: Session = Depends(get_session)
):
    """
    Get current ticker data for instrument
    Includes current price, spread, and 24h statistics
    """
    logger.info(f"Fetching ticker for {symbol}")
    
    # Find instrument
    instrument = session.exec(
        select(Instrument).where(Instrument.symbol == symbol.upper())
    ).first()
    
    if not instrument:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instrument not found"
        )
    
    # Get latest candle for current price
    latest_candle = session.exec(
        select(Candle)
        .where(Candle.instrument_id == instrument.id)
        .where(Candle.timeframe == "1m")
        .order_by(Candle.timestamp.desc())
        .limit(1)
    ).first()
    
    if not latest_candle:
        # Generate mock data if no candles exist
        from core.market_data import get_current_price
        current_price = get_current_price(symbol, session)
        volume_24h = Decimal("1000000.00")
        high_24h = current_price * Decimal("1.05")
        low_24h = current_price * Decimal("0.95")
        change_24h = current_price * Decimal("0.02")
    else:
        current_price = latest_candle.close
        
        # Get 24h statistics
        yesterday = datetime.utcnow() - timedelta(hours=24)
        candles_24h = session.exec(
            select(Candle)
            .where(Candle.instrument_id == instrument.id)
            .where(Candle.timeframe == "1m")
            .where(Candle.timestamp >= yesterday)
            .order_by(Candle.timestamp)
        ).all()
        
        if candles_24h:
            volume_24h = sum(candle.volume for candle in candles_24h)
            high_24h = max(candle.high for candle in candles_24h)
            low_24h = min(candle.low for candle in candles_24h)
            open_24h = candles_24h[0].open
            change_24h = current_price - open_24h
        else:
            volume_24h = Decimal("0.00")
            high_24h = current_price
            low_24h = current_price
            change_24h = Decimal("0.00")
    
    # Calculate spread (mock realistic spreads)
    spread_pct = _get_spread_percentage(instrument.type)
    spread = current_price * spread_pct / 100
    bid = current_price - (spread / 2)
    ask = current_price + (spread / 2)
    
    # Calculate percentage change
    change_24h_pct = (change_24h / (current_price - change_24h)) * 100 if current_price != change_24h else Decimal("0.00")
    
    return TickerResponse(
        symbol=instrument.symbol,
        price=current_price,
        bid=bid,
        ask=ask,
        spread=spread,
        spread_pct=spread_pct,
        volume_24h=volume_24h,
        change_24h=change_24h,
        change_24h_pct=change_24h_pct,
        high_24h=high_24h,
        low_24h=low_24h,
        timestamp=datetime.utcnow()
    )


@router.get("/{symbol}/candles", response_model=List[CandleResponse])
def get_candles(
    symbol: str,
    timeframe: str = Query("1m", regex="^(1m|5m|15m|1h|4h|1d|1w)$"),
    from_time: Optional[datetime] = Query(None, alias="from"),
    to_time: Optional[datetime] = Query(None, alias="to"),
    limit: int = Query(100, ge=1, le=1000),
    current_user: Optional[User] = Depends(get_optional_current_user),
    session: Session = Depends(get_session)
):
    """
    Get historical candle data for charting
    Supports multiple timeframes and date ranges
    """
    logger.info(f"Fetching candles for {symbol} ({timeframe})")
    
    # Find instrument
    instrument = session.exec(
        select(Instrument).where(Instrument.symbol == symbol.upper())
    ).first()
    
    if not instrument:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instrument not found"
        )
    
    # Build query
    query = select(Candle).where(
        Candle.instrument_id == instrument.id,
        Candle.timeframe == timeframe
    )
    
    # Apply date filters
    if from_time:
        query = query.where(Candle.timestamp >= from_time)
    
    if to_time:
        query = query.where(Candle.timestamp <= to_time)
    else:
        # Default to last 24 hours if no date range specified
        if not from_time:
            default_from = datetime.utcnow() - timedelta(hours=24)
            query = query.where(Candle.timestamp >= default_from)
    
    # Order and limit
    query = query.order_by(Candle.timestamp.desc()).limit(limit)
    
    candles = session.exec(query).all()
    
    # Reverse to get chronological order
    candles.reverse()
    
    # If no candles found, generate mock data
    if not candles:
        candles = _generate_mock_candles(symbol, timeframe, limit)
    
    return [
        CandleResponse(
            timestamp=candle.timestamp if hasattr(candle, 'timestamp') else candle['timestamp'],
            open=candle.open if hasattr(candle, 'open') else candle['open'],
            high=candle.high if hasattr(candle, 'high') else candle['high'],
            low=candle.low if hasattr(candle, 'low') else candle['low'],
            close=candle.close if hasattr(candle, 'close') else candle['close'],
            volume=candle.volume if hasattr(candle, 'volume') else candle['volume'],
            timeframe=candle.timeframe if hasattr(candle, 'timeframe') else timeframe
        )
        for candle in candles
    ]


@router.get("/stats", response_model=MarketStatsResponse)
def get_market_stats(
    current_user: Optional[User] = Depends(get_optional_current_user),
    session: Session = Depends(get_session)
):
    """
    Get overall market statistics
    """
    logger.info("Fetching market statistics")
    
    # Get instrument counts
    total_instruments = session.exec(select(Instrument)).count()
    active_instruments = session.exec(
        select(Instrument).where(Instrument.is_active == True)
    ).count()
    
    # Calculate total volume (mock for now)
    total_volume_24h = Decimal("50000000.00")  # $50M mock volume
    
    # Get top gainers/losers (mock data)
    top_gainers = [
        {"symbol": "BTC/USD", "change_pct": 5.2, "price": 50000.00},
        {"symbol": "ETH/USD", "change_pct": 3.8, "price": 3000.00},
        {"symbol": "EUR/USD", "change_pct": 1.2, "price": 1.0850}
    ]
    
    top_losers = [
        {"symbol": "GOLD", "change_pct": -2.1, "price": 1950.00},
        {"symbol": "SPX", "change_pct": -1.5, "price": 4200.00},
        {"symbol": "GBP/USD", "change_pct": -0.8, "price": 1.2500}
    ]
    
    return MarketStatsResponse(
        total_instruments=total_instruments,
        active_instruments=active_instruments,
        total_volume_24h=total_volume_24h,
        top_gainers=top_gainers,
        top_losers=top_losers
    )


def _get_mock_price(symbol: str) -> Decimal:
    """Generate mock current price based on symbol"""
    from core.market_data import get_current_price
    # Use centralized market data service
    return get_current_price(symbol, session=None)


def _get_spread_percentage(instrument_type: str) -> Decimal:
    """Get realistic spread percentage by instrument type"""
    spreads = {
        "crypto": Decimal("0.1"),    # 0.1%
        "forex": Decimal("0.02"),    # 0.02%
        "stock": Decimal("0.05"),    # 0.05%
        "index": Decimal("0.03"),    # 0.03%
        "commodity": Decimal("0.08") # 0.08%
    }
    
    return spreads.get(instrument_type, Decimal("0.1"))


def _generate_mock_candles(symbol: str, timeframe: str, limit: int) -> List[dict]:
    """Generate mock candle data for testing"""
    import random
    
    # Timeframe to minutes mapping
    timeframe_minutes = {
        "1m": 1,
        "5m": 5,
        "15m": 15,
        "1h": 60,
        "4h": 240,
        "1d": 1440,
        "1w": 10080
    }
    
    minutes = timeframe_minutes.get(timeframe, 1)
    base_price = _get_mock_price(symbol)
    
    candles = []
    current_time = datetime.utcnow()
    
    for i in range(limit):
        # Generate realistic OHLC data
        open_price = base_price * Decimal(str(random.uniform(0.98, 1.02)))
        
        high_low_range = open_price * Decimal("0.02")  # 2% range
        high = open_price + Decimal(str(random.uniform(0, float(high_low_range))))
        low = open_price - Decimal(str(random.uniform(0, float(high_low_range))))
        
        close_price = open_price * Decimal(str(random.uniform(0.99, 1.01)))
        
        # Ensure OHLC consistency
        high = max(high, open_price, close_price)
        low = min(low, open_price, close_price)
        
        volume = Decimal(str(random.uniform(1000, 10000)))
        
        candle_time = current_time - timedelta(minutes=minutes * i)
        
        candles.append({
            "timestamp": candle_time,
            "open": open_price,
            "high": high,
            "low": low,
            "close": close_price,
            "volume": volume,
            "timeframe": timeframe
        })
    
    return list(reversed(candles))  # Return in chronological order
