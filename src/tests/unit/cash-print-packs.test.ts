import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
const m = vi.hoisted(() => ({ find: vi.fn(), list: vi.fn(), create: vi.fn(), update: vi.fn(), upsert: vi.fn(), count: vi.fn(), audit: vi.fn(), lock: vi.fn(), transaction: vi.fn(), policy: null as Record<string, unknown> | null, record: null as Record<string, unknown> | null }));
vi.mock("@/server/db/client", () => ({ prisma: { $transaction: m.transaction, documentLibraryPacketTemplate: { findFirst: m.find, findMany: m.list } } }));
vi.mock("@/server/deal-continuity/identities", () => ({ dealOrganization: () => "company-a" }));
vi.mock("@/server/crm-next/access", () => ({ resolveCrmNextAccess: () => ({ allowed: true }) }));
vi.mock("@/server/policies/unified-crm-customer-read", () => ({ requireUnifiedCrmCustomerReadPolicy: () => ({ kind: "OWNER" }) }));
vi.mock("@/server/policies/access", () => ({ isManager: (actor: AuthenticatedUser) => actor.roles.includes("Manager") }));
import { changeCashPrintPack, listCashPrintPacks, setCashPrintPackPolicy } from "@/server/sales-documents/cash-print-packs";
import { cashPrintPackIds, validateCashPrintPack } from "@/lib/cash-sale-print-library";
import { EMPTY_CASH_SALE } from "@/lib/cash-retail-sale";
const staff: AuthenticatedUser = { id: "staff", name: "Staff", email: "staff@example.test", isActive: true, roles: ["Salesperson"], duties: { all: [], direct: [], roleDefaults: [] } };
const manager = { ...staff, roles: ["Manager"] };
const id = "11111111-1111-4111-8111-111111111111", updatedAt = new Date("2026-11-05T12:00:00.000Z");
const data = { id, label: "Delivery copy", detail: "Team copy", ids: ["we-owe", "delivery-documents"] };
const record = { id: "db-pack", organizationId: "company-a", templateKey: `cash-print:${id}`, workflow: "CRM_NEXT_CASH_PRINT_SELECTION", packetType: "MINNESOTA_RETAIL_SALE_PRINT_SELECTION", status: "ACTIVE", title: data.label, requirements: { label: data.label, detail: data.detail, ids: data.ids }, createdByUserId: "other-staff", updatedAt };
const database = { $executeRaw: m.lock, documentLibraryPacketTemplate: { findFirst: m.find, findMany: m.list, create: m.create, update: m.update, upsert: m.upsert, count: m.count }, documentLibraryAuditEvent: { create: m.audit } };
describe("shared cash print packs", () => {
  beforeEach(() => {
    vi.resetAllMocks(); m.policy = null; m.record = null;
    m.transaction.mockImplementation(async (fn: (db: typeof database) => Promise<unknown>) => fn(database));
    m.find.mockImplementation(async ({ where }: { where: { templateKey: string } }) => where.templateKey === "cash-print-policy" ? m.policy : m.record);
    m.list.mockResolvedValue([record]); m.count.mockResolvedValue(0);
    m.create.mockImplementation(async ({ data: input }: { data: Record<string, unknown> }) => ({ ...record, ...input }));
    m.update.mockImplementation(async ({ data: input }: { data: Record<string, unknown> }) => ({ ...record, ...input }));
    m.upsert.mockResolvedValue({ ...record, updatedAt });
  });
  it("defaults to team editing and scopes reusable templates to this company and workflow", async () => {
    const result = await listCashPrintPacks(staff);
    expect(result.policy).toMatchObject({ staffCanEdit: true, canEdit: true, canManage: false });
    expect(result.packs[0]).toMatchObject({ id, canEdit: true });
    expect(m.list.mock.calls[0][0].where).toEqual({ organizationId: "company-a", workflow: record.workflow, packetType: record.packetType, status: "ACTIVE" });
  });
  it("allows staff to update another staff member's pack and records the actor", async () => {
    m.record = record;
    await changeCashPrintPack(staff, "UPDATE", { ...data, updatedAt: updatedAt.toISOString(), label: "Updated team copy" });
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ title: "Updated team copy", updatedByUserId: staff.id }) }));
    expect(m.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ actorUserId: staff.id, action: "CASH_PRINT_PACK_UPDATE" }) }));
    expect(m.lock).toHaveBeenCalled();
  });
  it("enforces manager restrictions on create, update and archive at the server", async () => {
    m.policy = { requirements: { staffCanEdit: false }, updatedAt }; m.record = record;
    for (const action of ["CREATE", "UPDATE", "ARCHIVE"] as const) await expect(changeCashPrintPack(staff, action, { ...data, updatedAt: updatedAt.toISOString() })).rejects.toMatchObject({ status: 403 });
    expect(m.create).not.toHaveBeenCalled(); expect(m.update).not.toHaveBeenCalled();
    expect((await listCashPrintPacks(staff)).packs[0].canEdit).toBe(false);
    await expect(changeCashPrintPack(manager, "UPDATE", { ...data, updatedAt: updatedAt.toISOString() })).resolves.toHaveProperty("pack");
  });
  it("only lets managers change the team policy and detects stale policy edits", async () => {
    await expect(setCashPrintPackPolicy(staff, { staffCanEdit: false, updatedAt: null })).rejects.toMatchObject({ status: 403 });
    await expect(setCashPrintPackPolicy(manager, { staffCanEdit: false, updatedAt: null })).resolves.toMatchObject({ policy: { staffCanEdit: false, canEdit: true } });
    m.policy = { requirements: { staffCanEdit: false }, updatedAt };
    await expect(setCashPrintPackPolicy(manager, { staffCanEdit: true, updatedAt: null })).rejects.toMatchObject({ status: 409 });
  });
  it("makes a repeated create idempotent while preserving one audit entry", async () => {
    const result = await changeCashPrintPack(staff, "CREATE", data);
    expect(result.pack?.ids).toEqual(data.ids);
    m.record = { ...record, createdByUserId: staff.id };
    await changeCashPrintPack(staff, "CREATE", data);
    expect(m.create).toHaveBeenCalledTimes(1); expect(m.audit).toHaveBeenCalledTimes(1);
  });
  it("rejects stale edits, missing packs, inactive actors and invalid forms", async () => {
    m.record = record;
    await expect(changeCashPrintPack(staff, "UPDATE", { ...data, updatedAt: "older" })).rejects.toMatchObject({ status: 409 });
    m.record = null;
    await expect(changeCashPrintPack(staff, "ARCHIVE", data)).rejects.toMatchObject({ status: 404 });
    await expect(listCashPrintPacks({ ...staff, isActive: false })).rejects.toMatchObject({ status: 401 });
    await expect(changeCashPrintPack(staff, "CREATE", { ...data, ids: ["not-a-form"] })).rejects.toMatchObject({ status: 400 });
    expect(() => validateCashPrintPack({ ...data, ids: [] })).toThrow();
  });
  it("archives packs instead of deleting their history or existing documents", async () => {
    m.record = record;
    expect(await changeCashPrintPack(staff, "ARCHIVE", { ...data, updatedAt: updatedAt.toISOString() })).toEqual({ pack: null });
    expect(m.update.mock.calls[0][0].data.status).toBe("ARCHIVED");
  });
  it("combines custom packs without duplicate forms and skips unavailable conditional forms", () => {
    const pack = { ...data, ids: ["we-owe", "we-owe", "trade-documents", "as-is-acknowledgment", "arbitration-agreement"] };
    expect(cashPrintPackIds([id], EMPTY_CASH_SALE, [pack])).toEqual(["we-owe", "arbitration-agreement"]);
    expect(cashPrintPackIds([id], { ...EMPTY_CASH_SALE, warrantyType: "No dealer warranty - eligibility reviewed", tradeVin: "1NXBR32E85Z123456" }, [pack])).toHaveLength(4);
  });
});
