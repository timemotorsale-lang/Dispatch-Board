import { businessDate } from "@/lib/money-resources";

export const DEAL_GROUPS = { ALL: "All pathways", SALES: "Vehicle Sales", LEASING: "Leasing", USE: "Vehicle Use", SERVICE: "Service & Repairs", PRODUCTS: "Additional Products" } as const;
export type DealGroup = keyof typeof DEAL_GROUPS;
export function dealGroup(pathway: string): DealGroup {
  if (["retail-sale", "outside-finance-one-pay", "finance", "bhph", "wholesale"].includes(pathway)) return "SALES";
  if (pathway === "lease-to-own") return "LEASING";
  if (["daily-rental", "vehicle-loaner", "test-drive"].includes(pathway)) return "USE";
  if (pathway === "repairs") return "SERVICE";
  return "PRODUCTS";
}
export function reportingRange(date: string, period: string) {
  businessDate(date);
  if (!["day", "week", "month"].includes(period)) throw new Error("Choose Day, Week, or Month.");
  const start = new Date(`${date}T12:00:00Z`), end = new Date(start);
  if (period === "week") { start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7); end.setTime(start.getTime()); end.setUTCDate(end.getUTCDate() + 6); }
  if (period === "month") { start.setUTCDate(1); end.setUTCMonth(end.getUTCMonth() + 1, 0); }
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10), period };
}
export function chicagoDate(value: Date | string | null | undefined) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Chicago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
export type DashboardDeal = {
  id: string; draftId: string | null; draftRevision: number | null; jacketId: string | null; dealNumber: string | null;
  customerId: string | null; customerName: string; vehicleReference: string; pathway: string; status: string; packetState: string | null; updatedAt: string;
  ownerId: string; ownerName: string; stage: string; nextAction: string; dueAt: string | null; taskHref: string | null;
  completedDate: string | null; createdDate: string | null; documentsReady: number; documentsTotal: number; needsAttention: boolean;
  soldDate?: string | null;
  documentChecklist?: Array<{ id: string; label: string; phase: string; status: string }>;
};
export function summarizeDeals(rows: DashboardDeal[], range: { start: string; end: string }) {
  const current = rows.filter(row => row.status !== "ARCHIVED");
  const completed = current.filter(row => row.stage === "Completed" && row.completedDate && row.completedDate >= range.start && row.completedDate <= range.end);
  const sold = current.filter(row => dealGroup(row.pathway) === "SALES" && row.soldDate && row.soldDate >= range.start && row.soldDate <= range.end);
  return { current: current.length, attention: current.filter(row => row.needsAttention).length,
    working: current.filter(row => row.stage === "Working").length, ready: current.filter(row => row.stage === "Ready to finalize").length,
    funding: current.filter(row => row.stage === "Awaiting funding").length, completed: completed.length, sold: sold.length,
    undatedCompleted: current.filter(row => row.stage === "Completed" && !row.completedDate).length,
    groups: Object.entries(DEAL_GROUPS).filter(([key]) => key !== "ALL").map(([key, label]) => ({ key, label,
      current: current.filter(row => dealGroup(row.pathway) === key && row.stage !== "Completed" && row.stage !== "Closed without completion").length,
      opened: current.filter(row => dealGroup(row.pathway) === key && row.createdDate && row.createdDate >= range.start && row.createdDate <= range.end).length,
      completed: completed.filter(row => dealGroup(row.pathway) === key).length, sold: sold.filter(row => dealGroup(row.pathway) === key).length })) };
}
