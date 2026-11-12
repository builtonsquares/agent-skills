from datetime import datetime, timedelta

import pytest

from scheduler.jobs import Job


def test_next_run_adds_interval_to_last_run():
    job = Job(name="backup", interval=timedelta(hours=6))

    assert job.next_run(datetime(2026, 1, 1, 22, 0)) == datetime(2026, 1, 2, 4, 0)


def test_from_config_parses_the_interval():
    job = Job.from_config("backup", "1h30m")

    assert job == Job(name="backup", interval=timedelta(hours=1, minutes=30))


def test_from_config_rejects_an_invalid_interval():
    with pytest.raises(ValueError, match="invalid duration"):
        Job.from_config("backup", "often")
