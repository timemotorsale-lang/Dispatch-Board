import type { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { getInitialAppointmentTemplateDefinition } from "@/server/appointments/appointment-template-domain";
import { prisma } from "@/server/db/client";
import { recordBoardActivityEvent } from "@/server/services/activity-feed";
import {
  createAppointmentAutomationOperationsRepository,
  type AppointmentAutomationOperationsRepository,
  type AppointmentAutomationRuleRecord
} from "@/server/services/appointment-automation-operations-console";
import {
  createAppointmentDraftFromTask,
  type TaskAppointmentDraftResult
} from "@/server/services/task-appointment-service";
import { getTaskReadModelById, type TaskReadModel } from "@/server/services/task-read";

type TaskAppointmentAutomationRuleExecution = {
  automationRuleCode: string;
  automationRuleVersion: number;
  purposeCode: string;
  status:
    | "SUCCEEDED"
    | "SKIPPED"
    | "REVIEW_REQUIRED"
    | "FAILED_RETRYABLE"
    | "FAILED_TERMINAL";
  appointmentId: string | null;
  appointmentNumber: string | null;
  failureCode: string | null;
  failureMessage: string | null;
};

export type TaskAppointmentAutomationResult = {
  taskId: string;
  triggerCode: string;
  evaluatedRuleCount: number;
  createdAppointmentCount: number;
  executions: TaskAppointmentAutomationRuleExecution[];
};

type ExistingAutomatedAppointmentRecord = {
  id: string;
  appointmentNumber: string;
  title: string;
};

type TaskAppointmentAutomationRepository = {
  findExistingAutomatedAppointment(
    taskId: string,
    automationRuleCode: string
  ): Promise<ExistingAutomatedAppointmentRecord | null>;
};

type TaskAppointmentAutomationDependencies = {
  automationRepository?: AppointmentAutomationOperationsRepository;
  appointmentRepository?: TaskAppointmentAutomationRepository;
  appointmentDraftCreator?: typeof createAppointmentDraftFromTask;
  now?: Date;
  recordActivity?: typeof recordBoardActivityEvent;
  taskReader?: (user: AuthenticatedUser | null, taskId: string) => Promise<TaskReadModel | null>;
};

function readRuleVersion(rule: AppointmentAutomationRuleRecord) {
  if (
    rule.validationSnapshot &&
    typeof rule.validationSnapshot === "object" &&
    !Array.isArray(rule.validationSnapshot)
  ) {
    const version = (rule.validationSnapshot as Record<string, unknown>).version;
    if (typeof version === "number" && version > 0) {
      return version;
    }
  }

  return 1;
}

function normalizeTriggerCode(triggerCode: string) {
  const normalized = triggerCode.trim().toUpperCase();

  if (!normalized) {
    throw new Error("Task appointment automation trigger code is required.");
  }

  return normalized;
}

function buildReasonNotes(input: {
  reasonNotes?: string | null;
  triggerCode: string;
  task: TaskReadModel;
}) {
  if (input.reasonNotes?.trim()) {
    return input.reasonNotes.trim();
  }

  if (input.triggerCode === "BLOCKED_TASK_REVIEW") {
    return `Automation created a review appointment because task "${input.task.title}" was blocked${input.task.blockerReason ? `: ${input.task.blockerReason}` : "."}`;
  }

  if (input.triggerCode === "ESCALATION_TASK_REVIEW") {
    return `Automation created a review appointment because task "${input.task.title}" moved to ready for review.`;
  }

  return `Automation created an appointment from task "${input.task.title}" after trigger ${input.triggerCode}.`;
}

function buildFailureClassification(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected automation failure.";
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("permission") ||
    normalizedMessage.includes("not found") ||
    normalizedMessage.includes("required") ||
    normalizedMessage.includes("valid")
  ) {
    return {
      status: "REVIEW_REQUIRED" as const,
      failureCode: "TASK_AUTOMATION_REVIEW_REQUIRED",
      failureMessage: message
    };
  }

  return {
    status: "FAILED_RETRYABLE" as const,
    failureCode: "TASK_AUTOMATION_RUNTIME_FAILURE",
    failureMessage: message
  };
}

