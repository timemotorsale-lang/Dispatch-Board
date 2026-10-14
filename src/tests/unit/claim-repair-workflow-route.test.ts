import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClaimWorkflowError } from "@/lib/claim-repair-workflow";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
const mocks = vi.hoisted(() => ({ user: vi.fn(), get: vi.fn(), execute: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/server/claims-workspace/repair-workflow-service", () => ({ getClaimRepairWorkflow: mocks.get, executeClaimRepairWorkflow: mocks.execute }));
import { GET, POST } from "@/app/api/claims-workspace/claims/[claimId]/workflow/route";
const context = { params: Promise.resolve({ claimId: "claim-review" }) };
describe("claim repair workflow routes", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue({ id: "manager" }); mocks.get.mockResolvedValue({ version: 1 }); });
  it("returns uncached workflow data for the requested claim", async () => {
    const response = await GET(new Request("http://local/workflow"), context);
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.get).toHaveBeenCalledWith({ id: "manager" }, "claim-review");
  });
  it.each([401, 403, 404, 409])("preserves explicit access and conflict status %s", async (status) => {
    mocks.get.mockRejectedValue(new ClaimWorkflowError("Explicit workflow failure", status));
    const response = await GET(new Request("http://local/workflow"), context);
    expect(response.status).toBe(status);
  });
  it("records a scoped command and returns the refreshed model", async () => {
    const body = { action: "CHECKPOINT", expectedVersion: 1, reason: "Reviewed teardown findings." };
    const response = await POST(new Request("http://local/workflow", { method: "POST", body: JSON.stringify(body) }), context);
    expect(response.status).toBe(200); expect(mocks.execute).toHaveBeenCalledWith({ id: "manager" }, "claim-review", body);
  });
  it("rejects malformed requests without a write", async () => {
    const response = await POST(new Request("http://local/workflow", { method: "POST", body: "[]" }), context);
    expect(response.status).toBe(400); expect(mocks.execute).not.toHaveBeenCalled();
  });
  it("returns a conflict for a stale aggregate version", async () => {
    mocks.execute.mockRejectedValue(new EnterpriseCommandConflictError("Refresh required.", "VERSION_CONFLICT"));
    expect((await POST(new Request("http://local/workflow", { method: "POST", body: "{}" }), context)).status).toBe(409);
  });
  it("redacts internal database errors", async () => {
    mocks.get.mockRejectedValue(new Error("postgresql://secret-password"));
    const response = await GET(new Request("http://local/workflow"), context);
    expect(response.status).toBe(503); expect(JSON.stringify(await response.json())).not.toContain("secret-password");
  });
});
