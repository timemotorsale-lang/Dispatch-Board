import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { closingChecks } from "@/lib/deal-closing";

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), updateMany: vi.fn(), update: vi.fn(), audit: vi.fn(), transaction: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { $transaction: mocks.transaction, salesDocumentJacket: { findFirst: mocks.findFirst } } }));
vi.mock("@/server/document-library/storage-config", () => ({ resolveDocumentStorageRuntimeFromEnv: () => ({ organizationId: "closing-org" }) }));
import { getSalesDocumentJacket, updateSalesDocumentJacket } from "@/server/sales-documents/service";

const actor = (roles = ["Manager"]): AuthenticatedUser => ({ id: "manager", name: "Closing manager", email: "manager@example.test", isActive: true, roles, duties: { direct: [], roleDefaults: [], all: [] } });
const request = () => ({ action: "CLOSING_REVIEW", revision: 5, pathway: "cash", classificationNote: "Retail cash proposal; classification evidence remains under review.", checks: closingChecks("cash").map(check => ({ id: check.id, state: "PENDING", evidence: "" })) });
const jacket = () => ({ id: "jacket-1", packetId: "packet-1", organizationId: "closing-org", dealNumber: "D1", pathway: "retail-sale", customerName: "Synthetic buyer", vehicleReference: "Synthetic vehicle", customerId: null, vin: null, stockNumber: null, state: "WORKING", revision: 5, requirements: [], closingReview: null, updatedAt: new Date("2026-10-24T18:00:00Z"), packet: { documents: [], auditEvents: [] }, versions: [] });

describe("closing-review persistence and authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const current = jacket();
    mocks.findFirst.mockImplementation(async () => structuredClone(current));
    mocks.updateMany.mockImplementation(async () => { current.revision += 1; return { count: 1 }; });
    mocks.update.mockImplementation(async ({ data }) => Object.assign(current, data));
    mocks.transaction.mockImplementation(async callback => callback({ salesDocumentJacket: { findFirst: mocks.findFirst, updateMany: mocks.updateMany, update: mocks.update }, documentLibraryAuditEvent: { create: mocks.audit } }));
  });
  it("rejects anonymous and ordinary sales mutations before reading or changing records", async () => {
    await expect(updateSalesDocumentJacket(null, "jacket-1", request())).rejects.toMatchObject({ status: 401 });
    await expect(updateSalesDocumentJacket(actor(["Sales"]), "jacket-1", request())).rejects.toMatchObject({ status: 403 });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("saves review and immutable audit snapshot in the existing transaction and organization", async () => {
    const result = await updateSalesDocumentJacket(actor(), "jacket-1", request());
    expect(mocks.findFirst.mock.calls[0][0].where).toEqual({ id: "jacket-1", organizationId: "closing-org" });
    expect(mocks.updateMany.mock.calls[0][0].where).toEqual({ id: "jacket-1", organizationId: "closing-org", revision: 5 });
    expect(result.closingReview).toMatchObject({ jacketRevision: 6, savedBy: "manager", pathway: "cash" });
    expect(result.closingReadiness).toMatchObject({ stale: false, releaseAllowed: false, signingAllowed: false });
    expect(mocks.audit.mock.calls[0][0].data).toMatchObject({ organizationId: "closing-org", action: "CLOSING_REVIEW_SAVED", actorUserId: "manager", metadata: { actorName: "Closing manager", closingReview: { jacketRevision: 6 } } });
    expect(result.state).toBe("WORKING");
    expect(result.versions).toEqual([]);
  });
  it("reads the saved review without allowing normal document readers to mutate it", async () => {
    await updateSalesDocumentJacket(actor(), "jacket-1", request());
    const reloaded = await getSalesDocumentJacket(actor(["Sales"]), "jacket-1");
    expect(reloaded.closingReview?.savedBy).toBe("manager");
    expect(reloaded.closingReadiness.stale).toBe(false);
  });
  it("fails a stale revision or concurrent mutation without saving a review or audit", async () => {
    await expect(updateSalesDocumentJacket(actor(), "jacket-1", { ...request(), revision: 4 })).rejects.toMatchObject({ status: 409 });
    expect(mocks.update).not.toHaveBeenCalled();
    mocks.updateMany.mockResolvedValue({ count: 0 });
    await expect(updateSalesDocumentJacket(actor(), "jacket-1", request())).rejects.toMatchObject({ status: 409 });
    expect(mocks.audit).not.toHaveBeenCalled();
  });
  it("does not repurpose unrelated or cross-organization jackets", async () => {
    mocks.findFirst.mockResolvedValue({ ...jacket(), pathway: "daily-rental" });
    await expect(updateSalesDocumentJacket(actor(), "jacket-1", request())).rejects.toThrow("not supported");
    expect(mocks.update).not.toHaveBeenCalled();
    mocks.findFirst.mockResolvedValue(null);
    await expect(updateSalesDocumentJacket(actor(), "other-org-jacket", request())).rejects.toMatchObject({ status: 404 });
  });
  it("conservatively invalidates a saved review after another jacket mutation", async () => {
    await updateSalesDocumentJacket(actor(), "jacket-1", request());
    const result = await updateSalesDocumentJacket(actor(), "jacket-1", { action: "NOTE", revision: 6, note: "Additional staff context after preparation review." });
    expect(result.closingReadiness).toMatchObject({ stale: true, resolved: 0, releaseAllowed: false });
    expect(result.closingReview?.jacketRevision).toBe(6);
  });
  it("can preserve a post-finalization review without rewriting final packet evidence", async () => {
    const current = { ...jacket(), state: "CLOSED" };
    mocks.findFirst.mockImplementation(async () => ({ ...current, revision: mocks.updateMany.mock.calls.length ? 6 : 5 }));
    const result = await updateSalesDocumentJacket(actor(), "jacket-1", request());
    expect(result.state).toBe("CLOSED");
    expect(mocks.update.mock.calls[0][0].data).not.toHaveProperty("state");
  });
});
