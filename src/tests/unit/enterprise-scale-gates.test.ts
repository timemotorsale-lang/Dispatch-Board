import { describe, expect, it } from "vitest";
import { evaluateMultiLocationTransfer, evaluateEnterpriseScaleRecovery, resolveInheritedPolicy } from "@/server/inventory/enterprise-scale-gates";

describe("M10 enterprise scale gates", () => {
  it("checks transfer custody, authority, ledger and concurrency", () => {
    const input = { tenantId: "t1", sourceQuantity: 5, requestedQuantity: 2, receivedQuantity: 2, unitCostCents: 100, expectedCostCents: 200, authorityApproved: true, sourceVersion: 3, appliedSourceVersion: 3, sourceLedgerTotal: 800, destinationLedgerTotal: 200, transferLedgerTotal: 1000 };
    expect(evaluateMultiLocationTransfer(input).disposition).toBe("READY");
    expect(evaluateMultiLocationTransfer({ ...input, appliedSourceVersion: 2 }).disposition).toBe("BLOCKED");
  });
  it("resolves approved effective local overrides before central defaults", () => {
    const records = [
      { tenantId: "t1", scopeId: "org", key: "limit", value: 10, effectiveFrom: "2020-01-01", approved: true },
      { tenantId: "t1", scopeId: "loc", key: "limit", value: 20, effectiveFrom: "2025-01-01", approved: true },
      { tenantId: "other", scopeId: "loc", key: "limit", value: 99, effectiveFrom: "2025-01-01", approved: true },
    ];
    expect(resolveInheritedPolicy(records, "t1", ["org", "loc"], "limit", new Date("2026-01-01"))?.value).toBe(20);
  });
  it("blocks scale proof with missing recovery evidence", () => {
    const good = { peakRequestsPerSecond: 100, requiredRequestsPerSecond: 80, archivalVerified: true, longRunningJobsCompleted: true, outageReplayVerified: true, regionFailureVerified: true, restoreVerified: true, replayIdempotent: true };
    expect(evaluateEnterpriseScaleRecovery(good).disposition).toBe("READY");
    expect(evaluateEnterpriseScaleRecovery({ ...good, restoreVerified: false }).disposition).toBe("BLOCKED");
  });
});
