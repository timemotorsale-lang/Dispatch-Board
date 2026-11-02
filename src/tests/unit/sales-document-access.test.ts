import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";

const db = vi.hoisted(() => ({ findFirst: vi.fn(), packet: vi.fn(), draft: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { salesDocumentJacket: { findFirst: db.findFirst }, salesDocumentGeneratedPacket: { findFirst: db.packet }, dealDeskDraft: { findFirst: db.draft } } }));
vi.mock("@/server/document-library/storage-config", () => ({ resolveDocumentStorageRuntimeFromEnv: () => ({ organizationId: "test-org", localPrivateRoot: null }) }));
import { getSalesDocumentJacket, requireSalesDocumentsUser, saveSalesDocument, readLatestSalesPacket } from "@/server/sales-documents/service";

const actor = (roles = ["Sales"]): AuthenticatedUser => ({ id: "staff", name: "Staff", email: "staff@local.test", isActive: true, roles, duties: { direct: [], roleDefaults: [], all: [] } });

describe("Sales Documents access boundaries", () => {
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
