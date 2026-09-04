import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), detail: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/server/repair-order/service", () => ({ getRepairOrderDetail: mocks.detail }));
vi.mock("@/server/db/client", () => ({ prisma: { diagnosticWorkspaceDraft: mocks } }));
import { GET, PUT } from "@/app/api/diagnostics/workspace-drafts/route";
const content = { ro: null, manual: { customer: "Test", vehicle: "Test vehicle", vin: "", concern: "" }, labor: [], parts: [], evidence: [], attempt: null };
const request = (version = 0) => new Request("http://localhost/api/diagnostics/workspace-drafts", { method: "PUT", body: JSON.stringify({ id: "draft-test", version, title: "Test", content }) });
beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue({ id: "user-1" }); mocks.findMany.mockResolvedValue([]); mocks.findFirst.mockResolvedValue(null); });
describe("private diagnostic workspace draft API", () => {
  it("requires authentication", async () => { mocks.user.mockResolvedValue(null); expect((await GET()).status).toBe(401); expect((await PUT(request())).status).toBe(401); });
  it("lists only the current user's drafts", async () => { await GET(); expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user-1" } })); });
  it("saves standalone drafts without creating a repair order", async () => { mocks.create.mockResolvedValue({ version: 1 }); expect((await PUT(request())).status).toBe(200); expect(mocks.detail).not.toHaveBeenCalled(); expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "user-1", content }) })); });
  it("replays an identical save after a lost response", async () => {
    mocks.findFirst.mockResolvedValue({ version: 2, contentHash: createHash("sha256").update(JSON.stringify(content)).digest("hex") });
    expect(await (await PUT(request(1))).json()).toEqual({ version: 2 }); expect(mocks.updateMany).not.toHaveBeenCalled();
  });
  it("rejects stale edits and scopes updates to the owner", async () => {
    mocks.findFirst.mockResolvedValue({ version: 3, contentHash: "different" }); mocks.updateMany.mockResolvedValue({ count: 0 });
    expect((await PUT(request(1))).status).toBe(409);
    expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "draft-test", userId: "user-1", version: 1 } }));
  });
});
