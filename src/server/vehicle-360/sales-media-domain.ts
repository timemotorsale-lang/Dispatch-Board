export type SalesMediaItem = { id: string; name: string; contentType: string; bytes: number; status: string; href: string | null };
export type IntakeMediaItem = SalesMediaItem & { reusable: boolean };
export type SalesMediaModel = { vehicleId: string; version: number; canManage: boolean; items: SalesMediaItem[]; intakeItems?: IntakeMediaItem[] };

export function orderSalesMedia<T extends { id: string }>(items: T[], order: unknown): T[] {
  const ids = Array.isArray(order) ? order.filter((id): id is string => typeof id === "string") : [];
  const rank = new Map(ids.map((id, index) => [id, index]));
  return [...items].sort((a, b) => (rank.get(a.id) ?? ids.length) - (rank.get(b.id) ?? ids.length));
}

export function validateSalesMediaOrder(items: SalesMediaItem[], ids: unknown) {
  if (!Array.isArray(ids) || ids.some(id => typeof id !== "string") || new Set(ids).size !== ids.length || ids.length !== items.length || ids.some(id => !items.some(item => item.id === id))) throw new Error("Media order must contain every current item exactly once. Refresh and retry.");
  return ids as string[];
}
