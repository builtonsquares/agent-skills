import type { Order, OrderStatus, OrderStore } from "./types";

function copyOrder(order: Order): Order {
  return { ...order, items: order.items.map((item) => ({ ...item })) };
}

/**
 * OrderStore backed by a Map, for tests and local development. Ids are "order-1", "order-2", ...
 * in insertion order. Orders are copied on the way in and out, so callers can't mutate stored state.
 */
export class InMemoryOrderStore implements OrderStore {
  private readonly orders = new Map<string, Order>();
  private nextId = 1;

  async insert(order: Omit<Order, "id">): Promise<Order> {
    const stored = copyOrder({ ...order, id: `order-${this.nextId++}` });
    this.orders.set(stored.id, stored);
    return copyOrder(stored);
  }

  async findById(id: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    return order && copyOrder(order);
  }

  async findByCustomer(customerId: string): Promise<Order[]> {
    return [...this.orders.values()].filter((order) => order.customerId === customerId).map(copyOrder);
  }

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = this.orders.get(id);
    if (!order) {
      throw new Error(`no order with id ${id}`);
    }
    order.status = status;
    return copyOrder(order);
  }
}
