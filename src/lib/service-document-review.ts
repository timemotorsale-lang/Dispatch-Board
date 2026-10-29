export type DocumentCustomerDetails = { name: string; phone: string; email: string; address: string };
export function normalizeDocumentCustomer(value: unknown): DocumentCustomerDetails {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Customer details are required.");
  const raw = value as Record<string, unknown>;
  const field = (key: string, maximum: number) => {
    const text = typeof raw[key] === "string" ? raw[key].trim() : "";
    if (text.length > maximum) throw new Error(`Customer ${key} is too long.`);
    return text;
  };
  const details = { name: field("name", 200), phone: field("phone", 50), email: field("email", 254).toLowerCase(), address: field("address", 500) };
  if (!details.name) throw new Error("Customer name is required.");
  if (details.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) throw new Error("Enter a valid customer email address.");
  if (details.phone && !/^\+?[\d\s().-]+$/.test(details.phone) || details.phone && (details.phone.replace(/\D/g, "").length < 7 || details.phone.replace(/\D/g, "").length > 15)) throw new Error("Enter a valid customer phone number.");
  return details;
}
