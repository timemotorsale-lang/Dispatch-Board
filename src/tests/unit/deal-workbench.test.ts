import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { $queryRaw: mocks.query } }));
vi.mock("@/server/document-library/storage-config", () => ({ resolveDocumentStorageRuntimeFromEnv: () => ({ organizationId: "workbench-org" }) }));
import { listDealWorkbench } from "@/server/sales-documents/deal-workbench";
const actor: AuthenticatedUser = { id: "workbench-user", name: "Staff", email: "staff@local.test", isActive: true, roles: ["Sales"], duties: { direct: [], roleDefaults: [], all: [] } };

describe("Deal workbench retrieval", () => {
  beforeEach(() => vi.resetAllMocks());
  it("denies anonymous and non-staff retrieval", async () => {
    await expect(listDealWorkbench(null, new URLSearchParams())).rejects.toMatchObject({ status: 401 });
    await expect(listDealWorkbench({ ...actor, roles: ["Technician"] }, new URLSearchParams())).rejects.toMatchObject({ status: 403 });
    expect(mocks.query).not.toHaveBeenCalled();
  });
  it("returns packet-only transactions without requiring a draft", async () => {
    mocks.query.mockResolvedValueOnce([{ id: "jacket-rental", draftId: null, jacketId: "jacket-rental", updatedAt: new Date("2026-10-03T12:00:00Z"), status: "IN_PROGRESS" }]).mockResolvedValueOnce([{ status: "IN_PROGRESS", count: 1n }]);
    expect(await listDealWorkbench(actor, new URLSearchParams())).toMatchObject({ total: 1, pages: 1, items: [{ draftId: null, jacketId: "jacket-rental", updatedAt: "2026-10-03T12:00:00.000Z" }] });
    const query = mocks.query.mock.calls[0][0];
    expect(query.values).toContain(actor.id); expect(query.values).toContain("workbench-org");
    expect(query.text).toContain('NOT EXISTS (SELECT 1 FROM drafts');
    expect(query.text).toContain('"snapshot" -> \'jackets\'');
  });
  it("binds search values and paginates in the database", async () => {
    mocks.query.mockResolvedValueOnce([]).mockResolvedValueOnce([{ status: "SOLD", count: 51n }, { status: "LOST", count: 2n }]);
    const result = await listDealWorkbench(actor, new URLSearchParams("status=SOLD&search=%25%27OR%201=1&page=2"));
    expect(result).toMatchObject({ total: 51, pages: 3, page: 2, counts: { SOLD: 51, LOST: 2 } });
    expect(mocks.query.mock.calls[0][0].text).not.toContain("OR 1=1");
    expect(mocks.query.mock.calls[0][0].values).toContain(25);
  });
  it("rejects invalid filters before querying", async () => {
    for (const query of ["status=UNKNOWN", "pathway=UNKNOWN", "page=0"]) await expect(listDealWorkbench(actor, new URLSearchParams(query))).rejects.toMatchObject({ status: 400 });
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
