import { describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/server/auth/store";
import { activeSeconds, buildWorkTimeGuidance, normalizeWorkSessionCommand } from "@/server/inventory-execution/work-time-domain";
import { controlInventoryWorkSession, startInventoryWorkSession } from "@/server/inventory-execution/work-time-service";

const technician: AuthenticatedUser = { id: "tech", name: "Tech", email: "tech@example.com", isActive: true, roles: ["Technician"], duties: { direct: [], roleDefaults: [], all: [] } };
const other = { ...technician, id: "other" };
const now = new Date("2026-07-19T18:00:00Z");

describe("Inventory EOS work-time guidance", () => {
  it("calculates active touch time without counting paused time", () => {
    expect(activeSeconds({ accumulatedSeconds: 300, activeSince: new Date("2026-07-19T17:55:00Z"), status: "ACTIVE" }, now)).toBe(600);
    expect(activeSeconds({ accumulatedSeconds: 300, activeSince: null, status: "PAUSED" }, now)).toBe(300);
  });

  it("uses explainable checkpoints and never turns time into automatic discipline", () => {
    expect(buildWorkTimeGuidance({ activeSeconds: 44 * 60, estimateMinutes: 60 }).code).toBe("ON_TRACK");
    expect(buildWorkTimeGuidance({ activeSeconds: 45 * 60, estimateMinutes: 60 }).code).toBe("CHECKPOINT_DUE");
    expect(buildWorkTimeGuidance({ activeSeconds: 60 * 60, estimateMinutes: 60 }).code).toBe("ESTIMATE_REACHED");
    expect(buildWorkTimeGuidance({ activeSeconds: 75 * 60, estimateMinutes: 60 }).code).toBe("OVERRUN_REVIEW");
    expect(buildWorkTimeGuidance({ activeSeconds: 90 * 60, estimateMinutes: 60 })).toMatchObject({ code: "STOP_AND_REASSESS", message: expect.stringContaining("request manager direction") });
  });

  it("requires structured pause/checkpoint reasons and conditional detail", () => {
    expect(() => normalizeWorkSessionCommand({ action: "PAUSE", expectedVersion: 1, idempotencyKey: "pause-1", reason: "Pause work for a governed reason." })).toThrow("structured reason");
    expect(() => normalizeWorkSessionCommand({ action: "CHECKPOINT", checkpointCode: "OTHER", expectedVersion: 1, idempotencyKey: "check-1", reason: "Record current progress state." })).toThrow("brief note");
    expect(normalizeWorkSessionCommand({ action: "CHECKPOINT", checkpointCode: "ON_TRACK", expectedVersion: 1, idempotencyKey: "check-2", reason: "Record current progress state." })).toMatchObject({ action: "CHECKPOINT", checkpointCode: "ON_TRACK" });
  });

  it("starts only ready current work for the assigned executor", async () => {
    const start = vi.fn(async () => ({ duplicate: false, result: { id: "session" }, version: 1 })), repository = { getPacketContext: vi.fn(async () => ({ id: "packet", state: "CURRENT", readiness: "READY", estimatedMinutes: 60, task: { assignedUserId: "tech" } })), getSessionContext: vi.fn(), start, control: vi.fn() };
    await expect(startInventoryWorkSession(technician, "packet", { idempotencyKey: "start-1", reason: "Start assigned repair work now." }, { now: () => now, organizationId: "org", repository: repository as never })).resolves.toMatchObject({ version: 1, guidance: { code: "ON_TRACK" } });
    await expect(startInventoryWorkSession(other, "packet", { idempotencyKey: "start-2", reason: "Attempt unassigned repair work." }, { now: () => now, organizationId: "org", repository: repository as never })).rejects.toThrow("assigned executor");
    repository.getPacketContext.mockResolvedValueOnce({ id: "packet", state: "CURRENT", readiness: "NOT_READY", estimatedMinutes: 60, task: { assignedUserId: "tech" } });
    await expect(startInventoryWorkSession(technician, "packet", { idempotencyKey: "start-3", reason: "Attempt work before readiness." }, { now: () => now, organizationId: "org", repository: repository as never })).rejects.toThrow("readiness gates");
  });

  it("preserves optimistic versions and assigned-executor authority on controls", async () => {
    const control = vi.fn(async () => ({ duplicate: false, result: { status: "PAUSED" }, version: 2 })), repository = { getPacketContext: vi.fn(), getSessionContext: vi.fn(async () => ({ id: "session", userId: "tech", workPacketId: "packet", status: "ACTIVE", version: 1 })), start: vi.fn(), control };
    await controlInventoryWorkSession(technician, "session", { action: "PAUSE", checkpointCode: "PARTS_ISSUE", expectedVersion: 1, idempotencyKey: "pause-1", reason: "Pause because required parts are unavailable." }, { now: () => now, organizationId: "org", repository: repository as never });
    expect(control).toHaveBeenCalledWith(expect.objectContaining({ commandType: "PAUSE_INVENTORY_WORK_SESSION", expectedVersion: 1 }), expect.objectContaining({ action: "PAUSE", checkpointCode: "PARTS_ISSUE" }));
    await expect(controlInventoryWorkSession(other, "session", { action: "RESUME", expectedVersion: 1, idempotencyKey: "resume-1", reason: "Attempt to resume another executor session." }, { now: () => now, organizationId: "org", repository: repository as never })).rejects.toThrow("assigned executor");
  });
});
