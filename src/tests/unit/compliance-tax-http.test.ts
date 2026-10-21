import { beforeEach, describe, expect, it, vi } from "vitest";
import { MoneyError } from "@/lib/money-resources";

const mocks = vi.hoisted(() => ({ actor: vi.fn(), worksheet: vi.fn(), search: vi.fn(), command: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.actor }));
vi.mock("@/server/compliance/service", () => ({ getTaxWorksheet: mocks.worksheet, searchTaxLinks: mocks.search, taxCommand: mocks.command }));
import { GET, POST } from "@/app/api/compliance/tax/route";

describe("tax endpoint boundaries", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.actor.mockResolvedValue({ id: "manager", isActive: true }); mocks.command.mockResolvedValue({ id: "saved" }); });
  it("does not disclose internal database errors", async () => {
    mocks.worksheet.mockRejectedValue(new Error("secret connection credentials"));
    const response = await GET(new Request("http://localhost/api/compliance/tax?month=2026-09"));
    expect(response.status).toBe(503); expect(await response.text()).not.toContain("secret"); expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("preserves permission status and routes canonical searches through authorization", async () => {
    mocks.worksheet.mockRejectedValue(new MoneyError("An authorized manager is required.", 403));
    expect((await GET(new Request("http://localhost/api/compliance/tax?month=2026-09"))).status).toBe(403);
    mocks.search.mockResolvedValue({ customers: [], vehicles: [] });
    expect((await GET(new Request("http://localhost/api/compliance/tax?search=Review"))).status).toBe(200);
    expect(mocks.search).toHaveBeenCalledWith({ id: "manager", isActive: true }, "Review");
  });
  it("rejects cross-site mutations, malformed JSON and oversized requests", async () => {
    expect((await POST(new Request("http://localhost/api/compliance/tax", { method: "POST", headers: { origin: "https://attacker.example" }, body: "{}" }))).status).toBe(403);
    expect((await POST(new Request("http://localhost/api/compliance/tax", { method: "POST", body: "not json" }))).status).toBe(400);
    expect((await POST(new Request("http://localhost/api/compliance/tax", { method: "POST", body: "x".repeat(30001) }))).status).toBe(413);
    expect(mocks.command).not.toHaveBeenCalled();
  });
  it("requires an active session before any write", async () => {
    mocks.actor.mockResolvedValue(null);
    expect((await POST(new Request("http://localhost/api/compliance/tax", { method: "POST", body: "{}" }))).status).toBe(401);
    expect(mocks.command).not.toHaveBeenCalled();
  });
});
