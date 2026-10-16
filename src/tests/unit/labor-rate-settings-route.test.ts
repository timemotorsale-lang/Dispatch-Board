import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), get: vi.fn(), change: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/server/services/labor-rate-settings", () => ({ getLaborRateSettings: mocks.get, changeLaborRateSettings: mocks.change }));
import { GET, POST } from "@/app/api/settings/labor-rate/route";

describe("Protected labor-rate settings endpoint", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue({ id: "manager" }); });
  it("returns private non-cacheable administrator settings", async () => {
    mocks.get.mockResolvedValue({ active: { laborRate: 125 }, policies: [] });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect((await response.json()).active.laborRate).toBe(125);
  });
  it("preserves authentication and manager denial statuses", async () => {
    mocks.get.mockRejectedValue(new Error("Authentication required."));
    expect((await GET()).status).toBe(401);
    mocks.change.mockRejectedValue(new Error("Manager access required."));
    expect((await POST(new Request("http://localhost/api/settings/labor-rate", { method: "POST", body: "{}" }))).status).toBe(403);
  });
  it("passes changes to the governed service without accepting a direct database mutation", async () => {
    const body = { action: "CREATE_POLICY_DRAFT", laborRateCents: 13500, idempotencyKey: "review-key", reason: "Reviewed increase" };
    mocks.change.mockResolvedValue({ result: { id: "draft-1" } });
    const response = await POST(new Request("http://localhost/api/settings/labor-rate", { method: "POST", body: JSON.stringify(body) }));
    expect(response.status).toBe(200);
    expect(mocks.change).toHaveBeenCalledWith({ id: "manager" }, body);
  });
});
