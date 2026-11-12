/** Formats an amount in cents as a localized currency string, e.g. 1999 -> "$19.99". */
export function formatCurrency(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}
