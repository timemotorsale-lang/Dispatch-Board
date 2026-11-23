import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import { createShopCompletionRepository } from "@/server/shop-completion/repository";
import { recordTechnicianProgress, reportTechnicianFinding } from "@/server/shop-completion/service";

vi.mock("@/server/db/client", () => ({ prisma: {} }));
vi.mock("@/server/enterprise-command/aggregate-mutation", async importOriginal => ({
  ...await importOriginal<typeof import("@/server/enterprise-command/aggregate-mutation")>(),
  executeAggregateMutation: (database: PrismaClient, _command: unknown, _topic: string, mutate: (tx: PrismaClient, version: number) => unknown) => mutate(database, 1),
}));

const tech = { id: "tech", name: "Technician", email: "tech@example.test", isActive: true, roles: ["Mechanic"], duties: { all: [], direct: [], roleDefaults: [] } };
const valid = { jobId: "job", finding: "New leak found", occurredAt: "2026-10-02T12:00:00Z", idempotencyKey: "report-1" };

function setup() {
  const order = { id: "ro", locationId: "shop", stage: "REPAIR" };
  const db = {
    repairOrder: { findFirst: vi.fn().mockResolvedValue(order), update: vi.fn() },
    repairJob: { findFirst: vi.fn().mockResolvedValue({ jobNumber: "J1", estimateVersionId: "estimate", authorizationId: "auth", authorizedLineKey: "line" }), updateMany: vi.fn() },
    repairEstimateVersion: { findFirst: vi.fn().mockResolvedValue({ id: "estimate" }) },
    repairAuthorization: { findFirst: vi.fn().mockResolvedValue({ id: "auth", disposition: "ACCEPTED", authorizedLineKeys: ["line"] }) },
    repairOrderReleaseAuthorization: { findFirst: vi.fn().mockResolvedValue(null) },
    repairVendorWork: { findFirst: vi.fn().mockResolvedValue(null) },
    repairAdvisorUpdate: { findFirst: vi.fn().mockResolvedValue({ version: 2 }), create: vi.fn().mockResolvedValue({ id: "advisor-note" }) },
    enterpriseAggregateVersion: { findUnique: vi.fn().mockResolvedValue(null) },
  };
  const repository = createShopCompletionRepository(db as unknown as PrismaClient);
  const save = vi.spyOn(repository, "advisor");
  const input = {
    organizationId: "org", enforceRollout: false, repository,
    foundationRepository: { listCapabilityGrants: vi.fn().mockResolvedValue([]) } as unknown as EnterpriseCommandRepository,
  };
  return { db, save, input };
}

describe("Technician finding workflow", () => {
  it("saves the assigned technician's progress separately from labor, QC and advisor decisions", async () => {
    const { db, input } = setup();
    const note = { ...valid, progress: "Bumper fitted. Checking panel gaps." };
    await recordTechnicianProgress(tech, "ro", note, input);
    expect(db.repairJob.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({
      id: "job", repairOrderId: "ro",
      dispatches: { some: { status: "ACTIVE", position: "CURRENT", technicianUserId: "tech" } },
    }) });
    expect(db.repairAdvisorUpdate.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      statusCode: "TECHNICIAN_PROGRESS", internalNotes: "J1 · Bumper fitted. Checking panel gaps.",
    }) });
    expect(db.repairOrder.update).not.toHaveBeenCalled();
    expect(db.repairJob.updateMany).not.toHaveBeenCalled();
    db.repairJob.findFirst.mockResolvedValueOnce(null);
    await expect(recordTechnicianProgress(tech, "ro", note, input)).rejects.toThrow("assigned technician");
    expect(db.repairAdvisorUpdate.create).toHaveBeenCalledTimes(1);
  });
  it("saves the active technician's job-numbered finding in the advisor inbox and leaves workflow state alone", async () => {
    const { db, input } = setup();
    await reportTechnicianFinding(tech, "ro", { ...valid, statusCode: "READY_FOR_QC", contactDirection: "OUTBOUND" }, input);
    expect(db.repairJob.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({
      id: "job", repairOrderId: "ro", organizationId: "org",
      status: { in: expect.arrayContaining(["WAITING_PARTS", "DISPATCHED"]) },
      dispatches: { some: { technicianUserId: "tech", OR: [
        { status: "ACTIVE", position: "CURRENT" }, { status: "STAGED", position: "NEXT" },
      ] } },
    }) });
    expect(db.repairAdvisorUpdate.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      repairOrderId: "ro", version: 3, contactChannel: "INTERNAL", contactDirection: "INTERNAL",
      statusCode: "TECHNICIAN_FINDING", internalNotes: "J1 · New leak found",
      customerVisibleSummary: "The repair team recorded a finding for advisor review.",
    }) });
    expect(db.repairJob.updateMany).not.toHaveBeenCalled();
    expect(db.repairOrder.update).not.toHaveBeenCalled();
  });

  it("lets managers report before assignment and keeps the retry identity stable", async () => {
    const { db, save, input } = setup();
    const manager = { ...tech, id: "manager", roles: ["General Manager"] };
    await reportTechnicianFinding(manager, "ro", valid, input);
    db.enterpriseAggregateVersion.findUnique.mockResolvedValue({ version: 1 });
    await reportTechnicianFinding(manager, "ro", valid, input);
    expect(db.repairJob.findFirst.mock.calls[0][0].where).not.toHaveProperty("dispatches");
    expect(save.mock.calls[1][0]).toMatchObject({ requestHash: save.mock.calls[0][0].requestHash, expectedVersion: 1 });
  });

  it("refuses an unassigned technician and a revoked approval before saving an advisor update", async () => {
    const unassigned = setup();
    unassigned.db.repairJob.findFirst.mockResolvedValue(null);
    await expect(reportTechnicianFinding(tech, "ro", valid, unassigned.input)).rejects.toThrow("assigned technician");
    expect(unassigned.db.repairAdvisorUpdate.create).not.toHaveBeenCalled();

    const revoked = setup();
    revoked.db.repairAuthorization.findFirst.mockResolvedValue({ id: "auth", disposition: "REVOKED", authorizedLineKeys: [] });
    await expect(reportTechnicianFinding(tech, "ro", valid, revoked.input)).rejects.toThrow("revoked");
    expect(revoked.db.repairAdvisorUpdate.create).not.toHaveBeenCalled();
  });
});
