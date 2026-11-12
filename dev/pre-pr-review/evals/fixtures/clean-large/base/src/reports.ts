import { lineTotalCents } from "./services/orders";
import type { OrderRecord } from "./types";

/** Revenue in cents from paid orders, keyed by sku. Pending and cancelled orders are ignored. */
export function paidRevenueBySku(orders: OrderRecord[]): Map<string, number> {
  const revenue = new Map<string, number>();
  for (const order of orders) {
    if (order.status !== "paid") {
      continue;
    }
    for (const item of order.items) {
      revenue.set(item.sku, (revenue.get(item.sku) ?? 0) + lineTotalCents(item));
    }
  }
  return revenue;
}
