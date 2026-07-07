import type { Prisma } from "@prisma/client";

import type { AppointmentAutomationExecutionRecord } from "@/server/services/appointment-automation-operations-console";
import { prisma } from "@/server/db/client";

type RetryReplayAction = "RETRY" | "REPLAY";
type RetryReplayStatus =
  | "SUCCEEDED"
  | "FAILED_RETRYABLE"
  | "FAILED_TERMINAL"
  | "REVIEW_REQUIRED";

type SourceAppointmentRecord = {
  id: string;
  appointmentNumber: string;
  organizationId: string;
  locationId: string;
  ownerUserId: string | null;
  createdByUserId: string | null;
  title: string;
  schedulingTimezone: string;
  customerSnapshot: unknown;
  vehicleSnapshot: unknown;
  sourceSnapshot: unknown;
  completedAt: Date | null;
  outcomeCode: string | null;
  followUpDispositionCode: string | null;
  followUpNotes: string | null;
};

type ExistingFollowUpAppointmentRecord = {
  id: string;
  appointmentNumber: string;
  title: string;
};

type ExistingFollowUpTaskRecord = {
  taskId: string;
  taskTitle: string;
  linkCode: string;
};

export type AppointmentAutomationRetryReplayOutcome = {
  status: RetryReplayStatus;
  resultSnapshot: Record<string, unknown>;
  failureCode: string | null;
  failureMessage: string | null;
  nextRetryAt: Date | null;
};

export type AppointmentAutomationRetryReplayRepository = {
  findSourceAppointmentById(appointmentId: string): Promise<SourceAppointmentRecord | null>;
  findGeneratedFollowUpAppointment(
    sourceAppointmentId: string
  ): Promise<ExistingFollowUpAppointmentRecord | null>;
  findGeneratedFollowUpTask(
    sourceAppointmentId: string,
    automationRuleCode: string
  ): Promise<ExistingFollowUpTaskRecord | null>;
  createGeneratedFollowUpAppointment(input: {
    sourceAppointment: SourceAppointmentRecord;
    appointmentNumber: string;
    title: string;
    followUpNotes: string | null;
  }): Promise<ExistingFollowUpAppointmentRecord>;
  createGeneratedFollowUpTask(input: {
    sourceAppointment: SourceAppointmentRecord;
    actorUserId: string;
    automationRuleCode: string;
    taskTitle: string;
    workflowArea: string;
    boardDate: string;
    followUpDispositionCode: string;
    followUpNotes: string | null;
    linkCode: string;
  }): Promise<ExistingFollowUpTaskRecord>;
};

function asObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function addBusinessDays(date: Date, businessDays: number) {
  const result = new Date(date);
  let remaining = businessDays;

  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const day = result.getUTCDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }

  return result;
}

function inferTaskWorkflowArea(title: string, followUpDispositionCode: string) {
  const normalizedTitle = title.toLowerCase();

  if (followUpDispositionCode === "MANAGER_REVIEW_REQUIRED") {
    return "GENERAL_MANAGER";
  }

  if (
    normalizedTitle.includes("service") ||
    normalizedTitle.includes("repair") ||
    normalizedTitle.includes("oil")
  ) {
    return "SHOP";
  }

  if (
    normalizedTitle.includes("dmv") ||
    normalizedTitle.includes("title") ||
    normalizedTitle.includes("registration") ||
    normalizedTitle.includes("document")
  ) {
    return "ADMIN";
  }

  if (normalizedTitle.includes("collection") || normalizedTitle.includes("payment")) {
    return "COLLECTIONS";
  }

  if (normalizedTitle.includes("inventory") || normalizedTitle.includes("vendor")) {
    return "INVENTORY";
  }

  if (normalizedTitle.includes("marketing") || normalizedTitle.includes("listing")) {
    return "MARKETING";
  }

  if (normalizedTitle.includes("test drive") || normalizedTitle.includes("sales")) {
    return "SALES";
  }

  return "ADMIN";
}

