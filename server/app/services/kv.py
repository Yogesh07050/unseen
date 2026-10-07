"""KV store: Redis when REDIS_URL is set, else an in-memory store (dev, one process)."""
from __future__ import annotations

import json
import time
from typing import Protocol


class KV(Protocol):
    async def incr(self, key: str, ttl: int) -> int: ...
    async def get_json(self, key: str) -> dict | None: ...
    async def set_json(self, key: str, value: dict, ttl: int) -> None: ...
    async def close(self) -> None: ...


class MemoryKV:
    def __init__(self) -> None:
        self._counts: dict[str, tuple[int, float]] = {}
        self._json: dict[str, tuple[dict, float]] = {}

    def _expired(self, exp: float) -> bool:
        return exp and time.time() > exp

    async def incr(self, key: str, ttl: int) -> int:
        n, exp = self._counts.get(key, (0, 0.0))
        if self._expired(exp):
            n = 0
        n += 1
        self._counts[key] = (n, time.time() + ttl)
        return n

    async def get_json(self, key: str) -> dict | None:
        item = self._json.get(key)
        if not item:
            return None
        value, exp = item
        if self._expired(exp):
            self._json.pop(key, None)
            return None
        return value

    async def set_json(self, key: str, value: dict, ttl: int) -> None:
        self._json[key] = (value, time.time() + ttl)

    async def close(self) -> None:
        self._counts.clear()
        self._json.clear()


class RedisKV:
    def __init__(self, client) -> None:
        self._r = client

    async def incr(self, key: str, ttl: int) -> int:
        n = await self._r.incr(key)
        if n == 1:
            await self._r.expire(key, ttl)
        return int(n)

    async def get_json(self, key: str) -> dict | None:
        raw = await self._r.get(key)
        return json.loads(raw) if raw else None

    async def set_json(self, key: str, value: dict, ttl: int) -> None:
        await self._r.set(key, json.dumps(value), ex=ttl)

    async def close(self) -> None:
        await self._r.aclose()


async def connect(redis_url: str | None) -> KV:
    if not redis_url:
        return MemoryKV()
    import redis.asyncio as redis  # type: ignore

    client = redis.from_url(redis_url, decode_responses=True)
    return RedisKV(client)
