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

export type AppointmentBookingStatus = (typeof APPOINTMENT_BOOKING_STATUSES)[number];
export type AppointmentConfirmationStatus =
  (typeof APPOINTMENT_CONFIRMATION_STATUSES)[number];
export type AppointmentAttendanceStatus = (typeof APPOINTMENT_ATTENDANCE_STATUSES)[number];
export type AppointmentExecutionStatus = (typeof APPOINTMENT_EXECUTION_STATUSES)[number];
export type AppointmentSourceType = (typeof APPOINTMENT_SOURCE_TYPES)[number];