function getAutomationRuleCode(execution: AppointmentAutomationExecutionRecord) {
  const resultSnapshot = asObject(execution.resultSnapshot);
  const inputSnapshot = asObject(execution.inputSnapshot);

  return (
    asString(resultSnapshot?.automationRuleCode) ?? asString(inputSnapshot?.automationRuleCode)
  );
}

function buildRetryReplayMetadata(input: {
  action: RetryReplayAction;
  execution: AppointmentAutomationExecutionRecord;
  createdAppointmentCount: number;
  createdTaskCount: number;
  existingAppointment: ExistingFollowUpAppointmentRecord | null;
  existingTask: ExistingFollowUpTaskRecord | null;
  generatedAppointment: ExistingFollowUpAppointmentRecord | null;
  generatedTask: ExistingFollowUpTaskRecord | null;
}) {
  return {
    ...asObject(input.execution.resultSnapshot),
    retryReplayAction: input.action,
    replayedAt: new Date().toISOString(),
    createdFollowUpAppointmentCount: input.createdAppointmentCount,
    createdFollowUpTaskCount: input.createdTaskCount,
    existingFollowUpAppointmentNumber: input.existingAppointment?.appointmentNumber ?? null,
    existingFollowUpTaskId: input.existingTask?.taskId ?? null,
    generatedFollowUpAppointmentNumber: input.generatedAppointment?.appointmentNumber ?? null,
    generatedFollowUpTaskId: input.generatedTask?.taskId ?? null
  };
}

function createFailureOutcome(input: {
  status: RetryReplayStatus;
  execution: AppointmentAutomationExecutionRecord;
  action: RetryReplayAction;
  failureCode: string;
  failureMessage: string;
  nextRetryAt?: Date | null;
}) {
  return {
    status: input.status,
    resultSnapshot: {
      ...asObject(input.execution.resultSnapshot),
      retryReplayAction: input.action,
      replayedAt: new Date().toISOString(),
      failureCode: input.failureCode,
      failureMessage: input.failureMessage
    },
    failureCode: input.failureCode,
    failureMessage: input.failureMessage,
    nextRetryAt: input.nextRetryAt ?? null
  } satisfies AppointmentAutomationRetryReplayOutcome;
}

function getFollowUpTaskTitle(appointmentNumber: string, followUpDispositionCode: string) {
  if (followUpDispositionCode === "CALLBACK_REQUIRED") {
    return `Callback required for appointment ${appointmentNumber}`;
  }

  if (followUpDispositionCode === "FOLLOW_UP_APPOINTMENT_REQUIRED") {
    return `Schedule follow-up appointment for ${appointmentNumber}`;
  }

  if (followUpDispositionCode === "MANAGER_REVIEW_REQUIRED") {
    return `Manager review required for appointment ${appointmentNumber}`;
  }

  return `Follow up on appointment ${appointmentNumber}`;
}

function getFollowUpAppointmentNumber(sourceAppointment: SourceAppointmentRecord, now: Date) {
  return `FUP-${sourceAppointment.appointmentNumber}-${now.getTime().toString(36).toUpperCase()}`;
}

