import { randomUUID } from "node:crypto";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  INITIAL_MINNEAPOLIS_LOCATION,
  INITIAL_ORGANIZATION
} from "@/server/appointments/location-foundation";
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

type TaskAppointmentDraftDependencies = {
  commandExecutor?: typeof submitAndExecuteAppointmentCommand;
  now?: Date;
  recordActivity?: typeof recordBoardActivityEvent;
  taskReader?: (user: AuthenticatedUser | null, taskId: string) => Promise<TaskReadModel | null>;
};

type NormalizedTaskAppointmentDraftInput = {
  title: string | null;
  reasonNotes: string;
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

function normalizeTaskAppointmentDraftInput(
  input: unknown
): NormalizedTaskAppointmentDraftInput {
  if (!isPlainObject(input)) {
    throw new Error("Task appointment payload must be an object.");
  }

  return {
    title: optionalText(input.title, "Task appointment title", 160),
    reasonNotes: requiredText(input.reasonNotes, "Task appointment reason", 1200),
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
        sourceType: "TASK",
        sourceReference: task.id,
        startsAt: null,
        endsAt: null,
        schedulingTimezone: INITIAL_MINNEAPOLIS_LOCATION.timezone,
        purposeSnapshot: {
          category: "TASK_MEETING",
          categoryLabel: "Task meeting / appointment",
          reason: normalizedInput.reasonNotes,
          sourceTaskId: task.id,
          sourceTaskTitle: task.title
        },
        customerSnapshot: task.customerReference
          ? {
              displayName: task.customerReference
            }
          : null,
        vehicleSnapshot: task.vehicleReference
          ? {
              displayName: task.vehicleReference,
              vehicleNumber: task.vehicleReference
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
          reasonNotes: normalizedInput.reasonNotes
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
            appointmentRequiredForTask: false
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

  await recordActivity({
    actorUserId: actor.id,
    boardDayId: task.boardDayId,
    eventType: "task.appointment_draft_created",
    message: `${actor.name} created draft appointment ${persistedAppointmentNumber} from ${task.title}.`,
    metadata: {
      appointmentId,
      appointmentNumber: persistedAppointmentNumber,
      appointmentTitle: title,
      reasonNotes: normalizedInput.reasonNotes
    },
    taskId: task.id
  });

  return {
    appointmentId,
    appointmentNumber: persistedAppointmentNumber,
    commandId: commandResult.command.id,
    commandStatus: commandResult.command.status,
    createdTaskLinkCount: commandResult.execution.createdTaskLinkCount,
    taskId: task.id
  };
}
