import { Item } from "./inventory";

export function subtotalCents(items: Item[]): number {
  return items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
}
