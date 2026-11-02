import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import type { AuthenticatedUser } from "@/server/auth/store";
const mocks = vi.hoisted(() => {
  const db = { dealDeskDraft: { findFirst: vi.fn(), updateMany: vi.fn(), update: vi.fn() }, customer: { findFirst: vi.fn() }, salesDocumentJacket: { findFirst: vi.fn(), updateMany: vi.fn() }, documentLibraryAuditEvent: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() }, task: { findUniqueOrThrow: vi.fn(), update: vi.fn(), findMany: vi.fn() }, user: { findFirst: vi.fn(), findMany: vi.fn() }, $transaction: vi.fn(), $queryRaw: vi.fn() };
  return { db, createTask: vi.fn() };
});
vi.mock("@/server/db/client", () => ({ prisma: mocks.db }));
vi.mock("@/server/document-library/storage-config", () => ({ resolveDocumentStorageRuntimeFromEnv: () => ({ organizationId: "org" }) }));
vi.mock("@/server/services/task-create-service", () => ({ createManualTask: mocks.createTask }));
import { manageDealOperations, readDealOperations } from "@/server/sales-documents/dashboard-operations";
const staff: AuthenticatedUser = { id: "staff", name: "Staff", email: "staff@example.test", isActive: true, roles: ["Salesperson"], duties: { direct: [], roleDefaults: [], all: [] } };
const manager: AuthenticatedUser = { ...staff, id: "manager", name: "Manager", roles: ["General Manager"] };
const draft = { id: "draft-one", organizationId: "org", ownerUserId: "staff", pathway: "lease-to-own", status: "SOLD", revision: 2, customerName: "Buyer", customerId: "customer", vehicleReference: "Toyota", snapshot: { jackets: { "lease-to-own": "jacket-one" } }, statusHistory: [] };
const jacket = { id: "jacket-one", organizationId: "org", packetId: "packet-one", revision: 4, state: "WORKING", pathway: "lease-to-own", customerName: "Buyer" };
const operation = (action = "DEAL_FINANCIAL") => ({ action, draftId: draft.id, jacketId: jacket.id, draftRevision: 2, jacketRevision: 4, operationKey: "operation-12345678", kind: "PAYMENT", amountCents: 50000, businessDate: "2026-01-01", reference: "BANK-1", evidence: "Verified bank statement and receipt", reason: "Recorded payment after statement review", confirmed: true });
describe("deal dashboard operations", () => {
  beforeEach(() => {
    vi.resetAllMocks(); mocks.db.$transaction.mockImplementation(callback => callback(mocks.db));
    mocks.db.$queryRaw.mockImplementation(query => Promise.resolve([{ revision: query.text.includes('"DealDeskDraft"') ? 2 : 4 }]));
    mocks.db.dealDeskDraft.findFirst.mockResolvedValue(draft); mocks.db.salesDocumentJacket.findFirst.mockResolvedValue(jacket);
    mocks.db.dealDeskDraft.updateMany.mockResolvedValue({ count: 1 }); mocks.db.salesDocumentJacket.updateMany.mockResolvedValue({ count: 1 });
    mocks.db.documentLibraryAuditEvent.findMany.mockResolvedValue([]); mocks.db.documentLibraryAuditEvent.findUnique.mockResolvedValue(null);
    mocks.db.documentLibraryAuditEvent.create.mockResolvedValue({ id: "audit" }); mocks.db.task.findMany.mockResolvedValue([]); mocks.db.user.findMany.mockResolvedValue([]);
    mocks.db.user.findFirst.mockResolvedValue({ ...staff, userRoles: [{ role: { name: "Salesperson", roleDuties: [] } }], userDuties: [] });
    mocks.db.customer.findFirst.mockResolvedValue({ id: "customer" });
  });
  it("denies unauthenticated access and staff financial or ownership commands", async () => {
    await expect(manageDealOperations(null, operation())).rejects.toMatchObject({ status: 401 });
    await expect(manageDealOperations(staff, operation())).rejects.toMatchObject({ status: 403 });
    await expect(manageDealOperations(staff, operation("DEAL_REASSIGN"))).rejects.toMatchObject({ status: 403 });
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
  });
  it("records verified entries and a separate idempotency result on the exact packet", async () => {
    await expect(manageDealOperations(manager, operation())).resolves.toEqual({ saved: true });
    expect(mocks.db.documentLibraryAuditEvent.create.mock.calls[0][0].data).toMatchObject({ action: "DEAL_FINANCIAL_RECORDED", packetId: "packet-one", organizationId: "org", metadata: { kind: "PAYMENT", amountCents: 50000, reference: "BANK-1" } });
    expect(mocks.db.documentLibraryAuditEvent.create.mock.calls[1][0].data).toMatchObject({ action: "DEAL_FINANCIAL", metadata: { result: { saved: true } } });
  });
  it("returns a prior operation without incrementing revisions or recording a second payment", async () => {
    const input = operation();
    mocks.db.documentLibraryAuditEvent.findUnique.mockResolvedValue({ actorUserId: manager.id, metadata: { requestHash: createHash("sha256").update(JSON.stringify(input)).digest("hex"), result: { saved: true } } });
    expect(await manageDealOperations(manager, input)).toEqual({ saved: true });
    expect(mocks.db.salesDocumentJacket.updateMany).not.toHaveBeenCalled(); expect(mocks.db.documentLibraryAuditEvent.create).not.toHaveBeenCalled();
  });
  it("rejects stale revisions, missing evidence, over-refunds and duplicate payment references", async () => {
    await expect(manageDealOperations(manager, { ...operation(), jacketRevision: 3 })).rejects.toMatchObject({ status: 409 });
    await expect(manageDealOperations(manager, { ...operation(), confirmed: false })).rejects.toThrow("Confirm");
    const payment = { id: "original", action: "DEAL_FINANCIAL_RECORDED", occurredAt: new Date("2026-01-01"), metadata: { kind: "PAYMENT", amountCents: 50000, businessDate: "2026-01-01", reference: "BANK-1" } };
    mocks.db.documentLibraryAuditEvent.findMany.mockResolvedValue([payment]);
    await expect(manageDealOperations(manager, { ...operation(), kind: "REFUND", amountCents: 50001, originalId: "original" })).rejects.toThrow("exceeds");
    await expect(manageDealOperations(manager, operation())).rejects.toThrow("already recorded");
    expect(mocks.db.documentLibraryAuditEvent.create).not.toHaveBeenCalled();
  });
  it("keeps a reminder link separate from customer identity and preserves task metadata", async () => {
    mocks.createTask.mockResolvedValue({ id: "task-one" }); mocks.db.task.findUniqueOrThrow.mockResolvedValue({ templateSnapshot: { completionCriteria: { mode: "checklist" } } });
    await manageDealOperations(staff, { ...operation("DEAL_REMINDER"), title: "Upload this deal's signed lease", dueAt: new Date(Date.now() + 86400000).toISOString(), assignedUserId: staff.id });
    expect(mocks.db.task.update.mock.calls[0][0].data).toMatchObject({ customerId: "customer", templateSnapshot: { completionCriteria: { mode: "checklist" }, dealDashboard: { organizationId: "org", draftId: draft.id, jacketId: jacket.id } } });
    expect(mocks.db.documentLibraryAuditEvent.create.mock.calls.map(call => call[0].data.action)).toEqual(["DEAL_REMINDER_RECORDED", "DEAL_REMINDER"]);
    await expect(manageDealOperations(staff, { ...operation("DEAL_REMINDER"), title: "Task for someone else", dueAt: new Date(Date.now() + 86400000).toISOString(), assignedUserId: "other" })).rejects.toMatchObject({ status: 403 });
  });
  it("reassigns an owned draft with reason and history while leaving reminder assignees intact", async () => {
    await manageDealOperations(manager, { ...operation("DEAL_REASSIGN"), assignedUserId: staff.id });
    expect(mocks.db.dealDeskDraft.update.mock.calls[0][0].data).toMatchObject({ ownerUserId: "staff", statusHistory: [expect.objectContaining({ action: "REASSIGNED", previousOwnerId: "staff", actorName: "Manager" })] });
    expect(mocks.db.task.update).not.toHaveBeenCalled();
  });
  it("keeps funding and delivery as evidence-backed milestones, without changing deal or packet state", async () => {
    await manageDealOperations(manager, { ...operation("DEAL_MILESTONE"), dimension: "FUNDING", state: "VERIFIED" });
    expect(mocks.db.documentLibraryAuditEvent.create.mock.calls[0][0].data).toMatchObject({ action: "DEAL_MILESTONE_RECORDED", metadata: { dimension: "FUNDING", state: "VERIFIED", reference: "BANK-1" } });
    expect(mocks.db.salesDocumentJacket.updateMany).not.toHaveBeenCalled();
    expect(mocks.db.dealDeskDraft.updateMany).not.toHaveBeenCalled();
    expect(mocks.db.dealDeskDraft.update).not.toHaveBeenCalled();
  });
  it("does not transfer a draft to staff who cannot access its customer", async () => {
    mocks.db.customer.findFirst.mockResolvedValue(null);
    await expect(manageDealOperations(manager, { ...operation("DEAL_REASSIGN"), assignedUserId: staff.id })).rejects.toThrow("Customer 360");
    expect(mocks.db.dealDeskDraft.update).not.toHaveBeenCalled();
  });
  it("allows verified financial corrections on archived deals without reopening them", async () => {
    mocks.db.dealDeskDraft.findFirst.mockResolvedValue({ ...draft, status: "ARCHIVED" });
    await expect(manageDealOperations(manager, { ...operation(), kind: "AGREED_AMOUNT", amountCents: 0 })).resolves.toEqual({ saved: true });
    expect(mocks.db.dealDeskDraft.update).not.toHaveBeenCalled();
    await expect(manageDealOperations(manager, operation("DEAL_REASSIGN"))).rejects.toMatchObject({ status: 409 });
  });
  it("never returns a saved draft snapshot in the detail drawer", async () => {
    const result = await readDealOperations(staff, { draftId: draft.id });
    expect(result).not.toHaveProperty("snapshot"); expect(result).not.toHaveProperty("statusHistory");
    expect(mocks.db.dealDeskDraft.findFirst.mock.calls[0][0].where.ownerUserId).toBe(staff.id);
  });
});
