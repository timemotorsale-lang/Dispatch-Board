import { describe, expect, it } from "vitest";

import {
  salesConsoleM16AuditGuardrails,
  salesConsoleM16AuditGuardrailsRemainPlanningOnly,
  salesConsoleM16AuditReadinessCoversRequestShape,
  salesConsoleM16ExcludedActionsRemainBlocked
} from "@/features/sales/sales-console-m16-audit-guardrails";

describe("Sales Console M16 audit guardrails", () => {
  it("covers the future manager review request audit shape", () => {
    expect(salesConsoleM16AuditReadinessCoversRequestShape()).toBe(true);
    expect(salesConsoleM16AuditGuardrails.auditReadiness).toContain("Every future request requires sourceSnapshot.");
  });

  it("keeps excluded risky workflows blocked", () => {
    expect(salesConsoleM16ExcludedActionsRemainBlocked()).toBe(true);
    expect(salesConsoleM16AuditGuardrails.excludedActionGuardrails.map((guardrail) => guardrail.guardrail)).toEqual([
      "No customer messaging automation",
      "No quote submission",
      "No vehicle holds or reservations",
      "No finance decisions",
      "No discount approvals"
    ]);
  });

  it("remains planning-only", () => {
    expect(salesConsoleM16AuditGuardrailsRemainPlanningOnly()).toBe(true);
  });
});
