import { describe, expect, it } from "vitest";

import {
  buildSalesConsolePilotReadiness,
  salesConsolePilotReadiness
} from "@/features/sales/sales-console-mvp-pilot-readiness";
import { salesConsoleReadAdapterPreview } from "@/features/sales/sales-console-mvp-read-adapters";

describe("Sales Console MVP pilot readiness", () => {
  it("builds a read-only pilot readiness model with no pilot blockers", () => {
    expect(salesConsolePilotReadiness.readOnly).toBe(true);
    expect(salesConsolePilotReadiness.pilotBlockers).toHaveLength(0);
    expect(salesConsolePilotReadiness.readinessChecks.every((check) => check.status !== "blocked")).toBe(true);
  });

  it("proves managers can scan the first priorities quickly", () => {
    const readiness = buildSalesConsolePilotReadiness(salesConsoleReadAdapterPreview);

    expect(readiness.priorityBrief.length).toBeGreaterThan(0);
    expect(readiness.priorityBrief.length).toBeLessThanOrEqual(3);
    expect(readiness.priorityBrief[0]).toContain("#1");
    expect(readiness.readinessChecks.some((check) => check.check === "30-second priority scan" && check.status === "ready")).toBe(true);
  });

  it("verifies loading, error, stale, blocked, placeholder, verify-first, and unavailable state coverage", () => {
    const readiness = buildSalesConsolePilotReadiness();

    expect(readiness.readinessChecks.map((check) => check.check)).toContain("Protected route smoke");
    expect(readiness.stateVerification.map((state) => state.label)).toEqual([
      "current",
      "stale",
      "blocked",
      "placeholder",
      "verify-first",
      "unavailable"
    ]);
    expect(readiness.stateVerification.every((state) => state.count >= 0)).toBe(true);
    expect(readiness.stateVerification.some((state) => state.label === "blocked" && state.status === "ready")).toBe(true);
    expect(readiness.stateVerification.some((state) => state.label === "placeholder" && state.status === "ready")).toBe(true);
  });

  it("tracks pilot acceptance checklist status without enabling production workflows", () => {
    const readiness = buildSalesConsolePilotReadiness();

    expect(readiness.acceptanceTracker.length).toBeGreaterThan(0);
    expect(readiness.acceptanceTracker.some((check) => check.item === "No risky write actions are active")).toBe(true);
    expect(readiness.acceptanceTracker.every((check) => check.status === "ready" || check.status === "review")).toBe(true);
    expect(readiness.readinessChecks.some((check) => check.check === "Read-only guardrails" && check.status === "ready")).toBe(true);
  });

  it("defines empty and fallback states for every pilot operating surface", () => {
    const readiness = buildSalesConsolePilotReadiness();

    expect(readiness.fallbackStates.map((state) => state.surface)).toEqual([
      "Salesperson Today",
      "Lead Operations",
      "Inventory Intelligence",
      "Deal Desk"
    ]);
    expect(readiness.fallbackStates.every((state) => state.fallbackAction.includes("console") || state.fallbackAction.includes("source"))).toBe(true);
  });
});
