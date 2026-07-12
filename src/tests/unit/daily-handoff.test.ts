import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { DailyHandoffRepository } from "@/server/repositories/daily-handoff-repository";
import { buildDailyHandoffDraft, submitDailyHandoff } from "@/server/services/daily-handoff";

const staff: AuthenticatedUser = { id: "staff-1", name: "Baraka Sales", email: "staff@example.com", isActive: true, roles: ["Sales"], duties: { all: [], direct: [], roleDefaults: [] } };
const flags = { enabled: true, startDayGateEnabled: true, taskAcceptanceEnabled: true, availableWorkEnabled: true, endOfDayReportEnabled: true, managerHealthEnabled: false };

function repository(): DailyHandoffRepository {
  return {
    findStaffDay: vi.fn(async () => ({ id: "staff-day-1", boardDayId: "board-1", userId: staff.id, startAcknowledgedAt: new Date("2026-07-11T13:00:00.000Z") })),
    listTasks: vi.fn(async () => [
      { id: "completed", title: "Completed follow-up", status: "COMPLETED", priority: "HIGH", dueAt: new Date("2026-07-11T14:00:00.000Z"), blockerReason: null, workflowArea: "SALES", customerReference: null, vehicleReference: null, checklistItems: [], comments: [] },
      { id: "blocked", title: "Waiting customer approval", status: "BLOCKED", priority: "HIGH", dueAt: new Date("2026-07-11T15:00:00.000Z"), blockerReason: "Customer unavailable", workflowArea: "SALES", customerReference: "Taylor R.", vehicleReference: null, checklistItems: [{ isRequired: true, completed: false }], comments: [{ body: "Call again tomorrow morning.", createdAt: new Date("2026-07-11T16:00:00.000Z") }] }
    ]),
    listActivity: vi.fn(async () => [{ eventType: "task.completed", message: "Completed follow-up", createdAt: new Date("2026-07-11T14:00:00.000Z"), taskId: "completed" }]),
    listRecommendations: vi.fn(async () => [{ status: "CLAIMED", dismissalReasonCode: null, taskId: "completed" }]),
    findLatestReport: vi.fn(async () => null),
    submitReport: vi.fn(async () => ({ id: "report-1", version: 1, submittedAt: new Date("2026-07-11T22:00:00.000Z") }))
  };
}

describe("daily handoff", () => {
  it("reconciles task totals and preserves carryover context", async () => {
    const result = await buildDailyHandoffDraft(staff, "2026-07-11", undefined, { flags, now: () => new Date("2026-07-11T20:00:00.000Z"), repository: repository() });
    expect(result.snapshot.totals).toMatchObject({ assigned: 2, completed: 1, blocked: 1, overdue: 1 });
    expect(result.snapshot.carryover).toEqual([expect.objectContaining({ id: "blocked", ownerUserId: staff.id, blockerReason: "Customer unavailable", nextStep: "Call again tomorrow morning." })]);
    expect(result.snapshot.recommendations.claimed).toBe(1);
  });

  it("requires confirmation and submits the authoritative snapshot", async () => {
    const testRepository = repository();
    await expect(submitDailyHandoff(staff, "2026-07-11", { accuracyConfirmed: false }, undefined, { flags, repository: testRepository })).rejects.toThrow("Confirm the handoff is accurate");
    const result = await submitDailyHandoff(staff, "2026-07-11", { accuracyConfirmed: true, additionalContext: "Customer requested a morning call.", tomorrowFollowUp: "Call Taylor at 9 AM." }, undefined, { flags, now: () => new Date("2026-07-11T22:00:00.000Z"), repository: testRepository, recordActivity: vi.fn(async () => undefined) });
    expect(result.version).toBe(1);
    expect(testRepository.submitReport).toHaveBeenCalledWith(expect.objectContaining({ accuracyConfirmed: true, submittedByUserId: staff.id, tomorrowFollowUp: "Call Taylor at 9 AM.", sourceSnapshot: expect.objectContaining({ carryover: expect.any(Array) }) }));
  });
});
