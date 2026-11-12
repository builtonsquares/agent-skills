from typing import Protocol

from billing.orders import Order


class Fulfilment(Protocol):
    def ship(self, order: Order) -> None:
        """Hand a paid order to the warehouse for picking and shipping."""
        ...
