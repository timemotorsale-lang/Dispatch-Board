import { describe, expect, it } from "vitest";
import { evaluateLifecycleVelocity, summarizeInventoryExposure, validateVelocityPolicy } from "@/server/inventory/costs-velocity";

describe("retail inventory acquisition and velocity controls", () => {
  it("reconciles incurred, recovered, and projected exposure", () => {
    expect(summarizeInventoryExposure([
      { category: "ACQUISITION", amountCents: 10000, status: "INCURRED" },
      { category: "RECONDITIONING", amountCents: 2500, status: "ESTIMATED" },
      { category: "RECOVERED", amountCents: 500, status: "RECOVERED" },
    ])).toMatchObject({ incurredCents: 10500, recoveredCents: 500, estimatedCents: 2500, grossExposureCents: 10000 });
  });

  it("evaluates effective velocity policy and rejects invalid targets", () => {
    const policy = { policyCode: "RETAIL_DEFAULT", version: 1, effectiveFrom: new Date("2026-01-01"), stageTargetsDays: { FRONTLINE_READY: 3 }, defaultTargetDays: 7 } as const;
    expect(validateVelocityPolicy(policy).ready).toBe(true);
    expect(evaluateLifecycleVelocity({ stage: "FRONTLINE_READY", stageStartedAt: new Date("2026-01-01"), now: new Date("2026-01-06"), policy })).toMatchObject({ targetDays: 3, breached: true });
    expect(validateVelocityPolicy({ ...policy, defaultTargetDays: -1 }).ready).toBe(false);
  });
});
