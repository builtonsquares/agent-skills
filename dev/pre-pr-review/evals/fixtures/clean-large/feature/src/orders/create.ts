import type { Order, OrderItem, OrderStore } from "../types";
import { calculateTotalCents } from "../utils/money";
import { OrderError } from "./errors";

export const MAX_ITEMS_PER_ORDER = 50;

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
export async function createOrder(store: OrderStore, input: CreateOrderInput): Promise<Order> {
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
