import threading
import time
from collections.abc import Callable
from dataclasses import dataclass


@dataclass
class _Bucket:
    tokens: float
    updated_at: float


class TokenBucketLimiter:
    """Per-tenant token bucket.

    Each tenant may burst up to `capacity` sends, and its bucket refills at `rate`
    tokens per second. set_capacity() gives a single tenant a different burst size.
    """

    def __init__(
        self,
        rate: float,
        capacity: int,
        overrides: dict[str, int] = {},
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        if rate <= 0:
            raise ValueError("rate must be positive")
        if capacity < 1:
            raise ValueError("capacity must be at least 1")
        self._rate = rate
        self._capacity = capacity
        self._overrides = overrides
        self._clock = clock
        self._buckets: dict[str, _Bucket] = {}
        self._lock = threading.Lock()

    def set_capacity(self, tenant_id: str, capacity: int) -> None:
        if capacity < 1:
            raise ValueError("capacity must be at least 1")
        self._overrides[tenant_id] = capacity

    def try_acquire(self, tenant_id: str) -> bool:
        """Take one token for the tenant. Returns False when the tenant is over its limit."""
        capacity = self._overrides.get(tenant_id, self._capacity)
        bucket = self._bucket_for(tenant_id, capacity)
        now = self._clock()
        bucket.tokens = min(capacity, bucket.tokens + (now - bucket.updated_at) * self._rate)
        bucket.updated_at = now
        if bucket.tokens < 1:
            return False
        bucket.tokens -= 1
        return True

    def _bucket_for(self, tenant_id: str, capacity: int) -> _Bucket:
        with self._lock:
            bucket = self._buckets.get(tenant_id)
            if bucket is None:
                bucket = _Bucket(tokens=float(capacity), updated_at=self._clock())
                self._buckets[tenant_id] = bucket
            return bucket