function createDefaultRepository(): AppointmentAutomationRetryReplayRepository {
  type AppointmentDelegate = {
    findUnique: (input: unknown) => Promise<SourceAppointmentRecord | null>;
    findMany: (input: unknown) => Promise<Array<{
      id: string;
      appointmentNumber: string;
      title: string;
      purposeSnapshot: unknown;
      sourceReference: string | null;
    }>>;
    create: (input: unknown) => Promise<ExistingFollowUpAppointmentRecord>;
  };

  type AppointmentTaskLinkDelegate = {
    findMany: (input: unknown) => Promise<Array<{
      taskId: string;
      linkCode: string;
      task: { id: string; title: string } | null;
    }>>;
    create: (input: unknown) => Promise<{ taskId: string; linkCode: string }>;
  };

  type BoardDayDelegate = {
    upsert: (input: unknown) => Promise<{ id: string }>;
  };

  type TaskDelegate = {
    create: (input: unknown) => Promise<{ id: string; title: string }>;
  };

  const automationPrisma = prisma as unknown as {
    appointment: AppointmentDelegate;
    appointmentTaskLink: AppointmentTaskLinkDelegate;
    boardDay: BoardDayDelegate;
    task: TaskDelegate;
  };

  function toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  return {
    async findSourceAppointmentById(appointmentId) {
      return automationPrisma.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          id: true,
          appointmentNumber: true,
          organizationId: true,
          locationId: true,
          ownerUserId: true,
          createdByUserId: true,
          title: true,
          schedulingTimezone: true,
          customerSnapshot: true,
          vehicleSnapshot: true,
          sourceSnapshot: true,
          completedAt: true,
          outcomeCode: true,
          followUpDispositionCode: true,
          followUpNotes: true
        }
      });
    },
    async findGeneratedFollowUpAppointment(sourceAppointmentId) {
      const appointments = await automationPrisma.appointment.findMany({
        where: {
          sourceType: "AUTOMATION",
          sourceReference: sourceAppointmentId
        },
        select: {
          id: true,
          appointmentNumber: true,
          title: true,
          purposeSnapshot: true,
          sourceReference: true
        }
      });

      return (
        appointments.find((appointment) => {
          const purposeSnapshot = asObject(appointment.purposeSnapshot);
          return asString(purposeSnapshot?.automationRuleCode) === "APPOINTMENT_OUTCOME_FOLLOW_UP_APPOINTMENT";
        }) ?? null
      );
    },
    async findGeneratedFollowUpTask(sourceAppointmentId, automationRuleCode) {
      const links = await automationPrisma.appointmentTaskLink.findMany({
        where: {
          appointmentId: sourceAppointmentId,
          automationRuleCode
        },
        select: {
          taskId: true,
          linkCode: true,
          task: {
            select: {
              id: true,
              title: true
            }
          }
        }
      });

      const link = links[0];
      if (!link || !link.task) {
        return null;
      }

      return {
        taskId: link.task.id,
        taskTitle: link.task.title,
        linkCode: link.linkCode
      };
    },
    async createGeneratedFollowUpAppointment(input) {
      return automationPrisma.appointment.create({
        data: {
          appointmentNumber: input.appointmentNumber,
          organizationId: input.sourceAppointment.organizationId,
          locationId: input.sourceAppointment.locationId,
          ownerUserId: input.sourceAppointment.ownerUserId,
          createdByUserId: input.sourceAppointment.createdByUserId,
          sourceType: "AUTOMATION",
          sourceReference: input.sourceAppointment.id,
          title: input.title,
          schedulingTimezone: input.sourceAppointment.schedulingTimezone,
          startsAt: null,
          endsAt: null,
          bookingStatus: "DRAFT",
          version: 1,
          purposeSnapshot: toJsonValue({
            purposeCode: "FOLLOW_UP_APPOINTMENT",
            automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_APPOINTMENT",
            templateVersion: 1,
            sourceAppointmentId: input.sourceAppointment.id,
            sourceAppointmentNumber: input.sourceAppointment.appointmentNumber,
            followUpNotes: input.followUpNotes
          }),
          customerSnapshot: toJsonValue(input.sourceAppointment.customerSnapshot),
          vehicleSnapshot: toJsonValue(input.sourceAppointment.vehicleSnapshot),
          sourceSnapshot: toJsonValue({
            sourceAppointmentId: input.sourceAppointment.id,
            sourceAppointmentNumber: input.sourceAppointment.appointmentNumber,
            sourceTitle: input.sourceAppointment.title,
            followUpDispositionCode: input.sourceAppointment.followUpDispositionCode
          })
        },
        select: {
          id: true,
          appointmentNumber: true,
          title: true
        }
      });
    },
    async createGeneratedFollowUpTask(input) {
      const boardDay = await automationPrisma.boardDay.upsert({
        where: {
          date: new Date(`${input.boardDate}T00:00:00.000Z`)
        },
        update: {},
        create: {
          date: new Date(`${input.boardDate}T00:00:00.000Z`)
        },
        select: {
          id: true
        }
      });

      const dueAt = input.sourceAppointment.completedAt
        ? addBusinessDays(input.sourceAppointment.completedAt, 1)
        : addBusinessDays(new Date(), 1);
      const task = await automationPrisma.task.create({
        data: {
          boardDayId: boardDay.id,
          title: input.taskTitle,
          description: [
            `Auto-created from completed appointment ${input.sourceAppointment.appointmentNumber}: ${input.sourceAppointment.title}.`,
            `Follow-up disposition: ${input.followUpDispositionCode}.`,
            `Next step: ${input.followUpNotes ?? "Follow-up required from appointment outcome."}`
          ].join("\n"),
          assignedUserId: input.sourceAppointment.ownerUserId,
          createdByUserId: input.actorUserId,
          dueAt,
          requiresManagerApproval: input.followUpDispositionCode === "MANAGER_REVIEW_REQUIRED",
          vehicleReference: asString(asObject(input.sourceAppointment.vehicleSnapshot)?.displayName),
          customerReference: asString(asObject(input.sourceAppointment.customerSnapshot)?.displayName),
          sourceType: "MANAGER",
          templateSnapshot: toJsonValue({
            automationRuleCode: input.automationRuleCode,
            templateVersion: 1,
            source: "APPOINTMENT_OUTCOME"
          }),
          workflowArea: input.workflowArea,
          status: "NOT_STARTED"
        },
        select: {
          id: true,
          title: true
        }
      });

      await automationPrisma.appointmentTaskLink.create({
        data: {
          appointmentId: input.sourceAppointment.id,
          taskId: task.id,
          linkType: "FOLLOW_UP",
          linkCode: input.linkCode,
          title: "Outcome follow-up task",
          explanation: "Created automatically from final appointment outcome disposition.",
          isRequired: false,
          blocksAppointment: false,
          blocksTask: true,
          automationRuleCode: input.automationRuleCode,
          templateVersion: 1,
          createdByUserId: input.actorUserId
        }
      });

      return {
        taskId: task.id,
        taskTitle: task.title,
        linkCode: input.linkCode
      };
    }
  };
}

