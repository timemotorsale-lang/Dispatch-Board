import { dealGroup } from "./deal-dashboard";

export const DEAL_WORKSPACE_SECTIONS = [
  ["overview", "Overview"], ["identity", "Customer & Vehicle"], ["terms", "Terms & Payments"],
  ["documents", "Documents"], ["completion", "Completion"], ["activity", "Activity"]
] as const;
export type DealWorkspaceSection = typeof DEAL_WORKSPACE_SECTIONS[number][0];
export function dealNextAction(input: { customer: boolean; vehicle: boolean; pathway: string; status: string; finalized: boolean }) {
  if (!input.customer) return { section: "identity", title: "Choose the customer", detail: "Select an existing customer or add a customer once to the shared record.", action: "Choose customer" } as const;
  if (!input.vehicle) return { section: "identity", title: "Confirm the vehicle", detail: "Link the inventory or registry vehicle before continuing.", action: "Choose vehicle" } as const;
  if (["ARCHIVED", "LOST", "CANCELLED"].includes(input.status)) return { section: "activity", title: "Review this deal's history", detail: "This deal is no longer active. Its records and documents remain available.", action: "Review activity" } as const;
  if (input.finalized || input.status === "COMPLETED") return { section: "documents", title: "Review completed paperwork", detail: "Open the saved documents and recorded completion details.", action: "Open documents" } as const;
  if (input.status === "SOLD") return { section: "completion", title: "Complete the remaining paperwork", detail: "The sale is recorded. Review signed documents, insurance, title/DMV, funding and delivery requirements.", action: "Complete paperwork" } as const;
  if (input.pathway === "repairs") return { section: "terms", title: "Continue service intake", detail: "Confirm the concern and shared identities, then continue to the repair order.", action: "Open service handoff" } as const;
  if (input.pathway === "daily-rental") return { section: "completion", title: "Prepare or activate the rental", detail: "Confirm rental dates, signed agreement and insurance, then record checkout. Active rentals remain open until actual return.", action: "Rental checkout & return" } as const;
  if (dealGroup(input.pathway) === "USE") return { section: "completion", title: "Review vehicle-use requirements", detail: "Confirm terms, agreement and dates before recording the reservation, actual handoff or return.", action: "Open assignment" } as const;
  return { section: "terms", title: "Review the deal terms", detail: "Confirm the agreed numbers, then prepare documents and record the sale when agreed.", action: "Review terms" } as const;
}
export function chooseEntryDraft<T extends { id: string; customerId?: string | null; pathway: string; status?: string }>(drafts: T[], input: { draftId?: string | null; newDeal: boolean; customerId?: string; pathway?: string }) {
  if (input.draftId) return { id: input.draftId, candidates: [] as T[] };
  if (input.newDeal || !input.customerId) return { id: null, candidates: [] as T[] };
  const candidates = drafts.filter(draft => draft.customerId === input.customerId && !["ARCHIVED", "LOST", "CANCELLED", "COMPLETED"].includes(draft.status ?? "") && (!input.pathway || draft.pathway === input.pathway));
  return { id: candidates.length === 1 ? candidates[0].id : null, candidates: candidates.length > 1 ? candidates : [] };
}
export function dealTimeShortcut(key: string, today: string) {
  const day = new Date(`${today}T12:00:00Z`);
  const period = ["today", "yesterday"].includes(key) ? "day" : ["week", "last-week", "two-weeks"].includes(key) ? "week" : "month";
  if (key === "yesterday") day.setUTCDate(day.getUTCDate() - 1);
  if (key === "last-week") day.setUTCDate(day.getUTCDate() - 7);
  if (key === "two-weeks") day.setUTCDate(day.getUTCDate() - 14);
  if (key === "last-month") { day.setUTCDate(1); day.setUTCMonth(day.getUTCMonth() - 1); }
  return { date: day.toISOString().slice(0, 10), period };
}
