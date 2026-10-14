import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), findMany: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/server/db/client", () => ({ prisma: { workdayWorkbook: { findMany: mocks.findMany } } }));
import { GET } from "@/app/api/coo-workbook/history/route";
describe("workbook history", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue({ id: "staff-1" }); mocks.findMany.mockResolvedValue([]); });
  it("loads only the signed-in user's requested workbook scope for the prior four weeks", async () => {
    const response = await GET(new Request("http://localhost/api/coo-workbook/history?before=2026-09-04&scope=STAFF"));
    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "staff-1", scope: "STAFF", boardDay: { date: { gte: new Date("2026-08-07T00:00:00.000Z"), lt: new Date("2026-09-04T00:00:00.000Z") } } } }));
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });
  it("requires authentication and rejects invalid dates", async () => {
    expect((await GET(new Request("http://localhost/api/coo-workbook/history?before=bad"))).status).toBe(400);
    mocks.user.mockResolvedValue(null);
    expect((await GET(new Request("http://localhost/api/coo-workbook/history?before=2026-09-04"))).status).toBe(401);
  });
});
