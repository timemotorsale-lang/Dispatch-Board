import { describe, expect, it } from "vitest";

import {
  financeHandoffHasAuditAndPermissionCoverage,
  financeHandoffRemainsReadOnly,
  salesConsoleFinanceHandoffReadModel,
  salespersonCannotSeeRestrictedFinanceFields
} from "@/features/sales/sales-console-m9-finance-handoff";

describe("Sales Console finance handoff foundation", () => {
  it("keeps finance handoff read-only with decisions disabled", () => {
    expect(financeHandoffRemainsReadOnly()).toBe(true);
    expect(salesConsoleFinanceHandoffReadModel.packages.every((handoff) => handoff.decisionEnabled === false)).toBe(true);
  });

  it("requires a complete handoff checklist/status package", () => {
    const handoff = salesConsoleFinanceHandoffReadModel.packages[0];

    expect(handoff?.requiredFields).toEqual(
      expect.arrayContaining(["dealId", "customerId", "selectedScenarioId", "creditAppStatus", "documentChecklist", "tradePayoffStatus", "privacyClassification"])
    );
  });

  it("prevents salespeople from seeing restricted finance fields", () => {
    expect(salespersonCannotSeeRestrictedFinanceFields()).toBe(true);
    expect(
      salesConsoleFinanceHandoffReadModel.visibilityRules.filter((rule) => rule.restricted).flatMap((rule) => rule.visibleTo)
    ).not.toContain("salesperson");
  });

  it("has audit and permission coverage while finance actions stay disabled", () => {
    expect(financeHandoffHasAuditAndPermissionCoverage()).toBe(true);
  });
});
