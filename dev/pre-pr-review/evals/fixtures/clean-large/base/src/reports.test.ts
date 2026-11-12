import { describe, expect, it } from "vitest";
import { paidRevenueBySku } from "./reports";
import type { OrderRecord } from "./types";

function order(overrides: Partial<OrderRecord>): OrderRecord {
  return { id: "order-1", customerId: "cus-1", items: [], totalCents: 0, status: "paid", ...overrides };
}

describe("paidRevenueBySku", () => {
  it("sums line totals per sku across paid orders", () => {
    const orders = [
      order({ items: [{ sku: "mug", quantity: 2, unitPriceCents: 1200 }] }),
      order({
        items: [
          { sku: "mug", quantity: 1, unitPriceCents: 1200 },
          { sku: "tee", quantity: 3, unitPriceCents: 2500 },
        ],
      }),
    ];

    expect(paidRevenueBySku(orders)).toEqual(
      new Map([
        ["mug", 3600],
        ["tee", 7500],
      ]),
    );
  });

  it("ignores pending and cancelled orders", () => {
    const orders = [
      order({ status: "pending", items: [{ sku: "mug", quantity: 1, unitPriceCents: 1200 }] }),
      order({ status: "cancelled", items: [{ sku: "tee", quantity: 1, unitPriceCents: 2500 }] }),
    ];

    expect(paidRevenueBySku(orders)).toEqual(new Map());
  });
});
