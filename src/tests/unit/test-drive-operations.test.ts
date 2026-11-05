import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { driveAgreementContent, driveLocalTime } from "@/lib/test-drive-workflow";

type Table = Record<string, ReturnType<typeof vi.fn>>;
const state = vi.hoisted(() => ({ db: {} as Record<string, Table | ReturnType<typeof vi.fn>>, context: {} as Record<string, unknown>, capability: vi.fn(), task: vi.fn(), generate: vi.fn(), archive: vi.fn(), finalize: vi.fn(), eligible: true }));
vi.mock("@/server/db/client", () => ({ prisma: { $transaction: (work: (db: unknown) => unknown) => work(state.db) } }));
vi.mock("@/server/deal-continuity/service", () => ({ contextFor: vi.fn(async () => state.context) }));
vi.mock("@/server/deal-continuity/identities", () => ({ dealOrganization: () => "registry", dealDocumentOrganization: () => "documents", dealVehicle: vi.fn(async () => ({ vin: "1NXBR32E85Z123456", id: "vehicle", locationId: "lot", eligibleForUse: state.eligible, year: "2005", make: "Toyota", model: "Corolla", stockNumber: "123" })) }));
vi.mock("@/server/sales-documents/service", () => ({ requireSalesDocumentsUser: (actor: unknown) => { if (!actor) throw new Error("Sign in"); return actor; }, archiveGeneratedSalesPacket: state.archive, updateSalesDocumentJacket: state.finalize }));
vi.mock("@/server/services/unified-crm-contract-packet-service", () => ({ generateUnifiedCrmContractPacket: state.generate }));
vi.mock("@/server/enterprise-command/repository", () => ({ createEnterpriseCommandRepository: () => ({ listCapabilityGrants: async () => [] }) }));
vi.mock("@/server/enterprise-command/vehicle-capabilities", () => ({ assertVehicleCapability: state.capability }));
vi.mock("@/server/services/task-create-service", () => ({ createManualTask: state.task }));
vi.mock("@/server/repositories/task-create-repository", () => ({ createTaskCreateRepository: (db: unknown) => db }));
import { executeTestDrive } from "@/server/deal-continuity/test-drive";
const table = (key: string) => state.db[key] as Table;
const actor = { id: "staff", isActive: true } as AuthenticatedUser;
let facts: Record<string, unknown>;
const release = { action: "RELEASE", operationKey: "td-release-123456", expectedFingerprint: "", physicalHandover: true, keysVerified: true };
describe("guided test-drive transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks(); state.eligible = true; state.capability.mockImplementation(() => {});
    const local = driveLocalTime(new Date(Date.now() - 60000));
    facts = { salesperson: "Pat", driveMode: "UNACCOMPANIED", accompanyingEmployee: "", driverLicense: "D123", driverPhone: "6125550100", licenseState: "MN", licenseExpiration: "2030-01-01", licenseVerified: true, insuranceBasis: "DEALER_REVIEW", insuranceVerified: true, testDriveDate: local.slice(0, 10), startTime: local.slice(11), durationMinutes: "30", mileageAllowance: "20", departureMileage: "45000", fuelOut: "Full", departureCondition: "Good", approvedRoute: "Local route" };
    const evidence = { "td-front": "front", "td-rear": "rear", "td-sides": "sides", "td-interior": "interior", "td-odometer": "odometer", signed: "signed", license: "license", insurance: "insurance" };
    state.context = { id: "draft", draftId: "draft", customerId: "customer", vehicleId: "vehicle", bookings: [], draft: { pathway: "test-drive", status: "IN_PROGRESS", dealNumber: 1234, customerName: "Driver", vehicleReference: "Corolla", snapshot: { "test-drive:facts": facts, "test-drive:guidedEvidence": evidence } } };
    const generated = { occurredAt: new Date(Date.now() - 86400000), result: { fingerprint: createHash("sha256").update(driveAgreementContent(facts, "customer", "1NXBR32E85Z123456")).digest("hex"), jacketId: "jacket", packetId: "packet" } };
    release.expectedFingerprint = generated.result.fingerprint;
    state.db = {
      $executeRaw: vi.fn(),
      dealContinuityEvent: { findUnique: vi.fn().mockResolvedValue(null), findFirst: vi.fn().mockResolvedValue(generated), create: vi.fn() },
      vehicleUseBooking: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockImplementation(async ({ data }) => ({ ...data, version: 1 })), update: vi.fn().mockImplementation(async ({ data, where }) => ({ ...(state.context.bookings as object[])[0], ...data, id: where.id, vehicleId: "vehicle", version: 2 })) },
      salesDocumentJacket: { findFirst: vi.fn().mockResolvedValue({ id: "jacket", organizationId: "documents", packetId: "packet", state: "DRAFT", revision: 1 }) },
      salesDocumentPacketVersion: { findFirst: vi.fn().mockResolvedValue({ snapshot: { documents: [{ id: "signed", signed: true }] } }) },
      salesDocumentGeneratedPacket: { findFirst: vi.fn().mockResolvedValue(null) },
      documentLibraryDocument: { findMany: vi.fn().mockResolvedValue(Object.values(evidence).map(id => ({ id, documentType: id === "signed" ? "signed-agreement" : id === "license" ? "driver-license" : id === "insurance" ? "insurance-proof" : "release-condition", status: "ACCEPTED", source: "MANUAL_UPLOAD", createdAt: new Date(), classificationSnapshot: { signed: id === "signed" } }))) },
      vehicleOdometerObservation: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() }, vehicleCustodyEvent: { create: vi.fn() },
      task: { findUniqueOrThrow: vi.fn().mockResolvedValue({ templateSnapshot: {} }), update: vi.fn(), updateMany: vi.fn() }
    };
    state.task.mockResolvedValue({ id: "task" }); state.archive.mockResolvedValue({ packetId: "packet", jacketId: "jacket" }); state.generate.mockResolvedValue({ packetId: "packet" });
  });
  it("records release, custody, mileage, return task and audit together", async () => {
    const result = await executeTestDrive(actor, "draft", release);
    expect(result.result).toMatchObject({ status: "CHECKED_OUT" });
    expect(state.finalize).toHaveBeenCalledOnce(); expect(state.task.mock.calls[0][2]).toBe(state.db);
    expect(table("vehicleCustodyEvent").create).toHaveBeenCalledOnce(); expect(table("dealContinuityEvent").create).toHaveBeenCalledOnce();
  });
  it("replays retries without duplicate custody, tasks or releases", async () => {
    await executeTestDrive(actor, "draft", release);
    const event = table("dealContinuityEvent").create.mock.calls[0][0].data;
    table("dealContinuityEvent").findUnique.mockResolvedValue(event);
    expect(await executeTestDrive(actor, "draft", release)).toMatchObject({ duplicate: true });
    expect(state.task).toHaveBeenCalledOnce(); expect(table("vehicleUseBooking").create).toHaveBeenCalledOnce();
    await expect(executeTestDrive(actor, "draft", { ...release, physicalHandover: false })).rejects.toThrow("different work");
  });
  it("rejects another departure even with a new request reference", async () => {
    state.context.bookings = [{ id: "booking", status: "CHECKED_OUT" }];
    await expect(executeTestDrive(actor, "draft", release)).rejects.toThrow("already recorded");
    expect(state.task).not.toHaveBeenCalled();
  });
  it("requires explicit reconciliation of a legacy started flag", async () => {
    const draft = state.context.draft as { snapshot: Record<string, unknown> };
    draft.snapshot["test-drive:testDriveStarted"] = true;
    await expect(executeTestDrive(actor, "draft", release)).rejects.toThrow("legacy draft");
    expect(table("vehicleUseBooking").create).not.toHaveBeenCalled();
    await executeTestDrive(actor, "draft", { ...release, legacyNotReleased: true, legacyNote: "Old flag was a draft only. Vehicle and keys are still here." });
    expect(table("vehicleUseBooking").create.mock.calls[0][0].data.departureSnapshot.legacyReconciliation).toMatchObject({ noPriorDepartureConfirmed: true, actorUserId: "staff" });
  });
  it.each(["CHECKED_OUT", "RESERVED", "RETURNED_REVIEW"])("rejects conflicting vehicle allocation: %s", async status => {
    table("vehicleUseBooking").findMany.mockResolvedValue([{ status, startsAt: new Date(Date.now() - 3600000), expectedReturnAt: new Date(Date.now() + 3600000) }]);
    await expect(executeTestDrive(actor, "draft", release)).rejects.toThrow("already out");
    expect(table("vehicleCustodyEvent").create).not.toHaveBeenCalled();
  });
  it("enforces role capabilities before custody writes", async () => {
    state.capability.mockImplementation(() => { throw new Error("Permission required"); });
    await expect(executeTestDrive(actor, "draft", release)).rejects.toThrow("Permission required");
    expect(state.task).not.toHaveBeenCalled();
  });
  it.each([{ licenseVerified: false }, { insuranceVerified: false }, { driveMode: "SUPERVISED" }, { licenseExpiration: "2020-01-01" }])("rejects unverified/invalid departure facts: %j", async change => {
    Object.assign(facts, change);
    release.expectedFingerprint = createHash("sha256").update(driveAgreementContent(facts, "customer", "1NXBR32E85Z123456")).digest("hex");
    await expect(executeTestDrive(actor, "draft", release)).rejects.toThrow();
    expect(state.finalize).not.toHaveBeenCalled();
  });
  it("rejects an agreement fingerprint changed by another editor", async () => {
    await expect(executeTestDrive(actor, "draft", { ...release, expectedFingerprint: "stale" })).rejects.toThrow("changed in another window");
    expect(state.finalize).not.toHaveBeenCalled();
  });
  it("rejects a stale or absent agreement and unsigned proof", async () => {
    table("dealContinuityEvent").findFirst.mockResolvedValue(null);
    await expect(executeTestDrive(actor, "draft", release)).rejects.toThrow("no longer matches");
    expect(state.finalize).not.toHaveBeenCalled();
  });
  it("requires reviewed evidence, distinct photos and an actual signature", async () => {
    const docs = await table("documentLibraryDocument").findMany();
    table("documentLibraryDocument").findMany.mockResolvedValue(docs.map((doc: { id: string }) => ({ ...doc, status: doc.id === "front" ? "PENDING_REVIEW" : "ACCEPTED" })));
    await expect(executeTestDrive(actor, "draft", release)).rejects.toThrow("Upload and review");
    table("documentLibraryDocument").findMany.mockResolvedValue(docs.map((doc: { id: string }) => ({ ...doc, classificationSnapshot: { signed: false } })));
    await expect(executeTestDrive(actor, "draft", release)).rejects.toThrow("signed copy");
  });
  it("requires the exact current signature in a previously finalized checkout", async () => {
    table("salesDocumentJacket").findFirst.mockResolvedValue({ id: "jacket", organizationId: "documents", packetId: "packet", state: "CHECKED_OUT", revision: 1 });
    table("salesDocumentPacketVersion").findFirst.mockResolvedValue({ snapshot: { documents: [{ id: "old-signature", signed: true }] } });
    await expect(executeTestDrive(actor, "draft", release)).rejects.toThrow("preserved checkout packet");
    expect(state.task).not.toHaveBeenCalled();
  });
  it("reuses the agreement for unchanged facts instead of generating duplicate files", async () => {
    expect(await executeTestDrive(actor, "draft", { action: "GENERATE", operationKey: "td-generate-1234" })).toMatchObject({ duplicate: true });
    expect(state.generate).not.toHaveBeenCalled(); expect(state.archive).not.toHaveBeenCalled();
  });
  it("generates changed facts once and records the archive reference", async () => {
    table("dealContinuityEvent").findFirst.mockResolvedValue(null);
    const result = await executeTestDrive(actor, "draft", { action: "GENERATE", operationKey: "td-generate-1234" });
    expect(result.result).toMatchObject({ jacketId: "jacket", packetId: "packet" });
    expect(state.generate).toHaveBeenCalledOnce(); expect(table("dealContinuityEvent").create).toHaveBeenCalledOnce();
  });
  it("generates the saved facts even when an older browser fingerprint was supplied", async () => {
    table("dealContinuityEvent").findFirst.mockResolvedValue(null);
    const result = await executeTestDrive(actor, "draft", { action: "GENERATE", operationKey: "td-generate-older-copy", expectedFingerprint: "older-browser-copy" });
    expect(result.result).toMatchObject({ packetId: "packet" });
    expect(state.generate.mock.calls[0][1].testDrive.driverLicense).toBe(facts.driverLicense);
    expect(state.capability).not.toHaveBeenCalled();
  });
  async function returnSetup(exception = false) {
    const booking = { id: "booking", vehicleId: "vehicle", status: "CHECKED_OUT", version: 1, checkedOutAt: new Date(Date.now() - 3600000), departureSnapshot: { odometer: 45000 }, agreementJacketId: "jacket" };
    state.context.bookings = [booking];
    const evidence = Object.fromEntries(["front", "rear", "interior", "odometer", "damage"].map(id => [`return-${id}`, id]));
    table("documentLibraryDocument").findMany.mockResolvedValue(Object.values(evidence).map(id => ({ id, documentType: "return-condition", createdAt: new Date(), status: "ACCEPTED", source: "MANUAL_UPLOAD" })));
    return { action: "RETURN", operationKey: "td-return-123456", bookingId: "booking", expectedVersion: 1, evidence, facts: { returnAt: driveLocalTime(new Date(Date.now() - 60000)), returnMileage: "45010", fuelIn: "Full", returnCondition: exception ? "New dent" : "Good", receivedBy: "Pat", keysReturned: !exception, returnException: exception, exceptionNote: exception ? "Spare key missing. Contact driver today." : "" } };
  }
  it("records return and completes the existing follow-up task", async () => {
    const result = await executeTestDrive(actor, "draft", await returnSetup());
    expect(result.result).toMatchObject({ status: "RETURNED" });
    expect(table("vehicleCustodyEvent").create.mock.calls[0][0].data.eventType).toBe("CHECK_IN");
    expect(table("task").updateMany.mock.calls[0][0].data.status).toBe("COMPLETED");
  });
  it("keeps an exception on hold with an open high-priority follow-up", async () => {
    expect((await executeTestDrive(actor, "draft", await returnSetup(true))).result).toMatchObject({ status: "RETURNED_REVIEW" });
    expect(table("task").updateMany.mock.calls[0][0].data).toMatchObject({ priority: "HIGH" });
    expect(table("task").updateMany.mock.calls[0][0].data.status).toBeUndefined();
  });
  it("rejects stale versions and unreviewed return photos", async () => {
    const data = await returnSetup();
    await expect(executeTestDrive(actor, "draft", { ...data, expectedVersion: 0 })).rejects.toThrow("assignment changed");
    table("documentLibraryDocument").findMany.mockResolvedValue([]);
    await expect(executeTestDrive(actor, "draft", data)).rejects.toThrow("return photos");
    expect(table("vehicleCustodyEvent").create).not.toHaveBeenCalled();
  });
  it("resolves a return exception without a second custody check-in", async () => {
    state.context.bookings = [{ id: "booking", status: "RETURNED_REVIEW", version: 2, returnSnapshot: { note: "Missing spare key" } }];
    const result = await executeTestDrive(actor, "draft", { action: "RESOLVE_EXCEPTION", operationKey: "resolve-12345678", bookingId: "booking", expectedVersion: 2, keysVerified: true, note: "Spare key recovered and damage inspection completed." });
    expect(result.result).toMatchObject({ status: "RETURNED" });
    expect(table("vehicleCustodyEvent").create).not.toHaveBeenCalled();
  });
});
