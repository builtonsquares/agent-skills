"""Parse compact duration strings such as "1h30m" into timedeltas."""

import re
from datetime import timedelta

_DURATION = re.compile(
    r"(?:(?P<days>\d+)d)?(?:(?P<hours>\d+)h)?(?:(?P<minutes>\d+)m)?(?:(?P<seconds>\d+)s)?",
    re.ASCII,
)


def parse_duration(text: str) -> timedelta:
    """Parse a duration such as "2d", "1h30m" or "90s".

    The text is one or more <integer><unit> parts with no spaces between them. Units are
    d, h, m and s; each may appear at most once, largest unit first.

    Raises ValueError if the text does not have that form, if the duration is zero, or if
    it is too large for a timedelta.
    """
    match = _DURATION.fullmatch(text)
    if match is None or not any(match.groupdict().values()):
        raise ValueError(f"invalid duration {text!r}; expected a value like '1h30m'")

    amounts = {unit: int(value) for unit, value in match.groupdict().items() if value is not None}
    try:
        duration = timedelta(**amounts)
    except OverflowError:
        raise ValueError(f"duration {text!r} is too large") from None

    if duration == timedelta(0):
        raise ValueError(f"duration {text!r} must be greater than zero")
    return duration
