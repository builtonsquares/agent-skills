export type OrderStatus = "pending" | "paid" | "cancelled";

export interface OrderItem {
  sku: string;
  quantity: number;
  unitPriceCents: number;
}

export interface OrderRecord {
  id: string;
  customerId: string;
  items: OrderItem[];
  totalCents: number;
  status: OrderStatus;
}

export interface OrderStore {
  insert(order: Omit<OrderRecord, "id">): Promise<OrderRecord>;
  findById(id: string): Promise<OrderRecord | undefined>;
  findByCustomer(customerId: string): Promise<OrderRecord[]>;
  updateStatus(id: string, status: OrderStatus): Promise<OrderRecord>;
}
