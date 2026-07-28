import { describe, expect, it } from "vitest";

import {
  salesConsoleM14LeadOperationsDepth,
  salesConsoleM14LeadOperationsExplainsSlaAndAssignment,
  salesConsoleM14LeadOperationsHasOperatingGroups,
  salesConsoleM14LeadOperationsRemainsReadOnly
} from "@/features/sales/sales-console-m14-lead-operations-depth";

describe("Sales Console M14 Lead Operations depth", () => {
  it("groups lead operations into operating queues", () => {
    expect(salesConsoleM14LeadOperationsHasOperatingGroups()).toBe(true);
    expect(salesConsoleM14LeadOperationsDepth.groups.map((group) => group.group)).toEqual([
      "assigned-current",
      "duplicate-review",
      "sla-risk",
      "unassigned-or-placeholder"
    ]);
  });

  it("keeps lead operations read-only and verify-first", () => {
    expect(salesConsoleM14LeadOperationsRemainsReadOnly()).toBe(true);
    expect(salesConsoleM14LeadOperationsDepth.readOnly).toBe(true);
    expect(salesConsoleM14LeadOperationsDepth.groups.every((group) => group.verifyPrompt.length > 0)).toBe(true);
  });

  it("explains SLA and assignment risk before staff action", () => {
    expect(salesConsoleM14LeadOperationsExplainsSlaAndAssignment()).toBe(true);
    expect(salesConsoleM14LeadOperationsDepth.groups.some((group) => group.operatingMeaning.includes("SLA-risk"))).toBe(true);
    expect(salesConsoleM14LeadOperationsDepth.groups.some((group) => group.verifyPrompt.includes("Do not reassign"))).toBe(true);
  });
});
