export type CustomerContactRead = {
  customer?: { phone?: string; email?: string };
  panel?: { items?: Array<{ title: string; detail: string; meta: string }> };
};

function availableContactValue(value: unknown) {
  const contact = typeof value === "string" ? value.trim() : "";
  return contact && contact !== "Restricted" && contact !== "Not recorded" ? contact : "";
}

export function customerContactValue(read: CustomerContactRead, type: "PHONE" | "EMAIL") {
  const points = read.panel?.items?.filter((item) => item.title === type) ?? [];
  const primary = points.find((item) => item.meta === "Primary") ?? points[0];
  return availableContactValue(primary?.detail) || availableContactValue(type === "PHONE" ? read.customer?.phone : read.customer?.email);
}
