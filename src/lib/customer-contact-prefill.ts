export type CustomerContactRead = {
  customer?: { phone?: string; email?: string };
  contacts?: Array<{ type: string; value: string }>;
  panel?: { items?: Array<{ title: string; detail: string; meta: string }> };
};

export function availableContactValue(value: unknown) {
  const contact = typeof value === "string" ? value.trim() : "";
  return contact && !/^(Restricted|Not recorded)$/i.test(contact) && !/[•●…]|\*{2,}/.test(contact) ? contact : "";
}

export function prefillCustomerContact(current: string, incoming: string) {
  return availableContactValue(current) || availableContactValue(incoming);
}

export function customerContactValue(read: CustomerContactRead, type: "PHONE" | "EMAIL") {
  const points = read.panel?.items?.filter((item) => item.title === type) ?? [];
  const primary = points.find((item) => item.meta === "Primary") ?? points[0];
  return read.contacts?.filter(point => point.type === type).map(point => availableContactValue(point.value)).find(Boolean) || availableContactValue(primary?.detail) || availableContactValue(type === "PHONE" ? read.customer?.phone : read.customer?.email);
}
