"""
WebSocket API Routes
Real-time updates for trading platform
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from typing import Dict, List, Set
import json
import logging
import asyncio
from datetime import datetime

from core.dependencies import get_current_user
from models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


class ConnectionManager:
    """Manage WebSocket connections"""
    
    def __init__(self):
        # Store active connections by type
        self.market_connections: Set[WebSocket] = set()
        self.account_connections: Dict[int, Set[WebSocket]] = {}  # user_id -> connections
        self.admin_connections: Set[WebSocket] = set()
    
    async def connect_market(self, websocket: WebSocket):
        """Connect to market data stream"""
        await websocket.accept()
        self.market_connections.add(websocket)
        logger.info(f"Market WebSocket connected. Total: {len(self.market_connections)}")
    
    async def connect_account(self, websocket: WebSocket, user_id: int):
        """Connect to account-specific updates"""
        await websocket.accept()
        if user_id not in self.account_connections:
            self.account_connections[user_id] = set()
        self.account_connections[user_id].add(websocket)
        logger.info(f"Account WebSocket connected for user {user_id}")
    
    async def connect_admin(self, websocket: WebSocket):
        """Connect to admin monitoring stream"""
        await websocket.accept()
        self.admin_connections.add(websocket)
        logger.info(f"Admin WebSocket connected. Total: {len(self.admin_connections)}")
    
    def disconnect_market(self, websocket: WebSocket):
        """Disconnect from market data stream"""
        self.market_connections.discard(websocket)
        logger.info(f"Market WebSocket disconnected. Remaining: {len(self.market_connections)}")
    
    def disconnect_account(self, websocket: WebSocket, user_id: int):
        """Disconnect from account updates"""
        if user_id in self.account_connections:
            self.account_connections[user_id].discard(websocket)
            if not self.account_connections[user_id]:
                del self.account_connections[user_id]
        logger.info(f"Account WebSocket disconnected for user {user_id}")
    
    def disconnect_admin(self, websocket: WebSocket):
        """Disconnect from admin stream"""
        self.admin_connections.discard(websocket)
        logger.info(f"Admin WebSocket disconnected. Remaining: {len(self.admin_connections)}")
    
    async def broadcast_market_data(self, data: dict):
        """Broadcast market data to all market subscribers"""
        if not self.market_connections:
            return
        
        message = json.dumps({
            "type": "market_data",
            "timestamp": datetime.utcnow().isoformat(),
            "data": data
        })
        
        # Send to all connections, remove failed ones
        failed_connections = set()
        for connection in self.market_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Failed to send market data: {e}")
                failed_connections.add(connection)
        
        # Clean up failed connections
        self.market_connections -= failed_connections
    
    async def send_account_update(self, user_id: int, data: dict):
        """Send update to specific user's account connections"""
        if user_id not in self.account_connections:
            return
        
        message = json.dumps({
            "type": "account_update",
            "timestamp": datetime.utcnow().isoformat(),
            "data": data
        })
        
        failed_connections = set()
        for connection in self.account_connections[user_id]:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Failed to send account update to user {user_id}: {e}")
                failed_connections.add(connection)
        
        # Clean up failed connections
        self.account_connections[user_id] -= failed_connections
        if not self.account_connections[user_id]:
            del self.account_connections[user_id]
    
    async def broadcast_admin_update(self, data: dict):
        """Broadcast admin updates to all admin connections"""
        if not self.admin_connections:
            return
        
        message = json.dumps({
            "type": "admin_update",
            "timestamp": datetime.utcnow().isoformat(),
            "data": data
        })
        
        failed_connections = set()
        for connection in self.admin_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Failed to send admin update: {e}")
                failed_connections.add(connection)
        
        # Clean up failed connections
        self.admin_connections -= failed_connections


# Global connection manager
manager = ConnectionManager()


@router.websocket("/market/prices")
async def websocket_market_prices(websocket: WebSocket):
    """
    WebSocket endpoint for real-time market prices
    Public endpoint - no authentication required
    """
    await manager.connect_market(websocket)
    
    try:
        # Send initial market data
        initial_data = {
            "symbols": ["BTC/USD", "ETH/USD", "EUR/USD"],
            "message": "Connected to market data stream"
        }
        await websocket.send_text(json.dumps({
            "type": "connection",
            "data": initial_data
        }))
        
        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for client messages (like subscription requests)
                data = await websocket.receive_text()
                message = json.loads(data)
                
                if message.get("action") == "subscribe":
                    symbols = message.get("symbols", [])
                    await websocket.send_text(json.dumps({
                        "type": "subscription",
                        "data": {"subscribed_symbols": symbols}
                    }))
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket market error: {e}")
                break
    
    finally:
        manager.disconnect_market(websocket)


