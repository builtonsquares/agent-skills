from dataclasses import dataclass
from typing import Protocol


class GatewayError(Exception):
    """Base class for errors returned by the payment gateway."""


class CardDeclined(GatewayError):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class GatewayUnavailable(GatewayError):
    """The gateway could not be reached or did not answer in time."""


@dataclass(frozen=True)
class Charge:
    id: str
    amount_cents: int


class PaymentGateway(Protocol):
    def charge(self, customer_id: str, amount_cents: int, idempotency_key: str) -> Charge:
        """Charge the customer's default card. Raises a GatewayError subclass on failure."""
        ...
