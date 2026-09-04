import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), ro: vi.fn(), bridge: vi.fn(), workspace: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/server/repair-order/service", () => ({ getRepairOrderDetail: mocks.ro }));
vi.mock("@/server/diagnostics/service", () => ({ getRepairOrderDiagnosticsBridge: mocks.bridge, getDiagnosticCaseWorkspace: mocks.workspace }));
import { GET } from "@/app/api/repair-orders/[id]/diagnostic-workspace/route";
beforeEach(() => { vi.resetAllMocks(); mocks.user.mockResolvedValue({ id: "user-1" }); mocks.ro.mockResolvedValue({ id: "ro-1" }); mocks.bridge.mockResolvedValue({ state: "COMPLETE", cases: [{ id: "case-1", concern: "Brakes", status: "OPEN", version: 1 }] }); mocks.workspace.mockResolvedValue({ permissions: { canRecordEvidence: false }, diagnosticCase: { id: "case-1" } }); });
const context = { params: Promise.resolve({ id: "ro-1" }) };
describe("RO-scoped evidence workspace", () => {
  it("checks RO access and uses the permission-filtered case workspace", async () => {
    const res = await GET(new Request("http://localhost/diagnostic-workspace"), context);
    expect(res.status).toBe(200); expect(mocks.ro).toHaveBeenCalledWith({ id: "user-1" }, "ro-1");
    expect(mocks.workspace).toHaveBeenCalledWith({ id: "user-1" }, "case-1");
    expect((await res.json()).workspace.permissions.canRecordEvidence).toBe(false);
    expect(res.headers.get("cache-control")).toContain("no-store");
  });
  it("rejects a case selected from a different repair order", async () => {
    expect((await GET(new Request("http://localhost/diagnostic-workspace?caseId=other-case"), context)).status).toBe(404);
    expect(mocks.workspace).not.toHaveBeenCalled();
  });
  it("does not load case evidence when access to the RO fails", async () => {
    mocks.ro.mockRejectedValue(new Error("Authentication required."));
    expect((await GET(new Request("http://localhost/diagnostic-workspace"), context)).status).toBe(401);
    expect(mocks.bridge).not.toHaveBeenCalled(); expect(mocks.workspace).not.toHaveBeenCalled();
  });
  it("distinguishes restricted records from missing cases", async () => {
    mocks.bridge.mockResolvedValue({ state: "RESTRICTED", cases: [] });
    const body = await (await GET(new Request("http://localhost/diagnostic-workspace"), context)).json();
    expect(body.state).toBe("RESTRICTED"); expect(body.workspace).toBe(null);
  });
});
