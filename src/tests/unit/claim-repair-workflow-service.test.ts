import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ mutation: vi.fn(), readModel: vi.fn() }));
vi.mock("@/server/claims-workspace/service", () => ({ getClaimWorkspaceReadModel: mocks.readModel }));
vi.mock("@/server/claims-workspace/repository-factory", () => ({ claimsWorkspaceDependencies: async () => ({}) }));
vi.mock("@/server/db/client", () => ({ prisma: {} }));
vi.mock("@/server/enterprise-command/aggregate-mutation", () => ({ executeAggregateMutation: mocks.mutation, toJson: (value: unknown) => value }));
import { executeClaimRepairWorkflow, getClaimRepairWorkflow, getClaimWorkflowTaskContext } from "@/server/claims-workspace/repair-workflow-service";
import type { AuthenticatedUser } from "@/server/auth/store";
const actor: AuthenticatedUser = { id: "manager", name: "Review Manager", email: "manager@example.com", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
function database() {
  return {
    vehicleCapabilityGrant: { findMany: vi.fn().mockResolvedValue([]) },
    insuranceClaim: { findFirst: vi.fn().mockResolvedValue({ id: "claim-1", linkedRepairOrderId: null, vehicleVin: "1HGCM82633A004352", vehicleId: null, customerName: "Review Customer", claimNumber: "REVIEW-1", status: "OPEN", evidence: [] }), update: vi.fn() },
    repairOrder: { findMany: vi.fn().mockResolvedValue([{ id: "ro-1", repairOrderNumber: "RO-1", vehicle: { year: 2003, make: "Honda", model: "Accord" } }]), findFirst: vi.fn().mockResolvedValue({ id: "ro-1", locationId: "location-1", vehicleId: "vehicle-1", customerId: null }) },
    enterpriseCommandLedger: { findFirst: vi.fn().mockResolvedValue(null) },
    enterpriseAuditEvent: { findMany: vi.fn().mockResolvedValue([]) },
    insuranceClaimActivity: { create: vi.fn() }
  };
}
describe("claim repair workflow service", () => {
  beforeEach(() => vi.resetAllMocks());
  it("returns to the current workflow from a verified associated task", async () => {
    const db = database(); mocks.readModel.mockResolvedValue({ associatedRepairTask: { id: "task-1" }, handoff: { allowed: true }, executionTasks: [] });
    const result = await getClaimWorkflowTaskContext(actor, { id: "task-1", description: "Claim: REVIEW-1. Carrier: Review." }, undefined, db as unknown as PrismaClient);
    expect(db.insuranceClaim.findFirst.mock.calls[0][0].where).toMatchObject({ claimNumber: "REVIEW-1", organizationId: expect.any(String) });
    expect(result?.href).toBe("/vehicles/claims-workspace?claimId=claim-1&workflow=next");
  });
  it("does not expose workflow context for an unrelated task or untrusted claim parameter", async () => {
    const db = database(); mocks.readModel.mockResolvedValue({ associatedRepairTask: { id: "different-task" } });
    expect(await getClaimWorkflowTaskContext(actor, { id: "task-1", description: "General task" }, "claim-1", db as unknown as PrismaClient)).toBeNull();
    expect(db.enterpriseCommandLedger.findFirst).not.toHaveBeenCalled();
  });
  it("does not search claims by a customer name or unrelated task description", async () => {
    const db = database();
    expect(await getClaimWorkflowTaskContext(actor, { id: "task-1", description: "Call Review Customer" }, undefined, db as unknown as PrismaClient)).toBeNull();
    expect(db.insuranceClaim.findFirst).not.toHaveBeenCalled();
  });
  it("rejects unauthenticated, inactive and unrelated roles before reading data", async () => {
    const db = database();
    for (const user of [null, { ...actor, isActive: false }, { ...actor, roles: ["Marketing/Advertisement Manager"] }]) await expect(getClaimRepairWorkflow(user, "claim-1", db as unknown as PrismaClient)).rejects.toThrow();
    expect(db.insuranceClaim.findFirst).not.toHaveBeenCalled();
  });
  it("scopes claim, candidates, ledger and audit queries to the organization", async () => {
    const db = database(); const result = await getClaimRepairWorkflow(actor, "claim-1", db as unknown as PrismaClient);
    expect(result.version).toBe(0); expect(result.source.candidates[0].id).toBe("ro-1");
    expect(db.insuranceClaim.findFirst.mock.calls[0][0].where).toMatchObject({ id: "claim-1", organizationId: expect.any(String) });
    expect(db.repairOrder.findMany.mock.calls[0][0].where).toMatchObject({ organizationId: expect.any(String), vehicle: { vin: "1HGCM82633A004352" }, closedAt: null });
    expect(db.enterpriseCommandLedger.findFirst.mock.calls[0][0].where).toMatchObject({ subjectId: "claim-1", domain: "CLAIM_REPAIR_WORKFLOW", organizationId: expect.any(String) });
  });
  it("rejects missing claims rather than supplying example data", async () => {
    const db = database(); db.insuranceClaim.findFirst.mockResolvedValueOnce(null);
    await expect(getClaimRepairWorkflow(actor, "missing", db as unknown as PrismaClient)).rejects.toThrow("Claim not found");
  });
  it("rejects stale sources inside the aggregate transaction before any update", async () => {
    const db = database();
    mocks.mutation.mockImplementation(async (_database, _command, _topic, callback) => callback(db));
    await expect(executeClaimRepairWorkflow(actor, "claim-1", { action: "LINK_REPAIR_ORDER", repairOrderId: "ro-1", sourceVersion: "stale", expectedVersion: 0, idempotencyKey: "test-1", reason: "Reviewed and linked claim." }, db as unknown as PrismaClient)).rejects.toThrow("source records changed");
    expect(db.insuranceClaim.update).not.toHaveBeenCalled(); expect(db.insuranceClaimActivity.create).not.toHaveBeenCalled();
  });
  it("rejects foreign repair-order links even with a current source", async () => {
    const db = database(); const model = await getClaimRepairWorkflow(actor, "claim-1", db as unknown as PrismaClient);
    mocks.mutation.mockImplementation(async (_database, _command, _topic, callback) => callback(db));
    await expect(executeClaimRepairWorkflow(actor, "claim-1", { action: "LINK_REPAIR_ORDER", repairOrderId: "foreign-ro", sourceVersion: model.sourceVersion, expectedVersion: 0, idempotencyKey: "test-1", reason: "Reviewed and linked claim." }, db as unknown as PrismaClient)).rejects.toThrow("matching open repair order");
    expect(db.insuranceClaim.update).not.toHaveBeenCalled();
  });
  it("uses the shared serializable, idempotent enterprise command boundary", async () => {
    const db = database(); mocks.mutation.mockResolvedValue({ duplicate: false, version: 1 });
    await executeClaimRepairWorkflow(actor, "claim-1", { action: "LINK_REPAIR_ORDER", expectedVersion: 0, idempotencyKey: "request-1", sourceVersion: "fingerprint", reason: "Reviewed and linked claim." }, db as unknown as PrismaClient);
    expect(mocks.mutation).toHaveBeenCalledWith(db, expect.objectContaining({ domain: "CLAIM_REPAIR_WORKFLOW", subjectType: "INSURANCE_CLAIM", subjectId: "claim-1", expectedVersion: 0, idempotencyKey: "request-1", requestHash: expect.any(String) }), "claims.repair-workflow", expect.any(Function));
  });
});
