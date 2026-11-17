import { beforeEach, describe, expect, it, vi } from "vitest";
type MockTable = Record<string, ReturnType<typeof vi.fn>>;
type MockDatabase = { $executeRaw: ReturnType<typeof vi.fn>; dealWorkflowContext: MockTable; dealContinuityEvent: MockTable; vehicleUseBooking: MockTable; salesDocumentJacket: MockTable; salesDocumentPacketVersion: MockTable; documentLibraryDocument: MockTable; vehicleOdometerObservation: MockTable; vehicleCustodyEvent: MockTable; task: MockTable };
const state = vi.hoisted(() => ({ db: {} as MockDatabase, capability: vi.fn(), createTask: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { $transaction: (execute: (db: unknown) => unknown) => execute(state.db) } }));
vi.mock("@/server/policies/access", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/server/policies/access")>(),
  isManager: () => false
}));
vi.mock("@/server/deal-continuity/identities", () => ({ dealOrganization: () => "registry", dealDocumentOrganization: () => "documents", dealCustomer: vi.fn(), dealVehicle: () => ({ eligibleForUse: true, vin: "VIN", locationId: "lot" }) }));
vi.mock("@/server/enterprise-command/repository", () => ({ createEnterpriseCommandRepository: () => ({ listCapabilityGrants: async () => [] }) }));
vi.mock("@/server/enterprise-command/vehicle-capabilities", () => ({ assertVehicleCapability: state.capability }));
vi.mock("@/server/services/task-create-service", () => ({ createManualTask: state.createTask }));
vi.mock("@/server/repositories/task-create-repository", () => ({ createTaskCreateRepository: (db: unknown) => db }));
import { executeVehicleUse } from "@/server/deal-continuity/service";
import type { AuthenticatedUser } from "@/server/auth/store";

