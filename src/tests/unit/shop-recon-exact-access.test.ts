import { describe, expect, it, vi } from "vitest";
import { getShopReconLanding } from "@/server/shop-completion/service";
import { downloadVehicleEvidence, uploadRepairOrderAttachment } from "@/server/vehicle-360/service";
import { createVehicle360Repository } from "@/server/vehicle-360/repository";
import { repairOrderAttachmentSubject } from "@/lib/repair-order-attachments";
import type { AuthenticatedUser } from "@/server/auth/store";

const user: AuthenticatedUser = { id: "staff", email: "staff@example.test", name: "Staff", isActive: true, roles: [], duties: { all: [], direct: [], roleDefaults: [] } };
const now = new Date("2026-11-25T12:00:00Z");
const grants = (capabilities: string[]) => capabilities.map(capability => ({ capability, effect: "ALLOW", locationId: "assigned-shop", validFrom: new Date("2026-01-01"), validTo: null, constraints: {} }));

describe("exact Shop & Recon access", () => {
  it("lets a location-only reader open an exact order at their shop without opening the whole queue", async () => {
    const findRepairOrderLocation = vi.fn().mockResolvedValue({ locationId: "assigned-shop" });
    const overview = vi.fn().mockResolvedValue({ repairOrders: [], comebacks: [] });
    const repository = { findRepairOrderLocation, overview, workflowEvidence: vi.fn().mockResolvedValue([]) } as never;
    const foundationRepository = { listCapabilityGrants: vi.fn().mockResolvedValue(grants(["REPAIR_ORDER_VIEW"])) } as never;
    const context = { organizationId: "org", repository, foundationRepository, now: () => now };
    await expect(getShopReconLanding(user, { ...context, repairOrderId: "own-ro" })).resolves.toMatchObject({ items: [] });
    expect(overview).toHaveBeenCalledWith("org", "own-ro");
    await expect(getShopReconLanding(user, context)).rejects.toThrow("REPAIR_ORDER_VIEW");
    findRepairOrderLocation.mockResolvedValueOnce({ locationId: "other-shop" });
    await expect(getShopReconLanding(user, { ...context, repairOrderId: "other-ro" })).rejects.toThrow("REPAIR_ORDER_VIEW");
    expect(overview).toHaveBeenCalledTimes(1);
  });
});

describe("repair order attachment download", () => {
  it("reads file bytes only after validating the repair order and evidence permissions at its location", async () => {
    const link = { organizationId: "org", subjectId: "order", subjectType: repairOrderAttachmentSubject, vehicleId: "vehicle" };
    const findRepairOrderEvidenceContext = vi.fn().mockResolvedValue({ id: "order", organizationId: "org", vehicleId: "vehicle", locationId: "assigned-shop" });
    const getAvailableEvidenceBytes = vi.fn().mockResolvedValue({ content: Buffer.from("pdf data") });
    const repository = {
      findRepairOrderEvidenceContext, getAvailableEvidenceBytes, recordEvidenceAccess: vi.fn(),
      getEvidence: vi.fn().mockResolvedValue({ id: "file", version: 1, fileName: "inspection.pdf", contentType: "application/pdf", accessLevel: "INTERNAL", status: "AVAILABLE", malwareStatus: "CLEAN", links: [link] }),
    } as never;
    const listCapabilityGrants = vi.fn().mockResolvedValue(grants(["VEHICLE_EVIDENCE_VIEW"]));
    const context = { organizationId: "org", repository, foundationRepository: { listCapabilityGrants } as never, now: () => now };
    await expect(downloadVehicleEvidence(user, "file", context)).rejects.toThrow("repair order evidence view");
    expect(getAvailableEvidenceBytes).not.toHaveBeenCalled();
    listCapabilityGrants.mockResolvedValue(grants(["REPAIR_ORDER_VIEW", "VEHICLE_EVIDENCE_VIEW"]));
    await expect(downloadVehicleEvidence(user, "file", context)).resolves.toMatchObject({ fileName: "inspection.pdf" });
    expect(getAvailableEvidenceBytes).toHaveBeenCalledWith("org", "file", 1);
    findRepairOrderEvidenceContext.mockResolvedValueOnce({ id: "order", organizationId: "org", vehicleId: "other-vehicle", locationId: "assigned-shop" });
    await expect(downloadVehicleEvidence(user, "file", context)).rejects.toThrow("Evidence object was not found");
    expect(getAvailableEvidenceBytes).toHaveBeenCalledTimes(1);
  });
});

it("applies the standard removal protection without an upload date and keeps retries stable across dates", async () => {
  const createEvidence = vi.fn().mockResolvedValue({ duplicate: false, evidence: { id: "file" } });
  const repository = {
    findRepairOrderEvidenceContext: vi.fn().mockResolvedValue({ id: "order", organizationId: "org", vehicleId: "vehicle", locationId: "assigned-shop" }),
    createEvidence,
  } as never;
  const foundationRepository = {
    listCapabilityGrants: vi.fn().mockResolvedValue(grants(["REPAIR_ORDER_VIEW", "VEHICLE_EVIDENCE_VIEW", "VEHICLE_EVIDENCE_MANAGE"])),
    listFeatureFlags: vi.fn().mockResolvedValue(["VEHICLE_OPERATIONS_MASTER", "VEHICLE_360"].map(code => ({ code, locationId: null, mode: "GENERAL", rolloutPercent: 100 }))),
  } as never;
  const form = new FormData();
  form.set("file", new File(["%PDF-1.7\n"], "inspection.pdf", { type: "application/pdf" }));
  form.set("idempotencyKey", "same-upload");
  const context = { organizationId: "org", repository, foundationRepository };
  await uploadRepairOrderAttachment(user, "order", form, { ...context, now: () => now });
  await uploadRepairOrderAttachment(user, "order", form, { ...context, now: () => new Date("2026-11-26T12:00:00Z") });
  expect(createEvidence.mock.calls[0][1].retentionUntil).toEqual(new Date("2029-11-25T23:59:59.999Z"));
  expect(createEvidence.mock.calls[0][0].requestHash).toBe(createEvidence.mock.calls[1][0].requestHash);
});

it("does not delete bytes when a concurrent retention change wins the final write", async () => {
  const updateMany = vi.fn().mockResolvedValue({ count: 0 });
  const create = vi.fn();
  const tx = {
    enterpriseCommandLedger: { findUnique: vi.fn().mockResolvedValue(null), create },
    enterpriseAggregateVersion: { findUnique: vi.fn().mockResolvedValue({ id: "aggregate", version: 1 }), update: vi.fn() },
    vehicleEvidenceObject: { findFirst: vi.fn().mockResolvedValue({ id: "file", version: 1, status: "AVAILABLE", legalHold: false, retentionUntil: new Date("2026-11-20") }), updateMany },
  };
  const repository = createVehicle360Repository({ $transaction: (run: (transaction: typeof tx) => unknown) => run(tx) } as never);
  const command = { organizationId: "org", domain: "VEHICLE_EVIDENCE", subjectId: "file", subjectType: "VEHICLE_EVIDENCE", commandType: "DELETE_VEHICLE_EVIDENCE", expectedVersion: 1, locationId: "assigned-shop", idempotencyKey: "remove-file", requestHash: "hash", reason: "Check expired demo attachment", actorUserId: user.id, payload: {}, correlationId: "change" };
  await expect(repository.deleteEvidence(command, user.id, now)).rejects.toThrow("retention settings changed");
  expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ version: 1, legalHold: false, retentionUntil: { lte: now } }) }));
  expect(create).not.toHaveBeenCalled();
});