export async function runAppointmentAutomationRetryReplay(input: {
  action: RetryReplayAction;
  execution: AppointmentAutomationExecutionRecord;
  actorUserId: string;
  now?: Date;
  repository?: AppointmentAutomationRetryReplayRepository;
}): Promise<AppointmentAutomationRetryReplayOutcome> {
  const repository = input.repository ?? createDefaultRepository();
  const now = input.now ?? new Date();
  const automationRuleCode = getAutomationRuleCode(input.execution);

  if (!automationRuleCode) {
    return createFailureOutcome({
      status: "REVIEW_REQUIRED",
      execution: input.execution,
      action: input.action,
      failureCode: "AUTOMATION_RULE_NOT_RECORDED",
      failureMessage: "This automation execution does not include a replayable automation rule."
    });
  }

  if (input.execution.sourceType !== "APPOINTMENT" || !input.execution.sourceReference) {
    return createFailureOutcome({
      status: "FAILED_TERMINAL",
      execution: input.execution,
      action: input.action,
      failureCode: "SOURCE_REFERENCE_NOT_SUPPORTED",
      failureMessage: "Only appointment-sourced automation executions can be retried or replayed right now."
    });
  }

  const sourceAppointment = await repository.findSourceAppointmentById(
    input.execution.sourceReference
  );

  if (!sourceAppointment) {
    return createFailureOutcome({
      status: "FAILED_TERMINAL",
      execution: input.execution,
      action: input.action,
      failureCode: "SOURCE_APPOINTMENT_NOT_FOUND",
      failureMessage: "The source appointment for this automation execution no longer exists."
    });
  }

  if (automationRuleCode === "APPOINTMENT_OUTCOME_FOLLOW_UP_APPOINTMENT") {
    const existingAppointment = await repository.findGeneratedFollowUpAppointment(
      sourceAppointment.id
    );
    const generatedAppointment =
      existingAppointment ??
      (await repository.createGeneratedFollowUpAppointment({
        sourceAppointment,
        appointmentNumber:
          asString(asObject(input.execution.resultSnapshot)?.generatedAppointmentNumber) ??
          getFollowUpAppointmentNumber(sourceAppointment, now),
        title:
          asString(asObject(input.execution.resultSnapshot)?.generatedAppointmentTitle) ??
          `Follow-up: ${sourceAppointment.title}`,
        followUpNotes: sourceAppointment.followUpNotes
      }));

    return {
      status: "SUCCEEDED",
      resultSnapshot: buildRetryReplayMetadata({
        action: input.action,
        execution: input.execution,
        createdAppointmentCount: existingAppointment ? 0 : 1,
        createdTaskCount: 0,
        existingAppointment,
        existingTask: null,
        generatedAppointment,
        generatedTask: null
      }),
      failureCode: null,
      failureMessage: null,
      nextRetryAt: null
    };
  }

  if (automationRuleCode === "APPOINTMENT_OUTCOME_FOLLOW_UP_TASK") {
    if (!sourceAppointment.ownerUserId) {
      return createFailureOutcome({
        status: "REVIEW_REQUIRED",
        execution: input.execution,
        action: input.action,
        failureCode: "SOURCE_OWNER_REQUIRED",
        failureMessage: "The source appointment no longer has an owner for follow-up task routing."
      });
    }

    const existingTask = await repository.findGeneratedFollowUpTask(
      sourceAppointment.id,
      automationRuleCode
    );
    const followUpDispositionCode =
      sourceAppointment.followUpDispositionCode ?? "FOLLOW_UP_REQUIRED";
    const generatedTask =
      existingTask ??
      (await repository.createGeneratedFollowUpTask({
        sourceAppointment,
        actorUserId: input.actorUserId,
        automationRuleCode,
        taskTitle:
          asString(asObject(input.execution.resultSnapshot)?.generatedTaskTitle) ??
          getFollowUpTaskTitle(sourceAppointment.appointmentNumber, followUpDispositionCode),
        workflowArea:
          asString(asObject(input.execution.resultSnapshot)?.workflowArea) ??
          inferTaskWorkflowArea(sourceAppointment.title, followUpDispositionCode),
        boardDate:
          asString(asObject(input.execution.resultSnapshot)?.generatedTaskBoardDate) ??
          addBusinessDays(sourceAppointment.completedAt ?? now, 1).toISOString().slice(0, 10),
        followUpDispositionCode,
        followUpNotes: sourceAppointment.followUpNotes,
        linkCode:
          asString(asObject(input.execution.inputSnapshot)?.followUpLinkCode) ??
          `OUTCOME_${followUpDispositionCode}`
      }));

    return {
      status: "SUCCEEDED",
      resultSnapshot: buildRetryReplayMetadata({
        action: input.action,
        execution: input.execution,
        createdAppointmentCount: 0,
        createdTaskCount: existingTask ? 0 : 1,
        existingAppointment: null,
        existingTask,
        generatedAppointment: null,
        generatedTask
      }),
      failureCode: null,
      failureMessage: null,
      nextRetryAt: null
    };
  }

  return createFailureOutcome({
    status: "REVIEW_REQUIRED",
    execution: input.execution,
    action: input.action,
    failureCode: "AUTOMATION_RULE_NOT_SUPPORTED",
    failureMessage: `Automation rule ${automationRuleCode} is not supported by the retry/replay engine yet.`
  });
}
