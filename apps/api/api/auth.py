"""
Authentication API Routes
JWT-based authentication with 2FA support
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime, timedelta
import logging

from core.database import get_session
from core.security import (
    hash_password, 
    verify_password, 
    create_access_token, 
    create_refresh_token,
    verify_token
)
from core.dependencies import get_current_user
from models.user import User, KYCStatus
from models.audit import Audit, AuditAction

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()


# Pydantic models for request/response
from pydantic import BaseModel, EmailStr


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    display_name: Optional[str] = None
    region: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserResponse(BaseModel):
    id: int
    email: str
    display_name: Optional[str]
    kyc_status: KYCStatus
    can_access_trading: bool
    is_admin: bool
    created_at: datetime
    last_login: Optional[datetime]


class RefreshTokenRequest(BaseModel):
    refresh_token: str


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    request: SignupRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    User registration endpoint
    Creates new user account with auto-approved KYC (admin reviews later)
    """
    logger.info(f"Signup attempt for email: {request.email}")
    
    # Check if user already exists
    result = await session.execute(
        select(User).where(User.email == request.email)
    )
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_pwd = hash_password(request.password)
    
    new_user = User(
        email=request.email,
        hashed_password=hashed_pwd,
        display_name=request.display_name,
        region=request.region,
        kyc_status=KYCStatus.PENDING,  # Will be auto-approved on KYC submission
        can_access_trading=False,  # Set to True after first deposit
        created_at=datetime.utcnow()
    )
    
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    
    # Create audit log
    audit = Audit(
        actor_user_id=new_user.id,
        action=AuditAction.USER_CREATED,
        object_type="user",
        object_id=new_user.id,
        reason="User registration"
    )
    session.add(audit)
    await session.commit()
    
    # Generate tokens
    access_token = create_access_token({"sub": str(new_user.id)})
    refresh_token = create_refresh_token({"sub": str(new_user.id)})
    
    logger.info(f"User created successfully: {new_user.id}")
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=30 * 60  # 30 minutes
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    User login endpoint
    Authenticates user and returns JWT tokens
    """
    logger.info(f"Login attempt for email: {request.email}")
    
    # Find user by email
    result = await session.execute(
        select(User).where(User.email == request.email)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    if user.is_banned:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is banned"
        )
    
    # Update last login
    user.last_login = datetime.utcnow()
    session.add(user)
    await session.commit()
    
    # Create audit log
    audit = Audit(
        actor_user_id=user.id,
        action=AuditAction.USER_LOGIN,
        object_type="user",
        object_id=user.id,
        reason="User login"
    )
    session.add(audit)
    await session.commit()
    
    # Generate tokens
    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    logger.info(f"User logged in successfully: {user.id}")
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=30 * 60  # 30 minutes
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    session: AsyncSession = Depends(get_session)
):
    """
    Refresh access token using refresh token
    """
    try:
        payload = verify_token(request.refresh_token, token_type="refresh")
        user_id = int(payload.get("sub"))
        
        # Verify user still exists and is active
        user = await session.get(User, user_id)
        if not user or not user.is_active or user.is_banned:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Generate new tokens
        access_token = create_access_token({"sub": str(user.id)})
        new_refresh_token = create_refresh_token({"sub": str(user.id)})
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            expires_in=30 * 60  # 30 minutes
        )
        
    except Exception as e:
        logger.error(f"Token refresh failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user information
    Returns user profile and access status
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        display_name=current_user.display_name,
        kyc_status=current_user.kyc_status,
        can_access_trading=current_user.can_access_trading,
        is_admin=current_user.is_admin,
        created_at=current_user.created_at,
        last_login=current_user.last_login
    )


@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """
    User logout endpoint
    Creates audit log for logout event
    """
    # Create audit log
    audit = Audit(
        actor_user_id=current_user.id,
        action=AuditAction.USER_LOGOUT,
        object_type="user",
        object_id=current_user.id,
        reason="User logout"
    )
    session.add(audit)
    await session.commit()
    
    logger.info(f"User logged out: {current_user.id}")
    
    return {"message": "Logged out successfully"}


# 2FA endpoints (placeholder for future implementation)
@router.post("/2fa/setup")
async def setup_2fa(
    current_user: User = Depends(get_current_user)
):
    """
    Setup 2FA for user account
    TODO: Implement TOTP-based 2FA
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="2FA setup not yet implemented"
    )


@router.post("/2fa/verify")
async def verify_2fa(
    current_user: User = Depends(get_current_user)
):
    """
    Verify 2FA code
    TODO: Implement TOTP verification
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="2FA verification not yet implemented"
    )
