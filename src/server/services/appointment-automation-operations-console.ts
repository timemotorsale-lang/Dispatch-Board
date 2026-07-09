import type { Prisma } from "@prisma/client";

import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { canManageSettings } from "@/server/policies/access";
import {
  getAppointmentCatalogAutomationAdminForManager,
  simulateAppointmentCatalogAutomation,
  type AppointmentCatalogAutomationAdmin
} from "@/server/services/appointment-catalog-automation-admin";
import { runAppointmentAutomationRetryReplay } from "@/server/services/appointment-automation-retry-replay-engine";

type RuleStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "RETIRED";
type RuleAction = "DRAFT_CREATED" | "DRAFT_UPDATED" | "ACTIVATED" | "PAUSED" | "RETIRED" | "SIMULATED";
type ExecutionStatus =
  | "PENDING"
  | "REVIEW_REQUIRED"
  | "SUCCEEDED"
  | "FAILED_RETRYABLE"
  | "FAILED_TERMINAL"
  | "SKIPPED"
  | "RESOLVED";
type ExecutionAction =
  | "QUEUED"
  | "SIMULATED"
  | "FAILED"
  | "RETRIED"
  | "REPLAYED"
  | "REVIEW_CREATED"
  | "RESOLVED"
  | "SKIPPED";

