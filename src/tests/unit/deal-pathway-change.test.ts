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
  it("blocks stale edits without blocking sold deals, historical paperwork or active custody", async () => {
    await expect(changeDealPathway(actor, { ...command, revision: 2 })).rejects.toMatchObject({ status: 409 });
    mocks.booking.mockResolvedValue(1); mocks.packet.mockResolvedValue({ id: "signed" }); mocks.find.mockResolvedValue({ ...draft, pathway: "daily-rental", status: "COMPLETED" });
    await changeDealPathway(actor, command);
    const data = mocks.update.mock.calls[0][0].data;
    expect(data.status).toBe("IN_PROGRESS");
    expect(data.snapshot["desk:assignmentPathway"]).toBe("daily-rental");
    expect(data.statusHistory[0]).toMatchObject({ from: "COMPLETED", to: "IN_PROGRESS", preservedPacketId: "signed", activeAssignmentPreserved: true });
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
  it("rejects unsupported pathways and requests without an attributable reason", async () => {
    await expect(changeDealPathway(actor, { ...command, reason: "" })).rejects.toMatchObject({ status: 400 });
    await expect(changeDealPathway(actor, { ...command, pathway: "invalid" })).rejects.toMatchObject({ status: 400 });
    await expect(changeDealPathway(null, command)).rejects.toMatchObject({ status: 401 });
  });
});
