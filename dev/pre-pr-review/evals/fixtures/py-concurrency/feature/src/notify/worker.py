import logging
import queue
import threading

from notify.jobs import Job
from notify.ratelimit import TokenBucketLimiter
from notify.sender import Sender

log = logging.getLogger(__name__)

_STOP = object()


class WorkerPool:
    def __init__(self, sender: Sender, limiter: TokenBucketLimiter, workers: int = 4) -> None:
        if workers < 1:
            raise ValueError("workers must be at least 1")
        self._sender = sender
        self._limiter = limiter
        self._queue: queue.Queue = queue.Queue()
        self._throttled: queue.Queue = queue.Queue()
        self._threads = [
            threading.Thread(target=self._run, name=f"notify-{i}", daemon=True)
            for i in range(workers)
        ]

    def start(self) -> None:
        for thread in self._threads:
            thread.start()

    def submit(self, job: Job) -> None:
        self._queue.put(job)

    def requeue_throttled(self) -> int:
        """Move jobs held back by the rate limiter onto the work queue. Returns how many moved."""
        moved = 0
        while True:
            try:
                job = self._throttled.get_nowait()
            except queue.Empty:
                return moved
            self._queue.put(job)
            moved += 1

    def stop(self) -> None:
        for _ in self._threads:
            self._queue.put(_STOP)
        for thread in self._threads:
            thread.join()

    def _run(self) -> None:
        while True:
            item = self._queue.get()
            try:
                if item is _STOP:
                    return
                self._handle(item)
            finally:
                self._queue.task_done()

    def _handle(self, job: Job) -> None:
        if not self._limiter.try_acquire(job.tenant_id):
            log.info("tenant %s is over its send rate; holding job", job.tenant_id)
            self._throttled.put(job)
            return
        self._deliver(job)

    def _deliver(self, job: Job) -> None:
        try:
            self._sender.send(job)
        except Exception:
            log.exception("delivery failed for tenant %s", job.tenant_id)