export type AppointmentAutomationRuleRecord = {
  id: string;
  organizationId: string;
  catalogVersionId: string | null;
  ruleCode: string;
  name: string;
  description: string | null;
  triggerCode: string;
  purposeCode: string;
  status: RuleStatus;
  priority: number;
  missingInputBehavior: string;
  validationSnapshot: unknown;
  simulationSnapshot: unknown;
  reason: string;
  createdByUserId: string | null;
  activatedByUserId: string | null;
  activatedAt: Date | null;
  pausedAt: Date | null;
  retiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AppointmentAutomationExecutionRecord = {
  id: string;
  organizationId: string;
  automationRuleId: string | null;
  triggerCode: string;
  purposeCode: string | null;
  status: ExecutionStatus;
  sourceType: string;
  sourceReference: string | null;
  inputSnapshot: unknown;
  resultSnapshot: unknown;
  failureCode: string | null;
  failureMessage: string | null;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt: Date | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AppointmentAutomationEventRecord = {
  id: string;
  automationRuleId?: string | null;
  automationExecutionId?: string | null;
  action: RuleAction | ExecutionAction;
  reason: string;
  actorUserId: string | null;
  priorSnapshot?: unknown;
  newSnapshot?: unknown;
  occurredAt: Date;
};

export type AppointmentAutomationOperationsRepository = {
  listRules(organizationId: string): Promise<AppointmentAutomationRuleRecord[]>;
  listExecutions(organizationId: string): Promise<AppointmentAutomationExecutionRecord[]>;
  getExecutionById(executionId: string): Promise<AppointmentAutomationExecutionRecord | null>;
  listRuleEvents(organizationId: string, limit: number): Promise<AppointmentAutomationEventRecord[]>;
  listExecutionEvents(organizationId: string, limit: number): Promise<AppointmentAutomationEventRecord[]>;
  recordExecution(input: AutomationExecutionRecordInput): Promise<AppointmentAutomationExecutionRecord>;
  finalizeExecution(input: {
    executionId: string;
    status: Exclude<ExecutionStatus, "PENDING" | "RESOLVED" | "SKIPPED">;
    reason: string;
    actorUserId: string;
    resultSnapshot?: unknown;
    failureCode?: string | null;
    failureMessage?: string | null;
    nextRetryAt?: Date | null;
    eventAction?: "RETRIED" | "REPLAYED" | "FAILED" | "REVIEW_CREATED" | null;
  }): Promise<AppointmentAutomationExecutionRecord>;
  upsertRuleDraft(input: RuleMutationInput & {
    actorUserId: string;
    catalogVersionId: string | null;
    validation: RuleValidation;
    simulation: unknown;
  }): Promise<AppointmentAutomationRuleRecord>;
  transitionRule(input: RuleTransitionInput & { actorUserId: string }): Promise<AppointmentAutomationRuleRecord>;
  transitionExecution(input: ExecutionTransitionInput & { actorUserId: string }): Promise<AppointmentAutomationExecutionRecord>;
};

export type RuleMutationInput = {
  ruleCode: string;
  triggerCode: string;
  purposeCode: string;
  name: string;
  description?: string | null;
  priority?: number;
  reason: string;
};

export type RuleTransitionInput = {
  ruleCode: string;
  action: "ACTIVATE" | "PAUSE" | "RETIRE";
  reason: string;
};

export type ExecutionTransitionInput = {
  executionId: string;
  action: "RETRY" | "REPLAY" | "RESOLVE" | "SKIP";
  reason: string;
};

export type AutomationExecutionRecordInput = {
  ruleCode?: string | null;
  triggerCode: string;
  purposeCode?: string | null;
  sourceType: string;
  sourceReference?: string | null;
  inputSnapshot: unknown;
  resultSnapshot?: unknown;
  status?: ExecutionStatus;
  failureCode?: string | null;
  failureMessage?: string | null;
  attemptCount?: number;
  maxAttempts?: number;
  nextRetryAt?: Date | null;
  actorUserId?: string | null;
  reason: string;
};

function assertCanManageAutomation(user: AuthenticatedUser | null): asserts user is AuthenticatedUser {
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (!canManageSettings(user)) {
    throw new Error("Manager access required.");
  }
}

function normalizeCode(value: unknown, label: string) {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function normalizeReason(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (normalized.length < 8) {
    throw new Error("A documented reason of at least 8 characters is required.");
  }

  return normalized;
}

function normalizeText(value: unknown, label: string) {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function withResolvedRuleSnapshotContext(input: {
  snapshot: unknown;
  resolvedRule: AppointmentAutomationRuleRecord | null;
  fallbackRuleCode: string | null;
}) {
  const snapshot = isPlainObject(input.snapshot) ? input.snapshot : {};

  return {
    ...snapshot,
    automationRuleCode:
      (typeof snapshot.automationRuleCode === "string" && snapshot.automationRuleCode) ||
      input.resolvedRule?.ruleCode ||
      input.fallbackRuleCode ||
      null,
    automationRuleVersion:
      (typeof snapshot.automationRuleVersion === "number" && snapshot.automationRuleVersion) ||
      (input.resolvedRule ? versionFromSnapshot(input.resolvedRule.validationSnapshot) : null),
    catalogVersionId:
      (typeof snapshot.catalogVersionId === "string" && snapshot.catalogVersionId) ||
      input.resolvedRule?.catalogVersionId ||
      null
  };
}

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validateRule(input: {
  ruleCode: string;
  triggerCode: string;
  purposeCode: string;
  catalog: AppointmentCatalogAutomationAdmin;
}) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const purpose = input.catalog.purposes.find((candidate) => candidate.code === input.purposeCode);
  const triggerExists = input.catalog.automationRules.some(
    (rule) => rule.trigger === input.triggerCode && rule.purposeCode === input.purposeCode
  );

  if (!purpose) {
    errors.push(`Purpose ${input.purposeCode} is not configured.`);
  }

  if (!triggerExists) {
    warnings.push(`Trigger ${input.triggerCode} is not a catalog hook for ${input.purposeCode}.`);
  }

  if (input.catalog.versioning.displayedSource === "DRAFT") {
    warnings.push("Rule is being evaluated against a draft catalog version.");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

type RuleValidation = ReturnType<typeof validateRule> & { missingInputBehavior: string };
type RuleSimulation = ReturnType<typeof simulateAppointmentCatalogAutomation>;

function versionFromSnapshot(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return 1;
  }

  const version = (value as Record<string, unknown>).version;

  return typeof version === "number" && version > 0 ? version : 1;
}

function simulationForPurpose(purposeCode: string, catalog: AppointmentCatalogAutomationAdmin) {
  const purpose = catalog.purposes.find((candidate) => candidate.code === purposeCode);

  return purpose
    ? simulateAppointmentCatalogAutomation(
        {
          purposeCode,
          outcomeCode: purpose.outcomeCodes[0] ?? "COMPLETED",
          followUpDispositionCode: purpose.followUpDispositionCodes[0] ?? "NO_FOLLOW_UP_REQUIRED"
        },
        catalog
      )
    : null;
}

function baselineRuleCandidates(catalog: AppointmentCatalogAutomationAdmin) {
  return catalog.automationRules.map((rule) => ({
    id: `candidate-${rule.id}`,
    organizationId: INITIAL_ORGANIZATION.id,
    catalogVersionId: catalog.versioning.displayedVersion.id,
    ruleCode: `${rule.purposeCode}-${rule.trigger}`.replace(/[^A-Z0-9]+/g, "-"),
    name: `${rule.purposeName} automation`,
    description: `Candidate rule for ${formatLabel(rule.trigger)}.`,
    triggerCode: rule.trigger,
    purposeCode: rule.purposeCode,
    status: "DRAFT" as RuleStatus,
    priority: 100,
    missingInputBehavior: rule.missingInputBehavior,
    validationSnapshot: {
      ...validateRule({
        ruleCode: `${rule.purposeCode}-${rule.trigger}`,
        triggerCode: rule.trigger,
        purposeCode: rule.purposeCode,
        catalog
      }),
      version: 1
    },
    simulationSnapshot: {
      ...simulationForPurpose(rule.purposeCode, catalog),
      version: 1,
      catalogVersionId: catalog.versioning.displayedVersion.id
    },
    reason: "Catalog-derived candidate rule.",
    createdByUserId: null,
    activatedByUserId: null,
    activatedAt: null,
    pausedAt: null,
    retiredAt: null,
    createdAt: new Date("2026-07-06T00:00:00.000Z"),
    updatedAt: new Date("2026-07-06T00:00:00.000Z")
  }));
}

function readRuleValidation(rule: AppointmentAutomationRuleRecord) {
  const validation = rule.validationSnapshot as
    | { isValid?: boolean; errors?: string[]; warnings?: string[] }
    | null;

  return {
    isValid: Boolean(validation?.isValid ?? true),
    errors: validation?.errors ?? [],
    warnings: validation?.warnings ?? []
  };
}

function readRuleSimulation(rule: AppointmentAutomationRuleRecord) {
  return isPlainObject(rule.simulationSnapshot) ? (rule.simulationSnapshot as RuleSimulation) : null;
}

function summarizeRuleActivation(rule: AppointmentAutomationRuleRecord) {
  const validation = readRuleValidation(rule);
  const simulation = readRuleSimulation(rule);
  const blockers: string[] = [];
  const isCandidate = rule.id.startsWith("candidate-");

  if (isCandidate) {
    blockers.push("Save this catalog candidate as a persisted draft before activation.");
  }

  if (!validation.isValid) {
    blockers.push("Rule validation must pass before activation.");
  }

  if (!simulation) {
    blockers.push("Simulation evidence is required before activation.");
  }

  if (rule.status === "ACTIVE") {
    blockers.push("Rule is already active.");
  }

  return {
    canActivate: blockers.length === 0,
    blockers,
    warnings: validation.warnings
  };
}

function summarizeRule(rule: AppointmentAutomationRuleRecord) {
  const validation = readRuleValidation(rule);
  const simulation = readRuleSimulation(rule);
  const activation = summarizeRuleActivation(rule);
  const isCandidate = rule.id.startsWith("candidate-");
  const version = versionFromSnapshot(rule.validationSnapshot);

  return {
    id: rule.id,
    ruleCode: rule.ruleCode,
    version,
    name: rule.name,
    description: rule.description,
    triggerCode: rule.triggerCode,
    purposeCode: rule.purposeCode,
    catalogVersionId: rule.catalogVersionId,
    status: rule.status,
    priority: rule.priority,
    missingInputBehavior: rule.missingInputBehavior,
    source: isCandidate ? ("CATALOG_CANDIDATE" as const) : ("CONFIGURED_RULE" as const),
    validation,
    simulation: simulation
      ? {
          hasEvidence: true,
          warningCount: simulation.validation.warnings.length,
          generatedTaskCount: simulation.actions.generatedTaskActions.length,
          generatesFollowUpAppointment: Boolean(simulation.actions.generatedAppointmentAction),
          generatedFollowUpAppointmentStatus:
            simulation.actions.generatedAppointmentAction?.status ?? null,
          managerReviewRequired: simulation.actions.managerReviewRequired,
          missingInputBehavior: simulation.missingInputBehavior.behavior,
          blockedByMissingInput: simulation.missingInputBehavior.blocked
        }
      : {
          hasEvidence: false,
          warningCount: 0,
          generatedTaskCount: 0,
          generatesFollowUpAppointment: false,
          generatedFollowUpAppointmentStatus: null,
          managerReviewRequired: false,
          missingInputBehavior: rule.missingInputBehavior,
          blockedByMissingInput: false
        },
    activation,
    lifecycle: {
      canPause: !isCandidate && rule.status === "ACTIVE",
      canRetire: !isCandidate && rule.status !== "RETIRED"
    },
    reason: rule.reason,
    activatedAt: toIso(rule.activatedAt),
    pausedAt: toIso(rule.pausedAt),
    retiredAt: toIso(rule.retiredAt),
    updatedAt: rule.updatedAt.toISOString()
  };
}

function mergeVisibleRules(
  persistedRules: AppointmentAutomationRuleRecord[],
  catalog: AppointmentCatalogAutomationAdmin
) {
  const byRuleCode = new Map<string, AppointmentAutomationRuleRecord>();

  for (const rule of persistedRules) {
    byRuleCode.set(rule.ruleCode, rule);
  }

  for (const candidate of baselineRuleCandidates(catalog)) {
    if (!byRuleCode.has(candidate.ruleCode)) {
      byRuleCode.set(candidate.ruleCode, candidate);
    }
  }

  return Array.from(byRuleCode.values()).sort((left, right) => {
    const leftIsCandidate = left.id.startsWith("candidate-");
    const rightIsCandidate = right.id.startsWith("candidate-");

    if (leftIsCandidate !== rightIsCandidate) {
      return leftIsCandidate ? 1 : -1;
    }

    if (left.status !== right.status) {
      return left.status.localeCompare(right.status);
    }

    if (left.priority !== right.priority) {
      return left.priority - right.priority;
    }

    return left.ruleCode.localeCompare(right.ruleCode);
  });
}

function summarizeExecution(execution: AppointmentAutomationExecutionRecord) {
  const inputSnapshot =
    execution.inputSnapshot && typeof execution.inputSnapshot === "object"
      ? (execution.inputSnapshot as Record<string, unknown>)
      : null;
  const resultSnapshot =
    execution.resultSnapshot && typeof execution.resultSnapshot === "object"
      ? (execution.resultSnapshot as Record<string, unknown>)
      : null;

  const stringFromSnapshots = (...keys: string[]) => {
    for (const key of keys) {
      const resultValue = resultSnapshot?.[key];
      if (typeof resultValue === "string" && resultValue.trim()) {
        return resultValue.trim();
      }

      const inputValue = inputSnapshot?.[key];
      if (typeof inputValue === "string" && inputValue.trim()) {
        return inputValue.trim();
      }
    }

    return null;
  };

  const numberFromSnapshots = (...keys: string[]) => {
    for (const key of keys) {
      const resultValue = resultSnapshot?.[key];
      if (typeof resultValue === "number" && resultValue > 0) {
        return resultValue;
      }

      const inputValue = inputSnapshot?.[key];
      if (typeof inputValue === "number" && inputValue > 0) {
        return inputValue;
      }
    }

    return null;
  };

  return {
    id: execution.id,
    automationRuleCode: stringFromSnapshots("automationRuleCode"),
    automationRuleVersion: numberFromSnapshots("automationRuleVersion"),
    catalogVersionId: stringFromSnapshots("catalogVersionId"),
    triggerCode: execution.triggerCode,
    purposeCode: execution.purposeCode,
    status: execution.status,
    sourceType: execution.sourceType,
    sourceReference: execution.sourceReference,
    sourceTaskId: stringFromSnapshots("sourceTaskId"),
    sourceTaskTitle: stringFromSnapshots("sourceTaskTitle"),
    generatedAppointmentNumber: stringFromSnapshots(
      "generatedAppointmentNumber",
      "generatedFollowUpAppointmentNumber",
      "existingFollowUpAppointmentNumber"
    ),
    generatedAppointmentTitle: stringFromSnapshots("generatedAppointmentTitle"),
    generatedTaskId: stringFromSnapshots(
      "generatedTaskId",
      "generatedFollowUpTaskId",
      "existingFollowUpTaskId"
    ),
    generatedTaskTitle: stringFromSnapshots("generatedTaskTitle"),
    retryReplayAction: stringFromSnapshots("retryReplayAction"),
    failureCode: execution.failureCode,
    failureMessage: execution.failureMessage,
    attemptCount: execution.attemptCount,
    maxAttempts: execution.maxAttempts,
    nextRetryAt: toIso(execution.nextRetryAt),
    resolvedAt: toIso(execution.resolvedAt),
    createdAt: execution.createdAt.toISOString(),
    updatedAt: execution.updatedAt.toISOString()
  };
}

function summarizeEvent(event: AppointmentAutomationEventRecord) {
  const priorSnapshot = isPlainObject(event.priorSnapshot) ? event.priorSnapshot : null;
  const newSnapshot = isPlainObject(event.newSnapshot) ? event.newSnapshot : null;
  const candidateRecords = [
    newSnapshot,
    isPlainObject(newSnapshot?.resultSnapshot) ? (newSnapshot.resultSnapshot as Record<string, unknown>) : null,
    isPlainObject(newSnapshot?.inputSnapshot) ? (newSnapshot.inputSnapshot as Record<string, unknown>) : null,
    priorSnapshot,
    isPlainObject(priorSnapshot?.resultSnapshot) ? (priorSnapshot.resultSnapshot as Record<string, unknown>) : null,
    isPlainObject(priorSnapshot?.inputSnapshot) ? (priorSnapshot.inputSnapshot as Record<string, unknown>) : null
  ].filter((value): value is Record<string, unknown> => Boolean(value));

  const stringFromSnapshots = (...keys: string[]) => {
    for (const record of candidateRecords) {
      for (const key of keys) {
        const value = record[key];
        if (typeof value === "string" && value.trim()) {
          return value.trim();
        }
      }
    }

    return null;
  };

  const numberFromSnapshots = (...keys: string[]) => {
    for (const record of candidateRecords) {
      for (const key of keys) {
        const value = record[key];
        if (typeof value === "number" && value > 0) {
          return value;
        }
      }
    }

    return null;
  };

  return {
    id: event.id,
    automationRuleId: event.automationRuleId ?? null,
    automationExecutionId: event.automationExecutionId ?? null,
    action: event.action,
    reason: event.reason,
    actorUserId: event.actorUserId,
    occurredAt: event.occurredAt.toISOString(),
    automationRuleCode: stringFromSnapshots("automationRuleCode", "ruleCode"),
    automationRuleVersion: numberFromSnapshots("automationRuleVersion"),
    triggerCode: stringFromSnapshots("triggerCode"),
    sourceType: stringFromSnapshots("sourceType"),
    sourceReference: stringFromSnapshots("sourceReference"),
    sourceTaskId: stringFromSnapshots("sourceTaskId"),
    sourceTaskTitle: stringFromSnapshots("sourceTaskTitle"),
    generatedAppointmentNumber: stringFromSnapshots(
      "generatedAppointmentNumber",
      "generatedFollowUpAppointmentNumber",
      "existingFollowUpAppointmentNumber"
    ),
    generatedAppointmentTitle: stringFromSnapshots("generatedAppointmentTitle"),
    generatedTaskId: stringFromSnapshots(
      "generatedTaskId",
      "generatedFollowUpTaskId",
      "existingFollowUpTaskId"
    ),
    generatedTaskTitle: stringFromSnapshots("generatedTaskTitle"),
    retryReplayAction: stringFromSnapshots("retryReplayAction")
  };
}

function isPersistenceUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("AppointmentAutomationRule") ||
    message.includes("AppointmentAutomationExecution") ||
    message.includes("does not exist") ||
    message.includes("Unknown field")
  );
}

function unavailablePersistenceError() {
  return new Error(
    "Appointment automation operations persistence is not available until the Prisma client is regenerated and the operations-console migration is applied."
  );
}

function executionEventActionForStatus(status: ExecutionStatus): ExecutionAction {
  switch (status) {
    case "FAILED_RETRYABLE":
    case "FAILED_TERMINAL":
      return "FAILED";
    case "REVIEW_REQUIRED":
      return "REVIEW_CREATED";
    case "PENDING":
    case "SUCCEEDED":
    case "SKIPPED":
    case "RESOLVED":
      return "QUEUED";
  }
}

export function createAppointmentAutomationOperationsRepository(): AppointmentAutomationOperationsRepository {
  type AutomationTransaction = {
    appointmentAutomationRule: {
      findFirst: (input: unknown) => Promise<AppointmentAutomationRuleRecord | null>;
      create: (input: unknown) => Promise<AppointmentAutomationRuleRecord>;
      upsert: (input: unknown) => Promise<AppointmentAutomationRuleRecord>;
      update: (input: unknown) => Promise<AppointmentAutomationRuleRecord>;
    };
    appointmentAutomationRuleChangeEvent: {
      create: (input: unknown) => Promise<unknown>;
    };
    appointmentAutomationExecution: {
      findMany: (input: unknown) => Promise<AppointmentAutomationExecutionRecord[]>;
      create: (input: unknown) => Promise<AppointmentAutomationExecutionRecord>;
      update: (input: unknown) => Promise<AppointmentAutomationExecutionRecord>;
    };
    appointmentAutomationExecutionEvent: {
      create: (input: unknown) => Promise<unknown>;
    };
  };
  const automationPrisma = prisma as unknown as {
    appointmentAutomationRule?: {
      findMany: (input: unknown) => Promise<AppointmentAutomationRuleRecord[]>;
      findFirst: (input: unknown) => Promise<AppointmentAutomationRuleRecord | null>;
      create: (input: unknown) => Promise<AppointmentAutomationRuleRecord>;
      upsert: (input: unknown) => Promise<AppointmentAutomationRuleRecord>;
      update: (input: unknown) => Promise<AppointmentAutomationRuleRecord>;
    };
    appointmentAutomationRuleChangeEvent?: {
      findMany: (input: unknown) => Promise<AppointmentAutomationEventRecord[]>;
      create: (input: unknown) => Promise<unknown>;
    };
    appointmentAutomationExecution?: {
      findMany: (input: unknown) => Promise<AppointmentAutomationExecutionRecord[]>;
      create: (input: unknown) => Promise<AppointmentAutomationExecutionRecord>;
      update: (input: unknown) => Promise<AppointmentAutomationExecutionRecord>;
    };
    appointmentAutomationExecutionEvent?: {
      findMany: (input: unknown) => Promise<AppointmentAutomationEventRecord[]>;
      create: (input: unknown) => Promise<unknown>;
    };
    $transaction: <T>(callback: (transaction: AutomationTransaction) => Promise<T>) => Promise<T>;
  };

  const hasDelegates = Boolean(
    automationPrisma.appointmentAutomationRule &&
      automationPrisma.appointmentAutomationRuleChangeEvent &&
      automationPrisma.appointmentAutomationExecution &&
      automationPrisma.appointmentAutomationExecutionEvent
  );

  return {
    async listRules(organizationId) {
      if (!hasDelegates) return [];
      try {
        return await automationPrisma.appointmentAutomationRule!.findMany({
          where: { organizationId },
          orderBy: [{ status: "asc" }, { priority: "asc" }, { ruleCode: "asc" }]
        });
      } catch (error) {
        if (isPersistenceUnavailable(error)) return [];
        throw error;
      }
    },
    async listExecutions(organizationId) {
      if (!hasDelegates) return [];
      try {
        return await automationPrisma.appointmentAutomationExecution!.findMany({
          where: { organizationId },
          orderBy: [{ createdAt: "desc" }],
          take: 25
        });
      } catch (error) {
        if (isPersistenceUnavailable(error)) return [];
        throw error;
      }
    },
    async getExecutionById(executionId) {
      if (!hasDelegates) return null;
      try {
        const records = await automationPrisma.appointmentAutomationExecution!.findMany({
          where: { organizationId: INITIAL_ORGANIZATION.id, id: executionId },
          take: 1
        });
        return records[0] ?? null;
      } catch (error) {
        if (isPersistenceUnavailable(error)) return null;
        throw error;
      }
    },
    async listRuleEvents(organizationId, limit) {
      if (!hasDelegates) return [];
      return automationPrisma.appointmentAutomationRuleChangeEvent!.findMany({
        where: { organizationId },
        orderBy: [{ occurredAt: "desc" }],
        take: limit
      });
    },
    async listExecutionEvents(organizationId, limit) {
      if (!hasDelegates) return [];
      return automationPrisma.appointmentAutomationExecutionEvent!.findMany({
        where: { organizationId },
        orderBy: [{ occurredAt: "desc" }],
        take: limit
      });
    },
    async recordExecution(input) {
      if (!hasDelegates) throw unavailablePersistenceError();
      return automationPrisma.$transaction(async (transaction) => {
        const resolvedRule = input.ruleCode
          ? await transaction.appointmentAutomationRule.findFirst({
              where: {
                organizationId: INITIAL_ORGANIZATION.id,
                ruleCode: input.ruleCode
              }
            })
          : null;

        const execution = await transaction.appointmentAutomationExecution.create({
          data: {
            organizationId: INITIAL_ORGANIZATION.id,
            automationRuleId: resolvedRule?.id ?? null,
            triggerCode: resolvedRule?.triggerCode ?? input.triggerCode,
            purposeCode: resolvedRule?.purposeCode ?? input.purposeCode ?? null,
            status: input.status ?? "PENDING",
            sourceType: input.sourceType,
            sourceReference: input.sourceReference ?? null,
            inputSnapshot: toJsonValue(
              withResolvedRuleSnapshotContext({
                snapshot: input.inputSnapshot,
                resolvedRule,
                fallbackRuleCode: input.ruleCode ?? null
              })
            ),
            resultSnapshot:
              input.resultSnapshot === undefined
                ? undefined
                : toJsonValue(
                    withResolvedRuleSnapshotContext({
                      snapshot: input.resultSnapshot,
                      resolvedRule,
                      fallbackRuleCode: input.ruleCode ?? null
                    })
                  ),
            failureCode: input.failureCode ?? null,
            failureMessage: input.failureMessage ?? null,
            attemptCount: input.attemptCount ?? 0,
            maxAttempts: input.maxAttempts ?? 3,
            nextRetryAt: input.nextRetryAt ?? null,
            resolvedAt:
              input.status === "RESOLVED" || input.status === "SKIPPED" ? new Date() : null
          }
        });

        await transaction.appointmentAutomationExecutionEvent.create({
          data: {
            automationExecutionId: execution.id,
            organizationId: INITIAL_ORGANIZATION.id,
            actorUserId: input.actorUserId ?? null,
            action: executionEventActionForStatus(execution.status),
            reason: input.reason,
            priorSnapshot: undefined,
            newSnapshot: toJsonValue(execution)
          }
        });

        return execution;
      });
    },
    async finalizeExecution(input) {
      if (!hasDelegates) throw unavailablePersistenceError();
      return automationPrisma.$transaction(async (transaction) => {
        const existingRecords = await transaction.appointmentAutomationExecution.findMany({
          where: {
            organizationId: INITIAL_ORGANIZATION.id,
            id: input.executionId
          },
          take: 1
        });
        const existing = existingRecords[0] ?? null;

        if (!existing) {
          throw new Error("Automation execution is not queued.");
        }

        const execution = await transaction.appointmentAutomationExecution.update({
          where: { id: input.executionId },
          data: {
            status: input.status,
            resultSnapshot:
              input.resultSnapshot === undefined
                ? existing.resultSnapshot
                : toJsonValue(input.resultSnapshot),
            failureCode: input.failureCode ?? null,
            failureMessage: input.failureMessage ?? null,
            nextRetryAt: input.nextRetryAt ?? null,
            resolvedAt: null
          }
        });

        if (input.eventAction) {
          await transaction.appointmentAutomationExecutionEvent.create({
            data: {
              automationExecutionId: execution.id,
              organizationId: INITIAL_ORGANIZATION.id,
              actorUserId: input.actorUserId,
              action: input.eventAction,
              reason: input.reason,
              priorSnapshot: toJsonValue(existing),
              newSnapshot: toJsonValue(execution)
            }
          });
        }

        return execution;
      });
    },
    async upsertRuleDraft(input) {
      if (!hasDelegates) throw unavailablePersistenceError();
      return automationPrisma.$transaction(async (transaction) => {
        const prior = await transaction.appointmentAutomationRule.findFirst({
          where: { organizationId: INITIAL_ORGANIZATION.id, ruleCode: input.ruleCode }
        });
        const nextVersion = prior ? versionFromSnapshot(prior.validationSnapshot) + 1 : 1;
        const validationSnapshot = toJsonValue({
          ...input.validation,
          version: nextVersion
        });
        const simulationSnapshot = toJsonValue({
          ...(isPlainObject(input.simulation) ? input.simulation : { value: input.simulation }),
          version: nextVersion,
          catalogVersionId: input.catalogVersionId
        });
        const rule = prior
          ? await transaction.appointmentAutomationRule.update({
              where: {
                organizationId_ruleCode: {
                  organizationId: INITIAL_ORGANIZATION.id,
                  ruleCode: input.ruleCode
                }
              },
              data: {
                catalogVersionId: input.catalogVersionId,
                name: input.name,
                description: input.description ?? null,
                triggerCode: input.triggerCode,
                purposeCode: input.purposeCode,
                status: "DRAFT",
                priority: input.priority ?? 100,
                missingInputBehavior: input.validation.missingInputBehavior,
                validationSnapshot,
                simulationSnapshot,
                reason: input.reason
              }
            })
          : await transaction.appointmentAutomationRule.create({
              data: {
                organizationId: INITIAL_ORGANIZATION.id,
                catalogVersionId: input.catalogVersionId,
                ruleCode: input.ruleCode,
                name: input.name,
                description: input.description ?? null,
                triggerCode: input.triggerCode,
                purposeCode: input.purposeCode,
                status: "DRAFT",
                priority: input.priority ?? 100,
                missingInputBehavior: input.validation.missingInputBehavior,
                validationSnapshot,
                simulationSnapshot,
                reason: input.reason,
                createdByUserId: input.actorUserId
              }
            });
        await transaction.appointmentAutomationRuleChangeEvent.create({
          data: {
            automationRuleId: rule.id,
            organizationId: INITIAL_ORGANIZATION.id,
            actorUserId: input.actorUserId,
            action: prior ? "DRAFT_UPDATED" : "DRAFT_CREATED",
            reason: input.reason,
            priorSnapshot: prior ? toJsonValue(prior) : undefined,
            newSnapshot: toJsonValue(rule),
            validationSnapshot
          }
        });
        return rule;
      });
    },
    async transitionRule(input) {
      if (!hasDelegates) throw unavailablePersistenceError();
      const statusByAction = {
        ACTIVATE: "ACTIVE",
        PAUSE: "PAUSED",
        RETIRE: "RETIRED"
      } as const;
      const eventByAction = {
        ACTIVATE: "ACTIVATED",
        PAUSE: "PAUSED",
        RETIRE: "RETIRED"
      } as const;
      return automationPrisma.$transaction(async (transaction) => {
        const prior = await transaction.appointmentAutomationRule.findFirst({
          where: { organizationId: INITIAL_ORGANIZATION.id, ruleCode: input.ruleCode }
        });
        if (!prior) throw new Error("Automation rule is not configured.");
        const now = new Date();
        const rule = await transaction.appointmentAutomationRule.update({
          where: { organizationId_ruleCode: { organizationId: INITIAL_ORGANIZATION.id, ruleCode: input.ruleCode } },
          data: {
            status: statusByAction[input.action],
            reason: input.reason,
            activatedByUserId: input.action === "ACTIVATE" ? input.actorUserId : prior.activatedByUserId,
            activatedAt: input.action === "ACTIVATE" ? now : prior.activatedAt,
            pausedAt: input.action === "PAUSE" ? now : prior.pausedAt,
            retiredAt: input.action === "RETIRE" ? now : prior.retiredAt
          }
        });
        await transaction.appointmentAutomationRuleChangeEvent.create({
          data: {
            automationRuleId: rule.id,
            organizationId: INITIAL_ORGANIZATION.id,
            actorUserId: input.actorUserId,
            action: eventByAction[input.action],
            reason: input.reason,
            priorSnapshot: toJsonValue(prior),
            newSnapshot: toJsonValue(rule),
            validationSnapshot: toJsonValue(rule.validationSnapshot)
          }
        });
        return rule;
      });
    },
    async transitionExecution(input) {
      if (!hasDelegates) throw unavailablePersistenceError();
      return automationPrisma.$transaction(async (transaction) => {
        const existingRecords = await transaction.appointmentAutomationExecution.findMany({
          where: {
            organizationId: INITIAL_ORGANIZATION.id,
            id: input.executionId
          },
          take: 1
        });
        const existing = existingRecords[0] ?? null;

        if (!existing) {
          throw new Error("Automation execution is not queued.");
        }

        const now = new Date();
        const nextByAction = {
          RETRY: {
            status: "PENDING" as const,
            action: "RETRIED" as const,
            attemptCount: existing.attemptCount + 1,
            nextRetryAt: null,
            resolvedAt: null
          },
          REPLAY: {
            status: "PENDING" as const,
            action: "REPLAYED" as const,
            attemptCount: existing.attemptCount + 1,
            nextRetryAt: null,
            resolvedAt: null
          },
          RESOLVE: {
            status: "RESOLVED" as const,
            action: "RESOLVED" as const,
            attemptCount: existing.attemptCount,
            nextRetryAt: null,
            resolvedAt: now
          },
          SKIP: {
            status: "SKIPPED" as const,
            action: "SKIPPED" as const,
            attemptCount: existing.attemptCount,
            nextRetryAt: null,
            resolvedAt: now
          }
        } as const;

        const next = nextByAction[input.action];
        const execution = await transaction.appointmentAutomationExecution.update({
          where: { id: input.executionId },
          data: {
            status: next.status,
            attemptCount: next.attemptCount,
            nextRetryAt: next.nextRetryAt,
            resolvedAt: next.resolvedAt
          }
        });

        if (input.action === "RESOLVE" || input.action === "SKIP") {
          await transaction.appointmentAutomationExecutionEvent.create({
            data: {
              automationExecutionId: execution.id,
              organizationId: INITIAL_ORGANIZATION.id,
              actorUserId: input.actorUserId,
              action: next.action,
              reason: input.reason,
              priorSnapshot: toJsonValue(existing),
              newSnapshot: toJsonValue(execution)
            }
          });
        }

        return execution;
      });
    }
  };
}

async function buildRuleDraft(input: RuleMutationInput, catalog: AppointmentCatalogAutomationAdmin) {
  const ruleCode = normalizeCode(input.ruleCode, "Rule code");
  const triggerCode = normalizeCode(input.triggerCode, "Trigger code");
  const purposeCode = normalizeCode(input.purposeCode, "Purpose code");
  const purpose = catalog.purposes.find((candidate) => candidate.code === purposeCode);
  const validation: RuleValidation = {
    ...validateRule({ ruleCode, triggerCode, purposeCode, catalog }),
    missingInputBehavior: purpose?.missingInputBehavior ?? "CREATE_REVIEW_ITEM"
  };
  const simulation = simulationForPurpose(purposeCode, catalog);

  if (!validation.isValid) {
    throw new Error(`Automation rule is invalid: ${validation.errors.join(" ")}`);
  }

  return {
    ruleCode,
    triggerCode,
    purposeCode,
    catalogVersionId: catalog.versioning.displayedVersion.id,
    name: normalizeText(input.name, "Rule name"),
    description: input.description?.trim() || null,
    priority: input.priority ?? 100,
    reason: normalizeReason(input.reason),
    validation,
    simulation
  };
}

export async function getAppointmentAutomationOperationsConsoleForManager(
  user: AuthenticatedUser | null,
  repository: AppointmentAutomationOperationsRepository = createAppointmentAutomationOperationsRepository()
) {
  assertCanManageAutomation(user);

  const organizationId = INITIAL_ORGANIZATION.id;
  const catalog = await getAppointmentCatalogAutomationAdminForManager(user);
  const [persistedRules, executions, ruleEvents, executionEvents] = await Promise.all([
    repository.listRules(organizationId),
    repository.listExecutions(organizationId),
    repository.listRuleEvents(organizationId, 10),
    repository.listExecutionEvents(organizationId, 10)
  ]);
  const rules = mergeVisibleRules(persistedRules, catalog);
  const summarizedRules = rules.map(summarizeRule);
  const summarizedExecutions = executions.map(summarizeExecution);
  const failedExecutions = summarizedExecutions.filter((execution) =>
    ["FAILED_RETRYABLE", "FAILED_TERMINAL", "REVIEW_REQUIRED"].includes(execution.status)
  );
  const configuredRuleCount = summarizedRules.filter((rule) => rule.source === "CONFIGURED_RULE").length;
  const candidateRuleCount = summarizedRules.filter((rule) => rule.source === "CATALOG_CANDIDATE").length;

  return {
    catalogVersion: catalog.versioning.displayedVersion,
    catalogGovernance: {
      displayedSource: catalog.versioning.displayedSource,
      displayedVersionTitle: catalog.versioning.displayedVersion.title,
      displayedVersionStatus: catalog.versioning.displayedVersion.status,
      approvalStatus: catalog.versioning.approval.status,
      activationBlocked: catalog.versioning.approval.activationBlocked,
      validation: catalog.versioning.validation
    },
    ruleHealth: {
      totalRules: summarizedRules.length,
      configuredRules: configuredRuleCount,
      candidateRules: candidateRuleCount,
      activeRules: summarizedRules.filter((rule) => rule.status === "ACTIVE").length,
      draftRules: summarizedRules.filter((rule) => rule.status === "DRAFT").length,
      pausedRules: summarizedRules.filter((rule) => rule.status === "PAUSED").length,
      retiredRules: summarizedRules.filter((rule) => rule.status === "RETIRED").length,
      failedExecutions: failedExecutions.length,
      pendingReviewItems: summarizedExecutions.filter((execution) => execution.status === "REVIEW_REQUIRED").length,
      retryableExecutions: summarizedExecutions.filter((execution) => execution.status === "FAILED_RETRYABLE").length
    },
    rules: summarizedRules,
    executions: summarizedExecutions,
    failureQueue: failedExecutions,
    recentEvents: [...ruleEvents, ...executionEvents]
      .sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime())
      .slice(0, 10)
      .map(summarizeEvent),
    safetyControls: {
      activationRequiresValidRule: true,
      activationRequiresActiveCatalog: true,
      everyChangeRequiresReason: true,
      managerOnly: true,
      missingInputNeverSilentlySchedules: true
    }
  };
}

export async function saveAppointmentAutomationRuleDraftForManager(
  user: AuthenticatedUser | null,
  input: RuleMutationInput,
  repository: AppointmentAutomationOperationsRepository = createAppointmentAutomationOperationsRepository()
) {
  assertCanManageAutomation(user);
  const catalog = await getAppointmentCatalogAutomationAdminForManager(user);
  const draft = await buildRuleDraft(input, catalog);

  await repository.upsertRuleDraft({
    ...draft,
    actorUserId: user.id
  });

  return getAppointmentAutomationOperationsConsoleForManager(user, repository);
}

export async function transitionAppointmentAutomationRuleForManager(
  user: AuthenticatedUser | null,
  input: RuleTransitionInput,
  repository: AppointmentAutomationOperationsRepository = createAppointmentAutomationOperationsRepository()
) {
  assertCanManageAutomation(user);

  const normalizedInput = {
    ruleCode: normalizeCode(input.ruleCode, "Rule code"),
    action: input.action,
    reason: normalizeReason(input.reason),
    actorUserId: user.id
  } as const;

  if (normalizedInput.action === "ACTIVATE") {
    const existingRule =
      (await repository
        .listRules(INITIAL_ORGANIZATION.id)
        .then((rules) => rules.find((rule) => rule.ruleCode === normalizedInput.ruleCode) ?? null));

    if (!existingRule) {
      throw new Error("Automation rule is not configured.");
    }

    const activation = summarizeRuleActivation(existingRule);

    if (!activation.canActivate) {
      throw new Error(`Automation rule cannot activate: ${activation.blockers.join(" ")}`);
    }
  }

  await repository.transitionRule(normalizedInput);

  return getAppointmentAutomationOperationsConsoleForManager(user, repository);
}

export async function transitionAppointmentAutomationExecutionForManager(
  user: AuthenticatedUser | null,
  input: ExecutionTransitionInput,
  repository: AppointmentAutomationOperationsRepository = createAppointmentAutomationOperationsRepository(),
  dependencies?: {
    retryReplayEngine?: typeof runAppointmentAutomationRetryReplay;
    now?: Date;
  }
) {
  assertCanManageAutomation(user);

  const normalizedInput = {
    executionId: normalizeText(input.executionId, "Execution id"),
    action: input.action,
    reason: normalizeReason(input.reason),
    actorUserId: user.id
  } as const;

  await repository.transitionExecution(normalizedInput);

  if (normalizedInput.action === "RETRY" || normalizedInput.action === "REPLAY") {
    const execution = await repository.getExecutionById(normalizedInput.executionId);

    if (!execution) {
      throw new Error("Automation execution is not queued.");
    }

    const retryReplayEngine =
      dependencies?.retryReplayEngine ?? runAppointmentAutomationRetryReplay;
    let replayOutcome: {
      status: Exclude<ExecutionStatus, "PENDING" | "RESOLVED" | "SKIPPED">;
      resultSnapshot: Record<string, unknown>;
      failureCode: string | null;
      failureMessage: string | null;
      nextRetryAt: Date | null;
    };

    try {
      replayOutcome = await retryReplayEngine({
        action: normalizedInput.action,
        execution,
        actorUserId: user.id,
        now: dependencies?.now
      });
    } catch (error) {
      const now = dependencies?.now ?? new Date();
      const message =
        error instanceof Error ? error.message : "Retry/replay engine failed unexpectedly.";
      replayOutcome = {
        status: "FAILED_RETRYABLE",
        resultSnapshot: {
          retryReplayAction: normalizedInput.action,
          replayedAt: now.toISOString(),
          failureCode: "RETRY_REPLAY_RUNTIME_ERROR",
          failureMessage: message
        },
        failureCode: "RETRY_REPLAY_RUNTIME_ERROR",
        failureMessage: message,
        nextRetryAt: new Date(now.getTime() + 15 * 60 * 1000)
      };
    }

    await repository.finalizeExecution({
      executionId: normalizedInput.executionId,
      status: replayOutcome.status,
      reason: normalizedInput.reason,
      actorUserId: user.id,
      resultSnapshot: {
        ...replayOutcome.resultSnapshot,
        retryReplayAction:
          replayOutcome.resultSnapshot &&
          typeof replayOutcome.resultSnapshot === "object" &&
          !Array.isArray(replayOutcome.resultSnapshot) &&
          typeof (replayOutcome.resultSnapshot as Record<string, unknown>).retryReplayAction ===
            "string"
            ? (replayOutcome.resultSnapshot as Record<string, unknown>).retryReplayAction
            : normalizedInput.action,
        replayedAt:
          replayOutcome.resultSnapshot &&
          typeof replayOutcome.resultSnapshot === "object" &&
          !Array.isArray(replayOutcome.resultSnapshot) &&
          typeof (replayOutcome.resultSnapshot as Record<string, unknown>).replayedAt === "string"
            ? (replayOutcome.resultSnapshot as Record<string, unknown>).replayedAt
            : (dependencies?.now ?? new Date()).toISOString()
      },
      failureCode: replayOutcome.failureCode,
      failureMessage: replayOutcome.failureMessage,
      nextRetryAt: replayOutcome.nextRetryAt,
      eventAction:
        replayOutcome.status === "SUCCEEDED"
          ? normalizedInput.action === "RETRY"
            ? "RETRIED"
            : "REPLAYED"
          : replayOutcome.status === "REVIEW_REQUIRED"
            ? "REVIEW_CREATED"
            : "FAILED"
    });
  }

  return getAppointmentAutomationOperationsConsoleForManager(user, repository);
}

export async function recordAppointmentAutomationExecution(
  input: AutomationExecutionRecordInput,
  repository: AppointmentAutomationOperationsRepository = createAppointmentAutomationOperationsRepository()
) {
  return repository.recordExecution({
    ...input,
    ruleCode: input.ruleCode ? normalizeCode(input.ruleCode, "Rule code") : null,
    triggerCode: normalizeCode(input.triggerCode, "Trigger code"),
    purposeCode: input.purposeCode ? normalizeCode(input.purposeCode, "Purpose code") : null,
    sourceType: normalizeText(input.sourceType, "Source type"),
    sourceReference: input.sourceReference?.trim() || null,
    reason: normalizeReason(input.reason),
    failureCode: input.failureCode?.trim() || null,
    failureMessage: input.failureMessage?.trim() || null
  });
}
