from redis import asyncio as aioredis

from app.core.config import settings
from app.utils.redis_client import RedisClient


async def get_redis_client() -> RedisClient:
    redis = aioredis.from_url(
        settings.REDIS_URL,
    )
    try:
        yield RedisClient(redis)
    finally:
        await redis.close()
