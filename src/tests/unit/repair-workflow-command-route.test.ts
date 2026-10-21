import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
const { detail, execute, actor } = vi.hoisted(() => ({ detail: vi.fn(), execute: vi.fn(), actor: { id: "staff" } }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: async () => actor }));
vi.mock("@/server/repair-order/service", () => ({ getRepairOrderDetail: detail }));
vi.mock("@/server/service-close-parts/service", () => ({ executeServiceClosePartsCommand: execute }));
import { POST } from "@/app/api/repair-workflow/[id]/commands/route";
const request = (body: unknown) => new Request("http://localhost/api/repair-workflow/selected/commands", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const context = { params: Promise.resolve({ id: "selected" }) };
beforeEach(() => { vi.resetAllMocks(); detail.mockResolvedValue({ id: "selected" }); execute.mockResolvedValue({ ok: true }); });
describe("scoped review closeout commands", () => {
  it.each(["GENERATE_INVOICE_PACKAGE", "CLOSE_REPAIR_ORDER"])("enforces scoped access and rollout for %s", async action => {
    const response = await POST(request({ action, subjectId: "other", idempotencyKey: "stable" }), context);
    expect(response.status).toBe(200);
    expect(detail).toHaveBeenCalledWith(actor, "selected");
    expect(execute).toHaveBeenCalledWith(actor, { action, subjectId: "selected", idempotencyKey: "stable" }, { enforceRollout: true });
  });
  it("does not expose arbitrary enterprise actions", async () => {
    expect((await POST(request({ action: "REOPEN_REPAIR_ORDER" }), context)).status).toBe(400);
    expect(execute).not.toHaveBeenCalled();
  });
  it("refuses denied RO access before executing anything", async () => {
    detail.mockRejectedValue(new Error("Vehicle capability required: REPAIR_ORDER_READ"));
    expect((await POST(request({ action: "CLOSE_REPAIR_ORDER" }), context)).status).toBe(403);
    expect(execute).not.toHaveBeenCalled();
  });
  it("sanitizes database details while retaining actionable guard failures", async () => {
    execute.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("Private failing row", { code: "P2021", clientVersion: "test" }));
    const failure = await POST(request({ action: "CLOSE_REPAIR_ORDER" }), context);
    expect(failure.status).toBe(503); expect(JSON.stringify(await failure.json())).not.toContain("Private");
    execute.mockRejectedValueOnce(new Error("Current delivery readiness is HOLD."));
    expect(await (await POST(request({ action: "CLOSE_REPAIR_ORDER" }), context)).json()).toEqual({ error: "Current delivery readiness is HOLD." });
  });
});
