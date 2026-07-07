import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getAppointmentAutomationOperationsConsoleForManager: vi.fn(),
  saveAppointmentAutomationRuleDraftForManager: vi.fn(),
  transitionAppointmentAutomationRuleForManager: vi.fn(),
  transitionAppointmentAutomationExecutionForManager: vi.fn()
}));

vi.mock("@/server/auth/current-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

vi.mock("@/server/services/appointment-automation-operations-console", () => ({
  getAppointmentAutomationOperationsConsoleForManager:
    mocks.getAppointmentAutomationOperationsConsoleForManager,
  saveAppointmentAutomationRuleDraftForManager:
    mocks.saveAppointmentAutomationRuleDraftForManager,
  transitionAppointmentAutomationRuleForManager:
    mocks.transitionAppointmentAutomationRuleForManager,
  transitionAppointmentAutomationExecutionForManager:
    mocks.transitionAppointmentAutomationExecutionForManager
}));

import { GET } from "@/app/api/settings/appointments/automation/route";
import { POST as POST_EXECUTION_TRANSITION } from "@/app/api/settings/appointments/automation/executions/transition/route";
import { POST as POST_RULE } from "@/app/api/settings/appointments/automation/rules/route";
import { POST as POST_RULE_TRANSITION } from "@/app/api/settings/appointments/automation/rules/transition/route";

const managerUser = {
  id: "user-manager",
  name: "Abdi Farah",
  email: "manager@local.test",
  isActive: true,
  roles: ["General Manager"],
  duties: { direct: [], roleDefaults: [], all: [] }
};

const consoleModel = {
  ruleHealth: { totalRules: 1, activeRules: 0, draftRules: 1 },
  rules: [{ ruleCode: "RULE-1", name: "Rule 1", status: "DRAFT" }],
  failureQueue: [],
  recentEvents: []
};

describe("appointment automation operations console routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue(managerUser);
    mocks.getAppointmentAutomationOperationsConsoleForManager.mockResolvedValue(consoleModel);
    mocks.saveAppointmentAutomationRuleDraftForManager.mockResolvedValue(consoleModel);
    mocks.transitionAppointmentAutomationRuleForManager.mockResolvedValue(consoleModel);
    mocks.transitionAppointmentAutomationExecutionForManager.mockResolvedValue(consoleModel);
  });

  it("loads the automation console for managers", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ console: consoleModel });
    expect(mocks.getAppointmentAutomationOperationsConsoleForManager).toHaveBeenCalledWith(managerUser);
  });

  it("saves a rule draft", async () => {
    const payload = {
      ruleCode: "RULE-1",
      triggerCode: "ANY_TASK_REQUIRES_MEETING",
      purposeCode: "APT-TASK-MEETING",
      name: "Task meeting rule",
      reason: "Create rule draft."
    };
    const response = await POST_RULE(
      new Request("http://localhost/api/settings/appointments/automation/rules", {
        method: "POST",
        body: JSON.stringify(payload)
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ console: consoleModel });
    expect(mocks.saveAppointmentAutomationRuleDraftForManager).toHaveBeenCalledWith(
      managerUser,
      payload
    );
  });

  it("transitions a rule", async () => {
    const payload = { ruleCode: "RULE-1", action: "ACTIVATE", reason: "Activate rule." };
    const response = await POST_RULE_TRANSITION(
      new Request("http://localhost/api/settings/appointments/automation/rules/transition", {
        method: "POST",
        body: JSON.stringify(payload)
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ console: consoleModel });
    expect(mocks.transitionAppointmentAutomationRuleForManager).toHaveBeenCalledWith(
      managerUser,
      payload
    );
  });

  it("transitions an execution queue item", async () => {
    const payload = { executionId: "execution-1", action: "RESOLVE", reason: "Resolved manually." };
    const response = await POST_EXECUTION_TRANSITION(
      new Request("http://localhost/api/settings/appointments/automation/executions/transition", {
        method: "POST",
        body: JSON.stringify(payload)
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ console: consoleModel });
    expect(mocks.transitionAppointmentAutomationExecutionForManager).toHaveBeenCalledWith(
      managerUser,
      payload
    );
  });
});
