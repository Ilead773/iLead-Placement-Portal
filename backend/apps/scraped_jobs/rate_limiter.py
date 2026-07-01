import time
import logging

logger = logging.getLogger(__name__)


class RedisRateLimiter:
    """
    Distributed Redis-backed token bucket rate limiter.
    Safe across multiple Celery workers — uses Redis atomic INCR + EXPIRE.
    Replaces process-local RateLimiter which breaks under multiple workers.

    Usage:
        limiter = RedisRateLimiter('jsearch', calls_per_minute=8)
        limiter.wait()  # blocks until a slot is available
    """

    def __init__(self, source_name: str, calls_per_minute: int):
        from django.core.cache import cache
        self.cache = cache
        self.source_name = source_name
        self.calls_per_minute = calls_per_minute
        self.window_seconds = 60
        self.min_delay = 60.0 / calls_per_minute

    def wait(self):
        """
        Acquires a rate limit slot. Blocks (sleeps) until a slot is available.
        Uses Redis key with 60s sliding window.
        """
        key = f"ratelimit:{self.source_name}:{int(time.time() // self.window_seconds)}"
        while True:
            # Ensure key is initialized to 0 atomically (does nothing if key already exists)
            self.cache.add(key, 0, timeout=self.window_seconds + 5)
            
            # Atomic increment
            new_val = self.cache.incr(key)
            if new_val <= self.calls_per_minute:
                time.sleep(self.min_delay)  # enforce minimum spacing too
                return
            else:
                # Limit exceeded, atomic decrement to free our attempt
                try:
                    self.cache.decr(key)
                except Exception:
                    pass
                logger.debug(
                    f"[RateLimiter:{self.source_name}] Window full. Waiting..."
                )
                time.sleep(2)
                # Recalculate key in case window rolled over
                key = f"ratelimit:{self.source_name}:{int(time.time() // self.window_seconds)}"


class LocalRateLimiter:
    """
    Fallback process-local rate limiter used only when Redis is unavailable.
    """

    def __init__(self, calls_per_minute: int):
        self.delay = 60.0 / calls_per_minute
        self.last_call = 0.0

    def wait(self):
        elapsed = time.time() - self.last_call
        if elapsed < self.delay:
            time.sleep(self.delay - elapsed)
        self.last_call = time.time()


def get_rate_limiter(source_name: str, calls_per_minute: int):
    """
    Returns a RedisRateLimiter if Redis is available, otherwise LocalRateLimiter.
    """
    try:
        from django.core.cache import cache
        cache.get('health_check')
        return RedisRateLimiter(source_name, calls_per_minute)
    except Exception:
        logger.warning(
            f"[RateLimiter] Redis unavailable, using local limiter for {source_name}"
        )
        return LocalRateLimiter(calls_per_minute)