function getRuleAuthorityRejection(input: {
  rule: AppointmentAutomationRuleRecord;
  triggerCode: string;
}) {
  const purpose = getInitialAppointmentTemplateDefinition(input.rule.purposeCode);

  if (!purpose) {
    return {
      failureCode: "TASK_AUTOMATION_RULE_NOT_AUTHORIZED",
      failureMessage: `Automation rule ${input.rule.ruleCode} references unknown purpose ${input.rule.purposeCode}.`
    };
  }

  if (!purpose.isActive) {
    return {
      failureCode: "TASK_AUTOMATION_RULE_NOT_AUTHORIZED",
      failureMessage: `Automation rule ${input.rule.ruleCode} references inactive purpose ${input.rule.purposeCode}.`
    };
  }

  if (!purpose.automationTriggers.includes(input.triggerCode)) {
    return {
      failureCode: "TASK_AUTOMATION_RULE_NOT_AUTHORIZED",
      failureMessage: `Automation rule ${input.rule.ruleCode} is not authorized for trigger ${input.triggerCode}.`
    };
  }

  return null;
}

function buildRuleResultSnapshot(input: {
  automationRuleCode: string;
  automationRuleVersion: number;
  purposeCode: string;
  triggerCode: string;
  task: TaskReadModel;
  appointmentResult?: TaskAppointmentDraftResult | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  status: TaskAppointmentAutomationRuleExecution["status"];
  existingAppointment?: ExistingAutomatedAppointmentRecord | null;
}) {
  return {
    automationRuleCode: input.automationRuleCode,
    automationRuleVersion: input.automationRuleVersion,
    purposeCode: input.purposeCode,
    triggerCode: input.triggerCode,
    sourceTaskId: input.task.id,
    sourceTaskTitle: input.task.title,
    sourceTaskStatus: input.task.status,
    generatedAppointmentId: input.appointmentResult?.appointmentId ?? input.existingAppointment?.id ?? null,
    generatedAppointmentNumber:
      input.appointmentResult?.appointmentNumber ??
      input.existingAppointment?.appointmentNumber ??
      null,
    generatedAppointmentTitle: input.existingAppointment?.title ?? null,
    failureCode: input.failureCode ?? null,
    failureMessage: input.failureMessage ?? null,
    status: input.status
  };
}

function buildActivityMessage(input: {
  status: TaskAppointmentAutomationRuleExecution["status"];
  task: TaskReadModel;
  automationRuleCode: string;
  appointmentNumber?: string | null;
  failureMessage?: string | null;
}) {
  if (input.status === "SUCCEEDED") {
    return `Automation created appointment ${input.appointmentNumber ?? "draft"} from ${input.task.title}.`;
  }

  if (input.status === "SKIPPED") {
    return `Automation skipped duplicate appointment creation for ${input.task.title}.`;
  }

  return `Automation needs review for ${input.task.title}: ${input.failureMessage ?? input.automationRuleCode}.`;
}

function createDefaultAppointmentRepository(): TaskAppointmentAutomationRepository {
  type AppointmentDelegate = {
    findMany: (input: unknown) => Promise<
      Array<{
        id: string;
        appointmentNumber: string;
        title: string;
        sourceReference: string | null;
        purposeSnapshot: unknown;
        sourceSnapshot: unknown;
      }>
    >;
  };

  const automationPrisma = prisma as unknown as {
    appointment: AppointmentDelegate;
  };

  return {
    async findExistingAutomatedAppointment(taskId, automationRuleCode) {
      const appointments = await automationPrisma.appointment.findMany({
        where: {
          organizationId: INITIAL_ORGANIZATION.id,
          sourceType: "AUTOMATION",
          sourceReference: taskId
        },
        select: {
          id: true,
          appointmentNumber: true,
          title: true,
          sourceReference: true,
          purposeSnapshot: true,
          sourceSnapshot: true
        }
      });

      return (
        appointments.find((appointment) => {
          const purposeSnapshot =
            appointment.purposeSnapshot &&
            typeof appointment.purposeSnapshot === "object" &&
            !Array.isArray(appointment.purposeSnapshot)
              ? (appointment.purposeSnapshot as Record<string, unknown>)
              : null;
          const sourceSnapshot =
            appointment.sourceSnapshot &&
            typeof appointment.sourceSnapshot === "object" &&
            !Array.isArray(appointment.sourceSnapshot)
              ? (appointment.sourceSnapshot as Record<string, unknown>)
              : null;

          return (
            purposeSnapshot?.automationRuleCode === automationRuleCode ||
            sourceSnapshot?.automationRuleCode === automationRuleCode
          );
        }) ?? null
      );
    }
  };
}

