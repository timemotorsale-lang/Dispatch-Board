export class PartsQuoteError extends Error {
  constructor(message: string, readonly status = 400) { super(message); }
}

export function readPartsQuote(raw: Record<string, unknown>) {
  function field(name: string, label: string, max: number, required = false) {
    const value = raw[name] == null ? "" : typeof raw[name] === "string" ? raw[name].trim() : null;
    if (value === null || value.length > max || (required && !value)) {
      throw new PartsQuoteError(`Enter ${label} (${required ? "1–" : "up to "}${max} characters).`);
    }
    return value;
  }
  const id = field("id", "a quote ID", 36, true);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new PartsQuoteError("Invalid quote ID.");
  const qty = field("quantity", "a whole quantity", 5, true);
  const price = field("price", "a unit price", 11, true);
  if (!/^[1-9]\d{0,4}$/.test(qty)) throw new PartsQuoteError("Enter a whole quantity of at least 1.");
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(price)) throw new PartsQuoteError("Enter a price in dollars with up to two decimal places.");
  const [dollars, cents = ""] = price.split(".");
  const unitPriceCents = Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
  const quantity = Number(qty);
  if (quantity * unitPriceCents > 2147483647) throw new PartsQuoteError("This quote total exceeds the supported amount.");
  const supplierLink = field("supplierLink", "a supplier website or quote link", 500);
  if (supplierLink) {
    let url: URL;
    try { url = new URL(supplierLink); } catch { throw new PartsQuoteError("Enter a full supplier link starting with https:// or http://."); }
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new PartsQuoteError("Enter a public supplier link starting with https:// or http://.");
  }
  return {
    id, part: field("part", "a part name", 200, true), partNumber: field("partNumber", "a part number", 100).toUpperCase() || null,
    supplier: field("supplier", "a supplier name", 160, true), supplierPhone: field("supplierPhone", "a phone number", 60) || null,
    supplierContact: field("supplierContact", "a contact name or email", 160) || null, supplierLink: supplierLink || null,
    quantity, unitPriceCents, reference: field("reference", "quote notes", 500) || null,
  };
}

export function readQuotePurchaseDate(raw: unknown, now = new Date()) {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new PartsQuoteError("Enter the date the part was ordered.");
  const date = new Date(`${raw}T00:00:00.000Z`);
  if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== raw || date > now) throw new PartsQuoteError("Enter a valid order date no later than today.");
  return date.toISOString();
}

export function quotePurchaseState(orderStatus: string | undefined, inProgress: boolean) {
  if (orderStatus === "CANCELLED") return "Cancelled";
  if (orderStatus === "DRAFT") return "Awaiting approval";
  if (orderStatus) return "Purchase recorded";
  return inProgress ? "Checkout unfinished" : "Not ordered";
}

// Purchase Operations normalizes order references to uppercase on save.
export const quotePurchaseNumber = (id: string) => `ENTRY-${id.toUpperCase()}`;
