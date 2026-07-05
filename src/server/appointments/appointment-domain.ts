export const APPOINTMENT_BOOKING_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "SCHEDULED",
  "CANCELLED",
  "COMPLETED"
] as const;

export const APPOINTMENT_CONFIRMATION_STATUSES = [
  "NOT_REQUIRED",
  "NOT_SENT",
  "PENDING",
  "CONFIRMED",
  "DECLINED"
] as const;

export const APPOINTMENT_ATTENDANCE_STATUSES = [
  "EXPECTED",
  "CHECKED_IN",
  "NO_SHOW"
] as const;

export const APPOINTMENT_EXECUTION_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "WAITING",
  "FINISHED"
] as const;

export const APPOINTMENT_SOURCE_TYPES = [
  "MANUAL",
  "TASK",
  "AUTOMATION",
  "RECURRENCE",
  "COPY",
  "IMPORT"
] as const;

export const APPOINTMENT_TASK_LINK_TYPES = [
  "SOURCE",
  "PREPARATION",
  "DEPENDENCY",
  "DURING_APPOINTMENT",
  "APPROVAL",
  "FOLLOW_UP",
  "OUTCOME",
  "REFERENCE"
] as const;

export const APPOINTMENT_EVENT_ACTOR_TYPES = [
  "HUMAN",
  "SYSTEM",
  "AUTOMATION",
  "IMPORT"
] as const;

export const APPOINTMENT_HISTORY_EVENT_TYPES = [
  "CREATED",
  "DRAFT_UPDATED",
  "APPROVED",
  "SCHEDULED",
  "RESCHEDULED",
  "CANCELLED",
  "CONFIRMED",
  "DECLINED",
  "CHECKED_IN",
  "NO_SHOW_RECORDED",
  "STARTED",
  "WAITING",
  "FINISHED",
  "COMPLETED",
  "OUTCOME_RECORDED",
  "OWNER_CHANGED",
  "FIELD_UPDATED",
  "WARNING_OVERRIDDEN",
  "CONFLICT_DETECTED",
  "TASK_LINKED",
  "TASK_UNLINKED",
  "AUTOMATION_EVALUATED",
  "AUTOMATION_FAILED",
  "NOTIFICATION_QUEUED",
  "BULK_ACTION_PREVIEWED",
  "BULK_ACTION_APPLIED",
  "NOTE_ADDED"
] as const;

export type AppointmentBookingStatus = (typeof APPOINTMENT_BOOKING_STATUSES)[number];
export type AppointmentConfirmationStatus =
  (typeof APPOINTMENT_CONFIRMATION_STATUSES)[number];
export type AppointmentAttendanceStatus = (typeof APPOINTMENT_ATTENDANCE_STATUSES)[number];
export type AppointmentExecutionStatus = (typeof APPOINTMENT_EXECUTION_STATUSES)[number];
export type AppointmentSourceType = (typeof APPOINTMENT_SOURCE_TYPES)[number];
export type AppointmentTaskLinkType = (typeof APPOINTMENT_TASK_LINK_TYPES)[number];
export type AppointmentEventActorType = (typeof APPOINTMENT_EVENT_ACTOR_TYPES)[number];
export type AppointmentHistoryEventType =
  (typeof APPOINTMENT_HISTORY_EVENT_TYPES)[number];
