import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn(), findMany: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { dealDeskDraft: mocks, $transaction: (run: (db: unknown) => unknown) => run({ dealDeskDraft: mocks }) } }));
vi.mock("@/server/document-library/storage-config", () => ({ resolveDocumentStorageRuntimeFromEnv: () => ({ organizationId: "test-org" }) }));
import { listDealDrafts, readDealDeskDraft, saveDealDeskDraft, sanitizeDealDraftSnapshot } from "@/server/sales-documents/deal-drafts";

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
});
