import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
const mock = vi.hoisted(() => ({ sourceCreate: vi.fn(), sourceUpdate: vi.fn(), jobCreate: vi.fn(), jobFind: vi.fn(), jobUpdate: vi.fn(), jobUpdateMany: vi.fn(), scan: vi.fn(), audit: vi.fn() }));
vi.mock("@/server/db/client", () => {
  const db = { $executeRaw: vi.fn(), vehicleEvidenceObject: { count: async () => 0, create: mock.sourceCreate, update: mock.sourceUpdate }, purchaseImportJob: { create: mock.jobCreate, findUniqueOrThrow: mock.jobFind, findFirst: mock.jobFind, update: mock.jobUpdate, updateMany: mock.jobUpdateMany }, enterpriseAuditEvent: { create: mock.audit } };
  return { prisma: { ...db, $transaction: async (fn: (tx: typeof db) => unknown) => fn(db) } };
});
vi.mock("@/server/inventory-transfer/purchase-scanner", () => ({ scanPurchaseSource: mock.scan }));
import { stagePurchaseSource, storedPurchaseSource, claimPurchaseSave, recordPurchaseJobEvent } from "@/server/inventory-transfer/purchase-jobs";
const bytes = Buffer.from("invoice"), file = { bytes, fileName: "invoice.txt", contentType: "text/plain" };
beforeEach(() => { vi.resetAllMocks(); mock.sourceCreate.mockResolvedValue({ id: "source" }); mock.jobFind.mockResolvedValue({ sourceEvidenceId: "source", version: 1 }); mock.scan.mockResolvedValue({ malwareStatus: "CLEAN", scanner: "TEST" }); mock.jobUpdateMany.mockResolvedValue({ count: 1 }); });
describe("durable purchase source safety", () => {
  it("stores quarantined source and processing job before scanning", async () => {
    await stagePurchaseSource("staff", "lot", file);
    expect(mock.sourceCreate.mock.calls[0][0].data).toMatchObject({ status: "QUARANTINED", malwareStatus: "ERROR", content: new Uint8Array(bytes) });
    expect(mock.sourceCreate.mock.invocationCallOrder[0]).toBeLessThan(mock.scan.mock.invocationCallOrder[0]);
    expect(mock.sourceUpdate.mock.calls[0][0].data).toMatchObject({ status: "AVAILABLE", malwareStatus: "CLEAN" });
  });
  it("retains detected and unscanned documents in quarantine", async () => {
    mock.scan.mockResolvedValue({ malwareStatus: "ERROR", scanner: "NOT_CONFIGURED" });
    await expect(stagePurchaseSource("staff", "lot", file)).rejects.toThrow("quarantined");
    expect(mock.sourceUpdate.mock.calls[0][0].data.status).toBe("QUARANTINED");
    expect(mock.jobUpdate.mock.calls[0][0].data.status).toBe("QUARANTINED");
    mock.scan.mockResolvedValue({ malwareStatus: "DETECTED", scanner: "TEST" });
    await expect(stagePurchaseSource("staff", "lot", file)).rejects.toThrow("validation failed");
  });
  it("checks owner, organization and location when recovering sources", async () => {
    mock.jobFind.mockResolvedValue({ source: { status: "AVAILABLE", malwareStatus: "CLEAN", content: bytes, checksumSha256: createHash("sha256").update(bytes).digest("hex"), fileName: file.fileName, contentType: file.contentType } });
    expect(await storedPurchaseSource("staff", "lot", "job")).toEqual(file);
    expect(mock.jobFind.mock.calls[0][0].where).toMatchObject({ id: "job", locationId: "lot", createdByUserId: "staff" });
    mock.jobFind.mockResolvedValue(null);
    await expect(storedPurchaseSource("other", "lot", "job")).rejects.toThrow("unavailable");
  });
  it("rejects corrupt stored bytes and concurrent saves", async () => {
    mock.jobFind.mockResolvedValue({ source: { status: "AVAILABLE", malwareStatus: "CLEAN", content: bytes, checksumSha256: "invalid" } });
    await expect(storedPurchaseSource("staff", "lot", "job")).rejects.toThrow("integrity");
    mock.jobUpdateMany.mockResolvedValue({ count: 0 });
    await expect(claimPurchaseSave("job", 4)).rejects.toThrow("changed");
    expect(mock.jobUpdateMany.mock.calls[0][0].where).toMatchObject({ id: "job", version: 4, status: "READY" });
  });
  it("blocks review changes while a save is running and requires a current version", async () => {
    mock.jobFind.mockResolvedValue({ status: "APPLYING", version: 3, leaseUntil: new Date(Date.now() + 60_000) });
    await expect(recordPurchaseJobEvent("staff", "lot", "job", "PURCHASE_DOCUMENT_CORRECTED", {})).rejects.toThrow("save is running");
    await expect(recordPurchaseJobEvent("staff", "lot", "job", "PURCHASE_DOCUMENT_RESUMED", {})).rejects.toThrow("save is running");
    mock.jobFind.mockResolvedValue({ status: "APPLYING", version: 3, leaseUntil: new Date(0) });
    await recordPurchaseJobEvent("staff", "lot", "job", "PURCHASE_DOCUMENT_RESUMED", {});
    expect(mock.jobUpdateMany.mock.calls[0][0].where.version).toBe(3);
  });
});
