import type { ActivityFeedEvent } from "@/server/services/activity-feed";

export type ActivityFeedFilter = "all" | "tasks" | "appointments" | "status" | "blocked" | "comments" | "system";

export const activityFeedFilters: Array<{ value: ActivityFeedFilter; label: string }> = [
  { value: "all", label: "All Events" },
  { value: "tasks", label: "Tasks" },
  { value: "appointments", label: "Appointments" },
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
    COMMENT_ADDED: "Update added",
    APPOINTMENT_CREATED: "Appointment created",
    APPOINTMENT_DRAFT_UPDATED: "Appointment draft updated",
    APPOINTMENT_APPROVED: "Appointment approved",
    APPOINTMENT_SCHEDULED: "Appointment scheduled",
    APPOINTMENT_RESCHEDULED: "Appointment rescheduled",
    APPOINTMENT_CANCELLED: "Appointment cancelled",
    APPOINTMENT_CONFIRMED: "Appointment confirmed",
    APPOINTMENT_DECLINED: "Appointment declined",
    APPOINTMENT_CHECKED_IN: "Appointment checked in",
    APPOINTMENT_NO_SHOW_RECORDED: "Appointment no-show",
    APPOINTMENT_STARTED: "Appointment started",
    APPOINTMENT_WAITING: "Appointment waiting",
    APPOINTMENT_FINISHED: "Appointment finished",
    APPOINTMENT_COMPLETED: "Appointment completed",
    APPOINTMENT_OUTCOME_RECORDED: "Appointment outcome",
    APPOINTMENT_OWNER_CHANGED: "Appointment owner changed",
    APPOINTMENT_FIELD_UPDATED: "Appointment updated",
    APPOINTMENT_WARNING_OVERRIDDEN: "Appointment warning overridden",
    APPOINTMENT_CONFLICT_DETECTED: "Appointment conflict detected",
    APPOINTMENT_TASK_LINKED: "Appointment task linked",
    APPOINTMENT_TASK_UNLINKED: "Appointment task unlinked",
    APPOINTMENT_AUTOMATION_EVALUATED: "Appointment automation evaluated",
    APPOINTMENT_AUTOMATION_FAILED: "Appointment automation failed",
    APPOINTMENT_NOTIFICATION_QUEUED: "Appointment notification queued",
    APPOINTMENT_BULK_ACTION_PREVIEWED: "Appointment bulk action previewed",
    APPOINTMENT_BULK_ACTION_APPLIED: "Appointment bulk action applied",
    APPOINTMENT_NOTE_ADDED: "Appointment note added"
  };

  return labels[eventType] ?? eventType.toLowerCase().replaceAll("_", " ").replace(/^\w/, (match) => match.toUpperCase());
}

export function getActivityEventTone(event: Pick<ActivityFeedEvent, "eventType" | "task">): ActivityFeedTone {
  if (event.eventType.startsWith("APPOINTMENT_")) {
    if (
      event.eventType === "APPOINTMENT_CANCELLED" ||
      event.eventType === "APPOINTMENT_NO_SHOW_RECORDED" ||
      event.eventType === "APPOINTMENT_CONFLICT_DETECTED" ||
      event.eventType === "APPOINTMENT_AUTOMATION_FAILED"
    ) return "danger";
    if (
      event.eventType === "APPOINTMENT_WAITING" ||
      event.eventType === "APPOINTMENT_WARNING_OVERRIDDEN"
    ) return "warning";
    if (
      event.eventType === "APPOINTMENT_COMPLETED" ||
      event.eventType === "APPOINTMENT_FINISHED" ||
      event.eventType === "APPOINTMENT_SCHEDULED" ||
      event.eventType === "APPOINTMENT_CONFIRMED"
    ) return "success";
    if (
      event.eventType === "APPOINTMENT_AUTOMATION_EVALUATED" ||
      event.eventType === "APPOINTMENT_NOTIFICATION_QUEUED"
    ) return "system";
  }

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
  if (filter === "appointments") return event.eventType.startsWith("APPOINTMENT_");
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
