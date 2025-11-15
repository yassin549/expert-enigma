"""
FastAPI dependencies for authentication and authorization
"""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_session
from core.security import decode_token, verify_token_type
from models.user import User

# HTTP Bearer token scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: AsyncSession = Depends(get_session)
) -> User:
    """
    Get current authenticated user from JWT token
    
    Args:
        credentials: HTTP Bearer token
        session: Database session
    
    Returns:
        Current user object
    
    Raises:
        HTTPException: If token is invalid or user not found
    """
    # Decode token
    payload = decode_token(credentials.credentials)
    
    # Verify token type
    verify_token_type(payload, "access")
    
    # Get user ID from token
    user_id: Optional[int] = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Fetch user from database
    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Check if user is banned
    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been banned"
        )
    
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current active user (alias for clarity)
    
    Args:
        current_user: Current user from get_current_user
    
    Returns:
        Current active user
    """
    return current_user


def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current admin user
    Requires user to have is_admin=True
    
    Args:
        current_user: Current user from get_current_user
    
    Returns:
        Current admin user
    
    Raises:
        HTTPException: If user is not an admin
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return current_user


def require_trading_access(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Require user to have trading access
    Users must deposit money first before accessing trading
    
    Args:
        current_user: Current user from get_current_user
    
    Returns:
        Current user with trading access
    
    Raises:
        HTTPException: If user doesn't have trading access
    """
    if not current_user.can_access_trading:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Trading access denied. Please make a deposit first to access trading features."
        )
    
    return current_user


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: AsyncSession = Depends(get_session)
) -> Optional[User]:
    """
    Get current user if authenticated, None otherwise
    Used for optional authentication endpoints
    
    Args:
        credentials: Optional HTTP Bearer token
        session: Database session
    
    Returns:
        Current user if authenticated, None otherwise
    """
    if credentials is None:
        return None
    
    try:
        return await get_current_user(credentials, session)
    except HTTPException:
        return None
