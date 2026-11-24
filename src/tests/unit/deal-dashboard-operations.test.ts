import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import type { AuthenticatedUser } from "@/server/auth/store";
const mocks = vi.hoisted(() => {
  const db = { dealDeskDraft: { findFirst: vi.fn(), updateMany: vi.fn(), update: vi.fn() }, customer: { findFirst: vi.fn() }, salesDocumentJacket: { findFirst: vi.fn(), updateMany: vi.fn() }, documentLibraryAuditEvent: { findFirst: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() }, vehicleUseBooking: { findFirst: vi.fn() }, task: { findUniqueOrThrow: vi.fn(), update: vi.fn(), findMany: vi.fn() }, user: { findFirst: vi.fn(), findMany: vi.fn() }, $transaction: vi.fn(), $queryRaw: vi.fn() };
  return { db, createTask: vi.fn(), connectClaim: vi.fn() };
});
vi.mock("@/server/db/client", () => ({ prisma: mocks.db }));
vi.mock("@/server/document-library/storage-config", () => ({ resolveDocumentStorageRuntimeFromEnv: () => ({ organizationId: "org" }) }));
vi.mock("@/server/services/task-create-service", () => ({ createManualTask: mocks.createTask }));
vi.mock("@/server/claims-workspace/rental-incident", () => ({
  canWorkRentalIncidentClaims: (actor: AuthenticatedUser) => actor.roles.includes("General Manager"),
  connectRentalIncidentClaim: mocks.connectClaim
}));
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
  it("records title evidence without marking the sale funded, delivered or paid", async () => {
    await manageDealOperations(manager, { ...operation("DEAL_MILESTONE"), dimension: "TITLE", state: "VERIFIED" });
    expect(mocks.db.documentLibraryAuditEvent.create.mock.calls[0][0].data).toMatchObject({ action: "DEAL_MILESTONE_RECORDED", packetId: "packet-one", metadata: { dimension: "TITLE", state: "VERIFIED" } });
    expect(mocks.db.dealDeskDraft.update).not.toHaveBeenCalled();
    expect(mocks.db.salesDocumentJacket.updateMany).not.toHaveBeenCalled();
    await expect(manageDealOperations(staff, { ...operation("DEAL_MILESTONE"), dimension: "TITLE", state: "VERIFIED" })).rejects.toMatchObject({ status: 403 });
  });
  it("allows verified financial corrections on archived deals without reopening them", async () => {
    mocks.db.dealDeskDraft.findFirst.mockResolvedValue({ ...draft, status: "ARCHIVED" });
    await expect(manageDealOperations(manager, { ...operation(), kind: "AGREED_AMOUNT", amountCents: 0 })).resolves.toEqual({ saved: true });
    expect(mocks.db.dealDeskDraft.update).not.toHaveBeenCalled();
    await expect(manageDealOperations(manager, operation("DEAL_REASSIGN"))).rejects.toMatchObject({ status: 409 });
  });
  it("never returns a saved draft snapshot in the detail drawer", async () => {
    const result = await readDealOperations(staff, { draftId: draft.id });
    expect(result.draftStatus).toBe("SOLD");
    expect(result).not.toHaveProperty("snapshot"); expect(result).not.toHaveProperty("statusHistory");
    expect(mocks.db.dealDeskDraft.findFirst.mock.calls[0][0].where.ownerUserId).toBe(staff.id);
  });

  const rental = { ...draft, pathway: "daily-rental", status: "WORKING", dealNumber: 123, snapshot: {} };
  const booking = { id: "checked-out", organizationId: "org", context: { customerId: "customer", customer: { displayName: "Buyer" } }, vehicle: { id: "rented-vehicle", vin: "expected-vin" } };
  const rentalOperation = (action: string) => ({ action, draftId: rental.id, draftRevision: 2, operationKey: "rental-operation-123" });
  const at = new Date("2026-11-23T16:00:00Z");
  const audit = (id: string, action: string, note: string, metadata = {}) => ({ id, action, note, subjectType: "DEAL", subjectId: rental.id, actorUserId: staff.id, occurredAt: at, metadata: { actorName: staff.name, ...metadata } });

  it("saves a concise rental note on the exact deal and reads author and date after reopening", async () => {
    mocks.db.dealDeskDraft.findFirst.mockResolvedValue(rental);
    await expect(manageDealOperations(staff, { ...rentalOperation("RENTAL_PROGRESS_NOTE"), reason: " Called " })).resolves.toEqual({ saved: true });
    const stored = mocks.db.documentLibraryAuditEvent.create.mock.calls[0][0].data;
    expect(stored).toMatchObject({ action: "RENTAL_PROGRESS_NOTE_RECORDED", subjectId: rental.id, note: "Called", actorUserId: staff.id });
    expect(stored).not.toHaveProperty("packetId");
    mocks.db.documentLibraryAuditEvent.findMany.mockResolvedValue([{ ...stored, id: "note" }]);
    expect((await readDealOperations(staff, { draftId: rental.id })).rentalActivity?.notes).toEqual([{ id: "note", text: "Called", author: "Staff", at: stored.occurredAt.toISOString() }]);
    expect(mocks.db.dealDeskDraft.update).not.toHaveBeenCalled();
  });

  it("rejects unverified incidents and creates exactly one private follow-up on retry", async () => {
    mocks.db.dealDeskDraft.findFirst.mockResolvedValue(rental);
    const input = { ...rentalOperation("RENTAL_INCIDENT"), kind: "THEFT", reason: "Sensitive narrative", bookingId: booking.id };
    await expect(manageDealOperations(staff, input)).rejects.toMatchObject({ status: 409 });
    expect(mocks.createTask).not.toHaveBeenCalled();
    mocks.db.vehicleUseBooking.findFirst.mockResolvedValue(booking);
    mocks.createTask.mockResolvedValue({ id: "task-one" });
    mocks.db.task.findUniqueOrThrow.mockResolvedValue({ templateSnapshot: {} });
    const result = await manageDealOperations(staff, input);
    expect(result).toEqual({ saved: true, taskId: "task-one", incidentId: "audit" });
    expect(mocks.db.vehicleUseBooking.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: booking.id, context: expect.objectContaining({ draftId: rental.id }), checkedOutAt: { not: null } })
    }));
    expect(mocks.createTask.mock.calls[0][1]).toMatchObject({ assignedUserId: staff.id, priority: "HIGH" });
    expect(mocks.createTask.mock.calls[0][1].description).not.toContain(input.reason);
    const receipt = mocks.db.documentLibraryAuditEvent.create.mock.calls[1][0].data;
    mocks.db.documentLibraryAuditEvent.findUnique.mockResolvedValue(receipt);
    expect(await manageDealOperations(staff, input)).toEqual(result);
    expect(mocks.createTask).toHaveBeenCalledTimes(1);
    expect(mocks.connectClaim).not.toHaveBeenCalled();
  });

  it("reads the current Task outcome and limits claim links to Claims Desk staff", async () => {
    mocks.db.dealDeskDraft.findFirst.mockResolvedValue(rental);
    mocks.db.documentLibraryAuditEvent.findMany.mockResolvedValue([
      audit("incident", "RENTAL_INCIDENT_RECORDED", "Dent", { kind: "DAMAGE", taskId: "task" }),
      audit("link", "RENTAL_INCIDENT_CLAIM_RECORDED", "Linked", { incidentId: "incident", claimId: "claim" })
    ]);
    mocks.db.task.findMany.mockResolvedValue([{ id: "task", status: "COMPLETED", completedAt: at, dueAt: at, assignedUser: { name: "New owner" },
      templateSnapshot: { dealDashboard: { version: 1, organizationId: "org", draftId: rental.id, jacketId: null } } }]);
    const staffActivity = (await readDealOperations(staff, { draftId: rental.id })).rentalActivity;
    expect(staffActivity?.incidents[0]).toMatchObject({ claimLinked: true, claimId: null, followUp: { status: "COMPLETED", completedAt: at.toISOString(), owner: "New owner" } });
    expect((await readDealOperations(manager, { draftId: rental.id })).rentalActivity?.incidents[0]?.claimId).toBe("claim");
  });

  it("requires Claims Desk access and uses the vehicle from the persisted incident", async () => {
    mocks.db.dealDeskDraft.findFirst.mockResolvedValue(rental);
    mocks.db.documentLibraryAuditEvent.findFirst.mockResolvedValueOnce(null);
    const input = { ...rentalOperation("RENTAL_INCIDENT_CLAIM"), incidentId: "incident", claimAction: "START", vehicleId: "untrusted" };
    await expect(manageDealOperations(manager, input)).rejects.toMatchObject({ status: 404 });
    const incident = audit("incident", "RENTAL_INCIDENT_RECORDED", "Dent", { kind: "DAMAGE", bookingId: booking.id });
    mocks.db.documentLibraryAuditEvent.findFirst.mockResolvedValueOnce(incident).mockResolvedValueOnce(incident).mockResolvedValueOnce(null);
    mocks.db.vehicleUseBooking.findFirst.mockResolvedValue(booking);
    await expect(manageDealOperations(staff, input)).rejects.toMatchObject({ status: 403 });
    mocks.connectClaim.mockResolvedValue("claim");
    await expect(manageDealOperations(manager, input)).resolves.toEqual({ saved: true, claimId: "claim" });
    expect(mocks.connectClaim).toHaveBeenCalledWith(mocks.db, manager, { incidentId: incident.id, organizationId: "org", kind: "DAMAGE",
      customerId: "customer", customerName: "Buyer", vehicle: booking.vehicle, claimId: null });
  });
});
