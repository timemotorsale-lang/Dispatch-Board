import { randomUUID } from "node:crypto";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  INITIAL_MINNEAPOLIS_LOCATION,
  INITIAL_ORGANIZATION
} from "@/server/appointments/location-foundation";
import { locationLocalDateMinuteToInstant } from "@/server/appointments/location-time-service";
import {
  createAppointmentPurposeSnapshot,
  getInitialAppointmentTemplateDefinition
} from "@/server/appointments/appointment-template-domain";
import { isManager } from "@/server/policies/access";
import type { AppointmentCommandExecutionResult } from "@/server/services/appointment-command-execution-service";
import { submitAndExecuteAppointmentCommand } from "@/server/services/appointment-command-execution-service";
import { recordBoardActivityEvent } from "@/server/services/activity-feed";
import {
  getTaskReadModelById,
  type TaskReadModel
} from "@/server/services/task-read";

export type TaskAppointmentDraftResult = {
  appointmentId: string;
  appointmentNumber: string;
  commandId: string;
  commandStatus: string;
  createdTaskLinkCount: number;
  taskId: string;
};

export type TaskAppointmentDraftOptions = {
  automationRuleCode?: string | null;
  automationRuleVersion?: number | null;
  purposeCode?: string | null;
  sourceType?: "TASK" | "AUTOMATION";
  triggerCode?: string | null;
  activityEventType?: string;
  activityMessage?: string;
  metadata?: Record<string, unknown>;
  skipActivityRecord?: boolean;
};

type TaskAppointmentDraftDependencies = {
  commandExecutor?: typeof submitAndExecuteAppointmentCommand;
  now?: Date;
  recordActivity?: typeof recordBoardActivityEvent;
  taskReader?: (user: AuthenticatedUser | null, taskId: string) => Promise<TaskReadModel | null>;
  draftOptions?: TaskAppointmentDraftOptions;
};

type NormalizedTaskAppointmentDraftInput = {
  customerReference: string | null;
  deliveryNotes: string | null;
  durationMinutes: number | null;
  localDate: string | null;
  purposeCode: string | null;
  title: string | null;
  startTime: string | null;
  reasonNotes: string;
  vehicleReference: string | null;
  idempotencyKey: string | null;
};

function assertAuthenticated(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  return user;
}

function normalizeTaskId(taskId: string) {
  const normalizedTaskId = taskId.trim();

  if (!normalizedTaskId) {
    throw new Error("Task id is required.");
  }

  return normalizedTaskId;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function optionalText(value: unknown, label: string, maximumLength: number) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`${label} must be text.`);
  }

  const normalized = value.trim();

  if (normalized.length > maximumLength) {
    throw new Error(`${label} cannot exceed ${maximumLength} characters.`);
  }

  return normalized || null;
}

function requiredText(value: unknown, label: string, maximumLength: number) {
  const normalized = optionalText(value, label, maximumLength);

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function optionalPositiveInteger(value: unknown, label: string, maximum: number) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const normalizedValue = typeof value === "number" ? value : Number.parseInt(String(value), 10);

  if (!Number.isInteger(normalizedValue) || normalizedValue <= 0 || normalizedValue > maximum) {
    throw new Error(`${label} must be a whole number between 1 and ${maximum}.`);
  }

  return normalizedValue;
}

function optionalLocalDate(value: unknown, label: string) {
  const normalizedValue = optionalText(value, label, 10);

  if (!normalizedValue) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    throw new Error(`${label} must use YYYY-MM-DD.`);
  }

  return normalizedValue;
}

function optionalLocalTime(value: unknown, label: string) {
  const normalizedValue = optionalText(value, label, 5);

  if (!normalizedValue) {
    return null;
  }

  if (!/^\d{2}:\d{2}$/.test(normalizedValue)) {
    throw new Error(`${label} must use HH:MM.`);
  }

  const [hourText, minuteText] = normalizedValue.split(":");
  const hour = Number.parseInt(hourText ?? "", 10);
  const minute = Number.parseInt(minuteText ?? "", 10);

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new Error(`${label} must be a valid local time.`);
  }

  return normalizedValue;
}

function normalizeTaskAppointmentDraftInput(
  input: unknown
): NormalizedTaskAppointmentDraftInput {
  if (!isPlainObject(input)) {
    throw new Error("Task appointment payload must be an object.");
  }

  return {
    customerReference: optionalText(input.customerReference, "Task appointment customer", 180),
    deliveryNotes: optionalText(input.deliveryNotes, "Task appointment delivery notes", 600),
    durationMinutes: optionalPositiveInteger(input.durationMinutes, "Task appointment duration", 480),
    localDate: optionalLocalDate(input.localDate, "Task appointment local date"),
    purposeCode: optionalText(input.purposeCode, "Task appointment purpose code", 96),
    title: optionalText(input.title, "Task appointment title", 160),
    startTime: optionalLocalTime(input.startTime, "Task appointment start time"),
    reasonNotes: requiredText(input.reasonNotes, "Task appointment reason", 1200),
    vehicleReference: optionalText(input.vehicleReference, "Task appointment vehicle", 220),
    idempotencyKey: optionalText(input.idempotencyKey, "Task appointment idempotency key", 160)
  };
}

