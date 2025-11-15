"""
Security utilities for authentication and authorization
JWT tokens, password hashing, access control
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import HTTPException, status
import hashlib
import base64

from core.config import settings

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _prehash_password(password: str) -> str:
    """
    Pre-hash password with SHA-256 to handle bcrypt's 72-byte limit.
    Returns base64-encoded string (44 bytes) which is well under bcrypt's 72-byte limit.
    This allows passwords of any length while maintaining security.
    """
    # Hash with SHA-256 to get 32 bytes
    digest = hashlib.sha256(password.encode('utf-8')).digest()
    # Encode as base64 to get 44 characters (44 bytes), well under 72-byte limit
    return base64.b64encode(digest).decode('ascii')


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    Passwords are pre-hashed with SHA-256 to handle bcrypt's 72-byte limit.
    This ensures passwords of any length can be securely hashed.
    """
    # Pre-hash with SHA-256 and encode as base64 (44 bytes, well under 72-byte limit)
    prehashed_str = _prehash_password(password)
    
    # Safety check: ensure we never exceed 72 bytes
    # (base64 of SHA-256 is always 44 bytes, but this is defensive)
    prehashed_bytes = prehashed_str.encode('utf-8')
    if len(prehashed_bytes) > 72:
        # Truncate to 72 bytes if somehow longer (should never happen)
        prehashed_str = prehashed_bytes[:72].decode('utf-8', errors='ignore')
    
    return pwd_context.hash(prehashed_str)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    Supports both old format (direct bcrypt) and new format (pre-hashed with SHA-256).
    """
    # Try new format first (pre-hashed with SHA-256, base64 encoded)
    prehashed_str = _prehash_password(plain_password)
    
    # Safety check: ensure we never exceed 72 bytes (matches hash_password)
    prehashed_bytes = prehashed_str.encode('utf-8')
    if len(prehashed_bytes) > 72:
        prehashed_str = prehashed_bytes[:72].decode('utf-8', errors='ignore')
    
    if pwd_context.verify(prehashed_str, hashed_password):
        return True
    
    # Fallback to old format for backward compatibility (direct bcrypt)
    # This handles passwords that were hashed before the pre-hash change
    try:
        return pwd_context.verify(plain_password, hashed_password)
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
