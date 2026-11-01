import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "@/server/auth/store";
const mocks = vi.hoisted(() => ({ query: vi.fn(), jackets: vi.fn(), tasks: vi.fn(), access: vi.fn(), taxes: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { $queryRaw: mocks.query, salesDocumentJacket: { findMany: mocks.jackets }, task: { findMany: mocks.tasks }, complianceTaxRecord: { findMany: mocks.taxes } } }));
vi.mock("@/server/compliance/service", () => ({ complianceAccess: mocks.access }));
import { buildDealDashboard } from "@/server/sales-documents/dashboard";
const actor = { id: "staff-1", name: "Staff", isActive: true } as AuthenticatedUser;
const row = (id: string, status = "IN_PROGRESS") => ({ id, draftId: id, draftRevision: 1, jacketId: null, customerId: "customer-1", ownerId: actor.id, ownerName: actor.name, customerName: "Buyer", pathway: "retail-sale", status, packetState: null, createdAt: new Date("2026-10-01"), updatedAt: new Date("2026-11-01"), statusHistory: [] });
describe("scoped deal dashboard", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.query.mockResolvedValue([]); mocks.jackets.mockResolvedValue([]); mocks.tasks.mockResolvedValue([]); mocks.access.mockRejectedValue({ status: 403 }); });
  it("does not use the last edit as a completion date and keeps undated records out of period totals", async () => {
    mocks.query.mockResolvedValue([{ ...row("sold", "SOLD"), statusHistory: [{ to: "SOLD", at: "2026-10-31T18:00:00Z" }] }, row("old", "SOLD"), { ...row("rental", "COMPLETED"), pathway: "daily-rental", statusHistory: [{ to: "COMPLETED", at: "2026-10-31T18:00:00Z" }] }]);
    const result = await buildDealDashboard(actor, Prisma.sql`SELECT 1`, new URLSearchParams("date=2026-10-31&period=day&bucket=completed"));
    expect(result.total).toBe(2);
    expect(result.dashboard.summary.groups.find(group => group.key === "SALES")?.completed).toBe(1);
    expect(result.dashboard.summary.undatedCompleted).toBe(1);
    expect(result.dashboard.taxes.available).toBe(false);
    expect(mocks.taxes).not.toHaveBeenCalled();
  });
  it("keeps the first closed date when an addendum is finalized later", async () => {
    mocks.query.mockResolvedValue([{ ...row("closed"), jacketId: "packet-1", packetState: "CLOSED" }]);
    mocks.jackets.mockResolvedValue([{ id: "packet-1", requirements: [], packet: { documents: [] }, versions: [{ disposition: "CLOSED", finalizedAt: new Date("2026-11-15") }, { disposition: "CLOSED", finalizedAt: new Date("2026-10-15T18:00:00Z") }] }]);
    const result = await buildDealDashboard(actor, Prisma.sql`SELECT 1`, new URLSearchParams("date=2026-10-31&period=month&bucket=completed"));
    expect(result.items[0].completedDate).toBe("2026-10-15");
  });
  it("does not double-count a shared packet but preserves archived drafts in the archive view", async () => {
    mocks.query.mockResolvedValue([{ ...row("active"), jacketId: "packet-1" }, { ...row("archived", "ARCHIVED"), jacketId: "packet-1" }]);
    const current = await buildDealDashboard(actor, Prisma.sql`SELECT 1`, new URLSearchParams("status=CURRENT"));
    expect(current.items.map(item => item.id)).toEqual(["active"]);
    expect(current.counts.ARCHIVED).toBe(1);
    const archived = await buildDealDashboard(actor, Prisma.sql`SELECT 1`, new URLSearchParams("status=ARCHIVED"));
    expect(archived.items.map(item => item.id)).toEqual(["archived"]);
  });
  it("applies group filters without broadening access to other employees' follow-ups", async () => {
    mocks.query.mockResolvedValue([row("sale"), { ...row("lease"), pathway: "lease-to-own" }]);
    const result = await buildDealDashboard(actor, Prisma.sql`SELECT 1`, new URLSearchParams("group=LEASING"));
    expect(result.items.map(item => item.id)).toEqual(["lease"]);
    expect(mocks.tasks.mock.calls[0][0].where.assignedUserId).toBe(actor.id);
    await expect(buildDealDashboard(actor, Prisma.sql`SELECT 1`, new URLSearchParams("group=__proto__"))).rejects.toMatchObject({ status: 400 });
  });
  it("uses the packet's required-document blockers rather than blocking on optional forms", async () => {
    mocks.query.mockResolvedValue([{ ...row("ready"), jacketId: "packet-1" }]);
    mocks.jackets.mockResolvedValue([{ id: "packet-1", requirements: [{ id: "optional", phase: "CLOSING", required: false, signed: false, label: "Optional form" }], versions: [], packet: { documents: [] } }]);
    const result = await buildDealDashboard(actor, Prisma.sql`SELECT 1`, new URLSearchParams("bucket=ready"));
    expect(result.items[0].stage).toBe("Ready to finalize");
    expect(result.dashboard.summary.ready).toBe(1);
  });
  it("counts a dated vehicle sale while keeping funding-pending work open", async () => {
    mocks.query.mockResolvedValue([{ ...row("unfunded", "SOLD"), packetState: "DELIVERED_FUNDING_PENDING", statusHistory: [{ to: "SOLD", at: "2026-10-31T18:00:00Z" }] }]);
    const result = await buildDealDashboard(actor, Prisma.sql`SELECT 1`, new URLSearchParams("date=2026-10-31&period=day"));
    expect(result.items[0].stage).toBe("Awaiting funding");
    expect(result.dashboard.summary).toMatchObject({ sold: 1, funding: 1, completed: 0 });
  });
  it("keeps sold history while corrections or unwind reviews remain open work", async () => {
    mocks.query.mockResolvedValue([{ ...row("review", "PENDING"), packetState: "UNWIND_PENDING", statusHistory: [{ to: "SOLD", at: "2026-11-01T18:00:00Z", effectiveAt: "2026-10-15T18:00:00Z" }] }]);
    const result = await buildDealDashboard(actor, Prisma.sql`SELECT 1`, new URLSearchParams("date=2026-10-31&period=month"));
    expect(result.items[0]).toMatchObject({ stage: "Unwind review pending", soldDate: "2026-10-15", needsAttention: true });
    expect(result.dashboard.summary).toMatchObject({ sold: 1, completed: 0 });
  });
});
