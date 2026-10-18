import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import type { EnterpriseCommandRepository } from "@/server/enterprise-command/repository";
import type { ShopExecutionRepository } from "@/server/shop-execution/repository";
import { recordRepairJobLabor } from "@/server/shop-execution/service";

const now = new Date("2026-10-16T12:00:00Z");
const mechanic: AuthenticatedUser = { id: "tech-1", name: "Technician", email: "tech@example.com", isActive: true, roles: ["Mechanic"], duties: { all: [], direct: [], roleDefaults: [] } };
const manager: AuthenticatedUser = { ...mechanic, id: "manager-1", roles: ["General Manager"] };

function fixture() {
  const labor = vi.fn().mockResolvedValue({ duplicate: false, result: { id: "clock-1" }, version: 2 });
  const syncJobStatus = vi.fn();
  const repository = { overview: vi.fn().mockResolvedValue({ jobs: [{ id: "job-1", repairOrder: { locationId: "location-1" } }] }), aggregateVersion: vi.fn().mockResolvedValue(1), labor } as unknown as ShopExecutionRepository;
  const foundationRepository = { listCapabilityGrants: vi.fn().mockResolvedValue([]) } as unknown as EnterpriseCommandRepository;
  return { labor, syncJobStatus, input: { repository, foundationRepository, enforceRollout: false, organizationId: "org-1", now: () => now, taskBridge: { reconcileOwner: vi.fn(), reconcileJob: vi.fn(), syncJobStatus } } };
}

function command(overrides = {}) {
  return { eventType: "START", technicianUserId: mechanic.id, occurredAt: now.toISOString(), idempotencyKey: "labor-1", reason: "Record assigned repair work", ...overrides };
}

describe("connected pilot labor attribution", () => {
  it("refuses another technician's event before writing labor", async () => {
    const context = fixture();
    await expect(recordRepairJobLabor(mechanic, "job-1", command({ technicianUserId: "tech-2" }), context.input)).rejects.toThrow("Only the assigned technician");
    expect(context.labor).not.toHaveBeenCalled();
  });

  it("refuses staff corrections and future events", async () => {
    const context = fixture();
    await expect(recordRepairJobLabor(mechanic, "job-1", command({ eventType: "CORRECTION", correctionMinutes: 5 }), context.input)).rejects.toThrow("Only a manager");
    await expect(recordRepairJobLabor(mechanic, "job-1", command({ occurredAt: "2026-10-17T12:00:00Z" }), context.input)).rejects.toThrow("future");
    expect(context.labor).not.toHaveBeenCalled();
  });

  it("records an owned event and synchronizes the existing task", async () => {
    const context = fixture();
    await recordRepairJobLabor(mechanic, "job-1", command(), context.input);
    expect(context.labor).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: mechanic.id }), expect.objectContaining({ technicianUserId: mechanic.id }));
    expect(context.syncJobStatus).toHaveBeenCalledWith("org-1", "job-1", mechanic.id, "IN_PROGRESS", null);
  });

  it("allows an audited manager correction without reopening completed work", async () => {
    const context = fixture();
    await recordRepairJobLabor(manager, "job-1", command({ eventType: "CORRECTION", correctionMinutes: -5 }), context.input);
    expect(context.labor).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: manager.id }), expect.objectContaining({ technicianUserId: mechanic.id, correctionMinutes: -5 }));
    expect(context.syncJobStatus).not.toHaveBeenCalled();
  });
});
