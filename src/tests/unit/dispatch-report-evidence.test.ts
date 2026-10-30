import { describe, expect, it, vi } from "vitest";
import { readDispatchEvidence } from "@/server/dispatch/evidence";
import type { Prisma } from "@prisma/client";
const base = { userId: "staff", personName: "Staff member", startDate: "2026-10-29", endDate: "2026-10-30", startsAt: new Date("2026-10-29T05:00Z"), endsAt: new Date("2026-10-30T05:00Z"), cutoffAt: new Date("2026-10-29T22:00Z") };
function database(events: unknown[], focuses: unknown[] = []) {
  return { activityEvent: { findMany: vi.fn().mockResolvedValue(events) }, workdayDailyFocusItem: { findMany: vi.fn().mockResolvedValue(focuses) } } as unknown as Pick<Prisma.TransactionClient, "activityEvent" | "workdayDailyFocusItem">;
}
const event = { id: "event-1", taskId: "task-1", actorUserId: "staff", eventType: "task.completed", message: "Repair completed", createdAt: new Date("2026-10-29T16:00Z"), metadata: { personId: "staff", title: "Repair glass", nextStatus: "COMPLETED", businessDate: "2026-10-29" } };
describe("dated dispatch report evidence", () => {
  it("attributes a completion to the worker recorded at the event rather than a later assignee", async () => {
    const result = await readDispatchEvidence(database([event]), base);
    expect(result.observations).toEqual([expect.objectContaining({ taskId: "task-1", row: expect.objectContaining({ title: "Repair glass", owner: "Staff member", state: "COMPLETED" }) })]);
  });
  it("keeps a manager's coordination visible without counting another person's completion as their own", async () => {
    const result = await readDispatchEvidence(database([{ ...event, metadata: { ...event.metadata, personId: "other" } }]), base);
    expect(result.observations).toHaveLength(0); expect(result.activity[0].state).toBe("COORDINATION");
  });
  it("keeps old unattributed events as activity rather than inventing completion evidence", async () => {
    const result = await readDispatchEvidence(database([{ ...event, metadata: {} }]), base);
    expect(result.observations).toHaveLength(0); expect(result.activity).toHaveLength(1); expect(result.sourceQuality).toBe("PARTIAL");
  });
  it("separates planned workbook outcomes from recorded completions", async () => {
    const result = await readDispatchEvidence(database([], [{ id: "focus-1", outcome: "Photograph arrivals", status: "PLANNED", convertedTaskId: null }]), base);
    expect(result.plannedFocus[0].title).toBe("Photograph arrivals"); expect(result.manualCompleted).toHaveLength(0);
  });
  it("freezes manual completion titles from their event and limits reads to the submission cutoff", async () => {
    const db = database([{ ...event, taskId: null, eventType: "dispatch.complete_focus", metadata: { personId: "staff", focusId: "focus-1", title: "Original outcome", state: "UNKNOWN" } }]);
    const result = await readDispatchEvidence(db, base);
    expect(result.manualCompleted[0]).toMatchObject({ id: "focus:focus-1", title: "Original outcome", state: "COMPLETED" });
    expect(db.activityEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ createdAt: { gte: base.startsAt, lt: base.cutoffAt } }) }));
  });
});
