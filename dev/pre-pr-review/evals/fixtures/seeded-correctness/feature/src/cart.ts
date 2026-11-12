import { Item, reserve } from "./inventory";

export function subtotalCents(items: Item[]): number {
  return items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
}

/**
 * Applies a percentage discount to a total.
 * @param discountPct whole-number percentage from 0 to 100 (e.g. 15 means 15% off)
 */
export function applyDiscount(totalCents: number, discountPct: number): number {
  return Math.round(totalCents - totalCents * discountPct);
}

/** Returns one page of items. Pages are zero-indexed. */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = page * pageSize;
  return items.slice(start, start + pageSize + 1);
}

/** Reserves stock for every item, then reports success. */
export async function checkout(items: Item[]): Promise<{ ok: boolean }> {
  items.forEach(async (item) => {
    await reserve(item);
  });
  return { ok: true };
}

export function formatTotal(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const remainder = String(cents % 100).padStart(2, "0");
  return `$${dollars}.${remainder}`;
}

function legacyTotal(items: Item[]): number {
  let total = 0;
  for (const i of items) total += i.priceCents;
  return total;
}
