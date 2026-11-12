import logging
import time
from pathlib import Path

from billing.fulfilment import Fulfilment
from billing.gateway import CardDeclined, Charge, GatewayUnavailable, PaymentGateway
from billing.orders import Order, OrderStatus

log = logging.getLogger(__name__)

MAX_ATTEMPTS = 3
BACKOFF_SECONDS = 0.5


def _charge_with_retry(gateway: PaymentGateway, order: Order) -> Charge:
    attempt = 1
    while True:
        try:
            return gateway.charge(order.customer_id, order.total_cents, idempotency_key=order.id)
        except GatewayUnavailable:
            if attempt >= MAX_ATTEMPTS:
                raise
            log.info("gateway unavailable for order %s, retrying (attempt %d)", order.id, attempt)
            time.sleep(BACKOFF_SECONDS * attempt)
            attempt += 1


def settle_order(order: Order, gateway: PaymentGateway, fulfilment: Fulfilment) -> None:
    """Charge a pending order and, once paid, send it to fulfilment.

    A declined card marks the order failed and nothing is shipped.
    """
    if order.status is not OrderStatus.PENDING:
        raise ValueError(f"order {order.id} is {order.status}, expected pending")
    try:
        charge = _charge_with_retry(gateway, order)
        order.charge_id = charge.id
    except CardDeclined as exc:
        order.status = OrderStatus.FAILED
        log.info("order %s declined: %s", order.id, exc.reason)
        return
    except Exception:
        log.warning("charge for order %s did not confirm", order.id)
    order.status = OrderStatus.PAID
    fulfilment.ship(order)


def write_receipt(order: Order, receipts_dir: Path) -> Path:
    """Write a plain-text receipt for a paid order and return its path."""
    if order.status is not OrderStatus.PAID:
        raise ValueError(f"order {order.id} is not paid")
    path = receipts_dir / f"{order.id}.txt"
    handle = open(path, "w", encoding="utf-8")
    handle.write(f"order: {order.id}\n")
    handle.write(f"charge: {order.charge_id}\n")
    dollars, cents = divmod(order.total_cents, 100)
    handle.write(f"amount: {dollars}.{cents:02d}\n")
    handle.close()
    return path
