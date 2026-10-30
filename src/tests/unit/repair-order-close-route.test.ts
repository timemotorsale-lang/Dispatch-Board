import { beforeEach, describe, expect, it, vi } from "vitest";
import { RepairOrderCloseBlockedError, RepairOrderCloseSyncPendingError } from "@/server/repair-order/close-outstanding-work";
const mocks = vi.hoisted(() => ({ close: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: async () => ({ id: "advisor" }) }));
vi.mock("@/server/repair-order/service", () => ({ closeRepairOrderNoFurtherWork: mocks.close, closeDuplicateRepairOrder: vi.fn(), getRepairOrderDetail: vi.fn(), updateRepairOrderControl: vi.fn() }));
import { POST } from "@/app/api/repair-orders/[id]/route";
const context = { params: Promise.resolve({ id: "ro-1" }) };
const request = () => new Request("http://local/api/repair-orders/ro-1", { method: "POST", body: JSON.stringify({ action: "CLOSE_RO", expectedVersion: 4, idempotencyKey: "close", reason: "Vehicle fixed and delivered." }) });
beforeEach(() => vi.clearAllMocks());
describe("one-step RO close route", () => {
  it("accepts the close action and preserves the request key", async () => {
    mocks.close.mockResolvedValue({ result: { version: 5 } });
    expect((await POST(request(), context)).status).toBe(200);
    expect(mocks.close).toHaveBeenCalledWith({ id: "advisor" }, "ro-1", expect.objectContaining({ idempotencyKey: "close", action: "CLOSE_RO" }));
  });
  it("returns a direct link when financial closeout is required", async () => {
    const action = { label: "Open invoice closeout", href: "/prototype/repair-workbench?repairOrderId=ro-1&step=handoff" };
    mocks.close.mockRejectedValue(new RepairOrderCloseBlockedError("Invoice closeout is required.", action, "INVOICE_CLOSEOUT_REQUIRED"));
    const response = await POST(request(), context);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ action, code: "INVOICE_CLOSEOUT_REQUIRED" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it.each([new RepairOrderCloseSyncPendingError(new Error("Offline")), Object.assign(new Error("Connection interrupted"), { name: "PrismaClientUnknownRequestError" })])("keeps an uncertain or partially synchronized close retryable", async error => {
    mocks.close.mockRejectedValue(error);
    const response = await POST(request(), context);
    expect(response.status).toBe(503);
    expect((await response.json()).error).toContain("Retry");
  });
});
