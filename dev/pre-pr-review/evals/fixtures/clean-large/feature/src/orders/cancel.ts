import type { Order, OrderStore } from "../types";
import { OrderError } from "./errors";
import { getOrder } from "./queries";

/**
 * Cancels a pending order. Paid and already-cancelled orders can't be cancelled; that throws
 * OrderError with code "invalid_transition".
 */
export async function cancelOrder(store: OrderStore, id: string): Promise<Order> {
  const order = await getOrder(store, id);
  if (order.status !== "pending") {
    throw new OrderError(`cannot cancel a ${order.status} order`, "invalid_transition");
  }
  return store.updateStatus(id, "cancelled");
}
