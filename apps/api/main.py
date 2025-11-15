"""
Topcoin Platform - FastAPI Backend
Production-grade API for simulated trading platform with admin-managed returns
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import logging
import time
from typing import AsyncIterator

from core.config import settings
from core.database import init_db
from core.redis import init_redis, close_redis

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.ENVIRONMENT == "development" else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Lifespan context manager for startup and shutdown events"""
    logger.info("🚀 Starting Topcoin API...")
    
    # Startup
    await init_db()
    await init_redis()
    logger.info("✅ Database and Redis initialized")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down Topcoin API...")
    await close_redis()
    logger.info("✅ Shutdown complete")


# Initialize FastAPI application
app = FastAPI(
    title="Topcoin API",
    description="Production-grade API for simulated trading platform with CMF/MSB compliance",
    version="1.0.0",
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip Compression
app.add_middleware(GZipMiddleware, minimum_size=1000)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add processing time header to all responses"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": exc.errors(),
            "message": "Validation error"
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "message": str(exc) if settings.ENVIRONMENT == "development" else "An error occurred"
        }
    )


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0"
    }


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "Topcoin API",
        "description": "Production-grade simulated trading platform",
        "regulatory": {
            "cmf_licensed": True,
            "msb_registered": True
        },
        "docs": "/docs" if settings.ENVIRONMENT != "production" else None,
        "health": "/health"
    }


# Import and include routers
from api.auth import router as auth_router
from api.accounts import router as accounts_router
from api.trading import router as trading_router
from api.market import router as market_router
from api.admin import router as admin_router
from api.websocket import router as websocket_router
from api.investments import router as investments_router
from api.payments import router as payments_router
from api.payouts import router as payouts_router

app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(accounts_router, prefix="/api/accounts", tags=["Accounts"])
app.include_router(trading_router, prefix="/api/trading", tags=["Trading"])
app.include_router(market_router, prefix="/api/market", tags=["Market Data"])
app.include_router(admin_router, prefix="/api/admin", tags=["Admin"])
app.include_router(investments_router, prefix="/api/investments", tags=["AI Investments"])
app.include_router(websocket_router, prefix="/ws", tags=["WebSocket"])
app.include_router(payments_router, prefix="/api/payments", tags=["Payments"])
app.include_router(payouts_router, prefix="/api/payouts", tags=["Payouts"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.ENVIRONMENT == "development",
        log_level="debug" if settings.ENVIRONMENT == "development" else "info"
    )
