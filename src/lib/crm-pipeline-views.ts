import { activePipelineRow, inPipelinePeriod, localPipelineDate, pipelineMidnight, pipelineSignals, resolvePipelinePeriod, type PipelineRow, type PipelineWorkspace } from "./crm-pipeline";
export function mergePipelinePages(previous: PipelineWorkspace | null, current: PipelineWorkspace): PipelineWorkspace {
  if (!previous) return current;
  return { ...previous, rows: [...new Map([...previous.rows, ...current.rows].map(r => [r.id, r])).values()], unlinkedLeads: [...new Map([...previous.unlinkedLeads, ...current.unlinkedLeads].map(r => [r.id, r])).values()], nextCursor: current.nextCursor, moreLeads: current.moreLeads, truncated: current.truncated };
}
export const PIPELINE_VIEWS = {
  all: "All current work", close_today: "Close today", close_week: "Close this week", close_month: "Close this month",
  yesterday: "Yesterday review", last_week: "Last week review", two_weeks_ago: "Two weeks ago review", last_month: "Last month review",
  overdue: "Overdue", unassigned: "Unassigned", no_activity: "No next activity", missing_date: "Missing closing date",
  waiting: "Waiting review", nurture: "Nurture review", exceptions: "Needs attention", archived: "Archived and closed"
} as const;
export type PipelineFilters = { q: string; owner: string; pathway: string; period: string; basis: string; view: string; start: string; end: string; mode: string; history: string; };
export const defaultPipelineFilters: PipelineFilters = { q: "", owner: "mine", pathway: "all", period: "today", basis: "due", view: "all", start: "", end: "", mode: "queue", history: "current" };
export function pipelineBasisDate(r: PipelineRow, basis: string) {
  if (basis === "received") return r.receivedAt;
  if (basis === "close") return r.expectedCloseAt;
  if (basis === "sold") return r.soldAt;
  if (basis === "completed") return r.completedAt;
  return ["WAITING", "NURTURE"].includes(r.disposition) ? r.reviewAt : r.nextActionDueAt;
}
export function recordedPipelinePlan(r: PipelineRow, endExclusive: string) {
  // History can be incomplete for old records. Never fabricate a period-end snapshot.
  const later = [...r.history].filter(h => h.occurredAt >= endExclusive).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const changed = later.find(h => h.priorValue && typeof h.priorValue === "object" && "expectedCloseAt" in h.priorValue);
  return changed ? (changed.priorValue as { expectedCloseAt: string | null }).expectedCloseAt : r.updatedAt < endExclusive ? r.expectedCloseAt : undefined;
}
export function filterPipelineRows(rows: PipelineRow[], f: PipelineFilters, actorId: string, now: Date) {
  const range = resolvePipelinePeriod(f.period, now, f.start, f.end), today = pipelineMidnight(localPipelineDate(now)).toISOString();
  return rows.filter(r => {
    if (f.owner === "mine" && r.ownerUserId !== actorId && r.pendingOwnerId !== actorId || f.owner !== "mine" && f.owner !== "all" && r.ownerUserId !== f.owner) return false;
    if (f.pathway !== "all" && r.pathway !== f.pathway) return false;
    if (f.q && !`${r.title} ${r.customerName} ${r.vehicle} ${r.opportunityNumber} ${r.sourceCode}`.toLowerCase().includes(f.q.toLowerCase())) return false;
    const active = activePipelineRow(r), pendingTasks = r.tasks.some(t => t.status !== "COMPLETED"), accountable = active || pendingTasks || r.exceptions.length > 0, due = pipelineBasisDate(r, "due"), signals = pipelineSignals(r, now);
    if (f.view === "archived") return !active;
    if (["overdue", "unassigned", "no_activity", "missing_date", "waiting", "nurture", "exceptions"].includes(f.view)) {
      if (!accountable) return false;
      if (f.view === "overdue") return Boolean(due && due < now.toISOString());
      if (f.view === "unassigned") return !r.ownerUserId || !r.ownerActive;
      if (f.view === "no_activity") return r.disposition === "ACTIVE" && (!r.nextActionDueAt || !r.nextActionLabel);
      if (f.view === "missing_date") return !r.expectedCloseAt;
      if (f.view === "waiting") return r.disposition === "WAITING";
      if (f.view === "nurture") return r.disposition === "NURTURE";
      return signals.length > 0 || r.exceptions.length > 0;
    }
    if (f.history === "plan") {
      const value = recordedPipelinePlan(r, range.endExclusive);
      return value !== undefined && inPipelinePeriod(value, range);
    }
    const basisDate = pipelineBasisDate(r, f.basis), inRange = inPipelinePeriod(basisDate, range);
    // Due work remains visible in current operational windows, irrespective of receipt month.
    const currentWindow = ["today", "this_week", "this_month"].includes(f.period);
    if (f.basis === "due" && currentWindow) return accountable && (inRange || Boolean(basisDate && basisDate < today) || !basisDate);
    if (f.basis === "close" && currentWindow) return active && inRange;
    return inRange;
  }).sort((a, b) => {
    const urgency = (r: PipelineRow) => pipelineSignals(r, now).length + r.exceptions.length;
    return urgency(b) - urgency(a) || (a.nextActionDueAt ?? "9999").localeCompare(b.nextActionDueAt ?? "9999") || a.id.localeCompare(b.id);
  });
}
export function applyPipelineView(f: PipelineFilters, view: string): PipelineFilters {
  const common = { ...f, view, history: "current" };
  if (view.startsWith("close_")) return { ...common, basis: "close", period: view === "close_today" ? "today" : view === "close_week" ? "this_week" : "this_month" };
  if (["yesterday", "last_week", "two_weeks_ago", "last_month"].includes(view)) return { ...common, period: view, basis: "received" };
  return common;
}
