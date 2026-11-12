import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryOrderStore } from "../store";
import {
  MAX_ITEMS_PER_ORDER,
  OrderError,
  cancelOrder,
  createOrder,
  getOrder,
  listOrdersForCustomer,
  type CreateOrderInput,
} from ".";

const mug = { sku: "mug", quantity: 2, unitPriceCents: 1200 };
const tee = { sku: "tee", quantity: 1, unitPriceCents: 2500 };

let store: InMemoryOrderStore;

beforeEach(() => {
  store = new InMemoryOrderStore();
});

async function expectOrderError(promise: Promise<unknown>, code: OrderError["code"]) {
  await expect(promise).rejects.toSatisfy((error) => error instanceof OrderError && error.code === code);
}

describe("createOrder", () => {
  it("stores a pending order with the computed total", async () => {
    const order = await createOrder(store, { customerId: "cus-1", items: [mug, tee] });

    expect(order).toEqual({
      id: "order-1",
      customerId: "cus-1",
      items: [mug, tee],
      totalCents: 4900,
      status: "pending",
    });
    expect(await store.findById("order-1")).toEqual(order);
  });

  it.each<[string, CreateOrderInput]>([
    ["a blank customer id", { customerId: "  ", items: [mug] }],
    ["no items", { customerId: "cus-1", items: [] }],
    ["too many items", { customerId: "cus-1", items: Array(MAX_ITEMS_PER_ORDER + 1).fill(mug) }],
    ["a blank sku", { customerId: "cus-1", items: [{ ...mug, sku: " " }] }],
    ["a zero quantity", { customerId: "cus-1", items: [{ ...mug, quantity: 0 }] }],
    ["a fractional quantity", { customerId: "cus-1", items: [{ ...mug, quantity: 1.5 }] }],
    ["a negative price", { customerId: "cus-1", items: [{ ...mug, unitPriceCents: -1 }] }],
    ["a fractional price", { customerId: "cus-1", items: [{ ...mug, unitPriceCents: 9.99 }] }],
  ])("rejects %s", async (_case, input) => {
    await expectOrderError(createOrder(store, input), "invalid_order");
    expect(await store.findByCustomer(input.customerId)).toEqual([]);
  });

  it("accepts exactly the maximum number of items and free items", async () => {
    const items = [...Array(MAX_ITEMS_PER_ORDER - 1).fill(mug), { ...tee, unitPriceCents: 0 }];

    const order = await createOrder(store, { customerId: "cus-1", items });

    expect(order.totalCents).toBe((MAX_ITEMS_PER_ORDER - 1) * 2400);
  });
});

describe("getOrder", () => {
  it("returns the stored order", async () => {
    const created = await createOrder(store, { customerId: "cus-1", items: [mug] });

    expect(await getOrder(store, created.id)).toEqual(created);
  });

  it("throws not_found for an unknown id", async () => {
    await expectOrderError(getOrder(store, "order-404"), "not_found");
  });
});

describe("listOrdersForCustomer", () => {
  beforeEach(async () => {
    await createOrder(store, { customerId: "cus-1", items: [mug] });
    await createOrder(store, { customerId: "cus-1", items: [tee] });
    await createOrder(store, { customerId: "cus-2", items: [mug] });
    await store.updateStatus("order-2", "paid");
  });

  it("returns only that customer's orders", async () => {
    const orders = await listOrdersForCustomer(store, "cus-1");

    expect(orders.map((order) => order.id)).toEqual(["order-1", "order-2"]);
  });

  it("filters by status when one is given", async () => {
    const orders = await listOrdersForCustomer(store, "cus-1", "paid");

    expect(orders.map((order) => order.id)).toEqual(["order-2"]);
  });
});

describe("cancelOrder", () => {
  it("cancels a pending order", async () => {
    const created = await createOrder(store, { customerId: "cus-1", items: [mug] });

    const cancelled = await cancelOrder(store, created.id);

    expect(cancelled.status).toBe("cancelled");
    expect((await store.findById(created.id))?.status).toBe("cancelled");
  });

  it.each(["paid", "cancelled"] as const)("refuses to cancel a %s order", async (status) => {
    const created = await createOrder(store, { customerId: "cus-1", items: [mug] });
    await store.updateStatus(created.id, status);

    await expectOrderError(cancelOrder(store, created.id), "invalid_transition");
    expect((await store.findById(created.id))?.status).toBe(status);
  });

  it("throws not_found for an unknown id", async () => {
    await expectOrderError(cancelOrder(store, "order-404"), "not_found");
  });
});
