import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { assessSalesDocument } from "@/lib/sales-document-audit";
const mocks = vi.hoisted(() => ({ find: vi.fn(), lock: vi.fn(), document: vi.fn(), audit: vi.fn(), reading: vi.fn(), transaction: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { salesDocumentJacket: { findFirst: mocks.find }, $transaction: mocks.transaction } }));
vi.mock("@/server/document-library/storage-config", () => ({ resolveDocumentStorageRuntimeFromEnv: () => ({ organizationId: "org" }) }));
import { getSalesDocumentContent, getSalesDocumentJacket, updateSalesDocumentJacket } from "@/server/sales-documents/service";
const staff = { id: "staff", name: "Staff", isActive: true, roles: ["Sales"], duties: { direct: [], roleDefaults: [], all: [] } } as unknown as AuthenticatedUser;
const manager = { ...staff, roles: ["Manager"] };
const makeJacket = () => ({ id: "jacket", packetId: "packet", organizationId: "org", revision: 1, state: "WORKING", pathway: "retail-sale", customerName: "Synthetic Buyer", customerId: "buyer", vin: "TESTVIN", stockNumber: "S1", updatedAt: new Date(), requirements: [{ id: "signed-agreement", phase: "CLOSING", label: "Signed agreement", required: true, signed: true }], versions: [] as Array<{ snapshot: unknown; finalizedAt: Date }>, packet: { auditEvents: [], documents: [{ documentId: "proof", document: { id: "proof", documentType: "signed-agreement", status: "ACCEPTED", source: "MANUAL_UPLOAD", createdAt: new Date(), fileName: "signed.pdf", checksumSha256: "original-checksum", classificationSnapshot: { signed: true } as Record<string, unknown> } }] } });
let jacket = makeJacket();
describe("sales attachment correction and optional audit", () => {
  beforeEach(() => {
    vi.resetAllMocks(); jacket = makeJacket(); mocks.find.mockImplementation(async () => jacket); mocks.lock.mockResolvedValue({ count: 1 });
    mocks.document.mockImplementation(async ({ data }) => Object.assign(jacket.packet.documents[0].document, data));
    mocks.transaction.mockImplementation(callback => callback({ salesDocumentJacket: { findFirst: mocks.find, updateMany: mocks.lock }, documentLibraryDocument: { update: mocks.document }, documentLibraryAuditEvent: { create: mocks.audit }, documentReadingJob: { findFirst: mocks.reading } }));
  });
  const exclude = () => ({ action: "EXCLUDE_DOCUMENT", revision: 1, documentId: "proof", note: "Wrong customer's final signed document" });
  it("excludes mistakes from requirements and rejects them as usable evidence without deleting originals", async () => {
    const result = await updateSalesDocumentJacket(staff, "jacket", exclude());
    expect(result.documents).toEqual([]); expect(result.excludedDocumentCount).toBe(1); expect(result.checklist[0].ready).toBe(false);
    expect(jacket.packet.documents[0].document.status).toBe("REJECTED");
    expect(mocks.document.mock.calls[0][0].data).toMatchObject({ sensitivity: "RESTRICTED", classificationSnapshot: { signed: true, excludedFromDeal: true, excludedBy: staff.id } });
    expect(mocks.audit.mock.calls[0][0].data).toMatchObject({ action: "DOCUMENT_EXCLUDED", packetId: "packet", organizationId: "org" });
    await expect(getSalesDocumentContent(staff, "jacket", "proof")).rejects.toMatchObject({ status: 403 });
    await expect(updateSalesDocumentJacket(staff, "jacket", { action: "REVIEW", revision: 1, documentId: "proof" })).rejects.toMatchObject({ status: 409 });
  });
  it("requires correction reopening and manager authority when an attachment is in a final version", async () => {
    jacket.state = "CLOSED";
    await expect(updateSalesDocumentJacket(manager, "jacket", exclude())).rejects.toMatchObject({ status: 409 });
    jacket.state = "WORKING"; jacket.versions = [{ snapshot: { documents: [{ id: "proof", checksum: "original-checksum" }] }, finalizedAt: new Date() }];
    const before = structuredClone(jacket.versions);
    await expect(updateSalesDocumentJacket(staff, "jacket", exclude())).rejects.toMatchObject({ status: 403 });
    await updateSalesDocumentJacket(manager, "jacket", exclude()); expect(jacket.versions).toEqual(before);
  });
  it("rejects missing reasons, unrelated attachments, stale revisions and anonymous changes", async () => {
    for (const change of [{ note: "oops" }, { documentId: "other" }, { revision: 0 }]) await expect(updateSalesDocumentJacket(staff, "jacket", { ...exclude(), ...change })).rejects.toBeDefined();
    await expect(updateSalesDocumentJacket(null, "jacket", exclude())).rejects.toMatchObject({ status: 401 });
    expect(mocks.document).not.toHaveBeenCalled(); expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("can audit a finalized original without accepting evidence or rewriting the final packet", async () => {
    jacket.state = "CLOSED"; const before = structuredClone(jacket.packet.documents);
    mocks.reading.mockResolvedValue({ id: "read", reviewVersion: 3, review: { confirmed: true, fields: { vin: "OTHER-VIN", signer: "Other Buyer" } } });
    await updateSalesDocumentJacket(staff, "jacket", { action: "DOCUMENT_AUDIT", revision: 1, documentId: "proof", jobId: "read" });
    expect(mocks.reading.mock.calls[0][0].where).toEqual({ id: "read", organizationId: "org", createdByUserId: "staff", purpose: "SALES", status: "READY", checksumSha256: "original-checksum" });
    expect(mocks.audit.mock.calls[0][0].data).toMatchObject({ action: "DOCUMENT_AUDIT_RECORDED", metadata: { assessment: { status: "Possible wrong deal" }, reviewVersion: 3 } });
    expect(jacket.packet.documents).toEqual(before); expect(jacket.state).toBe("CLOSED"); expect(mocks.document).not.toHaveBeenCalled();
  });
  it("will not associate another source or an unconfirmed read with a deal audit", async () => {
    for (const result of [null, { review: { confirmed: false } }]) {
      mocks.reading.mockResolvedValue(result);
      await expect(updateSalesDocumentJacket(staff, "jacket", { action: "DOCUMENT_AUDIT", revision: 1, documentId: "proof", jobId: "other" })).rejects.toThrow("this exact document");
    }
    expect(mocks.audit).not.toHaveBeenCalled();
    jacket.packet.documents[0].document.classificationSnapshot.excludedFromDeal = true;
    expect((await getSalesDocumentJacket(staff, "jacket")).documents).toEqual([]);
  });
  it("distinguishes mismatches and missing identity from a limited identity match", () => {
    expect(assessSalesDocument({}, jacket).status).toBe("Needs review");
    expect(assessSalesDocument({ vin: "testvin", signer: "Synthetic Buyer" }, jacket).status).toBe("Matches available identity fields");
    expect(assessSalesDocument({ vin: "OTHER" }, jacket).status).toBe("Possible wrong deal");
  });
});