export async function runTaskAppointmentAutomationForTaskEvent(
  user: AuthenticatedUser | null,
  input: {
    reasonNotes?: string | null;
    taskId: string;
    triggerCode: string;
  },
  dependencies: TaskAppointmentAutomationDependencies = {}
): Promise<TaskAppointmentAutomationResult> {
  if (!user) {
    throw new Error("Authentication required.");
  }

  const triggerCode = normalizeTriggerCode(input.triggerCode);
  const taskId = input.taskId.trim();

  if (!taskId) {
    throw new Error("Task appointment automation task id is required.");
  }

  const automationRepository =
    dependencies.automationRepository ?? createAppointmentAutomationOperationsRepository();
  const appointmentRepository =
    dependencies.appointmentRepository ?? createDefaultAppointmentRepository();
  const taskReader = dependencies.taskReader ?? getTaskReadModelById;
  const recordActivity = dependencies.recordActivity ?? recordBoardActivityEvent;
  const appointmentDraftCreator =
    dependencies.appointmentDraftCreator ?? createAppointmentDraftFromTask;
  const task = await taskReader(user, taskId);

  if (!task) {
    throw new Error("Task not found.");
  }

  const rules = (await automationRepository.listRules(INITIAL_ORGANIZATION.id)).filter(
    (rule) => rule.status === "ACTIVE" && rule.triggerCode === triggerCode
  );
  const executions: TaskAppointmentAutomationRuleExecution[] = [];

  for (const rule of rules) {
    const automationRuleVersion = readRuleVersion(rule);
    const authorityRejection = getRuleAuthorityRejection({
      rule,
      triggerCode
    });

    if (authorityRejection) {
      await automationRepository.recordExecution({
        ruleCode: rule.ruleCode,
        triggerCode,
        purposeCode: rule.purposeCode,
        sourceType: "TASK",
        sourceReference: task.id,
        status: "REVIEW_REQUIRED",
        actorUserId: user.id,
        reason: "Reject task-to-appointment automation because rule authority is not allowed for this trigger and purpose.",
        inputSnapshot: {
          automationRuleCode: rule.ruleCode,
          automationRuleVersion,
          catalogVersionId: rule.catalogVersionId,
          triggerCode,
          sourceTaskId: task.id,
          sourceTaskTitle: task.title
        },
        resultSnapshot: buildRuleResultSnapshot({
          automationRuleCode: rule.ruleCode,
          automationRuleVersion,
          purposeCode: rule.purposeCode,
          triggerCode,
          task,
          status: "REVIEW_REQUIRED",
          failureCode: authorityRejection.failureCode,
          failureMessage: authorityRejection.failureMessage
        }),
        failureCode: authorityRejection.failureCode,
        failureMessage: authorityRejection.failureMessage
      });

      await recordActivity({
        actorUserId: user.id,
        boardDayId: task.boardDayId,
        eventType: "task.appointment_automation_review_required",
        message: buildActivityMessage({
          status: "REVIEW_REQUIRED",
          task,
          automationRuleCode: rule.ruleCode,
          failureMessage: authorityRejection.failureMessage
        }),
        metadata: {
          automationRuleCode: rule.ruleCode,
          automationRuleVersion,
          triggerCode,
          failureCode: authorityRejection.failureCode,
          failureMessage: authorityRejection.failureMessage
        } as Prisma.InputJsonValue,
        taskId: task.id
      });

      executions.push({
        automationRuleCode: rule.ruleCode,
        automationRuleVersion,
        purposeCode: rule.purposeCode,
        status: "REVIEW_REQUIRED",
        appointmentId: null,
        appointmentNumber: null,
        failureCode: authorityRejection.failureCode,
        failureMessage: authorityRejection.failureMessage
      });
      continue;
    }

    const existingAppointment = await appointmentRepository.findExistingAutomatedAppointment(
      task.id,
      rule.ruleCode
    );

    if (existingAppointment) {
      await automationRepository.recordExecution({
        ruleCode: rule.ruleCode,
        triggerCode,
        purposeCode: rule.purposeCode,
        sourceType: "TASK",
        sourceReference: task.id,
        status: "SKIPPED",
        actorUserId: user.id,
        reason: "Skip duplicate task automation because a generated appointment already exists.",
        inputSnapshot: {
          automationRuleCode: rule.ruleCode,
          automationRuleVersion,
          catalogVersionId: rule.catalogVersionId,
          triggerCode,
          sourceTaskId: task.id,
          sourceTaskTitle: task.title
        },
        resultSnapshot: buildRuleResultSnapshot({
          automationRuleCode: rule.ruleCode,
          automationRuleVersion,
          purposeCode: rule.purposeCode,
          triggerCode,
          task,
          status: "SKIPPED",
          existingAppointment
        })
      });

      await recordActivity({
        actorUserId: user.id,
        boardDayId: task.boardDayId,
        eventType: "task.appointment_automation_skipped",
        message: buildActivityMessage({
          status: "SKIPPED",
          task,
          automationRuleCode: rule.ruleCode
        }),
        metadata: {
          automationRuleCode: rule.ruleCode,
          automationRuleVersion,
          triggerCode,
          appointmentId: existingAppointment.id,
          appointmentNumber: existingAppointment.appointmentNumber
        } as Prisma.InputJsonValue,
        taskId: task.id
      });

      executions.push({
        automationRuleCode: rule.ruleCode,
        automationRuleVersion,
        purposeCode: rule.purposeCode,
        status: "SKIPPED",
        appointmentId: existingAppointment.id,
        appointmentNumber: existingAppointment.appointmentNumber,
        failureCode: null,
        failureMessage: null
      });
      continue;
    }

    try {
      const appointmentResult = await appointmentDraftCreator(
        user,
        task.id,
        {
          reasonNotes: buildReasonNotes({
            reasonNotes: input.reasonNotes,
            triggerCode,
            task
          }),
          title: `${rule.name}: ${task.title}`
        },
        {
          now: dependencies.now,
          recordActivity,
          taskReader: async () => task,
          draftOptions: {
            sourceType: "AUTOMATION",
            purposeCode: rule.purposeCode,
            automationRuleCode: rule.ruleCode,
            automationRuleVersion,
            triggerCode,
            activityEventType: "task.appointment_automation_created",
            activityMessage: buildActivityMessage({
              status: "SUCCEEDED",
              task,
              automationRuleCode: rule.ruleCode,
              appointmentNumber: null
            }),
            metadata: {
              purposeCode: rule.purposeCode,
              catalogVersionId: rule.catalogVersionId
            }
          }
        }
      );

      await automationRepository.recordExecution({
        ruleCode: rule.ruleCode,
        triggerCode,
        purposeCode: rule.purposeCode,
        sourceType: "TASK",
        sourceReference: task.id,
        status: "SUCCEEDED",
        actorUserId: user.id,
        reason: "Record successful task-to-appointment automation execution.",
        inputSnapshot: {
          automationRuleCode: rule.ruleCode,
          automationRuleVersion,
          catalogVersionId: rule.catalogVersionId,
          triggerCode,
          sourceTaskId: task.id,
          sourceTaskTitle: task.title
        },
        resultSnapshot: buildRuleResultSnapshot({
          automationRuleCode: rule.ruleCode,
          automationRuleVersion,
          purposeCode: rule.purposeCode,
          triggerCode,
          task,
          appointmentResult,
          status: "SUCCEEDED"
        })
      });

      executions.push({
        automationRuleCode: rule.ruleCode,
        automationRuleVersion,
        purposeCode: rule.purposeCode,
        status: "SUCCEEDED",
        appointmentId: appointmentResult.appointmentId,
        appointmentNumber: appointmentResult.appointmentNumber,
        failureCode: null,
        failureMessage: null
      });
    } catch (error) {
      const failure = buildFailureClassification(error);

      await automationRepository.recordExecution({
        ruleCode: rule.ruleCode,
        triggerCode,
        purposeCode: rule.purposeCode,
        sourceType: "TASK",
        sourceReference: task.id,
        status: failure.status,
        actorUserId: user.id,
        reason: "Record failed task-to-appointment automation execution for review or replay.",
        inputSnapshot: {
          automationRuleCode: rule.ruleCode,
          automationRuleVersion,
          catalogVersionId: rule.catalogVersionId,
          triggerCode,
          sourceTaskId: task.id,
          sourceTaskTitle: task.title
        },
        resultSnapshot: buildRuleResultSnapshot({
          automationRuleCode: rule.ruleCode,
          automationRuleVersion,
          purposeCode: rule.purposeCode,
          triggerCode,
          task,
          status: failure.status,
          failureCode: failure.failureCode,
          failureMessage: failure.failureMessage
        }),
        failureCode: failure.failureCode,
        failureMessage: failure.failureMessage
      });

      await recordActivity({
        actorUserId: user.id,
        boardDayId: task.boardDayId,
        eventType: "task.appointment_automation_review_required",
        message: buildActivityMessage({
          status: failure.status,
          task,
          automationRuleCode: rule.ruleCode,
          failureMessage: failure.failureMessage
        }),
        metadata: {
          automationRuleCode: rule.ruleCode,
          automationRuleVersion,
          triggerCode,
          failureCode: failure.failureCode,
          failureMessage: failure.failureMessage
        } as Prisma.InputJsonValue,
        taskId: task.id
      });

      executions.push({
        automationRuleCode: rule.ruleCode,
        automationRuleVersion,
        purposeCode: rule.purposeCode,
        status: failure.status,
        appointmentId: null,
        appointmentNumber: null,
        failureCode: failure.failureCode,
        failureMessage: failure.failureMessage
      });
    }
  }

  return {
    taskId: task.id,
    triggerCode,
    evaluatedRuleCount: rules.length,
    createdAppointmentCount: executions.filter((execution) => execution.status === "SUCCEEDED")
      .length,
    executions
  };
}
