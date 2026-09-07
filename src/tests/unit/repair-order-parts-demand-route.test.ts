import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cancel: vi.fn(),
  user: vi.fn(),
}));

vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/server/parts-ledger/service", () => ({ cancelRepairPartDemand: mocks.cancel }));

import { DELETE } from "@/app/api/repair-orders/[id]/parts/[demandId]/route";

describe("repair order part demand route", () => {
  it("cancels the selected demand for the selected repair order", async () => {
    mocks.user.mockResolvedValue({ id: "user-1" });
    mocks.cancel.mockResolvedValue({ result: { id: "demand-2", status: "CANCELLED" } });

    const response = await DELETE(
      new Request("http://localhost/api/repair-orders/ro-1/parts/demand-2", {
        method: "DELETE",
        body: JSON.stringify({ idempotencyKey: "cancel-1", reason: "Cancel duplicate demand." }),
      }),
      { params: Promise.resolve({ demandId: "demand-2", id: "ro-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.cancel).toHaveBeenCalledWith(
      { id: "user-1" },
      "ro-1",
      "demand-2",
      { idempotencyKey: "cancel-1", reason: "Cancel duplicate demand." },
      { enforceRollout: false },
    );
  });
});
