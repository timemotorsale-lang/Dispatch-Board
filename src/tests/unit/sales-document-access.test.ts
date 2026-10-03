import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";

const db = vi.hoisted(() => ({ findFirst: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { salesDocumentJacket: { findFirst: db.findFirst } } }));
vi.mock("@/server/document-library/storage-config", () => ({ resolveDocumentStorageRuntimeFromEnv: () => ({ organizationId: "test-org", localPrivateRoot: null }) }));
import { getSalesDocumentJacket, requireSalesDocumentsUser, saveSalesDocument } from "@/server/sales-documents/service";

const actor = (roles = ["Sales"]): AuthenticatedUser => ({ id: "staff", name: "Staff", email: "staff@local.test", isActive: true, roles, duties: { direct: [], roleDefaults: [], all: [] } });

describe("Sales Documents access boundaries", () => {
  beforeEach(() => db.findFirst.mockReset());
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
});
