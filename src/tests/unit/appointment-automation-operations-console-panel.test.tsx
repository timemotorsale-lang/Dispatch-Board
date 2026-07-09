import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AppointmentAutomationOperationsConsolePanel } from "@/features/settings/appointment-automation-operations-console-panel";
import {
  getAppointmentAutomationOperationsConsoleForManager,
  recordAppointmentAutomationExecution
} from "@/server/services/appointment-automation-operations-console";
import { createMemoryAppointmentAutomationOperationsRepository } from "@/tests/support/appointment-automation-console-test-repository";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

describe("appointment automation operations console panel", () => {
  it("renders rule lifecycle, failure queue, and audit sections", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const manager = usersByEmail.get("morgan.manager@local.test") ?? null;
    const { repository } = createMemoryAppointmentAutomationOperationsRepository();
    const consoleModel = await getAppointmentAutomationOperationsConsoleForManager(
      manager,
      repository
    );

    const markup = renderToStaticMarkup(
      <AppointmentAutomationOperationsConsolePanel initialConsole={consoleModel} />
    );

    expect(markup).toContain("Rule lifecycle control");
    expect(markup).toContain("Catalog governance");
    expect(markup).toContain("Activation readiness");
    expect(markup).toContain("Simulation evidence");
    expect(markup).toContain("Failure queue");
    expect(markup).toContain("Runtime execution activity");
    expect(markup).toContain("Recent automation events");
    expect(markup).toContain("Catalog candidate");
    expect(markup).toContain("Any Task Requires Meeting");
  });

  it("renders task-source runtime context for queued execution work", async () => {
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
        reason: "Queue task review automation.",
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
          generatedAppointmentTitle: "Blocked task review: Call lender and verify packet",
          retryReplayAction: "REPLAY"
        }
      },
      repository
    );

    const consoleModel = await getAppointmentAutomationOperationsConsoleForManager(
      manager,
      repository
    );

    const markup = renderToStaticMarkup(
      <AppointmentAutomationOperationsConsolePanel initialConsole={consoleModel} />
    );

    expect(markup).toContain("Call lender and verify packet (task-1)");
    expect(markup).toContain("APT-TASK-AUTO-001 (appointment-generated-1)");
    expect(markup).toContain("Generated result");
    expect(markup).toContain("Last recovery action: Replay");
  });

  it("renders audit failure and status context for runtime events", async () => {
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

    const consoleModel = await getAppointmentAutomationOperationsConsoleForManager(
      manager,
      repository
    );

    const markup = renderToStaticMarkup(
      <AppointmentAutomationOperationsConsolePanel initialConsole={consoleModel} />
    );

    expect(markup).toContain("Status: Failed Retryable");
    expect(markup).toContain("Failure: TASK_AUTOMATION_RUNTIME_FAILURE: Temporary failure");
  });
});
