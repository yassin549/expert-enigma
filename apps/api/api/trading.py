"""
Trading API Routes
100% simulated trading with realistic execution
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
from decimal import Decimal
import logging

from core.database import get_session
from core.dependencies import require_trading_access
from models.user import User
from models.account import Account
from models.order import Order, OrderSide, OrderType, OrderStatus
from models.position import Position, PositionSide, PositionStatus
from models.instrument import Instrument
from models.ledger import LedgerEntry, EntryType
from models.audit import Audit, AuditAction
from trading.simulator import trading_simulator, InstrumentType

logger = logging.getLogger(__name__)
router = APIRouter()


# Pydantic models for request/response
from pydantic import BaseModel


class PlaceOrderRequest(BaseModel):
    instrument_id: int
    side: OrderSide
    order_type: OrderType
    size: Decimal
    price: Optional[Decimal] = None  # Required for limit orders
    stop_price: Optional[Decimal] = None  # Required for stop orders
    take_profit: Optional[Decimal] = None
    stop_loss: Optional[Decimal] = None
    leverage: int = 1


class OrderResponse(BaseModel):
    id: int
    account_id: int
    instrument_id: int
    side: OrderSide
    order_type: OrderType
    size: Decimal
    price: Optional[Decimal]
    stop_price: Optional[Decimal]
    status: OrderStatus
    filled_size: Decimal
    fill_price: Optional[Decimal]
    fee: Decimal
    slippage: Decimal
    pnl: Optional[Decimal]
    virtual_trade: bool
    created_at: datetime
    filled_at: Optional[datetime]


class PositionResponse(BaseModel):
    id: int
    account_id: int
    instrument_id: int
    side: PositionSide
    size: Decimal
    entry_price: Decimal
    current_price: Decimal
    unrealized_pnl: Decimal
    unrealized_pnl_pct: Decimal
    margin_used: Decimal
    leverage: int
    status: PositionStatus
    opened_at: datetime
    closed_at: Optional[datetime]


class ClosePositionRequest(BaseModel):
    size: Optional[Decimal] = None  # If None, close entire position


@router.post("/accounts/{account_id}/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def place_order(
    account_id: int,
    request: PlaceOrderRequest,
    current_user: User = Depends(require_trading_access),
    session: Session = Depends(get_session)
):
    """
    Place trading order (100% simulated)
    Instantly executes market orders, queues limit/stop orders
    """
    logger.info(f"Placing {request.order_type} {request.side} order for user {current_user.id}")
    
    # Fetch and validate account
    account = session.get(Account, account_id)
    if not account or account.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    if account.is_frozen:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is frozen"
        )
    
    # Fetch instrument
    instrument = session.get(Instrument, request.instrument_id)
    if not instrument:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instrument not found"
        )
    
    # Get current market price (from latest candle or mock data)
    # TODO: Implement real market data fetching
    current_price = Decimal("50000.00")  # Mock BTC price
    
    # Validate order parameters
    if request.order_type == OrderType.LIMIT and not request.price:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit price required for limit orders"
        )
    
    if request.order_type in [OrderType.STOP, OrderType.STOP_LIMIT] and not request.stop_price:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stop price required for stop orders"
        )
    
    # Check available balance for buy orders
    if request.side == OrderSide.BUY:
        required_margin = (request.price or current_price) * request.size / Decimal(str(request.leverage))
        if account.virtual_balance < required_margin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient balance"
            )
    
    # Create order record
    new_order = Order(
        account_id=account_id,
        instrument_id=request.instrument_id,
        side=request.side,
        order_type=request.order_type,
        size=request.size,
        price=request.price,
        stop_price=request.stop_price,
        status=OrderStatus.PENDING,
        filled_size=Decimal("0.00"),
        fee=Decimal("0.00"),
        slippage=Decimal("0.00"),
        virtual_trade=True,  # Always true - no real broker
        created_at=datetime.utcnow()
    )
    
    session.add(new_order)
    session.commit()
    session.refresh(new_order)
    
    # Simulate order execution
    try:
        # Map instrument type
        instrument_type_map = {
            "crypto": InstrumentType.CRYPTO,
            "forex": InstrumentType.FOREX,
            "stock": InstrumentType.STOCK,
            "index": InstrumentType.INDEX,
            "commodity": InstrumentType.COMMODITY
        }
        instrument_type = instrument_type_map.get(instrument.type, InstrumentType.CRYPTO)
        
        # Simulate fill
        fill_result = trading_simulator.simulate_order_fill(
            order_type=request.order_type,
            side=request.side,
            size=request.size,
            current_price=current_price,
            limit_price=request.price,
            stop_price=request.stop_price,
            instrument_type=instrument_type,
            leverage=request.leverage
        )
        
        # Update order with fill results
        new_order.status = OrderStatus(fill_result["status"])
        new_order.filled_size = fill_result.get("filled_size", Decimal("0.00"))
        new_order.fill_price = fill_result.get("fill_price")
        new_order.fee = fill_result.get("fee", Decimal("0.00"))
        new_order.slippage = fill_result.get("slippage", Decimal("0.00"))
        
        if new_order.status == OrderStatus.FILLED:
            new_order.filled_at = datetime.utcnow()
            
            # Create or update position
            _handle_position_update(
                session, account, new_order, instrument, fill_result
            )
            
            # Update account statistics
            account.total_trades += 1
            account.last_trade_at = datetime.utcnow()
            account.updated_at = datetime.utcnow()
        
        session.add(new_order)
        session.add(account)
        session.commit()
        session.refresh(new_order)
        
        # Create audit log
        audit = Audit(
            actor_user_id=current_user.id,
            action=AuditAction.ORDER_PLACED,
            object_type="order",
            object_id=new_order.id,
            reason=f"{request.order_type} {request.side} order",
            diff={"order_status": fill_result["status"]}
        )
        session.add(audit)
        session.commit()
        
        logger.info(f"Order {new_order.id} executed with status: {new_order.status}")
        
    except Exception as e:
        logger.error(f"Order execution failed: {str(e)}")
        new_order.status = OrderStatus.REJECTED
        session.add(new_order)
        session.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Order execution failed: {str(e)}"
        )
    
    return OrderResponse(
        id=new_order.id,
        account_id=new_order.account_id,
        instrument_id=new_order.instrument_id,
        side=new_order.side,
        order_type=new_order.order_type,
        size=new_order.size,
        price=new_order.price,
        stop_price=new_order.stop_price,
        status=new_order.status,
        filled_size=new_order.filled_size,
        fill_price=new_order.fill_price,
        fee=new_order.fee,
        slippage=new_order.slippage,
        pnl=new_order.pnl,
        virtual_trade=new_order.virtual_trade,
        created_at=new_order.created_at,
        filled_at=new_order.filled_at
    )


def _handle_position_update(
    session: Session,
    account: Account,
    order: Order,
    instrument: Instrument,
    fill_result: dict
):
    """
    Handle position creation/update after order fill
    """
    # Check for existing position
    existing_position = session.exec(
        select(Position)
        .where(Position.account_id == account.id)
        .where(Position.instrument_id == order.instrument_id)
        .where(Position.status == PositionStatus.OPEN)
    ).first()
    
    if existing_position:
        # Update existing position
        if existing_position.side == PositionSide(order.side.value):
            # Same side - increase position
            total_size = existing_position.size + order.filled_size
            total_cost = (existing_position.entry_price * existing_position.size + 
                         order.fill_price * order.filled_size)
            new_entry_price = total_cost / total_size
            
            existing_position.size = total_size
            existing_position.entry_price = new_entry_price
            existing_position.current_price = order.fill_price
        else:
            # Opposite side - reduce or close position
            if order.filled_size >= existing_position.size:
                # Close position completely
                existing_position.status = PositionStatus.CLOSED
                existing_position.closed_at = datetime.utcnow()
                existing_position.current_price = order.fill_price
                
                # Calculate realized P&L
                pnl_calc = trading_simulator.calculate_position_pnl(
                    existing_position.entry_price,
                    order.fill_price,
                    existing_position.size,
                    existing_position.side,
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
                ledger_entry = LedgerEntry(
                    account_id=account.id,
                    user_id=account.user_id,
                    entry_type=EntryType.TRADE_PNL,
                    amount=realized_pnl,
                    balance_after=account.virtual_balance,
                    description=f"Realized P&L from {instrument.symbol} position",
                    reference_type="order",
                    reference_id=order.id
                )
                session.add(ledger_entry)
                
                # Create new position for remaining size if any
                remaining_size = order.filled_size - existing_position.size
                if remaining_size > 0:
                    new_position = Position(
                        account_id=account.id,
                        instrument_id=order.instrument_id,
                        side=PositionSide(order.side.value),
                        size=remaining_size,
                        entry_price=order.fill_price,
                        current_price=order.fill_price,
                        leverage=1,  # TODO: Get from order
                        status=PositionStatus.OPEN,
                        opened_at=datetime.utcnow()
                    )
                    session.add(new_position)
            else:
                # Partially close position
                existing_position.size -= order.filled_size
                existing_position.current_price = order.fill_price
        
        session.add(existing_position)
    else:
        # Create new position
        new_position = Position(
            account_id=account.id,
            instrument_id=order.instrument_id,
            side=PositionSide(order.side.value),
            size=order.filled_size,
            entry_price=order.fill_price,
            current_price=order.fill_price,
            leverage=1,  # TODO: Get from order
            status=PositionStatus.OPEN,
            opened_at=datetime.utcnow()
        )
        session.add(new_position)


@router.get("/accounts/{account_id}/orders", response_model=List[OrderResponse])
def get_orders(
    account_id: int,
    status: Optional[OrderStatus] = None,
    limit: int = 50,
    current_user: User = Depends(require_trading_access),
    session: Session = Depends(get_session)
):
    """
    Get order history with optional filtering
    """
    # Validate account ownership
    account = session.get(Account, account_id)
    if not account or account.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Build query
    query = select(Order).where(Order.account_id == account_id)
    
    if status:
        query = query.where(Order.status == status)
    
    query = query.order_by(Order.created_at.desc()).limit(limit)
    
    orders = session.exec(query).all()
    
    return [
        OrderResponse(
            id=order.id,
            account_id=order.account_id,
            instrument_id=order.instrument_id,
            side=order.side,
            order_type=order.order_type,
            size=order.size,
            price=order.price,
            stop_price=order.stop_price,
            status=order.status,
            filled_size=order.filled_size,
            fill_price=order.fill_price,
            fee=order.fee,
            slippage=order.slippage,
            pnl=order.pnl,
            virtual_trade=order.virtual_trade,
            created_at=order.created_at,
            filled_at=order.filled_at
        )
        for order in orders
    ]


@router.delete("/accounts/{account_id}/orders/{order_id}")
def cancel_order(
    account_id: int,
    order_id: int,
    current_user: User = Depends(require_trading_access),
    session: Session = Depends(get_session)
):
    """
    Cancel pending order
    """
    # Validate account ownership
    account = session.get(Account, account_id)
    if not account or account.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Fetch order
    order = session.get(Order, order_id)
    if not order or order.account_id != account_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if order.status != OrderStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only cancel pending orders"
        )
    
    # Cancel order
    order.status = OrderStatus.CANCELLED
    session.add(order)
    session.commit()
    
    # Create audit log
    audit = Audit(
        actor_user_id=current_user.id,
        action=AuditAction.ORDER_CANCELLED,
        object_type="order",
        object_id=order.id,
        reason="User cancelled order"
    )
    session.add(audit)
    session.commit()
    
    return {"message": "Order cancelled successfully"}


@router.get("/accounts/{account_id}/positions", response_model=List[PositionResponse])
def get_positions(
    account_id: int,
    status: Optional[PositionStatus] = None,
    current_user: User = Depends(require_trading_access),
    session: Session = Depends(get_session)
):
    """
    Get open positions with real-time P&L
    """
    # Validate account ownership
    account = session.get(Account, account_id)
    if not account or account.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Build query
    query = select(Position).where(Position.account_id == account_id)
    
    if status:
        query = query.where(Position.status == status)
    else:
        query = query.where(Position.status == PositionStatus.OPEN)
    
    positions = session.exec(query).all()
    
    # Calculate real-time P&L for each position
    position_responses = []
    for position in positions:
        # Get current market price (mock for now)
        current_price = Decimal("50000.00")  # TODO: Get real market price
        
        # Calculate P&L
        pnl_calc = trading_simulator.calculate_position_pnl(
            position.entry_price,
            current_price,
            position.size,
            position.side,
            position.leverage
        )
        
        # Update position current price
        position.current_price = current_price
        session.add(position)
        
        position_responses.append(PositionResponse(
            id=position.id,
            account_id=position.account_id,
            instrument_id=position.instrument_id,
            side=position.side,
            size=position.size,
            entry_price=position.entry_price,
            current_price=current_price,
            unrealized_pnl=pnl_calc["unrealized_pnl"],
            unrealized_pnl_pct=pnl_calc["unrealized_pnl_pct"],
            margin_used=position.entry_price * position.size / Decimal(str(position.leverage)),
            leverage=position.leverage,
            status=position.status,
            opened_at=position.opened_at,
            closed_at=position.closed_at
        ))
    
    session.commit()
    return position_responses


@router.post("/accounts/{account_id}/positions/{position_id}/close")
def close_position(
    account_id: int,
    position_id: int,
    request: ClosePositionRequest,
    current_user: User = Depends(require_trading_access),
    session: Session = Depends(get_session)
):
    """
    Close position (full or partial)
    """
    # Validate account ownership
    account = session.get(Account, account_id)
    if not account or account.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Fetch position
    position = session.get(Position, position_id)
    if not position or position.account_id != account_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Position not found"
        )
    
    if position.status != PositionStatus.OPEN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Position is not open"
        )
    
    # Determine close size
    close_size = request.size if request.size else position.size
    if close_size > position.size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Close size cannot exceed position size"
        )
    
    # Get current market price
    current_price = Decimal("50000.00")  # TODO: Get real market price
    
    # Calculate P&L for closed portion
    pnl_calc = trading_simulator.calculate_position_pnl(
        position.entry_price,
        current_price,
        close_size,
        position.side,
        position.leverage
    )
    
    realized_pnl = pnl_calc["unrealized_pnl"]
    
    # Update account balance
    account.virtual_balance += realized_pnl
    account.total_pnl += realized_pnl
    
    if realized_pnl > 0:
        account.winning_trades += 1
    else:
        account.losing_trades += 1
    
    # Update position
    if close_size == position.size:
        # Close entire position
        position.status = PositionStatus.CLOSED
        position.closed_at = datetime.utcnow()
    else:
        # Partial close - reduce size
        position.size -= close_size
    
    position.current_price = current_price
    
    # Create ledger entry
    ledger_entry = LedgerEntry(
        account_id=account.id,
        user_id=account.user_id,
        entry_type=EntryType.TRADE_PNL,
        amount=realized_pnl,
        balance_after=account.virtual_balance,
        description=f"Position close P&L",
        reference_type="position",
        reference_id=position.id
    )
    
    session.add(account)
    session.add(position)
    session.add(ledger_entry)
    session.commit()
    
    # Create audit log
    audit = Audit(
        actor_user_id=current_user.id,
        action=AuditAction.POSITION_CLOSED,
        object_type="position",
        object_id=position.id,
        reason=f"Position {'fully' if close_size == position.size else 'partially'} closed",
        diff={"realized_pnl": str(realized_pnl)}
    )
    session.add(audit)
    session.commit()
    
    return {
        "message": "Position closed successfully",
        "realized_pnl": realized_pnl,
        "new_balance": account.virtual_balance
    }


@router.post("/accounts/{account_id}/positions/close-all")
def close_all_positions(
    account_id: int,
    current_user: User = Depends(require_trading_access),
    session: Session = Depends(get_session)
):
    """
    Emergency close all open positions
    """
    # Validate account ownership
    account = session.get(Account, account_id)
    if not account or account.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    
    # Get all open positions
    open_positions = session.exec(
        select(Position)
        .where(Position.account_id == account_id)
        .where(Position.status == PositionStatus.OPEN)
    ).all()
    
    if not open_positions:
        return {"message": "No open positions to close"}
    
    total_pnl = Decimal("0.00")
    closed_count = 0
    
    # Close each position
    for position in open_positions:
        # Get current market price
        current_price = Decimal("50000.00")  # TODO: Get real market price
        
        # Calculate P&L
        pnl_calc = trading_simulator.calculate_position_pnl(
            position.entry_price,
            current_price,
            position.size,
            position.side,
            position.leverage
        )
        
        realized_pnl = pnl_calc["unrealized_pnl"]
        total_pnl += realized_pnl
        
        # Close position
        position.status = PositionStatus.CLOSED
        position.closed_at = datetime.utcnow()
        position.current_price = current_price
        
        # Create ledger entry
        ledger_entry = LedgerEntry(
            account_id=account.id,
            user_id=account.user_id,
            entry_type=EntryType.TRADE_PNL,
            amount=realized_pnl,
            balance_after=account.virtual_balance + total_pnl,
            description=f"Emergency close P&L",
            reference_type="position",
            reference_id=position.id
        )
        
        session.add(position)
        session.add(ledger_entry)
        closed_count += 1
    
    # Update account
    account.virtual_balance += total_pnl
    account.total_pnl += total_pnl
    account.updated_at = datetime.utcnow()
    
    session.add(account)
    session.commit()
    
    # Create audit log
    audit = Audit(
        actor_user_id=current_user.id,
        action=AuditAction.ADMIN_ACTION,
        object_type="account",
        object_id=account.id,
        reason=f"Emergency close all positions",
        diff={"positions_closed": closed_count, "total_pnl": str(total_pnl)}
    )
    session.add(audit)
    session.commit()
    
    return {
        "message": f"Closed {closed_count} positions",
        "total_pnl": total_pnl,
        "new_balance": account.virtual_balance
    }
