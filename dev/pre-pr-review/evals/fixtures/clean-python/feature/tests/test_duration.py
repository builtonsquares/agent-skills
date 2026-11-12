from datetime import timedelta

import pytest

from scheduler.duration import parse_duration


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("45s", timedelta(seconds=45)),
        ("15m", timedelta(minutes=15)),
        ("6h", timedelta(hours=6)),
        ("2d", timedelta(days=2)),
        ("1h30m", timedelta(hours=1, minutes=30)),
        ("1d2h3m4s", timedelta(days=1, hours=2, minutes=3, seconds=4)),
        ("90s", timedelta(minutes=1, seconds=30)),
        ("0h5m", timedelta(minutes=5)),
        ("007m", timedelta(minutes=7)),
    ],
)
def test_parses_valid_durations(text, expected):
    assert parse_duration(text) == expected


@pytest.mark.parametrize(
    "text",
    [
        "",
        "5",
        "h",
        "5x",
        "1h 30m",
        " 5m",
        "5m ",
        "30m1h",
        "1h1h",
        "1.5h",
        "-5m",
        "5M",
        "\N{ARABIC-INDIC DIGIT FIVE}m",
    ],
)
def test_rejects_malformed_durations(text):
    with pytest.raises(ValueError, match="invalid duration"):
        parse_duration(text)


@pytest.mark.parametrize("text", ["0s", "0d0h0m0s"])
def test_rejects_zero_durations(text):
    with pytest.raises(ValueError, match="must be greater than zero"):
        parse_duration(text)


def test_rejects_durations_too_large_for_timedelta():
    with pytest.raises(ValueError, match="too large"):
        parse_duration("1000000000d")
