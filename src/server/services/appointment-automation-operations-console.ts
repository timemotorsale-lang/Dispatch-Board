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
  action: RuleAction | ExecutionAction;
  reason: string;
  actorUserId: string | null;
  occurredAt: Date;
};

export type AppointmentAutomationOperationsRepository = {
  listRules(organizationId: string): Promise<AppointmentAutomationRuleRecord[]>;
  listExecutions(organizationId: string): Promise<AppointmentAutomationExecutionRecord[]>;
  listRuleEvents(organizationId: string, limit: number): Promise<AppointmentAutomationEventRecord[]>;
  listExecutionEvents(organizationId: string, limit: number): Promise<AppointmentAutomationEventRecord[]>;
  upsertRuleDraft(input: RuleMutationInput & {
    actorUserId: string;
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

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
    validationSnapshot: validateRule({
      ruleCode: `${rule.purposeCode}-${rule.trigger}`,
      triggerCode: rule.trigger,
      purposeCode: rule.purposeCode,
      catalog
    }),
    simulationSnapshot: null,
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

function summarizeRule(rule: AppointmentAutomationRuleRecord) {
  const validation = rule.validationSnapshot as
    | { isValid?: boolean; errors?: string[]; warnings?: string[] }
    | null;

  return {
    id: rule.id,
    ruleCode: rule.ruleCode,
    name: rule.name,
    description: rule.description,
    triggerCode: rule.triggerCode,
    purposeCode: rule.purposeCode,
    status: rule.status,
    priority: rule.priority,
    missingInputBehavior: rule.missingInputBehavior,
    validation: {
      isValid: Boolean(validation?.isValid ?? true),
      errors: validation?.errors ?? [],
      warnings: validation?.warnings ?? []
    },
    reason: rule.reason,
    activatedAt: toIso(rule.activatedAt),
    pausedAt: toIso(rule.pausedAt),
    retiredAt: toIso(rule.retiredAt),
    updatedAt: rule.updatedAt.toISOString()
  };
}

function summarizeExecution(execution: AppointmentAutomationExecutionRecord) {
  return {
    id: execution.id,
    triggerCode: execution.triggerCode,
    purposeCode: execution.purposeCode,
    status: execution.status,
    sourceType: execution.sourceType,
    sourceReference: execution.sourceReference,
    failureCode: execution.failureCode,
    failureMessage: execution.failureMessage,
    attemptCount: execution.attemptCount,
    maxAttempts: execution.maxAttempts,
    nextRetryAt: toIso(execution.nextRetryAt),
    resolvedAt: toIso(execution.resolvedAt),
    createdAt: execution.createdAt.toISOString()
  };
}

function summarizeEvent(event: AppointmentAutomationEventRecord) {
  return {
    id: event.id,
    action: event.action,
    reason: event.reason,
    actorUserId: event.actorUserId,
    occurredAt: event.occurredAt.toISOString()
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

export function createAppointmentAutomationOperationsRepository(): AppointmentAutomationOperationsRepository {
  type AutomationTransaction = {
    appointmentAutomationRule: {
      findFirst: (input: unknown) => Promise<AppointmentAutomationRuleRecord | null>;
      upsert: (input: unknown) => Promise<AppointmentAutomationRuleRecord>;
      update: (input: unknown) => Promise<AppointmentAutomationRuleRecord>;
    };
    appointmentAutomationRuleChangeEvent: {
      create: (input: unknown) => Promise<unknown>;
    };
    appointmentAutomationExecution: {
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
      upsert: (input: unknown) => Promise<AppointmentAutomationRuleRecord>;
      update: (input: unknown) => Promise<AppointmentAutomationRuleRecord>;
    };
    appointmentAutomationRuleChangeEvent?: {
      findMany: (input: unknown) => Promise<AppointmentAutomationEventRecord[]>;
      create: (input: unknown) => Promise<unknown>;
    };
    appointmentAutomationExecution?: {
      findMany: (input: unknown) => Promise<AppointmentAutomationExecutionRecord[]>;
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
    async upsertRuleDraft(input) {
      if (!hasDelegates) throw unavailablePersistenceError();
      return automationPrisma.$transaction(async (transaction) => {
        const prior = await transaction.appointmentAutomationRule.findFirst({
          where: { organizationId: INITIAL_ORGANIZATION.id, ruleCode: input.ruleCode }
        });
        const rule = await transaction.appointmentAutomationRule.upsert({
          where: {
            organizationId_ruleCode: {
              organizationId: INITIAL_ORGANIZATION.id,
              ruleCode: input.ruleCode
            }
          },
          create: {
            organizationId: INITIAL_ORGANIZATION.id,
            ruleCode: input.ruleCode,
            name: input.name,
            description: input.description ?? null,
            triggerCode: input.triggerCode,
            purposeCode: input.purposeCode,
            status: "DRAFT",
            priority: input.priority ?? 100,
            missingInputBehavior: input.validation.missingInputBehavior,
            validationSnapshot: toJsonValue(input.validation),
            simulationSnapshot: toJsonValue(input.simulation),
            reason: input.reason,
            createdByUserId: input.actorUserId
          },
          update: {
            name: input.name,
            description: input.description ?? null,
            triggerCode: input.triggerCode,
            purposeCode: input.purposeCode,
            status: "DRAFT",
            priority: input.priority ?? 100,
            missingInputBehavior: input.validation.missingInputBehavior,
            validationSnapshot: toJsonValue(input.validation),
            simulationSnapshot: toJsonValue(input.simulation),
            reason: input.reason
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
            validationSnapshot: toJsonValue(input.validation)
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
      throw new Error(`Execution ${input.action.toLowerCase()} persistence will be available after runtime execution records are seeded.`);
    }
  };
}

type RuleValidation = ReturnType<typeof validateRule> & { missingInputBehavior: string };

async function buildRuleDraft(input: RuleMutationInput, catalog: AppointmentCatalogAutomationAdmin) {
  const ruleCode = normalizeCode(input.ruleCode, "Rule code");
  const triggerCode = normalizeCode(input.triggerCode, "Trigger code");
  const purposeCode = normalizeCode(input.purposeCode, "Purpose code");
  const purpose = catalog.purposes.find((candidate) => candidate.code === purposeCode);
  const validation: RuleValidation = {
    ...validateRule({ ruleCode, triggerCode, purposeCode, catalog }),
    missingInputBehavior: purpose?.missingInputBehavior ?? "CREATE_REVIEW_ITEM"
  };
  const simulation = purpose
    ? simulateAppointmentCatalogAutomation(
        {
          purposeCode,
          outcomeCode: purpose.outcomeCodes[0] ?? "COMPLETED",
          followUpDispositionCode: purpose.followUpDispositionCodes[0] ?? "NO_FOLLOW_UP_REQUIRED"
        },
        catalog
      )
    : null;

  if (!validation.isValid) {
    throw new Error(`Automation rule is invalid: ${validation.errors.join(" ")}`);
  }

  return {
    ruleCode,
    triggerCode,
    purposeCode,
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
  const rules = persistedRules.length > 0 ? persistedRules : baselineRuleCandidates(catalog);
  const summarizedRules = rules.map(summarizeRule);
  const summarizedExecutions = executions.map(summarizeExecution);
  const failedExecutions = summarizedExecutions.filter((execution) =>
    ["FAILED_RETRYABLE", "FAILED_TERMINAL", "REVIEW_REQUIRED"].includes(execution.status)
  );

  return {
    catalogVersion: catalog.versioning.displayedVersion,
    ruleHealth: {
      totalRules: summarizedRules.length,
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

  await repository.transitionRule({
    ruleCode: normalizeCode(input.ruleCode, "Rule code"),
    action: input.action,
    reason: normalizeReason(input.reason),
    actorUserId: user.id
  });

  return getAppointmentAutomationOperationsConsoleForManager(user, repository);
}

export async function transitionAppointmentAutomationExecutionForManager(
  user: AuthenticatedUser | null,
  input: ExecutionTransitionInput,
  repository: AppointmentAutomationOperationsRepository = createAppointmentAutomationOperationsRepository()
) {
  assertCanManageAutomation(user);

  await repository.transitionExecution({
    executionId: normalizeText(input.executionId, "Execution id"),
    action: input.action,
    reason: normalizeReason(input.reason),
    actorUserId: user.id
  });

  return getAppointmentAutomationOperationsConsoleForManager(user, repository);
}
