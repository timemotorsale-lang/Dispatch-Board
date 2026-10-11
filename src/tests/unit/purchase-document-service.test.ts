import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
const mocks = vi.hoisted(() => ({ grants: vi.fn(), flags: vi.fn(), rollout: vi.fn(), assert: vi.fn(), location: vi.fn(), findMany: vi.fn(), findVehicle: vi.fn(), auditCreate: vi.fn(), auditFind: vi.fn(), auditList: vi.fn(), ledger: vi.fn(), extract: vi.fn(), intake: vi.fn(), save: vi.fn(), create: vi.fn(), evidence: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { location: { findFirst: mocks.location }, vehicle: { findMany: mocks.findMany, findFirst: mocks.findVehicle }, enterpriseAuditEvent: { create: mocks.auditCreate, findFirst: mocks.auditFind, findMany: mocks.auditList }, enterpriseCommandLedger: { findFirst: mocks.ledger } } }));
vi.mock("@/server/enterprise-command/repository", () => ({ createEnterpriseCommandRepository: () => ({ listCapabilityGrants: mocks.grants, listFeatureFlags: mocks.flags }) }));
vi.mock("@/server/enterprise-command/service", () => ({ evaluateVehicleOperationsFeature: mocks.rollout }));
vi.mock("@/server/enterprise-command/vehicle-capabilities", () => ({ assertVehicleCapability: mocks.assert }));
vi.mock("@/server/document-library/text-extraction", () => ({ extractDocumentText: mocks.extract }));
vi.mock("@/server/inventory-unit/intake-service", () => ({ getVehicleIntake: mocks.intake, saveVehicleIntake: mocks.save }));
vi.mock("@/server/vehicle-registry/service", () => ({ createRegistryVehicle: mocks.create }));
vi.mock("@/server/vehicle-360/service", () => ({ uploadVehicleEvidence: mocks.evidence }));
vi.mock("@/server/inventory-transfer/purchase-jobs", () => ({ stagePurchaseSource: async () => crypto.randomUUID(), finishPurchaseRead: vi.fn(), recordPurchaseJobEvent: vi.fn(), storedPurchaseSource: vi.fn(), registerPurchaseRow: vi.fn(), linkPurchaseSource: mocks.evidence, markPurchaseBatch: vi.fn(), claimPurchaseSave: vi.fn() }));
vi.mock("@/server/inventory-transfer/purchase-team", () => ({ purchaseJobAccess: async () => null }));
import { applyPurchaseDocument, readPurchaseDocument, readPurchaseSpreadsheet, reviewPurchaseDocument, validatePurchaseFile, savePurchaseCorrections, resumePurchaseImport, purchaseImportHistory, recordPurchaseImportFailure } from "@/server/inventory-transfer/purchase-service";
const user: AuthenticatedUser = { id: "staff", name: "Staff", email: "staff@example.test", isActive: true, roles: ["Staff"], duties: { all: [], direct: [], roleDefaults: [] } };
const file = { bytes: Buffer.from("Auction invoice source document"), contentType: "text/plain", fileName: "purchase.txt" };
const details = { source: "", seller: "", boughtFrom: "", buyer: "", acquiredOn: "", reference: "", priceStatus: "PENDING", purchaseCents: null, proposedPriceCents: null, whereabouts: "", odometer: null, odometerUnit: "MILES", condition: "", keys: null, titleStatus: "PENDING", documents: "", pendingNotes: "" };
beforeEach(() => {
  vi.resetAllMocks(); mocks.location.mockResolvedValue({ id: "lot" }); mocks.grants.mockResolvedValue([]); mocks.flags.mockResolvedValue([]); mocks.rollout.mockReturnValue({ executable: true });
  mocks.extract.mockResolvedValue({ method: "PLAIN_TEXT", text: "Auction: Test Auction\nVIN: 1HGCM82633A004352\nInvoice #: INV-1\nPurchase Price: $6000", warnings: [] });
  mocks.findMany.mockResolvedValue([{ id: "vehicle", vin: "1HGCM82633A004352", vehicleNumber: "KNOWN", status: "ACTIVE" }]);
  mocks.intake.mockResolvedValue({ version: 0, unit: null, status: "NOT_STARTED", details });
  mocks.ledger.mockResolvedValue(null); mocks.save.mockResolvedValue({ result: { vehicleId: "vehicle" } }); mocks.create.mockResolvedValue({ result: { id: "new-vehicle" } });
  const events: Record<string, unknown>[] = [];
  const matches = (event: Record<string, unknown>, where: Record<string, unknown>) => Object.entries(where).every(([key, value]) => typeof value === "object" && value !== null ? (value as { in: unknown[] }).in.includes(event[key]) : event[key] === value);
  mocks.auditCreate.mockImplementation(async ({ data }) => { const event = { ...data, id: `event-${events.length}`, createdAt: new Date(Date.now() + events.length) }; events.push(event); return event; });
  mocks.auditFind.mockImplementation(async ({ where }) => [...events].reverse().find(event => matches(event, where)) ?? null);
  mocks.auditList.mockImplementation(async ({ where, take, cursor, skip }) => { const items = [...events].reverse().filter(event => matches(event, where)); const offset = cursor ? items.findIndex(event => event.id === cursor.id) + (skip ?? 0) : 0; return items.slice(offset, take ? offset + take : undefined); });
});
async function reviewed(extra = {}) {
  const source = await readPurchaseDocument(user, "lot", file);
  const preview = await reviewPurchaseDocument(user, { readId: source.readId, values: source.values, fields: ["source", "seller", "reference", "purchaseCents"], ...extra });
  return { source, preview };
}
describe("purchase document allocation safety", () => {
  it("persists invalid corrections without writing vehicle records and resumes expired reads with the exact source", async () => {
    const source = await readPurchaseDocument(user, "lot", file);
    const values = { ...source.values, vin: "NEEDS-CORRECTION", purchasePrice: "6500" };
    await savePurchaseCorrections(user, { readId: source.readId, values, fields: ["purchaseCents", "reference"] });
    const saved = await mocks.auditFind({ where: { subjectId: source.readId, eventType: "PURCHASE_DOCUMENT_READ" } });
    saved.metadata.expiresAt = new Date(0).toISOString();
    await expect(resumePurchaseImport(user, source.readId, { ...file, bytes: Buffer.from("changed") })).rejects.toThrow("exact original");
    await expect(resumePurchaseImport({ ...user, id: "other" }, source.readId, file)).rejects.toThrow("this staff account");
    const resumed = await resumePurchaseImport(user, source.readId, file);
    expect(resumed.reading.values.vin).toBe(source.values.vin);
    expect(resumed.correction?.values.vin).toBe("NEEDS-CORRECTION");
    expect(resumed.reading).not.toHaveProperty("checksum");
    expect(mocks.extract).toHaveBeenCalledOnce(); expect(mocks.save).not.toHaveBeenCalled();
    const preview = await reviewPurchaseDocument(user, { readId: source.readId, values: source.values, fields: ["reference", "purchaseCents"] });
    expect(preview.existing).toBe(true);
  });
  it("projects scoped history, failure and completion without exposing stored document text", async () => {
    const { source, preview } = await reviewed();
    expect((await purchaseImportHistory(user, "lot")).jobs[0]).toMatchObject({ status: "READY", readId: source.readId });
    await recordPurchaseImportFailure(user, source.readId, undefined);
    expect((await purchaseImportHistory(user, "lot")).jobs[0].status).toBe("FAILED");
    await applyPurchaseDocument(user, preview.previewId, file);
    const history = await purchaseImportHistory(user, "lot");
    expect(history.jobs[0]).toMatchObject({ status: "IMPORTED", vehicleId: "vehicle" });
    expect(history.jobs[0]).not.toHaveProperty("text");
    expect((await purchaseImportHistory({ ...user, id: "other" }, "lot")).jobs).toEqual([]);
    expect((await purchaseImportHistory(user, "other-lot")).jobs).toEqual([]);
    await expect(resumePurchaseImport(user, source.readId, file)).rejects.toThrow("already saved");
    mocks.rollout.mockReturnValue({ executable: false, reason: "MASTER_DISABLED" });
    expect((await purchaseImportHistory(user, "lot")).jobs[0].status).toBe("IMPORTED");
    await expect(savePurchaseCorrections(user, { readId: source.readId, values: source.values, fields: ["seller"] })).rejects.toThrow("MASTER_DISABLED");
  });
  it("paginates source jobs and rejects foreign or invalid page cursors", async () => {
    for (let index = 0; index < 27; index++) await readPurchaseDocument(user, "lot", file);
    const first = await purchaseImportHistory(user, "lot");
    expect(first.jobs).toHaveLength(25); expect(first.nextCursor).toBeTruthy();
    const second = await purchaseImportHistory(user, "lot", first.nextCursor!);
    expect(second.jobs).toHaveLength(2); expect(second.nextCursor).toBeNull();
    expect(first.jobs.some(job => second.jobs.some(other => other.readId === job.readId))).toBe(false);
    await expect(purchaseImportHistory({ ...user, id: "other" }, "lot", first.nextCursor!)).rejects.toThrow("Invalid import history page");
    await expect(purchaseImportHistory(user, "lot", "unknown")).rejects.toThrow("Invalid import history page");
  });
  it("authorizes before OCR and honors master disable", async () => {
    await expect(readPurchaseDocument(null, "lot", file)).rejects.toThrow("Authentication");
    mocks.rollout.mockReturnValue({ executable: false, reason: "MASTER_DISABLED" });
    await expect(readPurchaseDocument(user, "lot", file)).rejects.toThrow("MASTER_DISABLED");
    expect(mocks.extract).not.toHaveBeenCalled();
  });
  it("rejects unsafe, oversized and unsupported documents", () => {
    expect(() => validatePurchaseFile({ ...file, bytes: Buffer.alloc(11 * 1024 * 1024) })).toThrow("10 MB");
    expect(() => validatePurchaseFile({ ...file, contentType: "text/html" })).toThrow("Choose");
    expect(() => validatePurchaseFile({ ...file, fileName: "../purchase.txt" })).toThrow("name");
  });
  it("never creates at read or review and saves only a reviewed draft with source evidence", async () => {
    const { preview } = await reviewed();
    expect(preview.existing).toBe(true); expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
    const result = await applyPurchaseDocument(user, preview.previewId, file);
    expect(result.vehicleId).toBe("vehicle"); expect(mocks.evidence).toHaveBeenCalledOnce();
    expect(mocks.save.mock.calls[0][2]).toMatchObject({ status: "DRAFT", expectedVersion: 0, details: { purchaseCents: 600000, reference: "INV-1", source: "AUCTION" } });
  });
  it("retains conflicting existing fields instead of overwriting", async () => {
    mocks.intake.mockResolvedValue({ version: 2, unit: null, status: "DRAFT", details: { ...details, seller: "Existing seller" } });
    const { preview } = await reviewed();
    expect(preview.allocations.find(row => row.field === "seller")?.conflict).toBe(true);
    await applyPurchaseDocument(user, preview.previewId, file);
    expect(mocks.save.mock.calls[0][2].details.seller).toBe("Existing seller");
  });
  it("rejects stock collisions and confirmed intake", async () => {
    mocks.findMany.mockResolvedValue([{ id: "other", vin: "5TFCZ5AN3LX230055" }]);
    await expect(reviewed()).rejects.toThrow("Stock number conflicts");
    mocks.findMany.mockResolvedValue([{ id: "vehicle", vin: "1HGCM82633A004352", status: "ACTIVE" }]);
    mocks.intake.mockResolvedValue({ version: 1, status: "CONFIRMED", details });
    await expect(reviewed()).rejects.toThrow("already confirmed");
  });
  it("binds previews to staff and rejects changed files or versions", async () => {
    const { preview } = await reviewed();
    await expect(applyPurchaseDocument({ ...user, id: "other" }, preview.previewId, file)).rejects.toThrow("this staff account");
    await expect(applyPurchaseDocument(user, preview.previewId, { ...file, bytes: Buffer.from("changed") })).rejects.toThrow("Document changed");
    mocks.intake.mockResolvedValue({ version: 1, unit: null, status: "DRAFT", details });
    await expect(applyPurchaseDocument(user, preview.previewId, file)).rejects.toThrow("changed since review");
    expect(mocks.evidence).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("deduplicates repeated source documents", async () => {
    const { preview } = await reviewed();
    await applyPurchaseDocument(user, preview.previewId, file);
    const second = await applyPurchaseDocument(user, preview.previewId, file);
    expect(second.duplicate).toBe(true); expect(mocks.save).toHaveBeenCalledOnce(); expect(mocks.evidence).toHaveBeenCalledOnce();
  });
  it("does not save a draft if original evidence upload fails", async () => {
    const { preview } = await reviewed(); mocks.evidence.mockRejectedValue(new Error("Upload unavailable"));
    await expect(applyPurchaseDocument(user, preview.previewId, file)).rejects.toThrow("Upload unavailable");
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("maps DealerCenter-style purchase spreadsheet columns into individually reviewed vehicles", async () => {
    const result = await readPurchaseSpreadsheet(user, "lot", { ...file, fileName: "purchases.csv", bytes: Buffer.from("VIN,Stock,Purchase Cost,Invoice Number,Purchase Date,Mileage\n1HGCM82633A004352,00123,6000,INV-1,10/08/2026,50000\n5TFCZ5AN3LX230055,230055,20000,INV-2,10/09/2026,42000") });
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].values).toMatchObject({ purchasePrice: "6000", reference: "INV-1", acquiredOn: "2026-10-08", odometer: "50000", stockNumber: "00123" });
    expect(result.rows[1].readId).not.toBe(result.rows[0].readId);
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.extract).not.toHaveBeenCalled();
  });
  it("rejects ambiguous purchase spreadsheet columns instead of guessing", async () => {
    await expect(readPurchaseSpreadsheet(user, "lot", { ...file, bytes: Buffer.from("VIN,Purchase Price,Purchase Cost\n1HGCM82633A004352,6000,7000") })).rejects.toThrow("Multiple columns");
  });
  it("creates a missing identity only after explicit review and retains the original", async () => {
    mocks.findMany.mockResolvedValue([]); mocks.findVehicle.mockResolvedValue(null);
    const { preview } = await reviewed();
    expect(preview.existing).toBe(false); expect(mocks.create).not.toHaveBeenCalled();
    const result = await applyPurchaseDocument(user, preview.previewId, file);
    expect(result.vehicleId).toBe("new-vehicle");
    expect(mocks.create).toHaveBeenCalledOnce(); expect(mocks.save.mock.calls[0][2].status).toBe("DRAFT");
    expect(mocks.assert.mock.calls.some(([input]) => input.capability === "VEHICLE_IDENTITY_CREATE")).toBe(true);
  });
  it("refuses a new identity when a vehicle appeared after review", async () => {
    mocks.findMany.mockResolvedValue([]);
    const { preview } = await reviewed(); mocks.findVehicle.mockResolvedValue({ id: "concurrent-vehicle" });
    await expect(applyPurchaseDocument(user, preview.previewId, file)).rejects.toThrow("added since review");
    expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("returns the prior command on a transaction-reference retry without writing", async () => {
    const { preview } = await reviewed(); mocks.ledger.mockResolvedValue({ resultSnapshot: { vehicleId: "vehicle" } });
    expect(await applyPurchaseDocument(user, preview.previewId, file)).toMatchObject({ vehicleId: "vehicle", duplicate: true });
    expect(mocks.evidence).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("passes allocated fields and amount through existing role constraints", async () => {
    await reviewed();
    expect(mocks.assert.mock.calls.some(([input]) => input.capability === "INVENTORY_INTAKE_EDIT" && input.requestedFields?.includes("purchaseCents") && input.amountCents === 600000)).toBe(true);
  });
  it("blocks non-USD values rather than silently treating them as dollars", async () => {
    await expect(readPurchaseSpreadsheet(user, "lot", { ...file, bytes: Buffer.from("VIN,Purchase Cost,Currency\n1HGCM82633A004352,6000,CAD") })).rejects.toThrow("non-USD");
    mocks.extract.mockResolvedValue({ method: "PLAIN_TEXT", text: "Auction invoice in CAD\nVIN: 1HGCM82633A004352\nPurchase Price: 6000", warnings: [] });
    await expect(readPurchaseDocument(user, "lot", file)).rejects.toThrow("non-USD");
  });
  it("warns about OCR VIN misreads and blocks saving an invalid VIN", async () => {
    mocks.extract.mockResolvedValue({ method: "OCR_TEXT", text: "Auction: Test Auction\nVIN: THGCM82633A004352\nPurchase Price: $6000\nInvoice #: INV-1", warnings: [] });
    const reading = await readPurchaseDocument(user, "lot", file);
    expect(reading.warnings).toEqual(expect.arrayContaining([expect.stringContaining("check digit")]));
    await expect(reviewPurchaseDocument(user, { readId: reading.readId, values: reading.values, fields: ["purchaseCents", "reference"] })).rejects.toThrow("check digit");
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("rejects expired previews and privileged replacement fields", async () => {
    const source = await readPurchaseDocument(user, "lot", file);
    await expect(reviewPurchaseDocument(user, { readId: source.readId, values: source.values, fields: ["proposedPriceCents"] })).rejects.toThrow("valid acquisition fields");
    const saved = await mocks.auditFind({ where: { subjectId: source.readId, eventType: "PURCHASE_DOCUMENT_READ", actorUserId: user.id } });
    saved.metadata.expiresAt = new Date(0).toISOString();
    await expect(reviewPurchaseDocument(user, { readId: source.readId, values: source.values, fields: ["seller"] })).rejects.toThrow("expired");
  });
  it("rechecks permissions before applying and blocks unsafe purchase-reference allocation", async () => {
    const { preview } = await reviewed(); mocks.assert.mockImplementation(() => { throw new Error("Vehicle capability required"); });
    await expect(applyPurchaseDocument(user, preview.previewId, file)).rejects.toThrow("capability required");
    mocks.assert.mockReset(); mocks.intake.mockResolvedValue({ version: 0, unit: null, status: "DRAFT", details: { ...details, reference: "OTHER-INVOICE" } });
    await expect(reviewed()).rejects.toThrow("different purchase reference");
  });
});
