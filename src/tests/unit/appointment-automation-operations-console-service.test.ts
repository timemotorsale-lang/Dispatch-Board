import { describe, expect, it } from "vitest";

import {
  getAppointmentAutomationOperationsConsoleForManager,
  recordAppointmentAutomationExecution,
  saveAppointmentAutomationRuleDraftForManager,
  transitionAppointmentAutomationExecutionForManager,
  transitionAppointmentAutomationRuleForManager
} from "@/server/services/appointment-automation-operations-console";
import { createMemoryAppointmentAutomationOperationsRepository } from "@/tests/support/appointment-automation-console-test-repository";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

describe("appointment automation operations console service", () => {
  it("loads catalog-derived rule candidates and health metrics for managers", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentAutomationOperationsRepository();

    const console = await getAppointmentAutomationOperationsConsoleForManager(manager, repository);

    expect(console.ruleHealth.totalRules).toBeGreaterThan(10);
    expect(console.ruleHealth.candidateRules).toBeGreaterThan(10);
    expect(console.ruleHealth.configuredRules).toBe(0);
    expect(console.ruleHealth.draftRules).toBe(console.ruleHealth.totalRules);
    expect(console.rules.some((rule) => rule.triggerCode === "ANY_TASK_REQUIRES_MEETING")).toBe(true);
    expect(console.rules.some((rule) => rule.simulation.hasEvidence)).toBe(true);
    expect(console.rules.some((rule) => rule.activation.canActivate === false)).toBe(true);
    expect(console.safetyControls.everyChangeRequiresReason).toBe(true);
  });

  it("saves a rule draft and records the lifecycle event", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentAutomationOperationsRepository();

    const console = await saveAppointmentAutomationRuleDraftForManager(
      manager,
      {
        ruleCode: "RULE-TEST-DRIVE-FOLLOW-UP",
        name: "Test drive follow-up automation",
        triggerCode: "QUALIFIED_SALES_FOLLOW_UP_TASK",
        purposeCode: "APT-TEST-DRIVE",
        reason: "Prepare test-drive follow-up automation."
      },
      repository
    );

    expect(console.ruleHealth.configuredRules).toBe(1);
    expect(console.ruleHealth.totalRules).toBeGreaterThan(1);
    expect(console.rules.find((rule) => rule.ruleCode === "RULE-TEST-DRIVE-FOLLOW-UP")).toMatchObject({
      ruleCode: "RULE-TEST-DRIVE-FOLLOW-UP",
      version: 1,
      catalogVersionId: console.catalogVersion.id,
      status: "DRAFT",
      source: "CONFIGURED_RULE",
      simulation: expect.objectContaining({
        hasEvidence: true
      }),
      activation: expect.objectContaining({
        canActivate: true
      })
    });
    expect(console.rules.some((rule) => rule.source === "CATALOG_CANDIDATE")).toBe(true);
    expect(console.recentEvents[0]).toMatchObject({
      action: "DRAFT_CREATED"
    });
  });

  it("increments the saved rule version when a draft is updated", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentAutomationOperationsRepository();

    await saveAppointmentAutomationRuleDraftForManager(
      manager,
      {
        ruleCode: "RULE-TASK-MEETING",
        name: "Task meeting automation",
        triggerCode: "ANY_TASK_REQUIRES_MEETING",
        purposeCode: "APT-TASK-MEETING",
        reason: "Create first version."
      },
      repository
    );

    const console = await saveAppointmentAutomationRuleDraftForManager(
      manager,
      {
        ruleCode: "RULE-TASK-MEETING",
        name: "Task meeting automation revised",
        triggerCode: "ANY_TASK_REQUIRES_MEETING",
        purposeCode: "APT-TASK-MEETING",
        reason: "Update the draft after review."
      },
      repository
    );

    expect(console.rules.find((rule) => rule.ruleCode === "RULE-TASK-MEETING")).toMatchObject({
      name: "Task meeting automation revised",
      version: 2
    });
    expect(console.recentEvents[0]).toMatchObject({
      action: "DRAFT_UPDATED"
    });
  });

  it("rejects activating a catalog candidate before it is saved as a configured draft", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentAutomationOperationsRepository();
    const console = await getAppointmentAutomationOperationsConsoleForManager(manager, repository);
    const candidateRule = console.rules.find((rule) => rule.source === "CATALOG_CANDIDATE");

    expect(candidateRule).toBeTruthy();
    await expect(
      transitionAppointmentAutomationRuleForManager(
        manager,
        {
          ruleCode: candidateRule!.ruleCode,
          action: "ACTIVATE",
          reason: "Attempt to activate a catalog candidate directly."
        },
        repository
      )
    ).rejects.toThrow(/not configured/i);
  });

  it("activates, pauses, and retires a configured rule with reasons", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentAutomationOperationsRepository();

    await saveAppointmentAutomationRuleDraftForManager(
      manager,
      {
        ruleCode: "RULE-SERVICE-INTAKE",
        name: "Service intake automation",
        triggerCode: "SERVICE_TASK_REQUIRES_CUSTOMER_ARRIVAL",
        purposeCode: "APT-SERVICE-INTAKE",
        reason: "Prepare service intake automation."
      },
      repository
    );

    const active = await transitionAppointmentAutomationRuleForManager(
      manager,
      {
        ruleCode: "RULE-SERVICE-INTAKE",
        action: "ACTIVATE",
        reason: "Activate approved service intake rule."
      },
      repository
    );

    expect(active.rules[0].status).toBe("ACTIVE");

    const paused = await transitionAppointmentAutomationRuleForManager(
      manager,
      {
        ruleCode: "RULE-SERVICE-INTAKE",
        action: "PAUSE",
        reason: "Pause rule while reviewing service workflow."
      },
      repository
    );

    expect(paused.rules[0].status).toBe("PAUSED");

    const retired = await transitionAppointmentAutomationRuleForManager(
      manager,
      {
        ruleCode: "RULE-SERVICE-INTAKE",
        action: "RETIRE",
        reason: "Retire rule after replacement workflow approved."
      },
      repository
    );

    expect(retired.rules[0].status).toBe("RETIRED");
    expect(retired.recentEvents[0].action).toBe("RETIRED");
  });

  it("records runtime executions and lets managers resolve queued execution work", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentAutomationOperationsRepository();

    await recordAppointmentAutomationExecution(
      {
        ruleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_APPOINTMENT",
        triggerCode: "APPOINTMENT_OUTCOME_RECORDED",
        purposeCode: "FOLLOW_UP_APPOINTMENT",
        sourceType: "APPOINTMENT",
        sourceReference: "appointment-1",
        status: "REVIEW_REQUIRED",
        reason: "Queue runtime review item for follow-up automation.",
        actorUserId: manager?.id ?? null,
        inputSnapshot: {
          automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_APPOINTMENT",
          automationRuleVersion: 3,
          catalogVersionId: "catalog-version-1"
        },
        resultSnapshot: {
          automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_APPOINTMENT",
          automationRuleVersion: 3,
          catalogVersionId: "catalog-version-1",
          generatedAppointmentNumber: "FUP-APT-10245-001"
        }
      },
      repository
    );

    const beforeResolve = await getAppointmentAutomationOperationsConsoleForManager(
      manager,
      repository
    );

    expect(beforeResolve.executions[0]).toMatchObject({
      automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_APPOINTMENT",
      automationRuleVersion: 3,
      catalogVersionId: "catalog-version-1",
      status: "REVIEW_REQUIRED",
      generatedAppointmentNumber: "FUP-APT-10245-001"
    });
    expect(beforeResolve.failureQueue).toHaveLength(1);

    const resolved = await transitionAppointmentAutomationExecutionForManager(
      manager,
      {
        executionId: beforeResolve.executions[0].id,
        action: "RESOLVE",
        reason: "Reviewed output and closed the runtime item."
      },
      repository
    );

    expect(resolved.executions[0].status).toBe("RESOLVED");
    expect(resolved.failureQueue).toHaveLength(0);
    expect(resolved.recentEvents[0].action).toBe("RESOLVED");
  });

  it("runs retry through the replay engine and records a completed retry event", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentAutomationOperationsRepository();

    await recordAppointmentAutomationExecution(
      {
        ruleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_TASK",
        triggerCode: "APPOINTMENT_OUTCOME_RECORDED",
        sourceType: "APPOINTMENT",
        sourceReference: "appointment-1",
        status: "FAILED_RETRYABLE",
        reason: "Queue retryable runtime task failure.",
        actorUserId: manager?.id ?? null,
        inputSnapshot: {
          automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_TASK"
        },
        resultSnapshot: {
          automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_TASK"
        },
        failureCode: "SIMULATED_FAILURE",
        failureMessage: "Temporary failure"
      },
      repository
    );

    const beforeRetry = await getAppointmentAutomationOperationsConsoleForManager(
      manager,
      repository
    );

    const retried = await transitionAppointmentAutomationExecutionForManager(
      manager,
      {
        executionId: beforeRetry.executions[0].id,
        action: "RETRY",
        reason: "Run the automation again after fixing the source issue."
      },
      repository,
      {
        retryReplayEngine: async () => ({
          status: "SUCCEEDED",
          resultSnapshot: {
            automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_TASK",
            generatedFollowUpTaskId: "task-1"
          },
          failureCode: null,
          failureMessage: null,
          nextRetryAt: null
        })
      }
    );

    expect(retried.executions[0]).toMatchObject({
      status: "SUCCEEDED",
      failureCode: null,
      generatedTaskId: "task-1",
      retryReplayAction: "RETRY"
    });
    expect(retried.recentEvents[0].action).toBe("RETRIED");
  });

  it("surfaces task-source execution context from runtime snapshots", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentAutomationOperationsRepository();

    await recordAppointmentAutomationExecution(
      {
        ruleCode: "RULE-BLOCKED-TASK-REVIEW",
        triggerCode: "BLOCKED_TASK_REVIEW",
        purposeCode: "APT-TASK-MEETING",
        sourceType: "TASK",
        sourceReference: "task-1",
        status: "REVIEW_REQUIRED",
        reason: "Queue task-sourced automation review.",
        actorUserId: manager?.id ?? null,
        inputSnapshot: {
          automationRuleCode: "RULE-BLOCKED-TASK-REVIEW",
          automationRuleVersion: 2,
          sourceTaskId: "task-1",
          sourceTaskTitle: "Call lender and verify packet"
        },
        resultSnapshot: {
          automationRuleCode: "RULE-BLOCKED-TASK-REVIEW",
          automationRuleVersion: 2,
          sourceTaskId: "task-1",
          sourceTaskTitle: "Call lender and verify packet",
          generatedAppointmentId: "appointment-generated-1",
          generatedAppointmentNumber: "APT-TASK-AUTO-001",
          generatedAppointmentTitle: "Blocked task review: Call lender and verify packet"
        }
      },
      repository
    );

    const console = await getAppointmentAutomationOperationsConsoleForManager(manager, repository);

    expect(console.executions[0]).toMatchObject({
      sourceTaskId: "task-1",
      sourceTaskTitle: "Call lender and verify packet",
      generatedAppointmentId: "appointment-generated-1",
      generatedAppointmentNumber: "APT-TASK-AUTO-001",
      generatedAppointmentTitle: "Blocked task review: Call lender and verify packet"
    });
    expect(console.recentEvents[0]).toMatchObject({
      action: "REVIEW_CREATED",
      automationRuleCode: "RULE-BLOCKED-TASK-REVIEW",
      sourceTaskId: "task-1",
      sourceTaskTitle: "Call lender and verify packet",
      generatedAppointmentId: "appointment-generated-1",
      generatedAppointmentNumber: "APT-TASK-AUTO-001"
    });
  });

  it("keeps skipped background automation events distinct from queued runtime records", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentAutomationOperationsRepository();

    await recordAppointmentAutomationExecution(
      {
        ruleCode: "RULE-BLOCKED-TASK-REVIEW",
        triggerCode: "BLOCKED_TASK_REVIEW",
        purposeCode: "APT-TASK-MEETING",
        sourceType: "TASK",
        sourceReference: "task-1",
        status: "SKIPPED",
        reason: "Skip duplicate generated appointment.",
        actorUserId: manager?.id ?? null,
        inputSnapshot: {
          automationRuleCode: "RULE-BLOCKED-TASK-REVIEW",
          automationRuleVersion: 2,
          sourceTaskId: "task-1",
          sourceTaskTitle: "Call lender and verify packet"
        },
        resultSnapshot: {
          automationRuleCode: "RULE-BLOCKED-TASK-REVIEW",
          automationRuleVersion: 2,
          sourceTaskId: "task-1",
          sourceTaskTitle: "Call lender and verify packet",
          generatedAppointmentNumber: "APT-TASK-AUTO-001",
          status: "SKIPPED"
        }
      },
      repository
    );

    const console = await getAppointmentAutomationOperationsConsoleForManager(manager, repository);

    expect(console.recentEvents[0]).toMatchObject({
      action: "SKIPPED",
      status: "SKIPPED",
      sourceTaskId: "task-1",
      generatedAppointmentNumber: "APT-TASK-AUTO-001"
    });
  });

  it("surfaces failure details on background automation audit events", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository, historyEvents } = createMemoryAppointmentAutomationOperationsRepository();

    await recordAppointmentAutomationExecution(
      {
        ruleCode: "RULE-BLOCKED-TASK-REVIEW",
        triggerCode: "BLOCKED_TASK_REVIEW",
        purposeCode: "APT-TASK-MEETING",
        sourceType: "TASK",
        sourceReference: "task-1",
        status: "FAILED_RETRYABLE",
        reason: "Record retryable background automation failure.",
        actorUserId: manager?.id ?? null,
        inputSnapshot: {
          automationRuleCode: "RULE-BLOCKED-TASK-REVIEW",
          automationRuleVersion: 2,
          sourceTaskId: "task-1",
          sourceTaskTitle: "Call lender and verify packet"
        },
        resultSnapshot: {
          automationRuleCode: "RULE-BLOCKED-TASK-REVIEW",
          automationRuleVersion: 2,
          sourceTaskId: "task-1",
          sourceTaskTitle: "Call lender and verify packet",
          status: "FAILED_RETRYABLE",
          failureCode: "TASK_AUTOMATION_RUNTIME_FAILURE",
          failureMessage: "Temporary failure"
        },
        failureCode: "TASK_AUTOMATION_RUNTIME_FAILURE",
        failureMessage: "Temporary failure"
      },
      repository
    );

    const console = await getAppointmentAutomationOperationsConsoleForManager(manager, repository);

    expect(console.recentEvents[0]).toMatchObject({
      action: "FAILED",
      status: "FAILED_RETRYABLE",
      failureCode: "TASK_AUTOMATION_RUNTIME_FAILURE",
      failureMessage: "Temporary failure",
      sourceTaskId: "task-1"
    });
    expect(historyEvents.find((event) => event.eventType === "AUTOMATION_FAILED")).toBeUndefined();
  });

  it("writes appointment history evidence for appointment-sourced automation failures", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository, historyEvents } = createMemoryAppointmentAutomationOperationsRepository();

    await recordAppointmentAutomationExecution(
      {
        ruleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_TASK",
        triggerCode: "APPOINTMENT_OUTCOME_RECORDED",
        purposeCode: "FOLLOW_UP_TASK",
        sourceType: "APPOINTMENT",
        sourceReference: "appointment-1",
        status: "FAILED_RETRYABLE",
        reason: "Record retryable appointment automation failure.",
        actorUserId: manager?.id ?? null,
        inputSnapshot: {
          automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_TASK",
          automationRuleVersion: 3,
          sourceAppointmentNumber: "APT-10245"
        },
        resultSnapshot: {
          automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_TASK",
          automationRuleVersion: 3,
          status: "FAILED_RETRYABLE",
          failureCode: "FOLLOW_UP_TASK_WRITE_FAILED",
          failureMessage: "Could not persist follow-up task."
        },
        failureCode: "FOLLOW_UP_TASK_WRITE_FAILED",
        failureMessage: "Could not persist follow-up task."
      },
      repository
    );

    expect(historyEvents[0]).toMatchObject({
      appointmentId: "appointment-1",
      actorType: "AUTOMATION",
      eventType: "AUTOMATION_FAILED",
      automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_TASK",
      automationRuleVersion: 3,
      metadata: expect.objectContaining({
        automationExecutionId: "execution-1",
        sourceReference: "appointment-1",
        failureCode: "FOLLOW_UP_TASK_WRITE_FAILED"
      })
    });
  });

  it("writes generated-appointment history evidence for task-sourced automation outcomes", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository, historyEvents } = createMemoryAppointmentAutomationOperationsRepository();

    await recordAppointmentAutomationExecution(
      {
        ruleCode: "RULE-BLOCKED-TASK-REVIEW",
        triggerCode: "BLOCKED_TASK_REVIEW",
        purposeCode: "APT-TASK-MEETING",
        sourceType: "TASK",
        sourceReference: "task-1",
        status: "SUCCEEDED",
        reason: "Record generated appointment from task automation.",
        actorUserId: manager?.id ?? null,
        inputSnapshot: {
          automationRuleCode: "RULE-BLOCKED-TASK-REVIEW",
          automationRuleVersion: 2,
          sourceTaskId: "task-1",
          sourceTaskTitle: "Call lender and verify packet"
        },
        resultSnapshot: {
          automationRuleCode: "RULE-BLOCKED-TASK-REVIEW",
          automationRuleVersion: 2,
          generatedAppointmentId: "appointment-generated-1",
          generatedAppointmentNumber: "APT-TASK-AUTO-001",
          generatedAppointmentTitle: "Blocked task review: Call lender and verify packet"
        }
      },
      repository
    );

    expect(historyEvents[0]).toMatchObject({
      appointmentId: "appointment-generated-1",
      actorType: "AUTOMATION",
      eventType: "AUTOMATION_EVALUATED",
      automationRuleCode: "RULE_BLOCKED_TASK_REVIEW",
      metadata: expect.objectContaining({
        generatedAppointmentId: "appointment-generated-1",
        generatedAppointmentNumber: "APT-TASK-AUTO-001",
        sourceTaskId: "task-1"
      })
    });
  });

  it("rejects non-manager access", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staff = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createMemoryAppointmentAutomationOperationsRepository();

    await expect(
      getAppointmentAutomationOperationsConsoleForManager(staff, repository)
    ).rejects.toThrow(/Manager access required/);
  });
});
