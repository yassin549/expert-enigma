"""
Database Configuration and Session Management
SQLModel with async PostgreSQL support
"""

from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from typing import AsyncGenerator
import logging

from core.config import settings

logger = logging.getLogger(__name__)

# Convert postgresql:// to postgresql+asyncpg:// for async support
async_database_url = settings.DATABASE_URL.replace(
    "postgresql://", "postgresql+asyncpg://"
)

# Create async engine
async_engine = create_async_engine(
    async_database_url,
    echo=settings.DB_ECHO,
    future=True,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Create sync engine (for Alembic migrations)
sync_engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DB_ECHO,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Async session factory
async_session_maker = sessionmaker(
    async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def init_db() -> None:
    """Initialize database - create tables if they don't exist"""
    try:
        # Import all models to ensure they're registered with SQLModel metadata
        from models import (
            User, Account, AdminAdjustment, Wallet, Deposit, Withdrawal,
            Order, Position, Instrument, Candle, AIInvestmentPlan, UserInvestment,
            LedgerEntry, AMLAlert, Audit, SupportTicket
        )
        
        async with async_engine.begin() as conn:
            # Create all tables if they don't exist
            # This works in both development and production as a fallback
            # If tables already exist, SQLAlchemy will skip them
            def create_tables(sync_conn):
                SQLModel.metadata.create_all(bind=sync_conn, checkfirst=True)
            
            await conn.run_sync(create_tables)
            logger.info("✅ Database tables initialized successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {str(e)}")
        raise


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for getting async database session
    
    Usage:
        @app.get("/")
        async def route(session: AsyncSession = Depends(get_session)):
            # Use session here
            pass
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


def get_sync_session() -> Session:
    """Get synchronous session (for scripts and migrations)"""
    return Session(sync_engine)
