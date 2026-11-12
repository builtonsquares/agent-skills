from typing import Protocol

from notify.jobs import Job


class Sender(Protocol):
    def send(self, job: Job) -> None:
        """Deliver one notification. Raises on delivery failure."""
        ...
