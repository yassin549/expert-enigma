"""
WebSocket Authentication Utilities
Handles JWT token validation for WebSocket connections
"""

from fastapi import WebSocket, HTTPException, status
from typing import Optional, Tuple
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from core.security import decode_token, verify_token_type
from core.database import get_session
from models.user import User

logger = logging.getLogger(__name__)


async def authenticate_websocket(
    websocket: WebSocket,
    token: Optional[str] = None,
    session: Optional[AsyncSession] = None,
    accept_connection: bool = True
) -> Tuple[User, AsyncSession]:
    """
    Authenticate WebSocket connection using JWT token
    
    Token can be provided via:
    1. Query parameter: ?token=...
    2. Initial message: {"type": "auth", "token": "..."} (requires accept_connection=True)
    
    Args:
        websocket: WebSocket connection
        token: Optional token from query parameter
        session: Optional database session (will create if not provided)
        accept_connection: Whether to accept the connection (default: True)
    
    Returns:
        Tuple of (authenticated_user, database_session)
    
    Raises:
        HTTPException: If authentication fails
    """
    # Get token from query parameter if not provided
    if not token:
        token = websocket.query_params.get("token")
    
    # Accept connection if needed (for message-based auth)
    if accept_connection and not token:
        try:
            await websocket.accept()
            # Try to get from initial message
            import asyncio
            try:
                message = await asyncio.wait_for(websocket.receive_text(), timeout=5.0)
                import json
                data = json.loads(message)
                if data.get("type") == "auth":
                    token = data.get("token")
            except asyncio.TimeoutError:
                pass
            except Exception as e:
                logger.warning(f"Error reading auth message: {e}")
        except Exception:
            pass
    
    if not token:
        if accept_connection:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication required")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required"
        )
    
    # Decode and verify token
    try:
        payload = decode_token(token)
        verify_token_type(payload, "access")
    except HTTPException as e:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token")
        raise e
    
    # Get user ID from token
    user_id_raw = payload.get("sub")
    if user_id_raw is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid token payload")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Convert user ID to integer
    try:
        user_id = int(user_id_raw) if isinstance(user_id_raw, str) else user_id_raw
    except (ValueError, TypeError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid user ID")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID in token"
        )
    
    # Get or create database session
    if not session:
        from core.database import async_session_maker
        session = async_session_maker()
    
    # Fetch user from database
    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if user is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User not found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Check if user is active
    if not user.is_active:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Account inactive")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Check if user is banned
    if user.is_banned:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Account banned")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been banned"
        )
    
    logger.info(f"WebSocket authenticated for user {user.id} ({user.email})")
    return user, session


async def authenticate_admin_websocket(
    websocket: WebSocket,
    token: Optional[str] = None,
    session: Optional[AsyncSession] = None,
    accept_connection: bool = True
) -> Tuple[User, AsyncSession]:
    """
    Authenticate WebSocket connection for admin users
    
    Args:
        websocket: WebSocket connection
        token: Optional token from query parameter
        session: Optional database session
        accept_connection: Whether to accept the connection (default: True)
    
    Returns:
        Tuple of (authenticated_admin_user, database_session)
    
    Raises:
        HTTPException: If authentication fails or user is not admin
    """
    user, session = await authenticate_websocket(websocket, token, session, accept_connection)
    
    if not user.is_admin:
        if accept_connection:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Admin access required")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    logger.info(f"Admin WebSocket authenticated for user {user.id} ({user.email})")
    return user, session

