import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn(), findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { dealDeskDraft: mocks, $transaction: (run: (db: unknown) => unknown) => run({ dealDeskDraft: mocks, vehicleUseBooking: { count: mocks.count } }) } }));
vi.mock("@/server/document-library/storage-config", () => ({ resolveDocumentStorageRuntimeFromEnv: () => ({ organizationId: "test-org" }) }));
import { listDealDrafts, listSavedDealLibrary, readDealDeskDraft, saveDealDeskDraft, sanitizeDealDraftSnapshot } from "@/server/sales-documents/deal-drafts";

const actor: AuthenticatedUser = { id: "staff-1", name: "Staff", email: "staff@local.test", isActive: true, roles: ["Sales"], duties: { direct: [], roleDefaults: [], all: [] } };
const draft = { id: "draft-12345678", revision: 0, pathway: "bhph", customerName: "Buyer", vehicleReference: "Vehicle", snapshot: { "bhph:terms": { salePrice: "$14000", downPayment: "$2000" } } };

describe("Saved deal draft controls", () => {
  beforeEach(() => vi.resetAllMocks());
  it("requires an active permitted staff account", async () => {
    await expect(saveDealDeskDraft(null, draft)).rejects.toMatchObject({ status: 401 });
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("scopes retrieval and listings to the current staff member and organization", async () => {
    mocks.findFirst.mockResolvedValue(null); mocks.findMany.mockResolvedValue([]);
    await expect(readDealDeskDraft(actor, draft.id)).rejects.toMatchObject({ status: 404 });
    await listDealDrafts(actor, "customer-1");
    expect(mocks.findFirst.mock.calls[0][0].where).toEqual({ id: draft.id, organizationId: "test-org", ownerUserId: actor.id });
    expect(mocks.findMany.mock.calls[0][0].where).toEqual({ organizationId: "test-org", ownerUserId: actor.id, customerId: "customer-1" });
  });
  it("creates a durable draft with all supplied working terms", async () => {
    mocks.findUnique.mockResolvedValue(null); mocks.create.mockImplementation(({ data }) => data);
    const saved = await saveDealDeskDraft(actor, draft);
    expect(saved.snapshot).toEqual(draft.snapshot);
    expect(saved.ownerUserId).toBe(actor.id);
  });
  it("does not allow another account to overwrite a draft", async () => {
    mocks.findUnique.mockResolvedValue({ organizationId: "test-org", ownerUserId: "other-staff" });
    await expect(saveDealDeskDraft(actor, draft)).rejects.toMatchObject({ status: 404 });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
  it("rejects stale edits instead of overwriting newer progress", async () => {
    mocks.findUnique.mockResolvedValue({ organizationId: "test-org", ownerUserId: actor.id });
    mocks.updateMany.mockResolvedValue({ count: 0 });
    await expect(saveDealDeskDraft(actor, { ...draft, revision: 1 })).rejects.toMatchObject({ status: 409 });
  });
  it("rejects oversized snapshots, invalid pathways and missing working data", async () => {
    await expect(saveDealDeskDraft(actor, { ...draft, pathway: "unknown" })).rejects.toMatchObject({ status: 400 });
    await expect(saveDealDeskDraft(actor, { ...draft, snapshot: null })).rejects.toMatchObject({ status: 400 });
    await expect(saveDealDeskDraft(actor, { ...draft, snapshot: { content: "x".repeat(513 * 1024) } })).rejects.toMatchObject({ status: 413 });
  });
  it("does not store full credit identifiers in a saved draft", () => {
    expect(sanitizeDealDraftSnapshot({ fields: { "bhph:SSN / ITIN:0": "sensitive", "bhph:Year:0": "2010" }, applicant: { ssn: "sensitive", employer: "Employer" } })).toEqual({ fields: { "bhph:Year:0": "2010" }, applicant: { employer: "Employer" } });
  });
  it("defaults existing working data to a working deal and records status attribution", async () => {
    mocks.findUnique.mockResolvedValue(null); mocks.create.mockImplementation(({ data }) => data);
    const saved = await saveDealDeskDraft(actor, draft);
    expect(saved.status).toBe("IN_PROGRESS");
    expect(saved.statusHistory).toEqual([expect.objectContaining({ from: null, to: "IN_PROGRESS", actorId: actor.id })]);
  });
  it("preserves a saved disposition when an older client does not send status", async () => {
    mocks.findUnique.mockResolvedValue({ organizationId: "test-org", ownerUserId: actor.id, status: "SOLD", statusHistory: [] });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    await saveDealDeskDraft(actor, { ...draft, revision: 1 });
    expect(mocks.updateMany.mock.calls[0][0].data.status).toBe("SOLD");
    expect(mocks.updateMany.mock.calls[0][0].data.statusHistory).toBeUndefined();
  });
  it("appends server-owned history when a disposition changes", async () => {
    const history = [{ from: null, to: "IN_PROGRESS", actorId: actor.id, at: "2026-10-03T00:00:00Z" }];
    mocks.findUnique.mockResolvedValue({ organizationId: "test-org", ownerUserId: actor.id, status: "IN_PROGRESS", statusHistory: history });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    await saveDealDeskDraft(actor, { ...draft, status: "LOST", statusHistory: ["forged"] });
    expect(mocks.updateMany.mock.calls[0][0].data.statusHistory).toEqual([history[0], expect.objectContaining({ from: "IN_PROGRESS", to: "LOST", actorId: actor.id })]);
  });
  it("rejects unsupported status and filter values", async () => {
    await expect(saveDealDeskDraft(actor, { ...draft, status: "UNKNOWN" })).rejects.toMatchObject({ status: 400 });
    for (const query of ["status=UNKNOWN", "pathway=UNKNOWN", "page=-1"]) await expect(listSavedDealLibrary(actor, new URLSearchParams(query))).rejects.toMatchObject({ status: 400 });
  });
  it("searches scoped, paginated summaries with category counts", async () => {
    mocks.findMany.mockResolvedValue([{ id: draft.id }]); mocks.count.mockResolvedValue(80); mocks.groupBy.mockResolvedValue([{ status: "SOLD", _count: { _all: 80 } }]);
    const result = await listSavedDealLibrary(actor, new URLSearchParams("search=Buyer&status=SOLD&pathway=bhph&page=2"));
    expect(result).toMatchObject({ total: 80, page: 2, pages: 4, counts: { SOLD: 80 } });
    expect(mocks.findMany.mock.calls[0][0]).toMatchObject({ skip: 25, take: 25, where: { organizationId: "test-org", ownerUserId: actor.id, pathway: "bhph", status: "SOLD", OR: expect.any(Array) } });
    expect(mocks.groupBy.mock.calls[0][0].where.status).toBeUndefined();
    expect(mocks.findMany.mock.calls[0][0].select.snapshot).toBeUndefined();
  });
});
