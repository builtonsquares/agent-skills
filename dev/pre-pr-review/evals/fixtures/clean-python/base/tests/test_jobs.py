from datetime import datetime, timedelta

from scheduler.jobs import Job


def test_next_run_adds_interval_to_last_run():
    job = Job(name="backup", interval=timedelta(hours=6))

    assert job.next_run(datetime(2026, 1, 1, 22, 0)) == datetime(2026, 1, 2, 4, 0)
