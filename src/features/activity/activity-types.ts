export type ActivityEvent = { id: string; eventType: string; message: string; createdAt: string; actor: { id: string; name: string; email: string } | null; task: { id: string; title: string; status: string; workflowArea: string } | null };
export type ActivityFeedPayload = { date: string; boardDayId: string | null; events: ActivityEvent[]; error?: string };
export type ActivityFilter = "all" | "tasks" | "status" | "blocked" | "comments" | "system";
const statusEvents = new Set(["STATUS_CHANGED", "TASK_WAITING_ON_PARTS", "TASK_WAITING_ON_APPROVAL", "TASK_READY_FOR_REVIEW", "TASK_COMPLETED", "MANAGER_APPROVED_COMPLETION"]);
export function filterActivityEvents(events: ActivityEvent[], filter: ActivityFilter) {
  if (filter === "all") return events;
  if (filter === "system") return events.filter((event) => !event.actor);
  if (filter === "comments") return events.filter((event) => event.eventType === "COMMENT_ADDED");
  if (filter === "blocked") return events.filter((event) => event.eventType === "TASK_BLOCKED" || event.eventType === "BLOCKER_REASON_ADDED");
  if (filter === "status") return events.filter((event) => statusEvents.has(event.eventType));
  return events.filter((event) => event.task !== null || event.eventType.startsWith("TASK_") || event.eventType.includes("ASSIGNMENT"));
}
export function activityActionLabel(type: string) {
  const labels: Record<string, string> = { DAILY_BOARD_GENERATED: "Generated the daily board", TASK_CREATED: "Created a task", TASK_ASSIGNED: "Assigned a task", ASSIGNMENT_RECOMMENDATION_MADE: "Recommended an assignment", ASSIGNMENT_CHANGED: "Changed an assignment", DUE_TIME_CHANGED: "Changed a due time", STATUS_CHANGED: "Changed a status", TASK_BLOCKED: "Blocked a task", BLOCKER_REASON_ADDED: "Added a blocker reason", TASK_WAITING_ON_PARTS: "Marked waiting on parts", TASK_WAITING_ON_APPROVAL: "Requested approval", TASK_READY_FOR_REVIEW: "Marked ready for review", MANAGER_APPROVED_COMPLETION: "Approved completion", TASK_COMPLETED: "Completed a task", COMMENT_ADDED: "Added an update" };
  return labels[type] ?? type.toLowerCase().replaceAll("_", " ");
}
