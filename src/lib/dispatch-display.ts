import type { DispatchTeam, TeamRow, TeamTask } from "./dispatch-team";
import type { BoardFilters } from "@/features/board/board-grouping";

export function matchesOperationalState(task: { status: string; workflowArea?: string }, filters: Pick<BoardFilters, "metricFilter" | "status" | "workflowArea">) {
  if (filters.status && task.status !== filters.status || filters.workflowArea && task.workflowArea !== filters.workflowArea) return false;
  switch (filters.metricFilter) {
    case "active": return task.status !== "COMPLETED";
    case "stuck": return ["BLOCKED", "WAITING_ON_PARTS"].includes(task.status);
    case "needs_manager": return ["WAITING_ON_APPROVAL", "READY_FOR_REVIEW"].includes(task.status);
    case "ready_for_review": return task.status === "READY_FOR_REVIEW";
    case "completed": return task.status === "COMPLETED";
    default: return true;
  }
}
export function visibleTeamRows(data: DispatchTeam, filters: BoardFilters): TeamRow[] {
  const query = filters.searchText.trim().toLocaleLowerCase();
  return data.rows.filter(row => {
    if (filters.assigneeId && row.id !== filters.assigneeId) return false;
    const scoped = row.tasks.filter(task => matchesOperationalState(task, filters));
    if ((filters.status || filters.metricFilter || filters.workflowArea) && !scoped.length) return false;
    return !query || [row.name, row.title, ...row.focuses.filter(focus => focus.businessDate === data.date).map(focus => focus.title),
      ...scoped.flatMap(task => [task.title, task.blockerReason, task.status.replaceAll("_", " "), task.workflowArea?.replaceAll("_", " ")])]
      .filter(Boolean).join(" ").toLocaleLowerCase().includes(query);
  });
}
export function blockerLabel(task: Pick<TeamTask, "status" | "blockerReason">) {
  const label = task.status === "WAITING_ON_PARTS" ? "Waiting for parts" : task.status === "WAITING_ON_APPROVAL" ? "Awaiting approval" : task.status === "BLOCKED" ? "Blocked" : "";
  if (!label) return "";
  const reason = task.blockerReason?.trim();
  return reason && reason.toLocaleLowerCase() !== label.toLocaleLowerCase() ? label + " · " + reason : label;
}
export function teamBlockers(row: TeamRow) { return row.tasks.filter(task => Boolean(blockerLabel(task))); }
export function relativeTime(value: string, now: string) {
  const elapsed = Date.parse(now) - Date.parse(value);
  if (!Number.isFinite(elapsed)) return "Time unavailable";
  if (elapsed < -60000) return "Clock difference";
  if (elapsed < 60000) return "Just now";
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 60) return minutes + (minutes === 1 ? " minute ago" : " minutes ago");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");
  const days = Math.floor(hours / 24);
  return days + (days === 1 ? " day ago" : " days ago");
}
export function fullTimestamp(value: string, timezone = "America/Chicago") {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("en-US", { timeZone: timezone, dateStyle: "medium", timeStyle: "short" }).format(date);
}
export function sourceDelayed(at: string | null, now: string, error?: string) {
  return Boolean(error || at && Date.parse(now) - Date.parse(at) > 45000);
}
export function displayPageSize(height: number) { return Math.max(1, Math.floor((height - 210) / 155)); }
