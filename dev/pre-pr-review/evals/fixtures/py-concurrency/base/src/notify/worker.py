import logging
import queue
import threading

from notify.jobs import Job
from notify.sender import Sender

log = logging.getLogger(__name__)

_STOP = object()


class WorkerPool:
    def __init__(self, sender: Sender, workers: int = 4) -> None:
        if workers < 1:
            raise ValueError("workers must be at least 1")
        self._sender = sender
        self._queue: queue.Queue = queue.Queue()
        self._threads = [
            threading.Thread(target=self._run, name=f"notify-{i}", daemon=True)
            for i in range(workers)
        ]

    def start(self) -> None:
        for thread in self._threads:
            thread.start()

    def submit(self, job: Job) -> None:
        self._queue.put(job)

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
                self._deliver(item)
            finally:
                self._queue.task_done()

    def _deliver(self, job: Job) -> None:
        try:
            self._sender.send(job)
        except Exception:
            log.exception("delivery failed for tenant %s", job.tenant_id)
