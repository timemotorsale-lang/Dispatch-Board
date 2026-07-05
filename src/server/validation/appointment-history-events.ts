import {
  APPOINTMENT_EVENT_ACTOR_TYPES,
  APPOINTMENT_HISTORY_EVENT_TYPES,
  type AppointmentEventActorType,
  type AppointmentHistoryEventType
} from "@/server/appointments/appointment-domain";

const actorTypes = new Set<string>(APPOINTMENT_EVENT_ACTOR_TYPES);
const eventTypes = new Set<string>(APPOINTMENT_HISTORY_EVENT_TYPES);
const structuredCodePattern = /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/;

const reasonRequiredEvents = new Set<AppointmentHistoryEventType>([
  "RESCHEDULED",
  "CANCELLED",
  "DECLINED",
  "NO_SHOW_RECORDED",
  "WAITING",
  "WARNING_OVERRIDDEN",
  "BULK_ACTION_APPLIED"
]);

const priorAndNewValueRequiredEvents = new Set<AppointmentHistoryEventType>([
  "RESCHEDULED",
  "OWNER_CHANGED",
  "FIELD_UPDATED",
  "WARNING_OVERRIDDEN"
]);

function requiredText(value: string, label: string, maximumLength: number) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  if (normalized.length > maximumLength) {
    throw new Error(`${label} cannot exceed ${maximumLength} characters.`);
  }

  return normalized;
}

function optionalText(value: string | null | undefined, label: string, maximumLength: number) {
  const normalized = value?.trim() ?? "";

  if (normalized.length > maximumLength) {
    throw new Error(`${label} cannot exceed ${maximumLength} characters.`);
  }

  return normalized || null;
}

function optionalStructuredCode(
  value: string | null | undefined,
  label: string,
  maximumLength = 100
) {
  const normalized = optionalText(value, label, maximumLength)?.toUpperCase() ?? null;

  if (normalized && !structuredCodePattern.test(normalized)) {
    throw new Error(`${label} must contain uppercase letters, numbers, and single underscores only.`);
  }

  return normalized;
}

function optionalPositiveInteger(value: number | null | undefined, label: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return value;
}

function optionalDate(value: Date | null | undefined, label: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }

  return new Date(value);
}

function jsonObject(value: unknown, label: string, allowNull = true) {
  if (value === null || value === undefined) {
    if (allowNull) {
      return null;
    }

    throw new Error(`${label} is required.`);
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return value;
}

export type AppointmentHistoryEventInput = {
  appointmentId: string;
  actorType: string;
  actorUserId?: string | null;
  taskId?: string | null;
  appointmentTaskLinkId?: string | null;
  eventType: string;
  message: string;
  reasonCode?: string | null;
  reasonNotes?: string | null;
  correlationId: string;
  causationId?: string | null;
  automationRuleCode?: string | null;
  automationRuleVersion?: number | null;
  priorValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
  notificationIntent?: unknown;
  occurredAt?: Date | null;
};

export function normalizeAppointmentHistoryEvent(input: AppointmentHistoryEventInput) {
  if (!actorTypes.has(input.actorType)) {
    throw new Error(`Appointment history actor type is invalid: "${input.actorType}".`);
  }

  if (!eventTypes.has(input.eventType)) {
    throw new Error(`Appointment history event type is invalid: "${input.eventType}".`);
  }

  const actorType = input.actorType as AppointmentEventActorType;
  const eventType = input.eventType as AppointmentHistoryEventType;
  const actorUserId = optionalText(input.actorUserId, "Appointment history actor", 100);
  const reasonCode = optionalStructuredCode(
    input.reasonCode,
    "Appointment history reason code"
  );
  const reasonNotes = optionalText(input.reasonNotes, "Appointment history reason notes", 4000);
  const automationRuleCode = optionalStructuredCode(
    input.automationRuleCode,
    "Appointment history automation rule code"
  );
  const automationRuleVersion = optionalPositiveInteger(
    input.automationRuleVersion,
    "Appointment history automation rule version"
  );
  const priorValue = jsonObject(input.priorValue, "Appointment history prior value");
  const newValue = jsonObject(input.newValue, "Appointment history new value");

  if (actorType === "HUMAN" && !actorUserId) {
    throw new Error("Human appointment history events require an actor user.");
  }

  if (actorType === "AUTOMATION" && (!automationRuleCode || !automationRuleVersion)) {
    throw new Error("Automation appointment history events require rule code and version.");
  }

  if (automationRuleCode && !automationRuleVersion) {
    throw new Error("Appointment history automation rule code requires a rule version.");
  }

  if (automationRuleVersion && !automationRuleCode) {
    throw new Error("Appointment history automation rule version requires a rule code.");
  }

  if (reasonRequiredEvents.has(eventType) && !reasonCode) {
    throw new Error(`${eventType} appointment history events require a reason code.`);
  }

  if (reasonRequiredEvents.has(eventType) && !reasonNotes) {
    throw new Error(`${eventType} appointment history events require reason notes.`);
  }

  if (priorAndNewValueRequiredEvents.has(eventType) && (!priorValue || !newValue)) {
    throw new Error(`${eventType} appointment history events require prior and new values.`);
  }

  if (eventType === "NOTIFICATION_QUEUED" && !input.notificationIntent) {
    throw new Error("Notification appointment history events require notification intent.");
  }

  return {
    appointmentId: requiredText(input.appointmentId, "Appointment history appointment", 100),
    actorType,
    actorUserId,
    taskId: optionalText(input.taskId, "Appointment history task", 100),
    appointmentTaskLinkId: optionalText(
      input.appointmentTaskLinkId,
      "Appointment history task link",
      100
    ),
    eventType,
    message: requiredText(input.message, "Appointment history message", 500),
    reasonCode,
    reasonNotes,
    correlationId: requiredText(input.correlationId, "Appointment history correlation", 120),
    causationId: optionalText(input.causationId, "Appointment history causation", 120),
    automationRuleCode,
    automationRuleVersion,
    priorValue,
    newValue,
    metadata: jsonObject(input.metadata ?? {}, "Appointment history metadata", false),
    notificationIntent: jsonObject(
      input.notificationIntent,
      "Appointment history notification intent"
    ),
    occurredAt: optionalDate(input.occurredAt, "Appointment history occurrence time")
  };
}
