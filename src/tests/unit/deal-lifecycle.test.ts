import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
const mocks = vi.hoisted(() => ({ transaction: vi.fn(), draft: vi.fn(), jacket: vi.fn(), draftUpdate: vi.fn(), jacketLock: vi.fn(), jacketUpdate: vi.fn(), version: vi.fn(), audit: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/server/document-library/storage-config", () => ({ resolveDocumentStorageRuntimeFromEnv: () => ({ organizationId: "test-org" }) }));
import { manageDealLifecycle } from "@/server/sales-documents/deal-lifecycle";
const actor = (roles = ["Manager"]): AuthenticatedUser => ({ id: "staff-1", name: "Staff", email: "staff@test.local", isActive: true, roles, duties: { direct: [], roleDefaults: [], all: [] } });
const request = (action = "FINISH") => ({ action, id: "draft-1", jacketId: "jacket-1", revision: 3, jacketRevision: 5, note: "Reviewed with the customer." });
let draft: { id: string; status: string; revision: number; pathway: string; customerId: string; snapshot: unknown; statusHistory: unknown[] };
let jacket: { id: string; organizationId: string; packetId: string; pathway: string; customerId: string; state: string; revision: number; requirements: unknown[]; versions: Array<{ version: number; disposition: string; phase: string; finalizedAt: Date }>; packet: { documents: unknown[]; auditEvents: unknown[] }; updatedAt: Date };
describe("existing-deal lifecycle transaction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    draft = { id: "draft-1", status: "IN_PROGRESS", revision: 3, pathway: "lease-to-own", customerId: "buyer-1", snapshot: { jackets: { "lease-to-own": "jacket-1" } }, statusHistory: [] };
    jacket = { id: "jacket-1", organizationId: "test-org", packetId: "packet-1", pathway: "lease-to-own", customerId: "buyer-1", state: "WORKING", revision: 5, requirements: [], versions: [], packet: { documents: [], auditEvents: [] }, updatedAt: new Date() };
    mocks.draft.mockImplementation(async () => structuredClone(draft)); mocks.jacket.mockImplementation(async () => structuredClone(jacket));
    mocks.draftUpdate.mockImplementation(async ({ data }) => { Object.assign(draft, { status: data.status, statusHistory: data.statusHistory, revision: draft.revision + 1 }); return { count: 1 }; });
    mocks.jacketLock.mockImplementation(async () => { jacket.revision += 1; return { count: 1 }; });
    mocks.jacketUpdate.mockImplementation(async ({ data }) => Object.assign(jacket, data));
    mocks.version.mockImplementation(async ({ data }) => jacket.versions.unshift({ ...data, finalizedAt: new Date() }));
    mocks.transaction.mockImplementation(async run => {
      const before = structuredClone({ draft, jacket });
      try { return await run({ dealDeskDraft: { findFirst: mocks.draft, updateMany: mocks.draftUpdate }, salesDocumentJacket: { findFirst: mocks.jacket, updateMany: mocks.jacketLock, update: mocks.jacketUpdate }, salesDocumentPacketVersion: { create: mocks.version }, documentLibraryAuditEvent: { create: mocks.audit } }); }
      catch (error) { draft = before.draft; jacket = before.jacket; throw error; }
    });
  });
  it("finishes the existing lease and marks it sold in one transaction without changing its pathway", async () => {
    await expect(manageDealLifecycle(actor(["Sales"]), request())).resolves.toMatchObject({ id: "draft-1", jacketId: "jacket-1", status: "SOLD", state: "CLOSED" });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(draft.pathway).toBe("lease-to-own"); expect(jacket.versions).toHaveLength(1);
    await manageDealLifecycle(actor(), request());
    expect(mocks.version).toHaveBeenCalledTimes(1);
    expect(mocks.draft.mock.calls[0][0].where).toMatchObject({ ownerUserId: "staff-1", organizationId: "test-org" });
  });
  it("rolls back the sold status when required packet review blocks finalization", async () => {
    jacket.requirements = [{ id: "lease", label: "Signed lease", phase: "CLOSING", required: true, signed: true }];
    await expect(manageDealLifecycle(actor(), request())).rejects.toThrow("Signed lease");
    expect(draft.status).toBe("IN_PROGRESS"); expect(draft.revision).toBe(3); expect(jacket.state).toBe("WORKING"); expect(jacket.versions).toHaveLength(0);
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
    jacket.state = "CLOSED"; jacket.versions = [{ version: 1, disposition: "CLOSED", phase: "CLOSING", finalizedAt: new Date("2026-10-15T18:00:00Z") }];
    await manageDealLifecycle(actor(), request());
    expect(draft.statusHistory[0]).toMatchObject({ effectiveAt: "2026-10-15T18:00:00.000Z" });
    expect(mocks.version).not.toHaveBeenCalled();
  });
});
