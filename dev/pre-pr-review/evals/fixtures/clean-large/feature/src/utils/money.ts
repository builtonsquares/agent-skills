import type { OrderItem } from "../types";

/** Price of one order line in cents: quantity times unit price. */
export function lineTotalCents(item: OrderItem): number {
  return item.quantity * item.unitPriceCents;
}

/** Sum of the line totals, in cents. An empty list totals 0. */
export function calculateTotalCents(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + lineTotalCents(item), 0);
}
