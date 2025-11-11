"""
Trading Simulation Engine
100% simulated trading with realistic fills, spreads, and slippage
NO real broker integration - all trades exist only in our system
"""

import logging
from decimal import Decimal
from typing import Dict, Any, Optional, Tuple
from datetime import datetime
from enum import Enum
import random

logger = logging.getLogger(__name__)


class OrderSide(str, Enum):
    """Order side"""
    BUY = "buy"
    SELL = "sell"


class OrderType(str, Enum):
    """Order type"""
    MARKET = "market"
    LIMIT = "limit"
    STOP = "stop"
    STOP_LIMIT = "stop_limit"
    TAKE_PROFIT = "take_profit"
    TRAILING_STOP = "trailing_stop"
    OCO = "oco"  # One-Cancels-Other


class OrderStatus(str, Enum):
    """Order status"""
    PENDING = "pending"
    FILLED = "filled"
    PARTIALLY_FILLED = "partially_filled"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class InstrumentType(str, Enum):
    """Financial instrument type"""
    FOREX = "forex"
    CRYPTO = "crypto"
    STOCK = "stock"
    INDEX = "index"
    COMMODITY = "commodity"


class TradingSimulator:
    """
    Trading simulation engine that provides realistic order execution
    without connecting to any real broker
    """
    
    # Spread configurations by instrument type (in percentage)
    SPREADS = {
        InstrumentType.FOREX: 0.0002,      # 0.02% (2 pips)
        InstrumentType.CRYPTO: 0.001,       # 0.1%
        InstrumentType.STOCK: 0.0005,       # 0.05%
        InstrumentType.INDEX: 0.0003,       # 0.03%
        InstrumentType.COMMODITY: 0.0008,   # 0.08%
    }
    
    # Slippage configurations (max percentage)
    MAX_SLIPPAGE = {
        OrderType.MARKET: 0.005,            # 0.5% for market orders
        OrderType.LIMIT: 0.0,               # No slippage for limit orders
        OrderType.STOP: 0.003,              # 0.3% for stop orders
    }
    
    def __init__(self):
        """Initialize trading simulator"""
        self.liquidity_factor = 1.0  # Can be adjusted based on market conditions
    
    def calculate_spread(
        self,
        current_price: Decimal,
        instrument_type: InstrumentType
    ) -> Tuple[Decimal, Decimal]:
        """
        Calculate bid and ask prices with spread
        
        Args:
            current_price: Current market price
            instrument_type: Type of financial instrument
        
        Returns:
            Tuple of (bid_price, ask_price)
        """
        spread_pct = Decimal(str(self.SPREADS.get(instrument_type, 0.001)))
        half_spread = current_price * spread_pct / 2
        
        bid = current_price - half_spread
        ask = current_price + half_spread
        
        return (bid, ask)
    
    def calculate_slippage(
        self,
        order_type: OrderType,
        side: OrderSide,
        price: Decimal
    ) -> Decimal:
        """
        Calculate slippage for order
        
        Args:
            order_type: Type of order
            side: Buy or sell
            price: Order price
        
        Returns:
            Slippage amount (positive means worse fill)
        """
        max_slip_pct = Decimal(str(self.MAX_SLIPPAGE.get(order_type, 0.0)))
        
        if max_slip_pct == 0:
            return Decimal("0")
        
        # Random slippage between 0 and max
        random_factor = Decimal(str(random.uniform(0, 1)))
        slip_pct = max_slip_pct * random_factor
        
        slippage = price * slip_pct
        
        # Slippage is always negative for trader
        # Buy: pay more (positive slippage)
        # Sell: receive less (negative slippage)
        return slippage if side == OrderSide.BUY else -slippage
    
    async def simulate_order_fill(
        self,
        order_type: OrderType,
        side: OrderSide,
        size: Decimal,
        current_price: Decimal,
        limit_price: Optional[Decimal],
        stop_price: Optional[Decimal],
        instrument_type: InstrumentType,
        leverage: int = 1,
    ) -> Dict[str, Any]:
        """
        Simulate order execution with realistic fills
        
        Args:
            order_type: Type of order
            side: Buy or sell
            size: Order size
            current_price: Current market price
            limit_price: Limit price (for limit orders)
            stop_price: Stop price (for stop orders)
            instrument_type: Type of instrument
            leverage: Leverage multiplier
        
        Returns:
            Dictionary with fill details
        """
        logger.info(f"Simulating {order_type} {side} order: {size} @ {current_price}")
        
        # Calculate spread
        bid, ask = self.calculate_spread(current_price, instrument_type)
        
        # Determine execution price based on order type
        if order_type == OrderType.MARKET:
            # Market order fills immediately at current bid/ask
            base_price = ask if side == OrderSide.BUY else bid
            slippage = self.calculate_slippage(order_type, side, base_price)
            fill_price = base_price + slippage
            status = OrderStatus.FILLED
            filled_size = size
            
        elif order_type == OrderType.LIMIT:
            # Limit order only fills if price is favorable
            if not limit_price:
                return {
                    "status": OrderStatus.REJECTED,
                    "reason": "Limit price required for limit order"
                }
            
            # Check if limit price is achievable
            if side == OrderSide.BUY and limit_price >= ask:
                # Buy limit fills at ask (or better)
                fill_price = min(ask, limit_price)
                status = OrderStatus.FILLED
                filled_size = size
            elif side == OrderSide.SELL and limit_price <= bid:
                # Sell limit fills at bid (or better)
                fill_price = max(bid, limit_price)
                status = OrderStatus.FILLED
                filled_size = size
            else:
                # Limit not reached - order stays pending
                return {
                    "status": OrderStatus.PENDING,
                    "fill_price": None,
                    "filled_size": Decimal("0"),
                    "reason": "Limit price not reached"
                }
        
        elif order_type == OrderType.STOP:
            # Stop order triggers when stop price is hit
            if not stop_price:
                return {
                    "status": OrderStatus.REJECTED,
                    "reason": "Stop price required for stop order"
                }
            
            # Check if stop is triggered
            triggered = False
            if side == OrderSide.BUY and current_price >= stop_price:
                triggered = True
            elif side == OrderSide.SELL and current_price <= stop_price:
                triggered = True
            
            if triggered:
                base_price = ask if side == OrderSide.BUY else bid
                slippage = self.calculate_slippage(OrderType.STOP, side, base_price)
                fill_price = base_price + slippage
                status = OrderStatus.FILLED
                filled_size = size
            else:
                return {
                    "status": OrderStatus.PENDING,
                    "fill_price": None,
                    "filled_size": Decimal("0"),
                    "reason": "Stop price not triggered"
                }
        
        else:
            return {
                "status": OrderStatus.REJECTED,
                "reason": f"Order type {order_type} not yet implemented"
            }
        
        # Calculate margin required
        notional_value = fill_price * filled_size
        margin_required = notional_value / Decimal(str(leverage))
        
        # Calculate fees (0.1% taker fee simulation)
        fee = notional_value * Decimal("0.001")
        
        return {
            "status": status,
            "fill_price": fill_price,
            "filled_size": filled_size,
            "notional_value": notional_value,
            "margin_required": margin_required,
            "fee": fee,
            "slippage": slippage if order_type == OrderType.MARKET else Decimal("0"),
            "timestamp": datetime.utcnow().isoformat(),
            "virtual_trade": True,  # Always true - no real broker
        }
    
    def calculate_position_pnl(
        self,
        entry_price: Decimal,
        current_price: Decimal,
        size: Decimal,
        side: OrderSide,
        leverage: int = 1,
    ) -> Dict[str, Decimal]:
        """
        Calculate unrealized P&L for open position
        
        Args:
            entry_price: Position entry price
            current_price: Current market price
            size: Position size
            side: Long (buy) or short (sell)
            leverage: Leverage multiplier
        
        Returns:
            Dictionary with P&L details
        """
        if side == OrderSide.BUY:
            # Long position: profit when price increases
            price_diff = current_price - entry_price
        else:
            # Short position: profit when price decreases
            price_diff = entry_price - current_price
        
        unrealized_pnl = price_diff * size
        unrealized_pnl_pct = (price_diff / entry_price) * 100 * Decimal(str(leverage))
        
        return {
            "unrealized_pnl": unrealized_pnl,
            "unrealized_pnl_pct": unrealized_pnl_pct,
            "current_price": current_price,
            "price_diff": price_diff,
        }
    
    def check_margin_call(
        self,
        account_balance: Decimal,
        margin_used: Decimal,
        unrealized_pnl: Decimal,
        maintenance_margin_pct: Decimal = Decimal("0.5"),  # 50% default
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if position should be margin called
        
        Args:
            account_balance: Account virtual balance
            margin_used: Total margin in use
            unrealized_pnl: Total unrealized P&L
            maintenance_margin_pct: Maintenance margin requirement
        
        Returns:
            Tuple of (is_margin_call, reason)
        """
        equity = account_balance + unrealized_pnl
        margin_level = (equity / margin_used * 100) if margin_used > 0 else Decimal("999")
        
        if margin_level < maintenance_margin_pct * 100:
            return True, f"Margin level {margin_level:.2f}% below requirement"
        
        if equity <= 0:
            return True, "Account equity is zero or negative"
        
        return False, None


# Global simulator instance
trading_simulator = TradingSimulator()
