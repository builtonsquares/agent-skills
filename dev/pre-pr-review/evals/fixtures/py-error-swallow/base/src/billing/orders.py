from dataclasses import dataclass
from enum import StrEnum


class OrderStatus(StrEnum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"


@dataclass
class Order:
    id: str
    customer_id: str
    total_cents: int
    status: OrderStatus = OrderStatus.PENDING
    charge_id: str | None = None