function assertCanCreateAppointmentFromTask(input: {
  actor: AuthenticatedUser;
  task: TaskReadModel;
}) {
  if (isManager(input.actor) || input.actor.id === input.task.assignedUser.id) {
    return;
  }

  throw new Error("You do not have permission to create an appointment from this task.");
}

function createAppointmentNumber(now: Date) {
  return `APT-TASK-${now.getTime().toString(36).toUpperCase()}-${randomUUID()
    .slice(0, 8)
    .toUpperCase()}`;
}

function createCommandIdentifier(input: {
  actorUserId: string;
  taskId: string;
  now: Date;
}) {
  return `task-appointment-${input.taskId}-${input.actorUserId}-${input.now
    .getTime()
    .toString(36)}`;
}

function getAppointmentOwnerUserId(input: {
  actor: AuthenticatedUser;
  task: TaskReadModel;
}) {
  return isManager(input.actor) ? input.task.assignedUser.id : input.actor.id;
}

function buildDraftTitle(input: NormalizedTaskAppointmentDraftInput, task: TaskReadModel) {
  return input.title ?? `Appointment for ${task.title}`;
}

function minuteOfDayFromLocalTime(localTime: string) {
  const [hourText, minuteText] = localTime.split(":");
  return Number.parseInt(hourText ?? "0", 10) * 60 + Number.parseInt(minuteText ?? "0", 10);
}

function buildRequestedScheduleWindow(input: NormalizedTaskAppointmentDraftInput) {
  if (!input.localDate || !input.startTime) {
    return {
      startsAt: null,
      endsAt: null
    };
  }

  const durationMinutes = input.durationMinutes ?? 60;
  const startMinute = minuteOfDayFromLocalTime(input.startTime);
  const startsAt = locationLocalDateMinuteToInstant({
    localDate: input.localDate,
    minuteOfDay: startMinute,
    timezone: INITIAL_MINNEAPOLIS_LOCATION.timezone
  });
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

  return {
    startsAt,
    endsAt
  };
}

function buildPurposeSnapshot(input: {
  purposeCode: string | null;
  task: TaskReadModel;
  reasonNotes: string;
  options: TaskAppointmentDraftOptions | undefined;
}) {
  const purposeCode =
    input.purposeCode?.trim().toUpperCase() ??
    input.options?.purposeCode?.trim().toUpperCase() ??
    null;
  const template = purposeCode ? getInitialAppointmentTemplateDefinition(purposeCode) : null;

  if (template) {
    return {
      ...createAppointmentPurposeSnapshot(template),
      purposeCode: template.code,
      automationRuleCode: input.options?.automationRuleCode ?? null,
      automationRuleVersion: input.options?.automationRuleVersion ?? null,
      triggerCode: input.options?.triggerCode ?? null,
      sourceTaskId: input.task.id,
      sourceTaskTitle: input.task.title,
      meetingReason: input.reasonNotes
    };
  }

  return {
    category: "TASK_MEETING",
    categoryLabel: "Task meeting / appointment",
    reason: input.reasonNotes,
    sourceTaskId: input.task.id,
    sourceTaskTitle: input.task.title,
    automationRuleCode: input.options?.automationRuleCode ?? null,
    automationRuleVersion: input.options?.automationRuleVersion ?? null,
    triggerCode: input.options?.triggerCode ?? null,
    ...(purposeCode ? { purposeCode } : {})
  };
}

function getExecutionError(result: AppointmentCommandExecutionResult) {
  return (
    result.command.errorMessage ||
    (typeof result.execution?.resultSnapshot?.errorMessage === "string"
      ? result.execution.resultSnapshot.errorMessage
      : null) ||
    "Unable to create an appointment from this task."
  );
}

