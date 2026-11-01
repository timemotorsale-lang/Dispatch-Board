import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "@/server/auth/store";
const mocks = vi.hoisted(() => ({ query: vi.fn(), jackets: vi.fn(), tasks: vi.fn(), bookings: vi.fn(), access: vi.fn(), taxes: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { $queryRaw: mocks.query, salesDocumentJacket: { findMany: mocks.jackets }, task: { findMany: mocks.tasks }, vehicleUseBooking: { findMany: mocks.bookings }, complianceTaxRecord: { findMany: mocks.taxes } } }));
vi.mock("@/server/compliance/service", () => ({ complianceAccess: mocks.access }));
import { buildDealDashboard } from "@/server/sales-documents/dashboard";
import { resolveDocumentStorageRuntimeFromEnv } from "@/server/document-library/storage-config";
const actor = { id: "staff-1", name: "Staff", isActive: true } as AuthenticatedUser;
const row = (id: string, status = "IN_PROGRESS") => ({ id, draftId: id, draftRevision: 1, jacketId: null, customerId: "customer-1", ownerId: actor.id, ownerName: actor.name, customerName: "Buyer", pathway: "retail-sale", status, packetState: null, createdAt: new Date("2026-10-01"), updatedAt: new Date("2026-11-01"), statusHistory: [] });
describe("scoped deal dashboard", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.query.mockResolvedValue([]); mocks.jackets.mockResolvedValue([]); mocks.tasks.mockResolvedValue([]); mocks.bookings.mockResolvedValue([]); mocks.access.mockRejectedValue({ status: 403 }); });
  it("does not use the last edit as a completion date and keeps undated records out of period totals", async () => {
    mocks.query.mockResolvedValue([{ ...row("sold", "SOLD"), packetState: "CLOSED", statusHistory: [{ to: "SOLD", at: "2026-10-31T18:00:00Z" }] }, row("old", "COMPLETED"), { ...row("rental", "COMPLETED"), pathway: "daily-rental", statusHistory: [{ to: "COMPLETED", at: "2026-10-31T18:00:00Z" }] }]);
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
  it("counts the sale immediately but keeps paperwork pending until its packet is finalized", async () => {
    mocks.query.mockResolvedValue([{ ...row("sold-pending", "SOLD"), statusHistory: [{ to: "SOLD", at: "2026-10-31T18:00:00Z" }] }]);
    const pending = await buildDealDashboard(actor, Prisma.sql`SELECT 1`, new URLSearchParams("date=2026-10-31&period=day&bucket=paperwork"));
    expect(pending.items[0]).toMatchObject({ stage: "Sold · paperwork pending", needsAttention: true, nextAction: "Start paperwork checklist" });
    expect(pending.dashboard.summary).toMatchObject({ sold: 1, completed: 0, paperwork: 1 });
    mocks.query.mockResolvedValue([{ ...row("sold-pending", "SOLD"), packetState: "CLOSED", statusHistory: [{ to: "SOLD", at: "2026-10-31T18:00:00Z" }] }]);
    const complete = await buildDealDashboard(actor, Prisma.sql`SELECT 1`, new URLSearchParams("date=2026-10-31&period=day"));
    expect(complete.dashboard.summary).toMatchObject({ sold: 1, completed: 1, paperwork: 0 });
  });
  it("keeps reminders on the exact deal when the same customer has two deals", async () => {
    mocks.query.mockResolvedValue([row("deal-a"), row("deal-b")]);
    mocks.tasks.mockResolvedValue([{ id: "task-a", assignedUserId: actor.id, title: "Only deal A follow-up", dueAt: new Date("2026-10-01"), templateSnapshot: { dealDashboard: { version: 1, organizationId: resolveDocumentStorageRuntimeFromEnv().organizationId, draftId: "deal-a", jacketId: null } } }]);
    const result = await buildDealDashboard(actor, Prisma.sql`SELECT 1`, new URLSearchParams("bucket=overdue"));
    expect(result.items.map(item => item.id)).toEqual(["deal-a"]);
    expect(result.items[0].nextAction).toBe("Only deal A follow-up");
  });
  it("surfaces overdue vehicle returns and does not treat them as overdue reminders", async () => {
    mocks.query.mockResolvedValue([{ ...row("rental"), pathway: "daily-rental", jacketId: "rental-packet", packetState: "CHECKED_OUT" }]);
    mocks.bookings.mockResolvedValue([{ contextId: "rental", agreementJacketId: "rental-packet", expectedReturnAt: new Date("2026-01-01") }]);
    const returns = await buildDealDashboard(actor, Prisma.sql`SELECT 1`, new URLSearchParams("bucket=returns"));
    expect(returns.items[0]).toMatchObject({ nextAction: "Record vehicle return", indicators: { overdue: false, alerts: expect.arrayContaining(["Vehicle return due"]) } });
    expect((await buildDealDashboard(actor, Prisma.sql`SELECT 1`, new URLSearchParams("bucket=overdue"))).total).toBe(0);
  });
  it("rejects team scope for staff and shows no-follow-up work explicitly", async () => {
    await expect(buildDealDashboard(actor, Prisma.sql`SELECT 1`, new URLSearchParams("workspace=TEAM"))).rejects.toMatchObject({ status: 403 });
    mocks.query.mockResolvedValue([row("unattended")]);
    expect((await buildDealDashboard(actor, Prisma.sql`SELECT 1`, new URLSearchParams("bucket=unattended"))).items[0].indicators?.unattended).toBe(true);
  });
  it("keeps expired insurance actionable after the paperwork is completed", async () => {
    mocks.query.mockResolvedValue([{ ...row("completed-lease", "SOLD"), pathway: "lease-to-own", packetState: "CLOSED", insuranceExpirationDate: "2025-01-01" }]);
    const result = await buildDealDashboard(actor, Prisma.sql`SELECT 1`, new URLSearchParams("bucket=attention"));
    expect(result.items[0]).toMatchObject({ stage: "Completed", needsAttention: true, indicators: { alerts: expect.arrayContaining(["Recorded insurance expired 2025-01-01 · verify coverage"]) } });
  });
  it("preserves verified financial activity after a deal is archived", async () => {
    mocks.query.mockResolvedValue([{ ...row("archived-money", "ARCHIVED"), jacketId: "packet-money" }]);
    mocks.jackets.mockResolvedValue([{ id: "packet-money", requirements: [], versions: [], packet: { documents: [], auditEvents: [{ id: "payment", action: "DEAL_FINANCIAL_RECORDED", occurredAt: new Date("2026-10-31T18:00:00Z"), metadata: { kind: "PAYMENT", amountCents: 50000, businessDate: "2026-10-31", reference: "BANK-ARCHIVED" } }] } }]);
    const manager = { ...actor, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
    const result = await buildDealDashboard(manager, Prisma.sql`SELECT 1`, new URLSearchParams("status=CURRENT&date=2026-10-31&period=day"));
    expect(result.items).toHaveLength(0);
    expect(result.dashboard.financials).toMatchObject({ recordedDeals: 1, paymentsCents: 50000, netCents: 50000 });
  });
});
