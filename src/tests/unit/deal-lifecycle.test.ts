import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
const mocks = vi.hoisted(() => ({ transaction: vi.fn(), draft: vi.fn(), jacket: vi.fn(), draftUpdate: vi.fn(), draftSnapshot: vi.fn(), jacketLock: vi.fn(), jacketUpdate: vi.fn(), jacketExisting: vi.fn(), jacketCreate: vi.fn(), packetCreate: vi.fn(), version: vi.fn(), audit: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/server/document-library/storage-config", () => ({ resolveDocumentStorageRuntimeFromEnv: () => ({ organizationId: "test-org" }) }));
import { manageDealLifecycle } from "@/server/sales-documents/deal-lifecycle";
const actor = (roles = ["Manager"]): AuthenticatedUser => ({ id: "staff-1", name: "Staff", email: "staff@test.local", isActive: true, roles, duties: { direct: [], roleDefaults: [], all: [] } });
const request = (action = "FINISH") => ({ action, id: "draft-1", jacketId: "jacket-1", revision: 3, jacketRevision: 5, note: "Reviewed with the customer." });
let draft: { id: string; dealNumber: number; status: string; revision: number; pathway: string; customerId: string; customerName: string; vehicleReference: string; snapshot: unknown; statusHistory: unknown[] };
let jacket: { id: string; organizationId: string; packetId: string; pathway: string; customerId: string; state: string; revision: number; requirements: unknown[]; versions: Array<{ version: number; disposition: string; phase: string; finalizedAt: Date }>; packet: { documents: unknown[]; auditEvents: unknown[] }; updatedAt: Date };
describe("existing-deal lifecycle transaction", () => {
  it("keeps a saved vehicle-only draft from being marked sold until its shared customer is linked", async () => {
    Object.assign(draft, { status: "IN_PROGRESS", customerId: null, customerName: "Typed customer", snapshot: { "desk:identity": { vehicleId: "vehicle-1" } } });
    await expect(manageDealLifecycle(actor(), { ...request("MARK_SOLD"), jacketId: "" })).rejects.toThrow("Link a shared CRM customer");
    expect(mocks.draftUpdate).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    vi.resetAllMocks();
    draft = { id: "draft-1", dealNumber: 1234, status: "SOLD", revision: 3, pathway: "lease-to-own", customerId: "buyer-1", customerName: "Buyer", vehicleReference: "Vehicle", snapshot: { jackets: { "lease-to-own": "jacket-1" } }, statusHistory: [] };
    jacket = { id: "jacket-1", organizationId: "test-org", packetId: "packet-1", pathway: "lease-to-own", customerId: "buyer-1", state: "WORKING", revision: 5, requirements: [], versions: [], packet: { documents: [], auditEvents: [] }, updatedAt: new Date() };
    mocks.draft.mockImplementation(async () => structuredClone(draft)); mocks.jacket.mockImplementation(async () => structuredClone(jacket));
    mocks.draftUpdate.mockImplementation(async ({ data }) => { Object.assign(draft, { status: data.status ?? draft.status, statusHistory: data.statusHistory, revision: draft.revision + 1 }); return { count: 1 }; });
    mocks.draftSnapshot.mockImplementation(async ({ data }) => Object.assign(draft, data));
    mocks.jacketExisting.mockResolvedValue(null);
    mocks.jacketCreate.mockImplementation(async ({ data }) => { Object.assign(jacket, data, { state: "WORKING", revision: 1 }); return structuredClone(jacket); });
    mocks.jacketLock.mockImplementation(async () => { jacket.revision += 1; return { count: 1 }; });
    mocks.jacketUpdate.mockImplementation(async ({ data }) => Object.assign(jacket, data));
    mocks.version.mockImplementation(async ({ data }) => jacket.versions.unshift({ ...data, finalizedAt: new Date() }));
    mocks.transaction.mockImplementation(async run => {
      const before = structuredClone({ draft, jacket });
      try { return await run({ dealDeskDraft: { findFirst: mocks.draft, updateMany: mocks.draftUpdate, update: mocks.draftSnapshot }, salesDocumentJacket: { findFirst: mocks.jacket, findUnique: mocks.jacketExisting, create: mocks.jacketCreate, updateMany: mocks.jacketLock, update: mocks.jacketUpdate }, documentLibraryPacket: { create: mocks.packetCreate }, salesDocumentPacketVersion: { create: mocks.version }, documentLibraryAuditEvent: { create: mocks.audit } }); }
      catch (error) { draft = before.draft; jacket = before.jacket; throw error; }
    });
  });
  it("finalizes paperwork on the existing sold lease without changing its pathway", async () => {
    await expect(manageDealLifecycle(actor(["Sales"]), request())).resolves.toMatchObject({ id: "draft-1", jacketId: "jacket-1", status: "SOLD", state: "CLOSED" });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(draft.pathway).toBe("lease-to-own"); expect(jacket.versions).toHaveLength(1);
    await manageDealLifecycle(actor(), request());
    expect(mocks.version).toHaveBeenCalledTimes(1);
    expect(mocks.draft.mock.calls[0][0].where).toMatchObject({ ownerUserId: "staff-1", organizationId: "test-org" });
  });
  it("keeps a deal sold when required packet review blocks paperwork finalization", async () => {
    jacket.requirements = [{ id: "lease", label: "Signed lease", phase: "CLOSING", required: true, signed: true }];
    await expect(manageDealLifecycle(actor(), request())).rejects.toThrow("Signed lease");
    expect(draft.status).toBe("SOLD"); expect(draft.revision).toBe(3); expect(jacket.state).toBe("WORKING"); expect(jacket.versions).toHaveLength(0);
  });
  it("rejects stale revisions and unrelated packets before writing", async () => {
    await expect(manageDealLifecycle(actor(), { ...request(), revision: 2 })).rejects.toMatchObject({ status: 409 });
    draft.snapshot = { jackets: { "lease-to-own": "another-jacket" } };
    await expect(manageDealLifecycle(actor(), request())).rejects.toMatchObject({ status: 409 });
    expect(mocks.draftUpdate).not.toHaveBeenCalled();
  });
  it("requires manager permission and a reason to reopen, preserving original signed versions", async () => {
    jacket.state = "CLOSED"; draft.status = "SOLD"; jacket.versions = [{ version: 1, disposition: "CLOSED", phase: "CLOSING", finalizedAt: new Date("2026-10-15T18:00:00Z") }];
    await expect(manageDealLifecycle(actor(["Sales"]), request("REOPEN"))).rejects.toMatchObject({ status: 403 });
    await expect(manageDealLifecycle(actor(), { ...request("REOPEN"), note: "short" })).rejects.toMatchObject({ status: 400 });
    await expect(manageDealLifecycle(actor(), request("REOPEN"))).resolves.toMatchObject({ status: "SOLD", state: "WORKING" });
    expect(jacket.versions).toHaveLength(1); expect(mocks.version).not.toHaveBeenCalled();
  });
  it("requests unwind review without confirming a refund or removing the original packet", async () => {
    jacket.state = "CLOSED"; draft.status = "SOLD";
    await expect(manageDealLifecycle(actor(), request("REQUEST_UNWIND"))).resolves.toMatchObject({ state: "UNWIND_PENDING", status: "PENDING" });
    expect(mocks.audit.mock.calls[0][0].data.note).toContain("No funds were reversed");
    await expect(manageDealLifecycle(actor(), { ...request(), revision: 4, jacketRevision: 6 })).rejects.toMatchObject({ status: 409 });
    expect(mocks.version).not.toHaveBeenCalled();
  });
  it("keeps the original close date when recording sold status on an already closed packet", async () => {
    draft.status = "IN_PROGRESS";
    jacket.state = "CLOSED"; jacket.versions = [{ version: 1, disposition: "CLOSED", phase: "CLOSING", finalizedAt: new Date("2026-10-15T18:00:00Z") }];
    await manageDealLifecycle(actor(), request("MARK_SOLD"));
    expect(draft.statusHistory[0]).toMatchObject({ effectiveAt: "2026-10-15T18:00:00.000Z" });
    expect(mocks.version).not.toHaveBeenCalled();
  });
  it.each(["lease-to-own", "retail-sale"])("marks an existing %s deal sold even when no packet exists, without finalizing anything", async pathway => {
    draft.pathway = pathway;
    draft.status = "IN_PROGRESS"; draft.snapshot = {};
    await expect(manageDealLifecycle(actor(["Sales"]), { action: "MARK_SOLD", id: draft.id, revision: 3 })).resolves.toMatchObject({ id: draft.id, jacketId: null, status: "SOLD", state: null });
    expect(draft.status).toBe("SOLD"); expect(mocks.version).not.toHaveBeenCalled(); expect(mocks.jacketLock).not.toHaveBeenCalled();
    await manageDealLifecycle(actor(), { action: "MARK_SOLD", id: draft.id, revision: 3 });
    expect(mocks.draftUpdate).toHaveBeenCalledTimes(1);
  });
  it("marks a deal sold without checking signatures or completing funding", async () => {
    draft.status = "IN_PROGRESS"; jacket.state = "DELIVERED_FUNDING_PENDING";
    jacket.requirements = [{ id: "lease", label: "Signed lease", phase: "CLOSING", required: true, signed: true }];
    await expect(manageDealLifecycle(actor(), request("MARK_SOLD"))).resolves.toMatchObject({ status: "SOLD", state: "DELIVERED_FUNDING_PENDING" });
    expect(mocks.version).not.toHaveBeenCalled();
  });
  it("creates and links one paperwork jacket on the existing sold deal", async () => {
    draft.snapshot = {}; mocks.jacket.mockImplementation(async () => structuredClone(jacket));
    const result = await manageDealLifecycle(actor(), { action: "PREPARE_PAPERWORK", id: draft.id, revision: 3 });
    expect(result.id).toBe("draft-1"); expect(result.status).toBe("SOLD"); expect(result.jacketId).toBe(jacket.id);
    expect(draft.snapshot).toMatchObject({ jackets: { "lease-to-own": jacket.id } });
    await manageDealLifecycle(actor(), { action: "PREPARE_PAPERWORK", id: draft.id, revision: 4 });
    expect(mocks.packetCreate).toHaveBeenCalledTimes(1); expect(mocks.jacketCreate).toHaveBeenCalledTimes(1);
    expect(mocks.jacketCreate.mock.calls[0][0].data.dealNumber).toBe("1234");
  });
});
