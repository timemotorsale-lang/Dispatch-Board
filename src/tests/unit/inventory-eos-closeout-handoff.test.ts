import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { normalizeHandoffResponse, normalizeTechnicianCloseout } from "@/server/inventory-execution/closeout-domain";
import { offerInventoryHandoff, respondInventoryHandoff, submitTechnicianCloseout } from "@/server/inventory-execution/closeout-service";

const tech: AuthenticatedUser = { id: "tech", name: "Tech", email: "tech@example.com", isActive: true, roles: ["Technician"], duties: { direct: [], roleDefaults: [], all: [] } };
const nextOwner = { ...tech, id: "next" }, now = new Date("2026-07-19T18:00:00Z");
const completed = { expectedVersion: 2, idempotencyKey: "closeout-1", reason: "Submit required technician closeout.", outcome: "COMPLETED", workPerformed: ["REPAIRED", "TESTED"], partsDisposition: "INSTALLED", findings: ["EXPECTED_CONDITION"], verification: ["FUNCTION_TEST"], qcState: "READY_FOR_REVIEW", evidenceSnapshot: { items: [{ code: "PHOTO", label: "Completion photo", required: true, satisfied: true, source: "Vehicle evidence" }] }, optionalNotes: "Additional context if useful." };

describe("Inventory EOS technician closeout and handoff", () => {
  it("keeps completed closeout brief and optional detail optional", () => {
    expect(normalizeTechnicianCloseout({ ...completed, optionalNotes: undefined })).toMatchObject({ outcome: "COMPLETED", optionalNotes: null, workPerformed: ["REPAIRED", "TESTED"] });
  });

  it("requires complete structured recovery detail only when work is incomplete", () => {
    expect(() => normalizeTechnicianCloseout({ ...completed, outcome: "FURTHER_DIAGNOSIS", qcState: "NOT_READY" })).toThrow("requires explanation");
    const incomplete = normalizeTechnicianCloseout({ ...completed, outcome: "FURTHER_DIAGNOSIS", workPerformed: ["DIAGNOSED"], partsDisposition: "ADDITIONAL_PARTS_REQUIRED", findings: ["NEW_CONDITION"], verification: ["NOT_VERIFIED"], qcState: "NOT_READY", explanation: "The symptom persists after initial testing.", observation: "Intermittent voltage loss at connector.", testsPerformed: "Load test and scan completed.", recommendedNextStep: "Perform circuit isolation diagnosis.", diagnosticMinutes: 35, operability: "OPERABLE_WITH_RESTRICTION", blockerRecovery: { ownerUserId: "manager", requestedAction: "Authorize further electrical diagnosis.", impact: "Vehicle cannot advance to QC.", nextCheckAt: "2026-07-19T20:00:00Z", escalateAt: "2026-07-20T00:00:00Z", substituteAction: "Move vehicle to diagnostic bay." } });
    expect(incomplete).toMatchObject({ outcome: "FURTHER_DIAGNOSIS", blockerRecovery: { ownerUserId: "manager" } });
  });

  it("fails completed work closed when evidence or verification is incomplete", () => {
    expect(() => normalizeTechnicianCloseout({ ...completed, evidenceSnapshot: { items: [{ code: "PHOTO", label: "Photo", required: true, satisfied: false, source: "Policy" }] } })).toThrow("completion evidence is missing");
    expect(() => normalizeTechnicianCloseout({ ...completed, qcState: "NOT_READY" })).toThrow("must be ready for review");
  });

  it("submits through the packet aggregate with assigned-executor authority", async () => {
    const closeout = vi.fn(async () => ({ duplicate: false, result: { packetState: "READY_FOR_REVIEW" }, version: 3 })), repository = { getPacketContext: vi.fn(async () => ({ id: "packet", version: 2, task: { assignedUserId: "tech", requiresManagerApproval: true }, workSessions: [{ id: "session" }], closeout: null })), getHandoffContext: vi.fn(), closeout, offerHandoff: vi.fn(), respondHandoff: vi.fn() };
    await expect(submitTechnicianCloseout(tech, "packet", completed, { now: () => now, organizationId: "org", repository: repository as never })).resolves.toMatchObject({ version: 3 });
    expect(closeout).toHaveBeenCalledWith(expect.objectContaining({ commandType: "SUBMIT_TECHNICIAN_CLOSEOUT", expectedVersion: 2 }), expect.objectContaining({ sessionId: "session", submittedByUserId: "tech" }));
  });

  it("offers an attributable handoff only after repository completion gates", async () => {
    const offerHandoff = vi.fn(async () => ({ duplicate: false, result: { handoffId: "handoff" }, version: 4 })), repository = { getPacketContext: vi.fn(async () => ({ id: "packet", version: 3, task: { assignedUserId: "tech" }, workSessions: [], closeout: { id: "closeout" } })), getHandoffContext: vi.fn(), closeout: vi.fn(), offerHandoff, respondHandoff: vi.fn() };
    await offerInventoryHandoff(tech, "packet", { expectedVersion: 3, idempotencyKey: "handoff-1", reason: "Offer completed work to quality review.", toUserId: "next", nextAction: "Perform independent QC", targetAt: "2026-07-19T20:00:00Z" }, { now: () => now, organizationId: "org", repository: repository as never });
    expect(offerHandoff).toHaveBeenCalledWith(expect.objectContaining({ commandType: "OFFER_INVENTORY_WORK_HANDOFF", expectedVersion: 3 }), expect.objectContaining({ fromUserId: "tech", toUserId: "next" }));
  });

  it("requires the proposed next owner and a reason for rejection", async () => {
    expect(() => normalizeHandoffResponse({ expectedVersion: 1, idempotencyKey: "reject-1", reason: "Reject incomplete handoff evidence.", response: "REJECT" })).toThrow("Rejection reason");
    const respondHandoff = vi.fn(async () => ({ duplicate: false, result: { status: "ACCEPTED" }, version: 1 })), repository = { getPacketContext: vi.fn(), getHandoffContext: vi.fn(async () => ({ id: "handoff", toUserId: "next", workPacket: { id: "packet", version: 4 } })), closeout: vi.fn(), offerHandoff: vi.fn(), respondHandoff };
    await expect(respondInventoryHandoff(tech, "handoff", { expectedVersion: 1, idempotencyKey: "accept-wrong", reason: "Attempt to accept another owner handoff.", response: "ACCEPT" }, { organizationId: "org", repository: repository as never })).rejects.toThrow("proposed next owner");
    await respondInventoryHandoff(nextOwner, "handoff", { expectedVersion: 1, idempotencyKey: "accept-1", reason: "Accept quality-control ownership now.", response: "ACCEPT" }, { now: () => now, organizationId: "org", repository: repository as never });
    expect(respondHandoff).toHaveBeenCalledWith(expect.objectContaining({ expectedVersion: 0, subjectType: "INVENTORY_WORK_HANDOFF" }), expect.objectContaining({ expectedHandoffVersion: 1, userId: "next" }));
  });
});
