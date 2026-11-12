import { describe, expect, it } from "vitest";
import { calculateTotalCents } from "./money";

const mug = { sku: "mug", quantity: 2, unitPriceCents: 1200 };
const tee = { sku: "tee", quantity: 1, unitPriceCents: 2500 };

describe("calculateTotalCents", () => {
  it("sums quantity times unit price over all items", () => {
    expect(calculateTotalCents([mug, tee])).toBe(4900);
  });

  it("returns 0 for no items", () => {
    expect(calculateTotalCents([])).toBe(0);
  });
});
