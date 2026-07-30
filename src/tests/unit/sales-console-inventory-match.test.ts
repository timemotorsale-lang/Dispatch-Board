import { describe, expect, it } from "vitest";

import {
  salesConsoleInventoryAlternatives,
  salesConsoleInventoryKeepsHoldsGoverned,
  salesConsoleInventoryMatches,
  salesConsoleInventoryShowsReadinessAndBlockers
} from "@/features/sales/sales-console-inventory-match";

describe("Sales Console M45 inventory match and availability", () => {
  it("shows vehicle readiness, availability, market pressure, fit reasons, and blockers", () => {
    expect(salesConsoleInventoryShowsReadinessAndBlockers()).toBe(true);
    expect(salesConsoleInventoryMatches.some((match) => match.availability === "service-blocked")).toBe(true);
    expect(salesConsoleInventoryMatches.some((match) => match.availability === "pricing review")).toBe(true);
  });

  it("provides alternatives while keeping holds governed", () => {
    expect(salesConsoleInventoryAlternatives.length).toBeGreaterThanOrEqual(3);
    expect(salesConsoleInventoryKeepsHoldsGoverned()).toBe(true);
  });
});
