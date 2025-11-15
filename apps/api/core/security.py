"""
Security utilities for authentication and authorization
JWT tokens, password hashing, access control
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import HTTPException, status
import bcrypt

from core.config import settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _truncate_to_72_bytes(password: str) -> str:
    """
    Truncate password to exactly 72 bytes to meet bcrypt's hard limit.
    This is the maximum bcrypt can handle.
    """
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
        # Decode back to string, handling any incomplete UTF-8 sequences
        password = password_bytes.decode('utf-8', errors='ignore')
        # Re-encode to ensure we're exactly at or under 72 bytes
        while len(password.encode('utf-8')) > 72:
            password = password[:-1]
        return password
    return password


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    Automatically truncates passwords longer than 72 bytes to meet bcrypt's limit.
    Uses bcrypt directly to avoid passlib initialization issues.
    """
    # Truncate to 72 bytes
    safe_password = _truncate_to_72_bytes(password)
    
    # Use bcrypt directly to hash
    password_bytes = safe_password.encode('utf-8')
    # Ensure we're exactly at or under 72 bytes
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
        safe_password = password_bytes.decode('utf-8', errors='ignore')
    
    # Hash using bcrypt directly
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    Uses the same truncation logic as hash_password for consistency.
    """
    # Apply same truncation as hash_password
    safe_password = _truncate_to_72_bytes(plain_password)
    password_bytes = safe_password.encode('utf-8')
    
    # Ensure we're exactly at or under 72 bytes
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    
    # Verify using bcrypt directly
    try:
        return bcrypt.checkpw(password_bytes, hashed_password.encode('utf-8'))
    except Exception:
        return False


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create JWT access token
    
    Args:
        data: Data to encode in token (typically user_id, email, is_admin)
        expires_delta: Optional expiration time delta
    
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return encoded_jwt


def create_refresh_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create JWT refresh token
    
    Args:
        data: Data to encode in token
        expires_delta: Optional expiration time delta
    
    Returns:
        Encoded JWT refresh token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode.update({"exp": expire, "type": "refresh"})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return encoded_jwt


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode and verify JWT token
    
    Args:
        token: JWT token string
    
    Returns:
        Decoded token payload
    
    Raises:
        HTTPException: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def verify_token_type(payload: Dict[str, Any], expected_type: str) -> None:
    """
    Verify token type matches expected
    
    Args:
        payload: Decoded token payload
        expected_type: Expected token type ('access' or 'refresh')
    
    Raises:
        HTTPException: If token type doesn't match
    """
    token_type = payload.get("type")
    if token_type != expected_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token type. Expected {expected_type}, got {token_type}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def verify_token(token: str, token_type: str = "access") -> Dict[str, Any]:
    """
    Verify and decode JWT token with type checking
    
    Args:
        token: JWT token string
        token_type: Expected token type ('access' or 'refresh')
    
    Returns:
        Decoded token payload
    
    Raises:
        HTTPException: If token is invalid, expired, or wrong type
    """
    payload = decode_token(token)
    verify_token_type(payload, token_type)
    return payload


# Import dependencies here to avoid circular imports
from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(None)  # Will be properly injected
) -> "User":
    """
    Get current authenticated user from JWT token
    This is a placeholder - actual implementation is in dependencies.py
    """
    # This will be imported from dependencies to avoid circular imports
    pass
