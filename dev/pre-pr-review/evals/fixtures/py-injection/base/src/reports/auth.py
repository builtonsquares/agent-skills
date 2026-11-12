import hmac
from collections.abc import Callable
from functools import wraps
from typing import Any

from flask import abort, current_app, request


def require_api_key(view: Callable[..., Any]) -> Callable[..., Any]:
    @wraps(view)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        supplied = request.headers.get("X-Api-Key", "").encode()
        expected = current_app.config["API_KEY"].encode()
        if not hmac.compare_digest(supplied, expected):
            abort(401)
        return view(*args, **kwargs)

    return wrapper
