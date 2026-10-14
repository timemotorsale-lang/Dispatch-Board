import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { normalizeEvidenceUpload } from "@/server/vehicle-360/domain";
import { orderSalesMedia, validateSalesMediaOrder, type SalesMediaItem } from "@/server/vehicle-360/sales-media-domain";
import { createVehicle360Repository } from "@/server/vehicle-360/repository";
import { changeVehicleSalesMedia, getVehicleSalesMedia } from "@/server/vehicle-360/service";
import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import { VehicleSalesMediaWorkspace } from "@/features/inventory/vehicle-sales-media-workspace";
import type { AuthenticatedUser } from "@/server/auth/store";

const now = new Date("2026-10-10T12:00:00Z"), manager: AuthenticatedUser = { id: "manager", name: "Manager", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
const photo: SalesMediaItem = { id: "p1", name: "front.png", contentType: "image/png", bytes: 20, status: "AVAILABLE", href: "/api/vehicle-evidence/p1/content" };
const video: SalesMediaItem = { ...photo, id: "video", contentType: "video/mp4", name: "walkaround.mp4" };
const base = { accessLevel: "INTERNAL", category: "PHOTO", contentType: "image/png", fileName: "front.png", idempotencyKey: "upload-1", reason: "Add selected vehicle sales media.", retentionUntil: "2027-10-10T12:00:00Z", subjectType: "SALES_MEDIA", vehicleId: "v1", contentBase64: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString("base64") };
function command(expectedVersion = 0) { return normalizeEnterpriseCommand({ actorUserId: manager.id, commandType: "UPDATE_SALES_MEDIA", domain: "VEHICLE_EVIDENCE", expectedVersion, idempotencyKey: "change-1", locationId: null, organizationId: "org", payload: {}, reason: "Update the selected vehicle media collection.", subjectId: "v1", subjectType: "SALES_MEDIA" }); }
function database(items = [photo], version = 0) {
  const links = items.map(item => ({ evidenceObjectId: item.id, evidenceObject: { ...item, fileName: item.name, byteSize: item.bytes, malwareStatus: "CLEAN", legalHold: false } }));
  const tx = {
    $queryRaw: vi.fn(async () => [{ id: "v1" }]),
    vehicle: { findFirst: vi.fn(async () => ({ id: "v1" })) },
    vehicleEvidenceLink: { findMany: vi.fn(async () => links), create: vi.fn(), updateMany: vi.fn() },
    vehicleEvidenceObject: { create: vi.fn(async () => ({ id: "new", status: "AVAILABLE", version: 1 })), findUniqueOrThrow: vi.fn(async () => ({ id: "prior" })) },
    vehicleEvidenceEvent: { createMany: vi.fn() },
    enterpriseAggregateVersion: { findUnique: vi.fn(async () => version ? { id: "agg", version } : null), create: vi.fn(), update: vi.fn() },
    enterpriseCommandLedger: { findUnique: vi.fn(async () => null), findFirst: vi.fn(async () => ({ resultSnapshot: { order: items.map(item => item.id).reverse() } })), create: vi.fn(async () => ({ id: "ledger" })) },
    enterpriseDomainEvent: { create: vi.fn(async () => ({ id: "event" })) }, enterpriseAuditEvent: { create: vi.fn() }, enterpriseOutboxMessage: { create: vi.fn() }
  };
  return { tx, repository: createVehicle360Repository({ $transaction: (fn: (value: typeof tx) => unknown) => fn(tx) } as never) };
}

describe("vehicle sales media", () => {
  it("shows intake coverage separately without treating eleven angles as a photo limit", () => {
    const intakeItems = Array.from({ length: 13 }, (_, index) => ({ ...photo, id: `intake-${index}`, name: index ? `damage-closeup-${index}.png` : "front-left-arrival.png", reusable: index === 0 }));
    const html = renderToStaticMarkup(<VehicleSalesMediaWorkspace vehicleId="v1" initialKind="intake" initialModel={{ vehicleId: "v1", version: 0, canManage: true, items: [photo], intakeItems }}/>);
    expect(html).toContain("Intake &amp; Condition (13)");
    expect(html).toContain("Required coverage: 1 / 10 angles");
    expect(html).toContain("Photos (1 / 40)");
    expect(html).toContain("Damage evidence");
    expect(html).toContain("Use selected for advertising");
    expect(html).not.toContain("Remove selected");
    expect(html).not.toContain("as primary");
    const service = renderToStaticMarkup(<VehicleSalesMediaWorkspace vehicleId="v1" intakeOnly initialModel={{ vehicleId: "v1", version: 0, canManage: true, items: [], intakeItems }}/>);
    expect(service).not.toContain("Use selected for advertising");
    expect(service).not.toContain("Photos (0 / 40)");
  });
  it("reuses an eligible intake photo by linking its original, without creating bytes or changing intake", async () => {
    const { tx, repository } = database([]);
    tx.vehicleEvidenceLink.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ evidenceObjectId: "arrival", evidenceObject: { ...photo, id: "arrival", fileName: "front-arrival.png", byteSize: 20, malwareStatus: "CLEAN", accessLevel: "INTERNAL", legalHold: false } }] as never);
    await repository.changeSalesMedia(command(), { order: ["arrival"], removeIds: [], addIds: ["arrival"] });
    expect(tx.vehicleEvidenceLink.create).toHaveBeenCalledWith({ data: expect.objectContaining({ evidenceObjectId: "arrival", vehicleId: "v1", subjectType: "SALES_MEDIA", relationship: "SUPPORTS" }) });
    expect(tx.vehicleEvidenceObject.create).not.toHaveBeenCalled();
    expect(tx.vehicleEvidenceLink.updateMany).not.toHaveBeenCalled();
    expect(tx.enterpriseAuditEvent.create).toHaveBeenCalledOnce();
  });
  it.each([{ fileName: "odometer-damage.png" }, { legalHold: true }, { malwareStatus: "DETECTED" }, { status: "QUARANTINED" }, { accessLevel: "RESTRICTED" }])("rejects unsafe intake reuse: %j", async change => {
    const { tx, repository } = database([]);
    tx.vehicleEvidenceLink.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ evidenceObjectId: "arrival", evidenceObject: { ...photo, id: "arrival", fileName: "front.png", byteSize: 20, malwareStatus: "CLEAN", accessLevel: "INTERNAL", legalHold: false, ...change } }] as never);
    await expect(repository.changeSalesMedia(command(), { order: ["arrival"], removeIds: [], addIds: ["arrival"] })).rejects.toThrow("Select safe, internal intake photos");
    expect(tx.vehicleEvidenceLink.create).not.toHaveBeenCalled();
  });
  it("does not let reused intake photos exceed the advertising cap", async () => {
    const { tx, repository } = database(Array.from({ length: 40 }, (_, index) => ({ ...photo, id: `p${index}` })));
    tx.vehicleEvidenceLink.findMany.mockResolvedValueOnce(Array.from({ length: 40 }, (_, index) => ({ evidenceObjectId: `p${index}`, evidenceObject: { ...photo, id: `p${index}`, fileName: "front.png", byteSize: 20, malwareStatus: "CLEAN", legalHold: false } }))).mockResolvedValueOnce([{ evidenceObjectId: "arrival", evidenceObject: { ...photo, id: "arrival", fileName: "front.png", byteSize: 20, malwareStatus: "CLEAN", accessLevel: "INTERNAL", legalHold: false } }] as never);
    await expect(repository.changeSalesMedia(command(), { order: [], removeIds: [], addIds: ["arrival"] })).rejects.toThrow("40 sales photos");
  });
  it("separates sales files from evidence and rejects forged ownership/access", () => {
    expect(normalizeEvidenceUpload(base, now).scan.malwareStatus).toBe("CLEAN");
    for (const change of [{ subjectId: "another-vehicle" }, { accessLevel: "RESTRICTED" }, { relationship: "ARCHIVED_SALES_MEDIA" }]) expect(() => normalizeEvidenceUpload({ ...base, ...change }, now)).toThrow("selected vehicle");
    expect(() => normalizeEvidenceUpload({ ...base, contentType: "text/plain" }, now)).toThrow("photo or MP4");
  });
  it("validates MP4 signatures only for sales media", () => {
    const mp4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypisom")]).toString("base64");
    expect(normalizeEvidenceUpload({ ...base, contentType: "video/mp4", contentBase64: mp4 }, now).scan.malwareStatus).toBe("CLEAN");
    expect(normalizeEvidenceUpload({ ...base, contentType: "video/mp4" }, now).scan.malwareStatus).toBe("DETECTED");
    expect(() => normalizeEvidenceUpload({ ...base, contentType: "video/mp4", subjectType: "VEHICLE" }, now)).toThrow("sales media collection");
  });
  it("keeps saved order and appends new files without losing their identities", () => {
    expect(orderSalesMedia([photo, video, { ...photo, id: "new" }], [video.id, photo.id]).map(item => item.id)).toEqual(["video", "p1", "new"]);
    expect(validateSalesMediaOrder([photo, video], ["video", "p1"])).toEqual(["video", "p1"]);
    for (const ids of [["p1"], ["p1", "p1"], ["p1", "foreign"], null]) expect(() => validateSalesMediaOrder([photo, video], ids)).toThrow("every current item");
  });
  it("enforces 40 photos under a vehicle row lock before storing any bytes", async () => {
    const { tx, repository } = database(Array.from({ length: 40 }, (_, index) => ({ ...photo, id: `p${index}` })));
    const data = normalizeEvidenceUpload(base, now);
    await expect(repository.createEvidence({ ...command(), subjectId: "new", commandType: "UPLOAD_VEHICLE_EVIDENCE" }, { ...data, actorUserId: manager.id, byteSize: data.content.length, subjectId: "v1", malwareStatus: data.scan.malwareStatus, malwareScanner: data.scan.malwareScanner, reasonCode: data.scan.reasonCode })).rejects.toThrow("40 sales photos");
    expect(tx.$queryRaw).toHaveBeenCalledOnce(); expect(tx.vehicleEvidenceObject.create).not.toHaveBeenCalled();
    expect(tx.vehicleEvidenceLink.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ subjectType: "SALES_MEDIA", relationship: "SUPPORTS", vehicleId: "v1" }) }));
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(tx.vehicleEvidenceLink.findMany.mock.invocationCallOrder[0]);
  });
  it("has a separate five-video cap and permits an additional photo", async () => {
    const { tx, repository } = database(Array.from({ length: 5 }, (_, index) => ({ ...video, id: `v${index}` })));
    const data = normalizeEvidenceUpload(base, now), upload = { ...data, actorUserId: manager.id, byteSize: data.content.length, subjectId: "v1", malwareStatus: data.scan.malwareStatus, malwareScanner: data.scan.malwareScanner, reasonCode: data.scan.reasonCode };
    await expect(repository.createEvidence({ ...command(), subjectId: "new" }, { ...upload, contentType: "video/mp4" })).rejects.toThrow("5 sales videos");
    await repository.createEvidence({ ...command(), subjectId: "new" }, upload);
    expect(tx.vehicleEvidenceObject.create).toHaveBeenCalledOnce();
  });
  it("archives only selected sales links and retains the protected bytes and ledger", async () => {
    const { tx, repository } = database([photo, video]);
    await repository.changeSalesMedia(command(), { order: [video.id], removeIds: [photo.id] });
    expect(tx.vehicleEvidenceLink.updateMany).toHaveBeenCalledWith({ where: { organizationId: "org", vehicleId: "v1", subjectType: "SALES_MEDIA", relationship: "SUPPORTS", evidenceObjectId: { in: [photo.id] } }, data: { relationship: "ARCHIVED_SALES_MEDIA" } });
    expect(tx.vehicleEvidenceObject.create).not.toHaveBeenCalled();
    expect(tx.enterpriseCommandLedger.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ resultSnapshot: expect.objectContaining({ order: [video.id], removedIds: [photo.id] }) }) }));
  });
  it("rejects foreign media, legal holds, unsafe primary and stale changes", async () => {
    const { tx, repository } = database([photo], 2);
    await expect(repository.changeSalesMedia(command(), { order: [photo.id], removeIds: ["foreign"] })).rejects.toThrow("not found");
    tx.vehicleEvidenceLink.findMany.mockResolvedValueOnce([{ evidenceObjectId: photo.id, evidenceObject: { ...photo, fileName: photo.name, byteSize: 20, malwareStatus: "CLEAN", legalHold: true } }]);
    await expect(repository.changeSalesMedia(command(), { order: [], removeIds: [photo.id] })).rejects.toThrow("legal hold");
    tx.vehicleEvidenceLink.findMany.mockResolvedValueOnce([{ evidenceObjectId: photo.id, evidenceObject: { ...photo, status: "QUARANTINED", fileName: photo.name, byteSize: 20, malwareStatus: "DETECTED", legalHold: false } }]);
    await expect(repository.changeSalesMedia(command(), { order: [photo.id], removeIds: [] })).rejects.toThrow("safety scan");
    await expect(repository.changeSalesMedia(command(), { order: [photo.id], removeIds: [] })).rejects.toThrow("current version is 2");
  });
  it("supports idempotent update replay and refuses a changed request", async () => {
    const { tx, repository } = database(); const cmd = command();
    tx.enterpriseCommandLedger.findUnique.mockResolvedValueOnce({ requestHash: cmd.requestHash } as never);
    await expect(repository.changeSalesMedia(cmd, { order: [photo.id], removeIds: [] })).resolves.toEqual({ duplicate: true });
    tx.enterpriseCommandLedger.findUnique.mockResolvedValueOnce({ requestHash: "other" } as never);
    await expect(repository.changeSalesMedia(cmd, { order: [], removeIds: [] })).rejects.toThrow("different request");
    expect(tx.enterpriseAggregateVersion.create).not.toHaveBeenCalled();
  });
  it("uses existing capabilities and fails closed when mutations are disabled", async () => {
    const repository = { readSalesMedia: vi.fn(async () => ({ vehicleId: "v1", version: 0, items: [photo] })), changeSalesMedia: vi.fn() };
    const foundation = { listCapabilityGrants: vi.fn(async () => []), listFeatureFlags: vi.fn(async () => []) };
    const dependencies = { repository: repository as never, foundationRepository: foundation as never, organizationId: "org", now: () => now };
    await expect(getVehicleSalesMedia(null, "v1", dependencies)).rejects.toThrow("Authentication");
    await expect(getVehicleSalesMedia(manager, "v1", dependencies)).resolves.toMatchObject({ canManage: false });
    await expect(changeVehicleSalesMedia(manager, "v1", { expectedVersion: 0, order: [photo.id], idempotencyKey: "one", reason: "Change primary vehicle photo." }, dependencies)).rejects.toThrow("not enabled");
    await changeVehicleSalesMedia(manager, "v1", { expectedVersion: 0, order: [photo.id], idempotencyKey: "one", reason: "Change primary vehicle photo." }, { ...dependencies, enforceRollout: false });
    expect(repository.changeSalesMedia).toHaveBeenCalledOnce();
  });
  it("renders the counted collection and batch controls without mixing evidence", () => {
    const html = renderToStaticMarkup(<VehicleSalesMediaWorkspace vehicleId="v1" initialModel={{ vehicleId: "v1", version: 0, items: [photo, video], canManage: true }}/>);
    expect(html).toContain("Photos (1 / 40)"); expect(html).toContain("Videos (1 / 5)"); expect(html).toContain('multiple=""'); expect(html).toContain("Remove selected"); expect(html).toContain("Primary"); expect(html).toContain("capture=\"environment\"");
    const readOnly = renderToStaticMarkup(<VehicleSalesMediaWorkspace vehicleId="v1" initialModel={{ vehicleId: "v1", version: 0, items: [], canManage: false }}/>);
    expect(readOnly).toContain("Read-only"); expect(readOnly).toContain('disabled=""');
  });
});
