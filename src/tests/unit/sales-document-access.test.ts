import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { PDFDocument } from "pdf-lib";
import type { AuthenticatedUser } from "@/server/auth/store";

const db = vi.hoisted(() => ({ findFirst: vi.fn(), packet: vi.fn(), draft: vi.fn(), readFile: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readFile: db.readFile }));
vi.mock("@/server/db/client", () => ({ prisma: { salesDocumentJacket: { findFirst: db.findFirst }, salesDocumentGeneratedPacket: { findFirst: db.packet }, dealDeskDraft: { findFirst: db.draft } } }));
vi.mock("@/server/document-library/storage-config", () => ({ resolveDocumentStorageRuntimeFromEnv: () => ({ organizationId: "test-org", localPrivateRoot: "scan-private" }) }));
import { getSalesDocumentJacket, requireSalesDocumentsUser, saveSalesDocument, readLatestSalesPacket } from "@/server/sales-documents/service";

const actor = (roles = ["Sales"]): AuthenticatedUser => ({ id: "staff", name: "Staff", email: "staff@local.test", isActive: true, roles, duties: { direct: [], roleDefaults: [], all: [] } });

describe("Sales Documents access boundaries", () => {
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
