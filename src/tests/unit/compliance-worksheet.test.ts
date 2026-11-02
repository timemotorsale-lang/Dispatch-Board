import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ records: vi.fn(), period: vi.fn(), history: vi.fn(), staff: vi.fn(), lock: vi.fn() }));
vi.mock("@/server/money-resources/service", () => ({ moneyAccess: async () => ({ organizationId: "sample-org", manager: true }) }));
vi.mock("@/server/db/client", () => ({ prisma: { $transaction: (run: (database: unknown) => unknown) => run({ $executeRaw: mocks.lock, complianceTaxRecord: { findMany: mocks.records }, complianceTaxPeriod: { findUnique: mocks.period }, complianceTaxAudit: { findMany: mocks.history }, user: { findMany: mocks.staff } }) } }));
import { getTaxWorksheet } from "@/server/compliance/service";

describe("tax worksheet readable staff history", () => {
  it("resolves names only for the authorized period's audit actors and hides missing-name IDs", async () => {
    mocks.records.mockResolvedValue([]);
    mocks.period.mockResolvedValue(null);
    mocks.history.mockResolvedValue([{ id: "event-1", actorId: "staff-1" }, { id: "event-2", actorId: "missing-staff" }]);
    mocks.staff.mockResolvedValue([{ id: "staff-1", name: "Sample Manager" }]);
    const worksheet = await getTaxWorksheet(null, "2026-10");
    expect(mocks.history.mock.calls[0][0].where).toEqual({ organizationId: "sample-org", month: "2026-10" });
    expect(mocks.staff.mock.calls[0][0]).toEqual({ where: { id: { in: ["staff-1", "missing-staff"] } }, select: { id: true, name: true } });
    expect(worksheet.history.map(event => event.actorName)).toEqual(["Sample Manager", "Staff member"]);
    expect(worksheet.summary).toMatchObject({ saleCount: 0, leaseCount: 0, taxableLeaseCents: 0 });
  });
});