export async function createAppointmentDraftFromTask(
  user: AuthenticatedUser | null,
  taskId: string,
  input: unknown,
  dependencies: TaskAppointmentDraftDependencies = {}
): Promise<TaskAppointmentDraftResult> {
  const actor = assertAuthenticated(user);
  const normalizedTaskId = normalizeTaskId(taskId);
  const normalizedInput = normalizeTaskAppointmentDraftInput(input);
  const taskReader = dependencies.taskReader ?? getTaskReadModelById;
  const task = await taskReader(actor, normalizedTaskId);

  if (!task) {
    throw new Error("Task not found.");
  }

  assertCanCreateAppointmentFromTask({ actor, task });

  const now = dependencies.now ?? new Date();
  const ownerUserId = getAppointmentOwnerUserId({ actor, task });
  const appointmentNumber = createAppointmentNumber(now);
  const title = buildDraftTitle(normalizedInput, task);
  const requestedScheduleWindow = buildRequestedScheduleWindow(normalizedInput);
  const idempotencyKey =
    normalizedInput.idempotencyKey ??
    createCommandIdentifier({
      actorUserId: actor.id,
      taskId: task.id,
      now
    });
  const commandExecutor = dependencies.commandExecutor ?? submitAndExecuteAppointmentCommand;
  const commandResult = await commandExecutor(
    actor,
    {
      commandType: "CREATE_DRAFT",
      organizationId: INITIAL_ORGANIZATION.id,
      locationId: INITIAL_MINNEAPOLIS_LOCATION.id,
      ownerUserId,
      idempotencyKey,
      correlationId: idempotencyKey,
      payload: {
        appointmentNumber,
        ownerUserId,
        title,
        sourceType: dependencies.draftOptions?.sourceType ?? "TASK",
        sourceReference: task.id,
          startsAt: requestedScheduleWindow.startsAt,
          endsAt: requestedScheduleWindow.endsAt,
        schedulingTimezone: INITIAL_MINNEAPOLIS_LOCATION.timezone,
        purposeSnapshot: buildPurposeSnapshot({
          purposeCode: normalizedInput.purposeCode,
          task,
          reasonNotes: normalizedInput.reasonNotes,
          options: dependencies.draftOptions
        }),
        customerSnapshot: (normalizedInput.customerReference ?? task.customerReference)
          ? {
              displayName: normalizedInput.customerReference ?? task.customerReference
            }
          : null,
        vehicleSnapshot: (normalizedInput.vehicleReference ?? task.vehicleReference)
          ? {
              displayName: normalizedInput.vehicleReference ?? task.vehicleReference,
              vehicleNumber: normalizedInput.vehicleReference ?? task.vehicleReference
            }
          : null,
        sourceSnapshot: {
          taskId: task.id,
          taskTitle: task.title,
          taskStatus: task.status,
          workflowArea: task.workflowArea,
          boardDate: task.boardDate,
          assignedUserId: task.assignedUser.id,
          assignedUserName: task.assignedUser.name,
          customerReference: normalizedInput.customerReference ?? task.customerReference ?? null,
          deliveryNotes: normalizedInput.deliveryNotes,
          durationMinutes: normalizedInput.durationMinutes,
          requestedLocalDate: normalizedInput.localDate,
          requestedStartTime: normalizedInput.startTime,
          reasonNotes: normalizedInput.reasonNotes,
          vehicleReference: normalizedInput.vehicleReference ?? task.vehicleReference ?? null,
          automationRuleCode: dependencies.draftOptions?.automationRuleCode ?? null,
          automationRuleVersion: dependencies.draftOptions?.automationRuleVersion ?? null,
          triggerCode: dependencies.draftOptions?.triggerCode ?? null
        },
        taskLinks: [
          {
            action: "CREATE_LINK",
            taskId: task.id,
            linkType: "SOURCE",
            linkCode: "SOURCE_TASK",
            title: "Created from task",
            explanation: normalizedInput.reasonNotes,
            isRequired: true,
            blocksAppointment: false,
            appointmentRequiredForTask: false,
          }
        ]
      }
    },
    dependencies.now ? { now } : undefined
  );

  if (!commandResult.accepted || !commandResult.execution?.appointment) {
    throw new Error(getExecutionError(commandResult));
  }

  const appointmentId = commandResult.execution.appointment.id;
  const persistedAppointmentNumber = commandResult.execution.appointment.appointmentNumber;
  const recordActivity = dependencies.recordActivity ?? recordBoardActivityEvent;

  if (!dependencies.draftOptions?.skipActivityRecord) {
    await recordActivity({
      actorUserId: actor.id,
      boardDayId: task.boardDayId,
      eventType: dependencies.draftOptions?.activityEventType ?? "task.appointment_draft_created",
      message:
        dependencies.draftOptions?.activityMessage ??
        `${actor.name} created draft appointment ${persistedAppointmentNumber} from ${task.title}.`,
      metadata: {
        appointmentId,
        appointmentNumber: persistedAppointmentNumber,
        appointmentTitle: title,
        reasonNotes: normalizedInput.reasonNotes,
        automationRuleCode: dependencies.draftOptions?.automationRuleCode ?? null,
        automationRuleVersion: dependencies.draftOptions?.automationRuleVersion ?? null,
        triggerCode: dependencies.draftOptions?.triggerCode ?? null,
        ...(dependencies.draftOptions?.metadata ?? {})
      },
      taskId: task.id
    });
  }

  return {
    appointmentId,
    appointmentNumber: persistedAppointmentNumber,
    commandId: commandResult.command.id,
    commandStatus: commandResult.command.status,
    createdTaskLinkCount: commandResult.execution.createdTaskLinkCount,
    taskId: task.id
  };
}
