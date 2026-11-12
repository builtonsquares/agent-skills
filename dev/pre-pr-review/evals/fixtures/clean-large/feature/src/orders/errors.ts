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
