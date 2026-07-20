import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { normalizeManagerPlan } from "@/server/inventory-execution/manager-plan-domain";
import { publishManagerNextPlan } from "@/server/inventory-execution/manager-plan-service";

const manager: AuthenticatedUser = { id: "manager", name: "Manager", email: "manager@example.com", isActive: true, roles: ["General Manager"], duties: { direct: [], roleDefaults: [], all: [] } };
const technician = { ...manager, id: "tech", roles: ["Technician"] }, now = new Date("2026-07-19T18:00:00Z");
const base = { decision: "REQUIRE_DIAGNOSIS", direction: "Perform circuit-isolation diagnosis, then return for review.", expectedVersion: 3, idempotencyKey: "plan-1", internalNote: "Keep vehicle in the diagnostic bay.", publishNextWork: true, reason: "Publish manager direction and follow-up work.", nextWork: { assignedUserId: "tech", title: "Electrical circuit isolation", description: "Isolate intermittent voltage loss and document readings.", dueAt: "2026-07-20T18:00:00Z", priority: "HIGH", workflowArea: "SHOP", requiresManagerApproval: true, stageCode: "RECONDITIONING", purpose: "Resolve the newly found electrical condition.", nextAction: "Perform circuit isolation diagnosis", definitionOfDone: "Fault isolated, readings attached, and recommendation submitted.", urgency: "P1", urgencyReason: "Vehicle is blocked from QC.", readiness: "READY", readinessSnapshot: { items: [{ code: "BAY", label: "Diagnostic bay ready", required: true, satisfied: true, source: "Shop capacity" }] }, dependencySnapshot: { items: [{ code: "DIAGRAM", label: "Wiring diagram available", required: true, satisfied: true, source: "Service information" }] }, evidenceRequirements: { items: [{ code: "READINGS", label: "Circuit readings", required: true, satisfied: false, source: "Diagnostic policy" }] }, targetAt: "2026-07-20T18:00:00Z", estimatedMinutes: 60, policyVersion: "inventory-eos-mvp/v1" } };

describe("Inventory EOS manager next plan", () => {
  it("validates a structured next-task preview before publication", () => {
    expect(normalizeManagerPlan(base)).toMatchObject({ decision: "REQUIRE_DIAGNOSIS", publishNextWork: true, nextWork: { assignedUserId: "tech", priority: "HIGH", workflowArea: "SHOP", packet: { state: "STAGED", readiness: "READY" } } });
  });

  it("allows direction and private comment without forcing another task", () => {
    expect(normalizeManagerPlan({ ...base, decision: "HOLD", publishNextWork: false, nextWork: undefined })).toMatchObject({ decision: "HOLD", nextWork: null, internalNote: "Keep vehicle in the diagnostic bay." });
  });

  it("requires manager authority and does not publish for staff", async () => {
    const repository = { getContext: vi.fn(), publish: vi.fn() };
    await expect(publishManagerNextPlan(technician, "packet", base, { organizationId: "org", repository: repository as never })).rejects.toThrow("Manager authority");
    expect(repository.getContext).not.toHaveBeenCalled();
  });

  it("publishes one audited packet decision and one staged Task-backed follow-up", async () => {
    const publish = vi.fn(async () => ({ duplicate: false, result: { nextTaskId: "next-task", nextPacketId: "next-packet" }, version: 4 })), repository = { getContext: vi.fn(async () => ({ id: "packet", managerPlan: null, closeout: { id: "closeout" } })), publish };
    await expect(publishManagerNextPlan(manager, "packet", base, { now: () => now, organizationId: "org", repository: repository as never })).resolves.toMatchObject({ version: 4 });
    expect(publish).toHaveBeenCalledWith(expect.objectContaining({ commandType: "PUBLISH_INVENTORY_MANAGER_NEXT_PLAN", expectedVersion: 3, payload: expect.objectContaining({ publishNextWork: true }) }), expect.objectContaining({ managerId: "manager", nextTaskId: expect.any(String), nextPacketId: expect.any(String) }));
  });

  it("rejects missing next-work details before any mutation", () => {
    expect(() => normalizeManagerPlan({ ...base, nextWork: { title: "Incomplete" } })).toThrow();
    expect(() => normalizeManagerPlan({ ...base, expectedVersion: 0 })).toThrow("positive whole number");
  });
});
