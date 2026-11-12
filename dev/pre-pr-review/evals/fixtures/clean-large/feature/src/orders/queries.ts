import type { Order, OrderStatus, OrderStore } from "../types";
import { OrderError } from "./errors";

/** Returns the order with this id. Throws OrderError with code "not_found" if there is none. */
export async function getOrder(store: OrderStore, id: string): Promise<Order> {
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
): Promise<Order[]> {
  const orders = await store.findByCustomer(customerId);
  return status === undefined ? orders : orders.filter((order) => order.status === status);
}
