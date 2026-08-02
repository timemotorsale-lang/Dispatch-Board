import { describe, expect, it } from "vitest";

import { evaluateWopWorkOrder, type WopWorkOrderInput } from "@/features/prototype/wop-work-order-rules";

const baseInput: WopWorkOrderInput = {
  acceptedFindingsMapped: true,
  contingencyCaptured: true,
  criticalPathSequenced: true,
  diagnosisJobsCreated: true,
  estimatedTotalDollars: 450,
  estimateVersionLocked: true,
  laborHoursConfirmed: true,
  managerApprovalReceived: false,
  nextStageTargetConfirmed: true,
  outsideCapacityConfirmed: true,
  partsAvailabilityConfirmed: true,
  planType: "Retail recon",
  readinessRisksAssigned: true,
  repairJobsCreated: true,
  subletAndFeesConfirmed: true,
  technicianOrVendorAssigned: true,
  totalBudgetApproved: true,
  workDependenciesLinked: true,
};

describe("evaluateWopWorkOrder", () => {
  it("marks the plan ready for recon dispatch when every control is complete", () => {
    const result = evaluateWopWorkOrder(baseInput);

    expect(result.recommendation).toBe("Ready for recon dispatch");
    expect(result.blockerCount).toBe(0);
    expect(result.readinessScore).toBe(100);
    expect(result.authorizationComplete).toBe(true);
  });

  it("holds the plan when jobs, estimate, readiness, and authority are incomplete", () => {
    const result = evaluateWopWorkOrder({
      ...baseInput,
      acceptedFindingsMapped: false,
      contingencyCaptured: false,
      laborHoursConfirmed: false,
      partsAvailabilityConfirmed: false,
      totalBudgetApproved: false,
    });

    expect(result.recommendation).toBe("Hold");
    expect(result.blockers.length).toBeGreaterThan(3);
  });

  it("routes exception plans to manual review", () => {
    const result = evaluateWopWorkOrder({
      ...baseInput,
      planType: "Exception",
    });

    expect(result.recommendation).toBe("Exception");
    expect(result.blockers).toContain("Exception plan selected; manual review remains required");
  });

  it("requires manager approval when the work-order total is above $500", () => {
    const result = evaluateWopWorkOrder({
      ...baseInput,
      estimatedTotalDollars: 875,
      managerApprovalReceived: false,
    });

    expect(result.authorizationComplete).toBe(false);
    expect(result.blockers).toContain("Estimated total is above $500. Manager approval is still required");
  });

  it("allows stage approval within the $500 operating threshold without manager approval", () => {
    const result = evaluateWopWorkOrder({
      ...baseInput,
      estimatedTotalDollars: 499,
      managerApprovalReceived: false,
    });

    expect(result.authorizationComplete).toBe(true);
    expect(result.recommendation).toBe("Ready for recon dispatch");
  });
});
