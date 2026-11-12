from dataclasses import dataclass
from datetime import datetime, timedelta


@dataclass(frozen=True)
class Job:
    name: str
    interval: timedelta

    def next_run(self, last_run: datetime) -> datetime:
        """Return when the job should run next, given when it last ran."""
        return last_run + self.interval
