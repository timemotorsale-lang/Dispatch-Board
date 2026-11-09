import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
const mocks = vi.hoisted(() => ({ find: vi.fn(), update: vi.fn(), booking: vi.fn(), packet: vi.fn(), lock: vi.fn() }));
vi.mock("@/server/db/client", () => ({ prisma: { $transaction: (run: (database: unknown) => unknown) => run({ $executeRaw: mocks.lock, dealDeskDraft: { findFirst: mocks.find, updateMany: mocks.update }, vehicleUseBooking: { count: mocks.booking }, salesDocumentJacket: { findFirst: mocks.packet } }) } }));
vi.mock("@/server/document-library/storage-config", () => ({ resolveDocumentStorageRuntimeFromEnv: () => ({ organizationId: "org" }) }));
import { changeDealPathway } from "@/server/sales-documents/deal-pathway";
const actor: AuthenticatedUser = { id: "staff", name: "Staff", email: "staff@example.test", isActive: true, roles: ["Salesperson"], duties: { all: [], direct: [], roleDefaults: [] } };
const draft = { id: "draft", organizationId: "org", ownerUserId: "staff", dealNumber: 1066, pathway: "retail-sale", status: "IN_PROGRESS", revision: 3, statusHistory: [], snapshot: { "desk:workflowId": "retail-sale", "desk:identity": { customerId: "customer", vehicleId: "vehicle" }, "desk:form": { customerId: "customer", vehicle: "Toyota", amount: "10000" }, "retail-sale:cashSaleFacts": { agreed: "10000" }, jackets: { "retail-sale": "old-packet" } } };
const command = { id: "draft", revision: 3, pathway: "lease-to-own", reason: "Customer chose leasing instead of cash purchase" };
describe("controlled revenue pathway change", () => {
  afterEach(() => vi.unstubAllEnvs());
  beforeEach(() => { vi.resetAllMocks(); mocks.find.mockResolvedValue(draft); mocks.update.mockResolvedValue({ count: 1 }); mocks.booking.mockResolvedValue(0); mocks.packet.mockResolvedValue(null); });
  it("changes the existing deal and preserves identity, source terms and audit history", async () => {
    expect(await changeDealPathway(actor, command)).toMatchObject({ id: "draft", pathway: "lease-to-own", revision: 4 });
    const data = mocks.update.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("dealNumber"); expect(data).not.toHaveProperty("customerId");
    expect(data.snapshot["desk:identity"]).toEqual(draft.snapshot["desk:identity"]);
    expect(data.snapshot["retail-sale:cashSaleFacts"]).toEqual({ agreed: "10000" });
    expect(data.snapshot["desk:workflowId"]).toBe("lease-to-own");
    expect(data.snapshot["desk:form"].amount).toBe("");
    expect(data.statusHistory[0]).toMatchObject({ action: "PATHWAY_CHANGED", actorId: "staff", fromPathway: "retail-sale", toPathway: "lease-to-own", reason: command.reason });
  });
  it("uses owner and tenant scope for staff and rejects missing records", async () => {
    mocks.find.mockResolvedValue(null);
    await expect(changeDealPathway(actor, command)).rejects.toMatchObject({ status: 404 });
    expect(mocks.find.mock.calls[0][0].where).toEqual({ id: "draft", organizationId: "org", ownerUserId: "staff" });
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("switches a prepared lease to Test Drive without carrying lease paperwork into the drive", async () => {
    const leaseInputs = { agreedPrice: "28895", downPayment: "15000" };
    const identity = { customerId: "customer", vehicleId: "vehicle", vehicle: { vin: "SAMPLE-VIN", label: "Sample vehicle" } };
    mocks.find.mockResolvedValue({ ...draft, pathway: "lease-to-own", snapshot: {
      "desk:identity": identity, "desk:form": { customerId: "customer", vehicle: "Sample vehicle", amount: "28895" },
      "lease-to-own:leaseInputs": leaseInputs, "lease-to-own:generatedPacketId": "prepared-lease",
      jackets: { "lease-to-own": "lease-jacket" }
    } });
    await expect(changeDealPathway(actor, { ...command, pathway: "test-drive", reason: "Prospect requested a test drive" }))
      .resolves.toMatchObject({ id: draft.id, pathway: "test-drive", status: "IN_PROGRESS", revision: 4 });
    const data = mocks.update.mock.calls[0][0].data;
    expect(data.snapshot).toMatchObject({
      "desk:workflowId": "test-drive", "desk:identity": identity,
      "desk:form": { customerId: "customer", vehicle: "Sample vehicle", amount: "" },
      "lease-to-own:leaseInputs": leaseInputs, "lease-to-own:generatedPacketId": "prepared-lease",
      jackets: { "lease-to-own": "lease-jacket" }
    });
    expect(data.snapshot).not.toHaveProperty("test-drive:generatedPacketId");
    expect(data.statusHistory[0]).toMatchObject({ fromPathway: "lease-to-own", toPathway: "test-drive", reason: "Prospect requested a test drive" });
  });
  it("blocks stale edits without blocking sold deals, historical paperwork or active custody", async () => {
    await expect(changeDealPathway(actor, { ...command, revision: 2 })).rejects.toMatchObject({ status: 409 });
    mocks.booking.mockResolvedValue(1); mocks.packet.mockResolvedValue({ id: "signed" }); mocks.find.mockResolvedValue({ ...draft, pathway: "daily-rental", status: "COMPLETED" });
    await changeDealPathway(actor, command);
    const data = mocks.update.mock.calls[0][0].data;
    expect(data.status).toBe("PENDING");
    expect(data.snapshot["desk:assignmentPathway"]).toBe("daily-rental");
    expect(data.statusHistory[0]).toMatchObject({ from: "COMPLETED", to: "PENDING", preservedPacketId: "signed", activeAssignmentPreserved: true });
  });
  it.each(["SOLD", "COMPLETED", "PENDING"])("moves or keeps %s in Pending and changes the pathway atomically without a reason", async status => {
    mocks.find.mockResolvedValue({ ...draft, status });
    const result = await changeDealPathway(actor, { ...command, reason: "" });
    expect(result).toMatchObject({ pathway: "lease-to-own", status: "PENDING", revision: 4 });
    expect(mocks.update).toHaveBeenCalledOnce();
    expect(mocks.update.mock.calls[0][0]).toMatchObject({ where: { id: draft.id, status, revision: 3, pathway: "retail-sale" }, data: { status: "PENDING", pathway: "lease-to-own", statusHistory: [expect.objectContaining({ from: status, to: "PENDING", reason: "", actorId: actor.id })] } });
  });
  it("does not move status or write history if the atomic update loses a race", async () => {
    mocks.find.mockResolvedValue({ ...draft, status: "SOLD" }); mocks.update.mockResolvedValue({ count: 0 });
    await expect(changeDealPathway(actor, { ...command, reason: "" })).rejects.toMatchObject({ status: 409 });
    expect(mocks.update).toHaveBeenCalledOnce();
  });
  it("supports optional managers-only mode without making it the default", async () => {
    vi.stubEnv("DEAL_PATHWAY_CHANGE_ACCESS", "MANAGERS_ONLY");
    await expect(changeDealPathway(actor, command)).rejects.toMatchObject({ status: 403 });
    expect(mocks.update).not.toHaveBeenCalled();
    await expect(changeDealPathway({ ...actor, roles: ["General Manager"] }, command)).resolves.toMatchObject({ pathway: "lease-to-own" });
  });
  it("allows an operations coordinator to change an accessible deal without document-library permissions", async () => {
    await expect(changeDealPathway({ ...actor, roles: ["Operations Coordinator"] }, command)).resolves.toMatchObject({ pathway: "lease-to-own" });
  });
  it("does not duplicate the history entry on an identical retry", async () => {
    mocks.find.mockResolvedValue({ ...draft, pathway: "lease-to-own", revision: 4 });
    expect(await changeDealPathway(actor, command)).toMatchObject({ unchanged: true }); expect(mocks.update).not.toHaveBeenCalled();
  });
  it.each([undefined, "", "   ", "Fix"])("allows an optional reason %j and still records the actor and pathway history", async reason => {
    await expect(changeDealPathway(actor, { ...command, reason })).resolves.toMatchObject({ pathway: "lease-to-own", revision: 4 });
    expect(mocks.update.mock.calls[0][0].data.statusHistory[0]).toMatchObject({ action: "PATHWAY_CHANGED", actorId: actor.id, fromPathway: "retail-sale", toPathway: "lease-to-own", reason: reason?.trim() ?? "" });
  });
  it("rejects unsupported pathways, invalid optional reasons and unauthenticated requests", async () => {
    await expect(changeDealPathway(actor, { ...command, reason: "a".repeat(1001) })).rejects.toMatchObject({ status: 400 });
    await expect(changeDealPathway(actor, { ...command, reason: {} })).rejects.toMatchObject({ status: 400 });
    await expect(changeDealPathway(actor, { ...command, pathway: "invalid" })).rejects.toMatchObject({ status: 400 });
    await expect(changeDealPathway(null, command)).rejects.toMatchObject({ status: 401 });
  });
});
