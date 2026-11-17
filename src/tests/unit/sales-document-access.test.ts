import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import type { AuthenticatedUser } from "@/server/auth/store";
import { salesDocumentRequirements } from "@/lib/sales-document-pathways";

const db = vi.hoisted(() => ({ findFirst: vi.fn(), packet: vi.fn(), draft: vi.fn(), readFile: vi.fn(), lock: vi.fn(), update: vi.fn(), create: vi.fn(), audit: vi.fn(), writeObject: vi.fn(), storageEnabled: false }));
vi.mock("node:fs/promises", () => ({ readFile: db.readFile }));
vi.mock("@/server/db/client", () => ({ prisma: { salesDocumentJacket: { findFirst: db.findFirst }, salesDocumentGeneratedPacket: { findFirst: db.packet }, dealDeskDraft: { findFirst: db.draft }, $transaction: (run: (tx: unknown) => unknown) => run({
  salesDocumentJacket: { findFirst: db.findFirst, updateMany: db.lock }, documentLibraryDocument: { update: db.update, create: db.create }, documentLibraryAuditEvent: { create: db.audit }
}) } }));
vi.mock("@/server/document-library/storage-config", () => ({ resolveDocumentStorageRuntimeFromEnv: () => ({ organizationId: "test-org", localPrivateRoot: "scan-private", adapter: db.storageEnabled ? { writeObject: db.writeObject } : null }) }));
import { getSalesDocumentJacket, requireSalesDocumentsUser, saveSalesDocument, readLatestSalesPacket } from "@/server/sales-documents/service";

const actor = (roles = ["Sales"]): AuthenticatedUser => ({ id: "staff", name: "Staff", email: "staff@local.test", isActive: true, roles, duties: { direct: [], roleDefaults: [], all: [] } });

