export interface Item {
  sku: string;
  quantity: number;
  priceCents: number;
}

/** Reserves stock for an item. Rejects if the inventory service refuses the reservation. */
export async function reserve(item: Item): Promise<void> {
  const res = await fetch(`https://inventory.internal/reserve/${encodeURIComponent(item.sku)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity: item.quantity }),
  });
  if (!res.ok) {
    throw new Error(`reservation failed for ${item.sku}: ${res.status}`);
  }
}
