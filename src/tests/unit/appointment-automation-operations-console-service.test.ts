import { describe, expect, it } from "vitest";

import {
  getAppointmentAutomationOperationsConsoleForManager,
  saveAppointmentAutomationRuleDraftForManager,
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
    expect(console.ruleHealth.draftRules).toBe(console.ruleHealth.totalRules);
    expect(console.rules.some((rule) => rule.triggerCode === "ANY_TASK_REQUIRES_MEETING")).toBe(true);
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

    expect(console.ruleHealth.totalRules).toBe(1);
    expect(console.rules[0]).toMatchObject({
      ruleCode: "RULE-TEST-DRIVE-FOLLOW-UP",
      status: "DRAFT"
    });
    expect(console.recentEvents[0]).toMatchObject({
      action: "DRAFT_CREATED"
    });
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

  it("rejects non-manager access", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staff = usersByEmail.get("jordan.sales@local.test") ?? null;
    const { repository } = createMemoryAppointmentAutomationOperationsRepository();

    await expect(
      getAppointmentAutomationOperationsConsoleForManager(staff, repository)
    ).rejects.toThrow(/Manager access required/);
  });
});
