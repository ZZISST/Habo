import json
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)


class RedisManager:
    """Менеджер для работы с Redis"""

    def __init__(self, redis_url: str = "redis://localhost:6379", db: int = 0):
        self.redis_url = redis_url
        self.db = db
        self.redis: Optional[aioredis.Redis] = None

    async def connect(self) -> aioredis.Redis:
        """Подключение к Redis"""
        if not self.redis:
            self.redis = await aioredis.from_url(
                self.redis_url, db=self.db, encoding="utf-8", decode_responses=True
            )
        return self.redis

    async def disconnect(self):
        """Отключение от Redis"""
        if self.redis:
            await self.redis.close()
            self.redis = None

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Установить значение в Redis"""
        try:
            redis = await self.connect()
            json_value = json.dumps(value, default=str)
            if ttl:
                return await redis.setex(key, ttl, json_value)
            else:
                return await redis.set(key, json_value)
        except Exception as e:
            logger.error(f"Ошибка установки значения в Redis: {e}")
            return False

    async def get(self, key: str) -> Optional[Any]:
        """Получить значение из Redis"""
        try:
            redis = await self.connect()
            value = await redis.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            logger.error(f"Ошибка получения значения из Redis: {e}")
            return None

    async def delete(self, key: str) -> bool:
        """Удалить ключ из Redis"""
        try:
            redis = await self.connect()
            return bool(await redis.delete(key))
        except Exception as e:
            logger.error(f"Ошибка удаления ключа из Redis: {e}")
            return False

    async def exists(self, key: str) -> bool:
        """Проверить существование ключа"""
        try:
            redis = await self.connect()
            return bool(await redis.exists(key))
        except Exception as e:
            logger.error(f"Ошибка проверки существования ключа: {e}")
            return False

    async def expire(self, key: str, ttl: int) -> bool:
        """Установить TTL для ключа"""
        try:
            redis = await self.connect()
            return await redis.expire(key, ttl)
        except Exception as e:
            logger.error(f"Ошибка установки TTL: {e}")
            return False

    async def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """Увеличить числовое значение"""
        try:
            redis = await self.connect()
            return await redis.incr(key, amount)
        except Exception as e:
            logger.error(f"Ошибка увеличения значения: {e}")
            return None

    async def get_keys(self, pattern: str) -> List[str]:
        """Получить ключи по паттерну"""
        try:
            redis = await self.connect()
            return await redis.keys(pattern)
        except Exception as e:
            logger.error(f"Ошибка получения ключей: {e}")
            return []

    async def flush_db(self) -> bool:
        """Очистить базу данных"""
        try:
            redis = await self.connect()
            await redis.flushdb()
            return True
        except Exception as e:
            logger.error(f"Ошибка очистки базы данных: {e}")
            return False


class CacheManager:
    """Менеджер кэширования для финансовых данных"""

    def __init__(self, redis_manager: RedisManager):
        self.redis = redis_manager

    def _make_key(self, prefix: str, user_id: int, *args) -> str:
        """Создать ключ для кэша"""
        key_parts = [prefix, str(user_id)] + [str(arg) for arg in args]
        return ":".join(key_parts)

    async def cache_user_summary(
        self, user_id: int, summary_data: Dict[str, Any], ttl: int = 300
    ) -> bool:
        """Кэшировать сводку пользователя"""
        key = self._make_key("user_summary", user_id)
        return await self.redis.set(key, summary_data, ttl)

    async def get_user_summary(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Получить кэшированную сводку пользователя"""
        key = self._make_key("user_summary", user_id)
        return await self.redis.get(key)

    async def cache_analysis_result(
        self, analysis_id: int, result_data: Dict[str, Any], ttl: int = 3600
    ) -> bool:
        """Кэшировать результат анализа"""
        key = self._make_key("analysis", analysis_id)
        return await self.redis.set(key, result_data, ttl)

    async def get_analysis_result(self, analysis_id: int) -> Optional[Dict[str, Any]]:
        """Получить кэшированный результат анализа"""
        key = self._make_key("analysis", analysis_id)
        return await self.redis.get(key)

    async def cache_transaction_stats(
        self, user_id: int, period: str, stats_data: Dict[str, Any], ttl: int = 1800
    ) -> bool:
        """Кэшировать статистику транзакций"""
        key = self._make_key("transaction_stats", user_id, period)
        return await self.redis.set(key, stats_data, ttl)

    async def get_transaction_stats(
        self, user_id: int, period: str
    ) -> Optional[Dict[str, Any]]:
        """Получить кэшированную статистику транзакций"""
        key = self._make_key("transaction_stats", user_id, period)
        return await self.redis.get(key)

    async def cache_ai_analysis(
        self, user_id: int, analysis_type: str, result: Any, ttl: int = 7200
    ) -> bool:
        """Кэшировать результат AI анализа"""
        key = self._make_key("ai_analysis", user_id, analysis_type)
        cache_data = {"result": result, "timestamp": datetime.utcnow().isoformat()}
        return await self.redis.set(key, cache_data, ttl)

    async def get_ai_analysis(
        self, user_id: int, analysis_type: str
    ) -> Optional[Dict[str, Any]]:
        """Получить кэшированный AI анализ"""
        key = self._make_key("ai_analysis", user_id, analysis_type)
        return await self.redis.get(key)

    async def invalidate_user_cache(self, user_id: int) -> bool:
        """Инвалидировать весь кэш пользователя"""
        patterns = [
            f"user_summary:{user_id}",
            f"transaction_stats:{user_id}:*",
            f"ai_analysis:{user_id}:*",
        ]

        deleted_count = 0
        for pattern in patterns:
            keys = await self.redis.get_keys(pattern)
            for key in keys:
                if await self.redis.delete(key):
                    deleted_count += 1

        logger.info(
            f"Инвалидировано {deleted_count} ключей кэша для пользователя {user_id}"
        )
        return deleted_count > 0

    async def cache_kakeibo_notebook(
        self,
        user_id: int,
        notebook_type: str,
        period: str,
        notebook_data: Dict[str, Any],
        ttl: int = 900,
    ) -> bool:
        """Кэшировать данные блокнота Кэкэйбо"""
        key = self._make_key("kakeibo_notebook", user_id, notebook_type, period)
        return await self.redis.set(key, notebook_data, ttl)

    async def get_kakeibo_notebook(
        self, user_id: int, notebook_type: str, period: str
    ) -> Optional[Dict[str, Any]]:
        """Получить кэшированные данные блокнота Кэкэйбо"""
        key = self._make_key("kakeibo_notebook", user_id, notebook_type, period)
        return await self.redis.get(key)


# Глобальный экземпляр Redis менеджера
redis_manager: Optional[RedisManager] = None
cache_manager: Optional[CacheManager] = None


async def init_redis(redis_url: str = "redis://localhost:6379", db: int = 0):
    """Инициализировать Redis"""
    global redis_manager, cache_manager

    redis_manager = RedisManager(redis_url, db)
    await redis_manager.connect()
    cache_manager = CacheManager(redis_manager)

    logger.info("Redis успешно инициализирован")


async def close_redis():
    """Закрыть соединение с Redis"""
    global redis_manager, cache_manager

    if redis_manager:
        await redis_manager.disconnect()
        redis_manager = None
        cache_manager = None

    logger.info("Соединение с Redis закрыто")


def get_cache() -> Optional[CacheManager]:
    """Получить менеджер кэша"""
    return cache_manager


def get_redis() -> Optional[RedisManager]:
    """Получить Redis менеджер"""
    return redis_manager
