import { activePipelineRow, pipelineSignals, type PipelineRow } from "./crm-pipeline";

export const LEAD_INBOX_VIEWS = { all: "All inquiries", unreviewed: "New / unreviewed", assigned: "Assigned", response: "Awaiting response", qualified: "Qualified", nurture: "Nurture", archived: "Archived / closed" } as const;
export function leadInboxRows(rows: PipelineRow[], view: string) {
  return rows.filter(r => view === "archived" ? !activePipelineRow(r) : activePipelineRow(r) && (view === "unreviewed" ? !r.inquiryReviewedAt : view === "assigned" ? !!r.ownerUserId : view === "response" ? !r.firstResponseAt : view === "qualified" ? r.stage !== "NEW_INQUIRY" : view === "nurture" ? r.disposition === "NURTURE" : true));
}
export const PIPELINE_OPERATION_VIEWS = { sales: "Sales & leasing", repairs: "Repairs", vehicle_use: "Rentals, loaners & test drives", fulfillment: "Sold fulfillment" } as const;
export function operationRows(rows: PipelineRow[], view: string) {
  if (view === "fulfillment") return rows.filter(r => r.dealStatus === "SOLD" || r.dealReviewState === "UNWIND_PENDING");
  const nonSales = ["repairs", "daily-rental", "vehicle-loaner", "test-drive"];
  return rows.filter(r => view === "repairs" ? r.pathway === "repairs" : view === "vehicle_use" ? nonSales.slice(1).includes(r.pathway) : !nonSales.includes(r.pathway));
}
export function estimatedPipelineTotal(rows: PipelineRow[]) {
  const known = rows.filter(r => r.estimatedValueCents !== null);
  return { value: !rows.length ? 0 : known.length ? known.reduce((sum, r) => sum + r.estimatedValueCents!, 0) : null, unknown: rows.length - known.length };
}
export function pipelineActivityState(row: PipelineRow, now: Date) {
  if (!row.nextActionDueAt || !row.nextActionLabel) return { tone: "warning", label: "No next activity" };
  if (Date.parse(row.nextActionDueAt) < now.getTime()) return { tone: "danger", label: "Overdue" };
  if (row.exceptions.length || pipelineSignals(row, now).length) return { tone: "warning", label: "Needs review" };
  return { tone: "success", label: "Scheduled" };
}
