export type OrderStatus = "pending" | "paid" | "cancelled";

export interface OrderItem {
  sku: string;
  quantity: number;
  unitPriceCents: number;
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  totalCents: number;
  status: OrderStatus;
}

export interface OrderStore {
  insert(order: Omit<Order, "id">): Promise<Order>;
  findById(id: string): Promise<Order | undefined>;
  findByCustomer(customerId: string): Promise<Order[]>;
  updateStatus(id: string, status: OrderStatus): Promise<Order>;
}