describe("Sales Documents access boundaries", () => {
  it("updates a prepared lease in place after a trade change and reuses the version on repeat generation", async () => {
    const bytes = Buffer.from("lease with trade-in");
    const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
    const prepared = { id: "lease-form", source: "GENERATED", documentType: "lease-agreement", classificationSnapshot: { generationFingerprint: "before-trade" },
      fileName: "old.pdf", status: "ACCEPTED", storageReference: "local-private://old.pdf", currentVersionId: "old-version", createdAt: new Date(), versions: [{ version: 1 }] };
    db.findFirst.mockResolvedValue({ id: "jacket", organizationId: "test-org", pathway: "lease-to-own", state: "WORKING", revision: 2,
      requirements: [], versions: [], updatedAt: new Date(), packet: { auditEvents: [], documents: [{ document: prepared }] } });
    db.lock.mockResolvedValue({ count: 1 });
    db.storageEnabled = true;
    db.writeObject.mockResolvedValue({ reference: "local-private://updated.pdf", checksumSha256, sizeBytes: bytes.length, contentType: "application/pdf" });
    db.readFile.mockResolvedValue(bytes);
    try {
      const request = { bytes, fileName: "updated.pdf", contentType: "application/pdf", documentType: "w2-lease", generated: true, generationFingerprint: "after-trade" };
      await saveSalesDocument(actor(), "jacket", request);
      expect(db.writeObject).toHaveBeenCalledWith(expect.objectContaining({ documentId: "lease-form", version: 2 }));
      expect(db.create).not.toHaveBeenCalled();
      expect(db.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "lease-form" }, data: expect.objectContaining({
        status: "PENDING_REVIEW", classificationSnapshot: expect.objectContaining({ generationFingerprint: "after-trade" }),
        versions: { create: expect.objectContaining({ version: 2, checksumSha256 }) }
      }) }));
      Object.assign(prepared, { classificationSnapshot: { generationFingerprint: "after-trade" }, checksumSha256, storageReference: "local-private://updated.pdf" });
      await saveSalesDocument(actor(), "jacket", { ...request, fileName: "another-generation.pdf" });
      expect(db.writeObject).toHaveBeenCalledOnce();
      expect(db.update).toHaveBeenCalledOnce();
    } finally {
      db.storageEnabled = false;
      db.readFile.mockReset();
    }
  });
  it("reuses a prepared form even when a repeat generation changes its filename and bytes", async () => {
    const bytes = Buffer.from("original prepared form");
    db.readFile.mockResolvedValue(bytes);
    db.findFirst.mockResolvedValue({
      id: "prepared-jacket", pathway: "retail-sale", state: "WORKING", revision: 2,
      requirements: [], versions: [], updatedAt: new Date(),
      packet: { auditEvents: [], documents: [{ document: {
        id: "prepared-form", source: "GENERATED", documentType: "sales-agreement",
        checksumSha256: createHash("sha256").update(bytes).digest("hex"),
        storageReference: "local-private://prepared.html", status: "PENDING_REVIEW",
        classificationSnapshot: {}, fileName: "original.html", createdAt: new Date()
      } }] }
    });
    const result = await saveSalesDocument(actor(), "prepared-jacket", {
      bytes: Buffer.from("regenerated with a new timestamp"), fileName: "repeat.html",
      contentType: "text/html", documentType: "sales-agreement", generated: true
    });
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].id).toBe("prepared-form");
    expect(result.revision).toBe(2);
    db.readFile.mockRejectedValueOnce(new Error("missing"));
    await expect(saveSalesDocument(actor(), "prepared-jacket", {
      bytes, fileName: "repeat.html", contentType: "text/html", documentType: "sales-agreement", generated: true
    })).rejects.toMatchObject({ status: 503 });
    db.readFile.mockReset();
  });
  it("updates an existing lease checklist on read while preserving saved files and final snapshots", async () => {
    const removed = ["sales-agreement", "delivery-documents", "tax-fee-receipt", "buyers-guide", "binding-contract-disclosure"];
    const saved = [...removed.map(id => ({ id, label: id, phase: "CLOSING" as const, required: true, signed: true })), ...salesDocumentRequirements("lease-to-own")];
    const snapshot = { requirements: structuredClone(saved), documents: [{ id: "old-proof" }] };
    const original = structuredClone(snapshot);
    db.findFirst.mockResolvedValue({ id: "lease", pathway: "lease-to-own", requirements: saved, state: "CLOSED", updatedAt: new Date(), packet: { documents: [{ document: { id: "old-proof", documentType: "sales-agreement", status: "ACCEPTED", source: "MANUAL_UPLOAD", fileName: "existing-proof.pdf", classificationSnapshot: {}, createdAt: new Date() } }], auditEvents: [] }, versions: [{ id: "version-1", version: 1, phase: "CLOSING", disposition: "CLOSED", finalizedAt: new Date(), snapshot }] });
    const result = await getSalesDocumentJacket(actor(), "lease");
    expect(result.requirements).toHaveLength(7); expect(result.checklist).toHaveLength(7);
    expect(result.documents[0].id).toBe("old-proof"); expect(result.versions).toHaveLength(1);
    expect(saved).toHaveLength(12); expect(snapshot).toEqual(original);
    expect(result.checklist.some(item => removed.includes(item.id))).toBe(false);
  });
  it("recovers an already saved scan after a lost response without adding another document", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    const bytes = Buffer.from(await pdf.save());
    const checksum = createHash("sha256").update(bytes).digest("hex");
    db.readFile.mockResolvedValue(bytes);
    db.findFirst.mockResolvedValue({
      id: "scan-jacket", customerName: "Sample customer", customerId: "customer-1", vehicleReference: "Sample vehicle", vin: "SAMPLE", stockNumber: "S1",
      dealNumber: "D1", pathway: "retail-sale", state: "WORKING", revision: 2, requirements: [], versions: [], updatedAt: new Date(),
      packet: { auditEvents: [], documents: [{ document: { id: "saved-scan", source: "MANUAL_UPLOAD", documentType: "sales-agreement", checksumSha256: checksum,
        storageReference: "local-private://receipt.pdf", status: "PENDING_REVIEW", classificationSnapshot: { signed: true }, currentVersionId: "v1",
        versions: [], fileName: "scan.pdf", contentType: "application/pdf", createdAt: new Date() } }] }
    });
    const result = await saveSalesDocument(actor(), "scan-jacket", { bytes, fileName: "scan.pdf", contentType: "application/pdf", documentType: "sales-agreement", signed: true, expectedRevision: 1, captureMethod: "DOCUMENT_SCAN" });
    expect(result.revision).toBe(2);
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].id).toBe("saved-scan");
    expect(db.readFile).toHaveBeenCalledOnce();
  });
  it("rejects scan PDFs exceeding the page limit before writing storage", async () => {
    db.findFirst.mockResolvedValue({ state: "WORKING" });
    const pdf = await PDFDocument.create();
    for (let page = 0; page < 29; page += 1) pdf.addPage();
    await expect(saveSalesDocument(actor(), "scan-jacket", { bytes: await pdf.save(), fileName: "scan.pdf", contentType: "application/pdf", documentType: "supplemental", captureMethod: "DOCUMENT_SCAN" })).rejects.toThrow("1–28 pages");
  });
  beforeEach(() => { db.findFirst.mockReset(); db.packet.mockReset(); db.draft.mockReset(); });
  it("rejects anonymous, inactive and unrelated roles", () => {
    expect(() => requireSalesDocumentsUser(null)).toThrow("Sign in");
    expect(() => requireSalesDocumentsUser({ ...actor(), isActive: false })).toThrow("Sign in");
    expect(() => requireSalesDocumentsUser(actor(["Technician"]))).toThrow("Your role");
  });
  it("allows sales review but reserves exceptions for elevated staff", () => {
    expect(requireSalesDocumentsUser(actor()).id).toBe("staff");
    expect(() => requireSalesDocumentsUser(actor(), true)).toThrow("Your role");
    expect(requireSalesDocumentsUser(actor(["Manager"]), true).id).toBe("staff");
  });
  it("does not query records for unauthorized requests", async () => {
    await expect(getSalesDocumentJacket(null, "other-jacket")).rejects.toMatchObject({ status: 401 });
    expect(db.findFirst).not.toHaveBeenCalled();
  });
  it("scopes every jacket lookup to the configured organization", async () => {
    db.findFirst.mockResolvedValue(null);
    await expect(getSalesDocumentJacket(actor(), "other-jacket")).rejects.toMatchObject({ status: 404 });
    expect(db.findFirst.mock.calls[0][0].where).toEqual({ id: "other-jacket", organizationId: "test-org" });
  });
  it("does not write a file to a closed jacket", async () => {
    db.findFirst.mockResolvedValue({ state: "CLOSED" });
    await expect(saveSalesDocument(actor(), "closed", { bytes: new Uint8Array([1]), fileName: "signed.pdf", contentType: "application/pdf", documentType: "sales-agreement" })).rejects.toMatchObject({ status: 409 });
  });
  it("opens the latest saved preview read-only within the existing packet organization policy", async () => {
    db.packet.mockResolvedValue({ payload: { packetId: "saved-preview" } });
    await expect(readLatestSalesPacket(actor(), new URLSearchParams("jacketId=closed-jacket"))).resolves.toEqual({ packetId: "saved-preview" });
    expect(db.packet.mock.calls[0][0]).toMatchObject({ where: { jacket: { organizationId: "test-org", id: "closed-jacket" } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  });
  it("recovers older preview links by exact pathway and reference, without guessing from customer names", async () => {
    db.packet.mockResolvedValue(null);
    await expect(readLatestSalesPacket(actor(), new URLSearchParams("jacketReference=deal-reference&pathway=lease-to-own"))).resolves.toBeNull();
    expect(db.packet.mock.calls[0][0].where.jacket).toEqual({ organizationId: "test-org", dealReference: { in: ["deal-reference"] }, pathway: "lease-to-own" });
    await expect(readLatestSalesPacket(null, new URLSearchParams("jacketId=closed-jacket"))).rejects.toMatchObject({ status: 401 });
    await expect(readLatestSalesPacket(actor(), new URLSearchParams("customerName=Buyer"))).rejects.toMatchObject({ status: 400 });
  });
  it("uses only the current owner's saved references for draft-based recovery", async () => {
    db.draft.mockResolvedValue({ snapshot: { references: { "crm-next:document-jacket:buyer:lease-to-own:vehicle": "lease-reference", "crm-next:document-jacket:buyer:bhph:vehicle": "other-reference" } } });
    db.packet.mockResolvedValue(null);
    await readLatestSalesPacket(actor(), new URLSearchParams("draftId=older-draft&pathway=lease-to-own"));
    expect(db.draft.mock.calls[0][0].where).toEqual({ id: "older-draft", organizationId: "test-org", ownerUserId: actor().id, pathway: "lease-to-own" });
    expect(db.packet.mock.calls[0][0].where.jacket.dealReference.in).toEqual(["lease-reference"]);
    db.draft.mockResolvedValue(null);
    await expect(readLatestSalesPacket(actor(), new URLSearchParams("draftId=other-staff&pathway=lease-to-own"))).rejects.toMatchObject({ status: 404 });
  });
});
