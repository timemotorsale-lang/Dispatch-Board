import type { ActivityFeedEvent } from "@/server/services/activity-feed";

export type ActivityFeedFilter = "all" | "tasks" | "status" | "blocked" | "comments" | "system";

export const activityFeedFilters: Array<{ value: ActivityFeedFilter; label: string }> = [
  { value: "all", label: "All Events" },
  { value: "tasks", label: "Tasks" },
  { value: "status", label: "Status Changes" },
  { value: "blocked", label: "Blocked" },
  { value: "comments", label: "Comments" },
  { value: "system", label: "System" }
];

export type ActivityFeedTone = "neutral" | "danger" | "warning" | "review" | "success" | "system";

export function formatActivityEventLabel(eventType: string) {
  const labels: Record<string, string> = {
    DAILY_BOARD_GENERATED: "Daily board generated",
    TASK_CREATED: "Task created",
    TASK_ASSIGNED: "Task assigned",
    ASSIGNMENT_RECOMMENDED: "Assignment recommended",
    ASSIGNMENT_CHANGED: "Assignment changed",
    DUE_TIME_CHANGED: "Due time changed",
    STATUS_CHANGED: "Status changed",
    TASK_BLOCKED: "Task blocked",
    BLOCKER_REASON_ADDED: "Blocker added",
    WAITING_ON_PARTS: "Waiting on parts",
    WAITING_ON_APPROVAL: "Waiting on approval",
    READY_FOR_REVIEW: "Ready for review",
    MANAGER_APPROVED_COMPLETION: "Manager approved",
    TASK_COMPLETED: "Task completed",
    COMMENT_ADDED: "Update added"
  };

  return labels[eventType] ?? eventType.toLowerCase().replaceAll("_", " ").replace(/^\w/, (match) => match.toUpperCase());
}

export function getActivityEventTone(event: Pick<ActivityFeedEvent, "eventType" | "task">): ActivityFeedTone {
  if (event.eventType === "DAILY_BOARD_GENERATED") return "system";
  if (event.eventType === "TASK_COMPLETED" || event.task?.status === "COMPLETED") return "success";
  if (event.eventType === "READY_FOR_REVIEW" || event.task?.status === "READY_FOR_REVIEW") return "review";
  if (
    event.eventType === "TASK_BLOCKED" ||
    event.eventType === "BLOCKER_REASON_ADDED" ||
    event.task?.status === "BLOCKED"
  ) return "danger";
  if (
    event.eventType === "WAITING_ON_PARTS" ||
    event.eventType === "WAITING_ON_APPROVAL" ||
    event.task?.status === "WAITING_ON_PARTS" ||
    event.task?.status === "WAITING_ON_APPROVAL"
  ) return "warning";
  return "neutral";
}

export function activityEventMatchesFilter(event: ActivityFeedEvent, filter: ActivityFeedFilter) {
  if (filter === "all") return true;
  if (filter === "system") return !event.actor || event.eventType === "DAILY_BOARD_GENERATED";
  if (filter === "comments") return event.eventType === "COMMENT_ADDED";
  if (filter === "blocked") return getActivityEventTone(event) === "danger";
  if (filter === "status") {
    return [
      "STATUS_CHANGED",
      "TASK_BLOCKED",
      "WAITING_ON_PARTS",
      "WAITING_ON_APPROVAL",
      "READY_FOR_REVIEW",
      "TASK_COMPLETED",
      "MANAGER_APPROVED_COMPLETION"
    ].includes(event.eventType);
  }
  return Boolean(event.task) || event.eventType.startsWith("TASK_") || event.eventType.includes("ASSIGNMENT");
}
