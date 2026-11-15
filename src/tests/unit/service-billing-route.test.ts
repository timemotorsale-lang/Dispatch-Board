import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ execute: vi.fn(), read: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: async () => ({ id: "operator" }) }));
vi.mock("@/server/service-billing/service", () => ({ executeServiceBilling: mocks.execute, getServiceBilling: mocks.read }));
import { POST } from "@/app/api/repair-orders/[id]/billing/route";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
beforeEach(() => vi.clearAllMocks());
const request = () => new Request("http://local/api/repair-orders/ro/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "PAYMENT" }) });
const context = { params: Promise.resolve({ id: "ro" }) };
describe("billing outcome and retry boundary", () => {
  it("keeps an uncertain database outcome retryable rather than treating it as a rejected payment", async () => {
    const error = new Error("Connection dropped"); error.name = "PrismaClientUnknownRequestError";
    mocks.execute.mockRejectedValue(error);
    const response = await POST(request(), context);
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("unchanged request");
  });
  it("distinguishes a known version conflict from an uncertain database outcome", async () => {
    mocks.execute.mockRejectedValue(new EnterpriseCommandConflictError("Reload invoice version", "VERSION_CONFLICT"));
    expect((await POST(request(), context)).status).toBe(409);
  });
  it("returns a rejected domain request without implying money was moved", async () => {
    mocks.execute.mockRejectedValue(new Error("Payment exceeds the open balance"));
    expect((await POST(request(), context)).status).toBe(400);
  });
  it.each([["23505", 409], ["23514", 400], ["23503", 409]])("returns an actionable rejection for rolled-back raw SQL %s", async (sqlCode, status) => {
    const error = Object.assign(new Error("private database constraint details"), { name: "PrismaClientKnownRequestError", code: "P2010", meta: { code: sqlCode } });
    mocks.execute.mockRejectedValue(error);
    const response = await POST(request(), context);
    expect(response.status).toBe(status);
    const body = await response.json();
    expect(body.error).not.toMatch(/private|uncertain|unchanged request/);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("keeps unclassified raw SQL failures uncertain", async () => {
    mocks.execute.mockRejectedValue(Object.assign(new Error("private details"), { name: "PrismaClientKnownRequestError", code: "P2010", meta: { code: "08006" } }));
    const response = await POST(request(), context);
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("unchanged request");
  });
  it("never caches successful financial receipts", async () => {
    mocks.execute.mockResolvedValue({ duplicate: true, result: { entryId: "original" } });
    const response = await POST(request(), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