const actor = { id: "staff", name: "Staff", isActive: true } as AuthenticatedUser;
const due = new Date(Date.now() + 86400000);
const command = { action: "HANDOFF", operationKey: "activate-12345678", bookingId: "booking", expectedVersion: 1, reason: "Customer collected rental", occurredAt: new Date(Date.now() - 60000).toISOString(), odometer: 1000, fuel: "Full", condition: "Checked all panels", recipient: "Customer", evidence: ["checkout-report"], keysVerified: true, driverVerified: true, physicalHandover: true, insuranceVerified: true, insuranceValidUntil: due.toISOString(), timezone: "America/Chicago", agreementJacketId: "jacket" };
describe("rental activation transaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.capability.mockImplementation(() => {});
    const booking = { id: "booking", contextId: "draft", vehicleId: "vehicle", status: "RESERVED", version: 1, startsAt: new Date(Date.now() - 3600000), expectedReturnAt: due };
    state.db = {
      $executeRaw: vi.fn(),
      dealWorkflowContext: { findFirst: vi.fn().mockResolvedValue({ id: "draft", draftId: "draft", vehicleId: "vehicle", customerId: "customer", draft: { ownerUserId: "staff", pathway: "daily-rental", dealNumber: 1063, snapshot: { jackets: { "daily-rental": "jacket" } } }, bookings: [booking] }) },
      dealContinuityEvent: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn() },
      vehicleUseBooking: { findFirst: vi.fn().mockResolvedValueOnce(booking).mockResolvedValue(null), update: vi.fn().mockImplementation(async ({ data }) => ({ ...booking, ...data, version: 2 })) },
      salesDocumentJacket: { findFirst: vi.fn().mockResolvedValue({ id: "jacket", organizationId: "documents", packetId: "packet" }) },
      salesDocumentPacketVersion: { count: vi.fn().mockResolvedValue(1) },
      documentLibraryDocument: { findMany: vi.fn().mockResolvedValue([{ documentType: "signed-agreement", status: "ACCEPTED", source: "MANUAL_UPLOAD", classificationSnapshot: { signed: true } }, { documentType: "insurance-proof", status: "ACCEPTED", source: "MANUAL_UPLOAD" }]) },
      vehicleOdometerObservation: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn() },
      vehicleCustodyEvent: { create: vi.fn() },
      task: { findUniqueOrThrow: vi.fn().mockResolvedValue({ templateSnapshot: {} }), update: vi.fn(), updateMany: vi.fn() }
    };
    state.db.vehicleUseBooking.findMany = vi.fn().mockResolvedValue([]);
    state.createTask.mockResolvedValue({ id: "task" });
  });
  it("records custody, follow-up and audit through the same transaction", async () => {
    const result = await executeVehicleUse(actor, "draft", command);
    expect(result.result).toMatchObject({ status: "CHECKED_OUT", dealStage: "Delivered", lifecycle: "Rental Active" });
    expect(state.createTask.mock.calls[0][2]).toBe(state.db);
    expect(state.db.task.update).toHaveBeenCalled();
    expect(state.db.vehicleCustodyEvent.create).toHaveBeenCalled();
    expect(state.db.dealContinuityEvent.create).toHaveBeenCalledOnce();
  });
  it("reserves and checks out a previously unreserved rental in the same transaction", async () => {
    const context = await state.db.dealWorkflowContext.findFirst();
    state.db.dealWorkflowContext.findFirst.mockResolvedValue({ ...context, bookings: [] });
    state.db.vehicleUseBooking.findFirst.mockReset().mockResolvedValue(null);
    state.db.vehicleUseBooking.findMany = vi.fn().mockResolvedValue([]);
    state.db.vehicleUseBooking.create = vi.fn().mockImplementation(async ({ data }) => ({ ...data, version: 1, status: "RESERVED" }));
    const result = await executeVehicleUse(actor, "draft", { ...command, action: "ACTIVATE", bookingId: "", expectedVersion: undefined, expectedReturnAt: due.toISOString() });
    expect(result.result).toMatchObject({ status: "CHECKED_OUT", dealStage: "Delivered" });
    expect(state.db.vehicleUseBooking.create).toHaveBeenCalledOnce();
    expect(state.createTask.mock.calls[0][2]).toBe(state.db);
    expect(state.db.dealContinuityEvent.create).toHaveBeenCalledOnce();
  });
  it("allows a delayed pickup to confirm a new covered due-back time directly at checkout", async () => {
    state.db.vehicleUseBooking.findFirst.mockReset().mockResolvedValueOnce({ id: "booking", version: 1, status: "RESERVED", startsAt: new Date(Date.now() - 86400000), expectedReturnAt: new Date(Date.now() - 3600000) }).mockResolvedValue(null);
    await executeVehicleUse(actor, "draft", { ...command, expectedReturnAt: due.toISOString() });
    expect(state.db.vehicleUseBooking.update.mock.calls[0][0].data.expectedReturnAt).toEqual(due);
    expect(state.createTask).toHaveBeenCalledOnce();
  });
  it("rejects concurrent custody and missing permissions before writes", async () => {
    state.db.vehicleUseBooking.findFirst.mockReset().mockResolvedValueOnce({ id: "booking", version: 1, status: "RESERVED" }).mockResolvedValueOnce({ id: "other" });
    await expect(executeVehicleUse(actor, "draft", command)).rejects.toThrow("already out");
    expect(state.db.vehicleUseBooking.update).not.toHaveBeenCalled();
    state.capability.mockImplementation(() => { throw new Error("Permission required"); });
    await expect(executeVehicleUse(actor, "draft", command)).rejects.toThrow("Permission required");
    expect(state.createTask).not.toHaveBeenCalled();
  });
  it("recovers an identical retry without creating duplicate tasks", async () => {
    await executeVehicleUse(actor, "draft", command);
    const event = state.db.dealContinuityEvent.create.mock.calls[0][0].data;
    state.db.dealContinuityEvent.findUnique.mockResolvedValue(event);
    expect(await executeVehicleUse(actor, "draft", command)).toMatchObject({ duplicate: true });
    expect(state.createTask).toHaveBeenCalledOnce();
    await expect(executeVehicleUse(actor, "draft", { ...command, reason: "Different request" })).rejects.toThrow("different work");
    await expect(executeVehicleUse(actor, "draft", { ...command, insuranceValidUntil: new Date(due.getTime() + 86400000).toISOString() })).rejects.toThrow("different work");
  });
  it("can return an original rental after the deal changes to a lease", async () => {
    const context = await state.db.dealWorkflowContext.findFirst();
    state.db.dealWorkflowContext.findFirst.mockResolvedValue({ ...context, draft: { ...context.draft, pathway: "lease-to-own", snapshot: { ...context.draft.snapshot, "desk:assignmentPathway": "daily-rental" } } });
    state.db.vehicleUseBooking.findFirst.mockReset().mockResolvedValue({ id: "booking", vehicleId: "vehicle", status: "CHECKED_OUT", version: 1, checkedOutAt: new Date(Date.now() - 3600000), departureSnapshot: { odometer: 900 }, expectedReturnAt: due });
    const result = await executeVehicleUse(actor, "draft", { ...command, action: "RETURN" });
    expect(result.result).toMatchObject({ status: "RETURNED", lifecycle: "Rental Returned" });
    expect(state.db.task.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "COMPLETED" }) }));
  });
});
