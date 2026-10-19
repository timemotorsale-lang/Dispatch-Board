import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import type { ShopPlanningRepository } from "@/server/shop-planning/repository";
import { presentRepairEstimate } from "@/server/shop-planning/service";
import { estimateReviewScope } from "@/lib/estimate-review";

describe("diagnostic estimate retries", () => {
  it("keeps the command hash identical after the RO version advances, without recording diagnosis", async () => {
    const actor = { id: "manager-1", name: "Manager", email: "manager@example.com", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } } as AuthenticatedUser;
    const estimate = vi.fn().mockResolvedValue({ result: { id: "estimate-1" } });
    const diagnosis = vi.fn();
    const get = vi.fn().mockResolvedValueOnce({ id: "ro-1", locationId: "location-1", version: 4, vehicle: { id: "vehicle-1" } }).mockResolvedValueOnce({ id: "ro-1", locationId: "location-1", version: 5, vehicle: { id: "vehicle-1" } });
    const repository = { get, estimate, diagnosis } as unknown as ShopPlanningRepository;
    const foundationRepository = { listCapabilityGrants: vi.fn().mockResolvedValue([]) } as unknown as EnterpriseCommandRepository;
    const body = { expectedVersion: 4, idempotencyKey: "retry-1", presentedAt: "2026-09-03T15:00:00Z", expiresAt: "2026-09-10T15:00:00Z", lineItems: [{ key: "brakes", type: "LABOR", quantity: 1, unitPriceCents: 12900, description: "Inspect brakes" }], presentationChannel: "INTERNAL", taxBoundary: "Configured tax policy", reason: "Present estimate for review." };
    const dependencies = { repository, foundationRepository, enforceRollout: false, organizationId: "org-1", now: () => new Date("2026-09-03T15:00:00Z") };
    const reviewedBody = { ...body, manualLaborReview: { engine: "Reviewed engine", configuration: "Reviewed configuration", source: "Staff assessment", limitations: "Not OEM verified", scope: estimateReviewScope("vehicle-1", body.lineItems.map(line => ({ ...line, laborGuideMinutes: 0 }))) } };
    await presentRepairEstimate(actor, "ro-1", reviewedBody, dependencies);
    await presentRepairEstimate(actor, "ro-1", reviewedBody, dependencies);
    expect(estimate.mock.calls[0][0].requestHash).toBe(estimate.mock.calls[1][0].requestHash);
    expect(estimate.mock.calls[1][0].expectedVersion).toBe(4);
    expect(diagnosis).not.toHaveBeenCalled();
  });
});
