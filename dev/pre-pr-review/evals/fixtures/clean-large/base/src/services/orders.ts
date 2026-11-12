import type { OrderItem, OrderRecord, OrderStatus, OrderStore } from "../types";

export type OrderErrorCode = "invalid_order" | "not_found" | "invalid_transition";

export class OrderError extends Error {
  constructor(
    message: string,
    readonly code: OrderErrorCode,
  ) {
    super(message);
    this.name = "OrderError";
  }
}

export const MAX_ITEMS_PER_ORDER = 50;

/** Price of one order line in cents: quantity times unit price. */
export function lineTotalCents(item: OrderItem): number {
  return item.quantity * item.unitPriceCents;
}

/** Sum of the line totals, in cents. An empty list totals 0. */
export function calculateTotalCents(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + lineTotalCents(item), 0);
}

function validateItems(items: OrderItem[]): void {
  if (items.length === 0) {
    throw new OrderError("an order needs at least one item", "invalid_order");
  }
  if (items.length > MAX_ITEMS_PER_ORDER) {
    throw new OrderError(`an order can have at most ${MAX_ITEMS_PER_ORDER} items`, "invalid_order");
  }
  for (const item of items) {
    if (item.sku.trim() === "") {
      throw new OrderError("every item needs a sku", "invalid_order");
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new OrderError(`quantity for ${item.sku} must be a positive integer`, "invalid_order");
    }
    if (!Number.isInteger(item.unitPriceCents) || item.unitPriceCents < 0) {
      throw new OrderError(`price for ${item.sku} must be a non-negative integer`, "invalid_order");
    }
  }
}

export interface CreateOrderInput {
  customerId: string;
  items: OrderItem[];
}

/** Validates the input and stores a new pending order with its computed total. */
export async function createOrder(store: OrderStore, input: CreateOrderInput): Promise<OrderRecord> {
  if (input.customerId.trim() === "") {
    throw new OrderError("customerId is required", "invalid_order");
  }
  validateItems(input.items);
  return store.insert({
    customerId: input.customerId,
    items: input.items,
    totalCents: calculateTotalCents(input.items),
    status: "pending",
  });
}

/** Returns the order with this id. Throws OrderError with code "not_found" if there is none. */
export async function getOrder(store: OrderStore, id: string): Promise<OrderRecord> {
  const order = await store.findById(id);
  if (!order) {
    throw new OrderError(`order ${id} not found`, "not_found");
  }
  return order;
}

/** Returns the customer's orders, or only those with `status` when it is given. */
export async function listOrdersForCustomer(
  store: OrderStore,
  customerId: string,
  status?: OrderStatus,
): Promise<OrderRecord[]> {
  const orders = await store.findByCustomer(customerId);
  return status === undefined ? orders : orders.filter((order) => order.status === status);
}

/**
 * Cancels a pending order. Paid and already-cancelled orders can't be cancelled; that throws
 * OrderError with code "invalid_transition".
 */
export async function cancelOrder(store: OrderStore, id: string): Promise<OrderRecord> {
  const order = await getOrder(store, id);
  if (order.status !== "pending") {
    throw new OrderError(`cannot cancel a ${order.status} order`, "invalid_transition");
  }
  return store.updateStatus(id, "cancelled");
}
