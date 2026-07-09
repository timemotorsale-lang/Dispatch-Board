import type {
  AppointmentAutomationExecutionRecord,
  AppointmentAutomationOperationsRepository,
  AppointmentAutomationRuleRecord
} from "@/server/services/appointment-automation-operations-console";

export function createMemoryAppointmentAutomationOperationsRepository() {
  const now = new Date("2026-07-06T19:00:00.000Z");
  let rules: AppointmentAutomationRuleRecord[] = [];
  let executions: AppointmentAutomationExecutionRecord[] = [];
  const ruleEvents: Awaited<ReturnType<AppointmentAutomationOperationsRepository["listRuleEvents"]>> = [];
  const executionEvents: Awaited<ReturnType<AppointmentAutomationOperationsRepository["listExecutionEvents"]>> = [];

  const repository: AppointmentAutomationOperationsRepository = {
    async listRules() {
      return rules;
    },
    async listExecutions() {
      return executions;
    },
    async getExecutionById(executionId) {
      return executions.find((execution) => execution.id === executionId) ?? null;
    },
    async listRuleEvents(_organizationId, limit) {
      return ruleEvents.slice(0, limit);
    },
    async listExecutionEvents(_organizationId, limit) {
      return executionEvents.slice(0, limit);
    },
    async recordExecution(input) {
      const execution: AppointmentAutomationExecutionRecord = {
        id: `execution-${executions.length + 1}`,
        organizationId: "org-time-motor-sales",
        automationRuleId: null,
        triggerCode: input.triggerCode,
        purposeCode: input.purposeCode ?? null,
        status: input.status ?? "PENDING",
        sourceType: input.sourceType,
        sourceReference: input.sourceReference ?? null,
        inputSnapshot: input.inputSnapshot,
        resultSnapshot: input.resultSnapshot ?? null,
        failureCode: input.failureCode ?? null,
        failureMessage: input.failureMessage ?? null,
        attemptCount: input.attemptCount ?? 0,
        maxAttempts: input.maxAttempts ?? 3,
        nextRetryAt: input.nextRetryAt ?? null,
        resolvedAt:
          input.status === "RESOLVED" || input.status === "SKIPPED" ? now : null,
        createdAt: now,
        updatedAt: now
      };
      executions = [execution, ...executions];
      executionEvents.unshift({
        id: `execution-event-${executionEvents.length + 1}`,
        automationExecutionId: execution.id,
        action:
          execution.status === "FAILED_RETRYABLE" || execution.status === "FAILED_TERMINAL"
            ? "FAILED"
            : execution.status === "REVIEW_REQUIRED"
              ? "REVIEW_CREATED"
              : "QUEUED",
        reason: input.reason,
        actorUserId: input.actorUserId ?? null,
        priorSnapshot: undefined,
        newSnapshot: execution,
        occurredAt: now
      });
      return execution;
    },
    async finalizeExecution(input) {
      const existing = executions.find((execution) => execution.id === input.executionId);
      if (!existing) throw new Error("Automation execution is not queued.");
      const execution: AppointmentAutomationExecutionRecord = {
        ...existing,
        status: input.status,
        resultSnapshot: input.resultSnapshot ?? existing.resultSnapshot,
        failureCode: input.failureCode ?? null,
        failureMessage: input.failureMessage ?? null,
        nextRetryAt: input.nextRetryAt ?? null,
        resolvedAt: null,
        updatedAt: now
      };
      executions = executions.map((candidate) =>
        candidate.id === execution.id ? execution : candidate
      );
      if (input.eventAction) {
        executionEvents.unshift({
          id: `execution-event-${executionEvents.length + 1}`,
          automationExecutionId: execution.id,
          action: input.eventAction,
          reason: input.reason,
          actorUserId: input.actorUserId,
          priorSnapshot: existing,
          newSnapshot: execution,
          occurredAt: now
        });
      }
      return execution;
    },
    async upsertRuleDraft(input) {
      const existing = rules.find((rule) => rule.ruleCode === input.ruleCode);
      const nextVersion =
        existing &&
        existing.validationSnapshot &&
        typeof existing.validationSnapshot === "object" &&
        !Array.isArray(existing.validationSnapshot) &&
        typeof (existing.validationSnapshot as { version?: unknown }).version === "number"
          ? ((existing.validationSnapshot as { version: number }).version + 1)
          : 1;
      const rule: AppointmentAutomationRuleRecord = {
        id: existing?.id ?? `rule-${rules.length + 1}`,
        organizationId: "org-time-motor-sales",
        catalogVersionId: input.catalogVersionId,
        ruleCode: input.ruleCode,
        name: input.name,
        description: input.description ?? null,
        triggerCode: input.triggerCode,
        purposeCode: input.purposeCode,
        status: "DRAFT",
        priority: input.priority ?? 100,
        missingInputBehavior: input.validation.missingInputBehavior,
        validationSnapshot: {
          ...input.validation,
          version: nextVersion
        },
        simulationSnapshot:
          input.simulation && typeof input.simulation === "object" && !Array.isArray(input.simulation)
            ? {
                ...input.simulation,
                version: nextVersion,
                catalogVersionId: input.catalogVersionId
              }
            : {
                value: input.simulation,
                version: nextVersion,
                catalogVersionId: input.catalogVersionId
              },
        reason: input.reason,
        createdByUserId: existing?.createdByUserId ?? input.actorUserId,
        activatedByUserId: null,
        activatedAt: null,
        pausedAt: null,
        retiredAt: null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
      };
      rules = existing
        ? rules.map((candidate) => candidate.ruleCode === rule.ruleCode ? rule : candidate)
        : [...rules, rule];
      ruleEvents.unshift({
        id: `rule-event-${ruleEvents.length + 1}`,
        automationRuleId: rule.id,
        action: existing ? "DRAFT_UPDATED" : "DRAFT_CREATED",
        reason: input.reason,
        actorUserId: input.actorUserId,
        priorSnapshot: existing ?? undefined,
        newSnapshot: rule,
        occurredAt: now
      });
      return rule;
    },
    async transitionRule(input) {
      const existing = rules.find((rule) => rule.ruleCode === input.ruleCode);
      if (!existing) throw new Error("Automation rule is not configured.");
      const statusByAction = { ACTIVATE: "ACTIVE", PAUSE: "PAUSED", RETIRE: "RETIRED" } as const;
      const eventByAction = { ACTIVATE: "ACTIVATED", PAUSE: "PAUSED", RETIRE: "RETIRED" } as const;
      const nextRule: AppointmentAutomationRuleRecord = {
        ...existing,
        status: statusByAction[input.action],
        reason: input.reason,
        activatedByUserId: input.action === "ACTIVATE" ? input.actorUserId : existing.activatedByUserId,
        activatedAt: input.action === "ACTIVATE" ? now : existing.activatedAt,
        pausedAt: input.action === "PAUSE" ? now : existing.pausedAt,
        retiredAt: input.action === "RETIRE" ? now : existing.retiredAt,
        updatedAt: now
      };
      rules = rules.map((rule) => rule.ruleCode === nextRule.ruleCode ? nextRule : rule);
      ruleEvents.unshift({
        id: `rule-event-${ruleEvents.length + 1}`,
        automationRuleId: nextRule.id,
        action: eventByAction[input.action],
        reason: input.reason,
        actorUserId: input.actorUserId,
        priorSnapshot: existing,
        newSnapshot: nextRule,
        occurredAt: now
      });
      return nextRule;
    },
    async transitionExecution(input) {
      const existing = executions.find((execution) => execution.id === input.executionId);
      if (!existing) throw new Error("Automation execution is not queued.");
      const statusByAction = {
        RETRY: "PENDING",
        REPLAY: "PENDING",
        RESOLVE: "RESOLVED",
        SKIP: "SKIPPED"
      } as const;
      const nextExecution: AppointmentAutomationExecutionRecord = {
        ...existing,
        status: statusByAction[input.action],
        resolvedAt: ["RESOLVE", "SKIP"].includes(input.action) ? now : existing.resolvedAt,
        updatedAt: now
      };
      executions = executions.map((execution) =>
        execution.id === nextExecution.id ? nextExecution : execution
      );
      if (input.action === "RESOLVE" || input.action === "SKIP") {
        executionEvents.unshift({
          id: `execution-event-${executionEvents.length + 1}`,
          automationExecutionId: nextExecution.id,
          action: input.action === "RESOLVE" ? "RESOLVED" : "SKIPPED",
          reason: input.reason,
          actorUserId: input.actorUserId,
          priorSnapshot: existing,
          newSnapshot: nextExecution,
          occurredAt: now
        });
      }
      return nextExecution;
    }
  };

  return {
    repository,
    seedExecution(execution: AppointmentAutomationExecutionRecord) {
      executions = [...executions, execution];
    }
  };
}
