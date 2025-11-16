"""
Order Processing Service
Background task to check and execute pending limit/stop orders
"""

import logging
from decimal import Decimal
from datetime import datetime
from sqlmodel import Session, select
from typing import List

from models.order import Order, OrderStatus, OrderType, OrderSide
from models.instrument import Instrument, InstrumentType
from models.position import Position, PositionStatus
from models.account import Account
from models.ledger import LedgerEntry, EntryType
from trading.simulator import trading_simulator, InstrumentType as SimInstrumentType, OrderSide as SimOrderSide
from core.market_data import get_price_for_instrument
from core.database import get_sync_session

logger = logging.getLogger(__name__)


def process_pending_orders() -> dict:
    """
    Process pending limit and stop orders
    Checks if price conditions are met and executes orders
    
    Returns:
        Dictionary with processing results
    """
    session: Session = get_sync_session()
    processed = 0
    filled = 0
    errors = 0
    
    try:
        # Get all pending limit and stop orders
        pending_orders = session.exec(
            select(Order)
            .where(Order.status == OrderStatus.PENDING)
            .where(Order.type.in_([OrderType.LIMIT, OrderType.STOP, OrderType.STOP_LIMIT]))
        ).all()
        
        logger.info(f"Processing {len(pending_orders)} pending orders")
        
        for order in pending_orders:
            try:
                processed += 1
                
                # Get instrument
                instrument = session.get(Instrument, order.instrument_id)
                if not instrument:
                    logger.warning(f"Instrument {order.instrument_id} not found for order {order.id}")
                    continue
                
                # Get current market price
                current_price = get_price_for_instrument(order.instrument_id, session)
                
                # Map instrument type
                instrument_type_map = {
                    "crypto": SimInstrumentType.CRYPTO,
                    "forex": SimInstrumentType.FOREX,
                    "stock": SimInstrumentType.STOCK,
                    "index": SimInstrumentType.INDEX,
                    "commodity": SimInstrumentType.COMMODITY
                }
                instrument_type = instrument_type_map.get(instrument.type, SimInstrumentType.CRYPTO)
                
                # Check if order should be filled
                should_fill = False
                fill_price = None
                
                if order.type == OrderType.LIMIT:
                    # Limit order: fill if price is favorable
                    if order.side == OrderSide.BUY and order.price and current_price <= order.price:
                        # Buy limit: price dropped to or below limit
                        should_fill = True
                        fill_price = min(current_price, order.price)
                    elif order.side == OrderSide.SELL and order.price and current_price >= order.price:
                        # Sell limit: price rose to or above limit
                        should_fill = True
                        fill_price = max(current_price, order.price)
                
                elif order.type == OrderType.STOP:
                    # Stop order: triggers when stop price is hit
                    if order.side == OrderSide.BUY and order.stop_price and current_price >= order.stop_price:
                        # Buy stop: price rose to or above stop
                        should_fill = True
                        fill_price = current_price
                    elif order.side == OrderSide.SELL and order.stop_price and current_price <= order.stop_price:
                        # Sell stop: price dropped to or below stop
                        should_fill = True
                        fill_price = current_price
                
                elif order.type == OrderType.STOP_LIMIT:
                    # Stop-limit: first triggers stop, then fills at limit
                    if order.side == OrderSide.BUY:
                        if order.stop_price and current_price >= order.stop_price:
                            # Stop triggered, check if limit is met
                            if order.price and current_price <= order.price:
                                should_fill = True
                                fill_price = min(current_price, order.price)
                    elif order.side == OrderSide.SELL:
                        if order.stop_price and current_price <= order.stop_price:
                            # Stop triggered, check if limit is met
                            if order.price and current_price >= order.price:
                                should_fill = True
                                fill_price = max(current_price, order.price)
                
                # Execute order if conditions met
                if should_fill and fill_price:
                    # Get account
                    account = session.get(Account, order.account_id)
                    if not account:
                        logger.warning(f"Account {order.account_id} not found for order {order.id}")
                        continue
                    
                    # Check balance for buy orders
                    if order.side == OrderSide.BUY:
                        required_margin = fill_price * order.size / Decimal(str(order.leverage))
                        if account.virtual_balance < required_margin:
                            logger.warning(f"Insufficient balance for order {order.id}")
                            order.status = OrderStatus.REJECTED
                            session.add(order)
                            session.commit()
                            continue
                    
                    # Update order as filled
                    order.status = OrderStatus.FILLED
                    order.fill_price = fill_price
                    order.filled_size = order.size
                    order.filled_at = datetime.utcnow()
                    
                    # Calculate fee
                    notional_value = fill_price * order.size
                    order.fee = notional_value * Decimal("0.001")  # 0.1% fee
                    order.margin_required = notional_value / Decimal(str(order.leverage))
                    
                    # Update account balance (deduct margin + fee)
                    account.virtual_balance -= (order.margin_required + order.fee)
                    account.total_trades += 1
                    account.last_trade_at = datetime.utcnow()
                    account.updated_at = datetime.utcnow()
                    
                    # Create or update position
                    from models.position import Position, PositionStatus, PositionSide
                    from core.market_data import get_price_for_instrument as get_price
                    
                    # Check for existing position
                    existing_position = session.exec(
                        select(Position)
                        .where(Position.account_id == account.id)
                        .where(Position.instrument_id == order.instrument_id)
                        .where(Position.status == PositionStatus.OPEN)
                    ).first()
                    
                    if existing_position:
                        # Update existing position
                        # Compare side values (position.side is string, order.side is enum)
                        if existing_position.side.lower() == order.side.value.lower():
                            # Same side - increase position
                            total_size = existing_position.size + order.size
                            total_cost = (existing_position.entry_price * existing_position.size + 
                                         fill_price * order.size)
                            new_entry_price = total_cost / total_size
                            
                            existing_position.size = total_size
                            existing_position.entry_price = new_entry_price
                            existing_position.current_price = fill_price
                            session.add(existing_position)
                        else:
                            # Opposite side - reduce or close position
                            if order.size >= existing_position.size:
                                # Close position completely
                                existing_position.status = PositionStatus.CLOSED
                                existing_position.closed_at = datetime.utcnow()
                                existing_position.current_price = fill_price
                                
                                # Calculate realized P&L
                                from trading.simulator import OrderSide as SimOrderSide
                                position_side = SimOrderSide.BUY if existing_position.side.lower() == "buy" else SimOrderSide.SELL
                                pnl_calc = trading_simulator.calculate_position_pnl(
                                    existing_position.entry_price,
                                    fill_price,
                                    existing_position.size,
                                    position_side,
                                    existing_position.leverage
                                )
                                
                                realized_pnl = pnl_calc["unrealized_pnl"]
                                order.pnl = realized_pnl
                                
                                # Update account balance
                                account.virtual_balance += realized_pnl
                                account.total_pnl += realized_pnl
                                
                                if realized_pnl > 0:
                                    account.winning_trades += 1
                                else:
                                    account.losing_trades += 1
                                
                                # Create ledger entry
                                ledger_entry_pnl = LedgerEntry(
                                    account_id=account.id,
                                    user_id=account.user_id,
                                    entry_type=EntryType.TRADE_PNL,
                                    amount=realized_pnl,
                                    balance_after=account.virtual_balance,
                                    description=f"Realized P&L from {instrument.symbol} position",
                                    reference_type="order",
                                    reference_id=order.id
                                )
                                session.add(ledger_entry_pnl)
                                
                                # Create new position for remaining size if any
                                remaining_size = order.size - existing_position.size
                                if remaining_size > 0:
                                    new_position = Position(
                                        account_id=account.id,
                                        instrument_id=order.instrument_id,
                                        side=order.side.value,
                                        size=remaining_size,
                                        entry_price=fill_price,
                                        current_price=fill_price,
                                        leverage=order.leverage,
                                        status=PositionStatus.OPEN,
                                        opened_at=datetime.utcnow()
                                    )
                                    session.add(new_position)
                            else:
                                # Partially close position
                                existing_position.size -= order.size
                                existing_position.current_price = fill_price
                                session.add(existing_position)
                    else:
                        # Create new position
                        new_position = Position(
                            account_id=account.id,
                            instrument_id=order.instrument_id,
                            side=order.side.value,
                            size=order.size,
                            entry_price=fill_price,
                            current_price=fill_price,
                            leverage=order.leverage,
                            status=PositionStatus.OPEN,
                            opened_at=datetime.utcnow()
                        )
                        session.add(new_position)
                    
                    # Create ledger entry for fee
                    ledger_entry = LedgerEntry(
                        account_id=account.id,
                        user_id=account.user_id,
                        entry_type=EntryType.FEE,
                        amount=-order.fee,  # Negative for fee
                        balance_after=account.virtual_balance,
                        description=f"Trading fee for {instrument.symbol} order",
                        reference_type="order",
                        reference_id=order.id
                    )
                    session.add(ledger_entry)
                    
                    session.add(order)
                    session.add(account)
                    session.commit()
                    
                    filled += 1
                    logger.info(f"Order {order.id} filled at {fill_price}")
                
                # Check for expired orders (optional - can add expiry logic)
                # For now, orders stay pending until filled or cancelled
                
            except Exception as e:
                logger.error(f"Error processing order {order.id}: {str(e)}")
                errors += 1
                session.rollback()
                continue
        
        logger.info(f"Order processing complete: processed={processed}, filled={filled}, errors={errors}")
        return {
            "status": "success",
            "processed": processed,
            "filled": filled,
            "errors": errors
        }
        
    finally:
        session.close()

