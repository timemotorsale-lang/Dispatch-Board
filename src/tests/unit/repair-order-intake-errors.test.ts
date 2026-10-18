import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: async () => ({ id: "staff" }) }));
vi.mock("@/server/repair-order/service", () => ({ createRepairOrder: create, listRepairOrders: vi.fn() }));
import { POST } from "@/app/api/repair-orders/route";

describe("intake error presentation", () => {
  it.each(["P2021", "P2022"])("identifies an outdated database without blaming intake details: %s", async code => {
    create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("Private database schema and vehicle details", { code, clientVersion: "test" }));
    const response = await POST(request());
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toContain("pending database migrations");
    expect(body.error).toContain("Do not create another vehicle");
    expect(body.error).not.toContain("Private");
  });
  const request = () => new Request("http://localhost/api/repair-orders", { method: "POST", body: "{}", headers: { "Content-Type": "application/json" } });
  it("does not expose database details or a failing vehicle row to staff", async () => {
    create.mockRejectedValueOnce(new Prisma.PrismaClientUnknownRequestError("ServiceVisit constraint failed; private row: VIN and customer details", { clientVersion: "test" }));
    const response = await POST(request());
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body.error).toContain("Recheck the inventory link");
    expect(body.error).not.toContain("private row");
    expect(body.error).not.toContain("ServiceVisit");
  });

  it.each([["Inventory unit ID is required.", 400], ["Authentication required.", 401], ["Vehicle capability required: REPAIR_ORDER_CREATE", 403]])("retains actionable validation and access errors: %s", async (message, status) => {
    create.mockRejectedValueOnce(new Error(message));
    const response = await POST(request());
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: message });
  });
});
