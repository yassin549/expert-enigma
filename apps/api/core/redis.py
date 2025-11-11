"""
Redis Connection and Cache Management
"""

import redis.asyncio as aioredis
from redis.asyncio import Redis
from typing import Optional
import logging
import json
from datetime import timedelta

from core.config import settings

logger = logging.getLogger(__name__)

# Global Redis client
redis_client: Optional[Redis] = None


async def init_redis() -> None:
    """Initialize Redis connection"""
    global redis_client
    try:
        redis_client = await aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=50,
        )
        await redis_client.ping()
        logger.info("✅ Redis connection established")
    except Exception as e:
        logger.error(f"❌ Redis connection failed: {str(e)}")
        raise


async def close_redis() -> None:
    """Close Redis connection"""
    global redis_client
    if redis_client:
        await redis_client.close()
        logger.info("✅ Redis connection closed")


def get_redis() -> Redis:
    """Get Redis client instance"""
    if not redis_client:
        raise RuntimeError("Redis client not initialized")
    return redis_client


class Cache:
    """Redis cache utility class"""
    
    @staticmethod
    async def get(key: str) -> Optional[str]:
        """Get value from cache"""
        client = get_redis()
        return await client.get(key)
    
    @staticmethod
    async def get_json(key: str) -> Optional[dict]:
        """Get JSON value from cache"""
        value = await Cache.get(key)
        if value:
            return json.loads(value)
        return None
    
    @staticmethod
    async def set(key: str, value: str, expire: Optional[int] = None) -> bool:
        """Set value in cache with optional expiration (seconds)"""
        client = get_redis()
        if expire:
            return await client.setex(key, expire, value)
        return await client.set(key, value)
    
    @staticmethod
    async def set_json(key: str, value: dict, expire: Optional[int] = None) -> bool:
        """Set JSON value in cache"""
        return await Cache.set(key, json.dumps(value), expire)
    
    @staticmethod
    async def delete(key: str) -> int:
        """Delete key from cache"""
        client = get_redis()
        return await client.delete(key)
    
    @staticmethod
    async def exists(key: str) -> bool:
        """Check if key exists in cache"""
        client = get_redis()
        return await client.exists(key) > 0
    
    @staticmethod
    async def increment(key: str, amount: int = 1) -> int:
        """Increment value in cache"""
        client = get_redis()
        return await client.incrby(key, amount)
    
    @staticmethod
    async def expire(key: str, seconds: int) -> bool:
        """Set expiration on existing key"""
        client = get_redis()
        return await client.expire(key, seconds)
    
    @staticmethod
    async def get_ttl(key: str) -> int:
        """Get time to live for key"""
        client = get_redis()
        return await client.ttl(key)


class RateLimiter:
    """Redis-based rate limiter"""
    
    @staticmethod
    async def is_allowed(
        identifier: str,
        max_requests: int,
        window_seconds: int,
        action: str = "default"
    ) -> bool:
        """
        Check if action is allowed within rate limit
        
        Args:
            identifier: User ID, IP address, or other identifier
            max_requests: Maximum number of requests allowed
            window_seconds: Time window in seconds
            action: Action name (for different limits per action)
        
        Returns:
            True if allowed, False if rate limit exceeded
        """
        key = f"ratelimit:{action}:{identifier}"
        client = get_redis()
        
        current = await client.incr(key)
        
        if current == 1:
            await client.expire(key, window_seconds)
        
        return current <= max_requests
    
    @staticmethod
    async def get_remaining(
        identifier: str,
        max_requests: int,
        action: str = "default"
    ) -> int:
        """Get remaining requests in current window"""
        key = f"ratelimit:{action}:{identifier}"
        current = await Cache.get(key)
        if not current:
            return max_requests
        return max(0, max_requests - int(current))
    
    @staticmethod
    async def reset(identifier: str, action: str = "default") -> None:
        """Reset rate limit for identifier"""
        key = f"ratelimit:{action}:{identifier}"
        await Cache.delete(key)
