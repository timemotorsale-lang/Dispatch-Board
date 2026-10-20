import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import type { DispositionWholesaleRepository } from "@/server/disposition-wholesale/repository";
import { executeDispositionWholesaleCommand } from "@/server/disposition-wholesale/service";

const manager: AuthenticatedUser = { id: "manager", name: "Manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const base = { inventoryUnitId: "unit", ownerUserId: "manager", targetAt: "2026-10-13T12:00:00Z", occurredAt: "2026-10-10T12:00:00Z", idempotencyKey: "review-1", reason: "Recon is not economically justified", reasonCodes: ["RECON_DECLINED"] };
function dependencies(cases: unknown[] = []) {
  const create = vi.fn(async () => ({ result: { id: "new-case" } })), apply = vi.fn();
  const unit = { id: "unit", locationId: "lot", financialAcquiredAt: new Date(base.occurredAt), operatingState: "ACTIVE", costEntries: [], titleReadiness: [{ status: "READY" }] };
  return { create, apply, options: { enforceRollout: false, now: () => new Date(base.occurredAt), repository: { overview: async () => ({ cases, candidateUnits: [unit] }), create, apply } as unknown as DispositionWholesaleRepository, foundationRepository: { listCapabilityGrants: async () => [] } as unknown as EnterpriseCommandRepository } };
}
describe("as-is disposition server commands", () => {
  it("permits an attributable as-is review for a newly acquired unit", async () => {
    const context = dependencies();
    await executeDispositionWholesaleCommand(manager, { ...base, action: "CREATE_DISPOSITION_CANDIDATE", saleCondition: "AS_IS", reconDecisionReason: base.reason, knownDefects: "Engine fault; non-running vehicle" }, context.options);
    expect(context.create).toHaveBeenCalledWith(expect.objectContaining({ expectedVersion: 0 }), expect.objectContaining({ asIsReview: expect.objectContaining({ saleCondition: "AS_IS" }) }));
  });
  it("does not relax ordinary automated candidate eligibility", async () => {
    const context = dependencies();
    await expect(executeDispositionWholesaleCommand(manager, { ...base, action: "CREATE_DISPOSITION_CANDIDATE" }, context.options)).rejects.toThrow("candidate policy");
    expect(context.create).not.toHaveBeenCalled();
  });
  it("rejects direct completion requests without buyer acknowledgment before mutation", async () => {
    const context = dependencies([{ id: "case", locationId: "lot", candidateSnapshot: [{ asIsReview: { saleCondition: "AS_IS" } }], proposalVersions: [], offerVersions: [] }]);
    await expect(executeDispositionWholesaleCommand(manager, { ...base, subjectId: "case", expectedCaseVersion: 1, action: "RECORD_DISPOSITION_COMPLETION" }, context.options)).rejects.toThrow("Buyer acknowledgment");
    expect(context.apply).not.toHaveBeenCalled();
  });
});