@router.websocket("/accounts/{account_id}/updates")
async def websocket_account_updates(websocket: WebSocket, account_id: int):
    """
    WebSocket endpoint for account-specific updates
    Requires authentication via query parameter or header
    """
    # TODO: Implement WebSocket authentication
    # For now, we'll use a simple approach
    
    # Mock user ID - in real implementation, extract from JWT token
    user_id = 1  # This should be extracted from authentication
    
    await manager.connect_account(websocket, user_id)
    
    try:
        # Send initial account status
        initial_data = {
            "account_id": account_id,
            "message": "Connected to account updates"
        }
        await websocket.send_text(json.dumps({
            "type": "connection",
            "data": initial_data
        }))
        
        # Keep connection alive
        while True:
            try:
                data = await websocket.receive_text()
                # Handle client messages if needed
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket account error: {e}")
                break
    
    finally:
        manager.disconnect_account(websocket, user_id)


@router.websocket("/admin/monitoring")
async def websocket_admin_monitoring(websocket: WebSocket):
    """
    WebSocket endpoint for admin monitoring dashboard
    Requires admin authentication
    """
    # TODO: Implement admin WebSocket authentication
    
    await manager.connect_admin(websocket)
    
    try:
        # Send initial admin data
        initial_data = {
            "message": "Connected to admin monitoring",
            "active_connections": {
                "market": len(manager.market_connections),
                "accounts": sum(len(conns) for conns in manager.account_connections.values()),
                "admin": len(manager.admin_connections)
            }
        }
        await websocket.send_text(json.dumps({
            "type": "connection",
            "data": initial_data
        }))
        
        # Keep connection alive
        while True:
            try:
                data = await websocket.receive_text()
                # Handle admin commands if needed
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"WebSocket admin error: {e}")
                break
    
    finally:
        manager.disconnect_admin(websocket)


# Helper functions for sending updates from other parts of the application

async def notify_balance_update(user_id: int, account_id: int, new_balance: float, old_balance: float):
    """Notify user of balance update"""
    data = {
        "type": "balance_update",
        "account_id": account_id,
        "new_balance": new_balance,
        "old_balance": old_balance,
        "change": new_balance - old_balance
    }
    await manager.send_account_update(user_id, data)


async def notify_deposit_update(user_id: int, deposit_data: dict):
    """Notify user of deposit status update (real-time deposits feed)."""

    data = {
        "type": "deposit_update",
        "deposit": deposit_data,
    }

    await manager.send_account_update(user_id, data)


async def notify_order_fill(user_id: int, order_data: dict):
    """Notify user of order fill"""
    data = {
        "type": "order_fill",
        "order": order_data
    }
    await manager.send_account_update(user_id, data)


async def notify_position_update(user_id: int, position_data: dict):
    """Notify user of position P&L update"""
    data = {
        "type": "position_update",
        "position": position_data
    }
    await manager.send_account_update(user_id, data)


async def broadcast_price_update(symbol: str, price: float, change_pct: float):
    """Broadcast price update to all market subscribers"""
    data = {
        "symbol": symbol,
        "price": price,
        "change_pct": change_pct,
        "timestamp": datetime.utcnow().isoformat()
    }
    await manager.broadcast_market_data(data)


async def notify_admin_action(action_type: str, details: dict):
    """Notify admins of important actions"""
    data = {
        "type": action_type,
        "details": details
    }
    await manager.broadcast_admin_update(data)


# Background task to simulate market data updates
async def market_data_simulator():
    """
    Background task to simulate real-time market data
    In production, this would connect to real market data feeds
    """
    import random
    
    symbols = ["BTC/USD", "ETH/USD", "EUR/USD", "GBP/USD", "GOLD", "SPX"]
    base_prices = {
        "BTC/USD": 50000,
        "ETH/USD": 3000,
        "EUR/USD": 1.085,
        "GBP/USD": 1.25,
        "GOLD": 1950,
        "SPX": 4200
    }
    
    while True:
        try:
            # Simulate price updates every 5 seconds
            await asyncio.sleep(5)
            
            for symbol in symbols:
                # Generate random price movement
                base_price = base_prices[symbol]
                change_pct = random.uniform(-0.5, 0.5)  # ±0.5%
                new_price = base_price * (1 + change_pct / 100)
                
                # Update base price for next iteration
                base_prices[symbol] = new_price
                
                # Broadcast update
                await broadcast_price_update(symbol, new_price, change_pct)
                
        except Exception as e:
            logger.error(f"Market data simulator error: {e}")
            await asyncio.sleep(10)  # Wait before retrying


# Start background task when module is imported
# Note: In production, this should be managed by the application lifecycle
import asyncio
import threading

def start_market_simulator():
    """Start market data simulator in background"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    # Run the simulator
    loop.create_task(market_data_simulator())

# Uncomment to enable background market data simulation
# threading.Thread(target=start_market_simulator, daemon=True).start()
