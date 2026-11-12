from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Self

from scheduler.duration import parse_duration


@dataclass(frozen=True)
class Job:
    name: str
    interval: timedelta

    @classmethod
    def from_config(cls, name: str, every: str) -> Self:
        """Build a job from config values, e.g. Job.from_config("backup", "6h").

        Raises ValueError if `every` is not a valid duration (see parse_duration).
        """
        return cls(name=name, interval=parse_duration(every))

    def next_run(self, last_run: datetime) -> datetime:
        """Return when the job should run next, given when it last ran."""
        return last_run + self.interval
