import { describe, expect, it } from "vitest";

import {
  salesConsoleAllowedInternalWrites,
  salesConsoleConnectedMvpDeploymentGates,
  salesConsoleGuardrailsKeepRiskyWritesOutOfAllowedWrites,
  salesConsoleProhibitedWrites,
  salesConsoleRoleCanReviewSourceHealth,
  salesConsoleSourceOwnershipCoversEverySystem,
  salesConsoleSourceOwnershipMap,
  salesConsoleSourceSystems
} from "@/features/sales/sales-console-m49-connected-mvp-plan";

describe("Sales Console M49 connected MVP plan", () => {
  it("maps every source system before Phase 2 integration work starts", () => {
    expect(salesConsoleSourceOwnershipCoversEverySystem()).toBe(true);
    expect(salesConsoleSourceOwnershipMap).toHaveLength(salesConsoleSourceSystems.length);
  });

  it("keeps prohibited source-system writes out of allowed Sales Console writes", () => {
    expect(salesConsoleGuardrailsKeepRiskyWritesOutOfAllowedWrites()).toBe(true);
    expect(salesConsoleProhibitedWrites).toContain("quote submission");
    expect(salesConsoleProhibitedWrites).toContain("finance decision");
    expect(salesConsoleProhibitedWrites).toContain("vehicle hold/reservation");
  });

  it("allows only internal record types owned by the Sales Console", () => {
    expect(salesConsoleAllowedInternalWrites).toEqual(
      expect.arrayContaining(["Sales Opportunity", "Sales Activity", "Sales Evidence", "Sales Outcome"])
    );
    expect(salesConsoleAllowedInternalWrites).not.toContain("Finance Decision");
  });

  it("requires deployment gates that protect staff-facing rollout", () => {
    expect(salesConsoleConnectedMvpDeploymentGates).toEqual(
      expect.arrayContaining([
        "Every visible tab changes to an operating workspace",
        "Risky workflows remain governed or source-system controlled",
        "Algorithms return deterministic reasons staff can understand"
      ])
    );
  });

  it("limits source health review to manager and admin roles", () => {
    expect(salesConsoleRoleCanReviewSourceHealth("Sales Manager")).toBe(true);
    expect(salesConsoleRoleCanReviewSourceHealth("Admin / Owner")).toBe(true);
    expect(salesConsoleRoleCanReviewSourceHealth("Salesperson")).toBe(false);
  });
});
