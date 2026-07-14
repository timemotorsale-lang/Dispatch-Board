import { describe, expect, it } from "vitest";
import { evaluateDisasterRecoveryGate, evaluateExperiencePerformanceGate, evaluateSecurityValidationGate, transitionPilotState } from "@/server/inventory/enterprise-hardening-gates";

describe("enterprise hardening gates", () => {
  it("blocks unreconciled recovery evidence and accepts matching totals", () => {
    const input = { backupCompletedAt: "2026-01-01T00:00:00Z", restoreCompletedAt: "2026-01-01T00:10:00Z", observedRpoMinutes: 5, observedRtoMinutes: 10, approvedRpoMinutes: 15, approvedRtoMinutes: 30, sourceTotals: { vehicles: 2, commands: 4 }, restoredTotals: { vehicles: 2, commands: 3 } };
    expect(evaluateDisasterRecoveryGate(input).disposition).toBe("BLOCKED");
    expect(evaluateDisasterRecoveryGate({ ...input, restoredTotals: input.sourceTotals }).disposition).toBe("READY");
  });
  it("requires every security evidence family", () => {
    expect(evaluateSecurityValidationGate({ threatModelPassed: true, dependencyScanPassed: true, secretScanPassed: true, authorizationMatrixPassed: true, tenantIsolationPassed: true, uploadAbuseCasesPassed: true }).disposition).toBe("READY");
    expect(evaluateSecurityValidationGate({ threatModelPassed: true, dependencyScanPassed: false, secretScanPassed: true, authorizationMatrixPassed: true, tenantIsolationPassed: true, uploadAbuseCasesPassed: true }).blockers).toContain("SECURITY_DEPENDENCIES");
  });
  it("gates latency, accessibility, pagination, and concurrency", () => {
    const input = { wcagAaPassed: true, responsiveJourneysPassed: true, initialLoadP95Ms: 1000, mutationP95Ms: 500, maxConcurrentUsers: 100, requiredConcurrentUsers: 50, maxPaginationPageSize: 100, approvedMaxPaginationPageSize: 100, approvedInitialLoadP95Ms: 1500, approvedMutationP95Ms: 800 };
    expect(evaluateExperiencePerformanceGate(input).disposition).toBe("READY");
    expect(evaluateExperiencePerformanceGate({ ...input, initialLoadP95Ms: 2000 }).disposition).toBe("BLOCKED");
  });
  it("enforces pilot transitions and rollback safety", () => {
    expect(transitionPilotState("PLANNED", "ENABLE")).toBe("ENABLED");
    expect(transitionPilotState("ENABLED", "PAUSE")).toBe("PAUSED");
    expect(transitionPilotState("PAUSED", "ROLLBACK")).toBe("ROLLED_BACK");
    expect(() => transitionPilotState("PLANNED", "ENABLE", "BLOCKED")).toThrow();
  });
});
