import { TaskStatus } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { TaskExecutionRecord, TaskExecutionRepository } from "@/server/repositories/task-execution-repository";
import { acceptTask, evaluateTaskCompletionReadiness, overrideTaskCompletion } from "@/server/services/task-execution-readiness";

const staff: AuthenticatedUser = {
  id: "staff-1",
  name: "Baraka Sales",
  email: "staff@example.com",
  isActive: true,
  roles: ["Sales"],
  duties: { all: [], direct: [], roleDefaults: [] }
};

const manager: AuthenticatedUser = {
  ...staff,
  id: "manager-1",
  name: "Eli Manager",
  roles: ["General Manager"]
};

function task(overrides: Partial<TaskExecutionRecord> = {}): TaskExecutionRecord {
  return {
    id: "task-1",
    boardDayId: "board-1",
    title: "Confirm customer delivery",
    assignedUserId: staff.id,
    status: TaskStatus.IN_PROGRESS,
    blockerReason: null,
    requiresManagerApproval: false,
    acceptedAt: null,
    acceptedByUserId: null,
    templateSnapshot: {
      requiredUpdateFields: [{ key: "delivery_result", label: "Delivery result", type: "short_text", required: true }]
    },
    updateFieldValues: {},
    checklistItems: [{ key: "vehicle", label: "Verify vehicle", isRequired: true, completed: false }],
    concernLink: null,
    ...overrides
  } as TaskExecutionRecord;
}

describe("task execution readiness", () => {
  it("explains every unmet requirement and routes approval work to review", () => {
    const result = evaluateTaskCompletionReadiness(task({
      blockerReason: "Waiting for keys",
      requiresManagerApproval: true,
      status: TaskStatus.BLOCKED
    }));

    expect(result.ready).toBe(false);
    expect(result.nextCompletionStatus).toBe(TaskStatus.READY_FOR_REVIEW);
    expect(result.requirements.map((requirement) => requirement.label)).toEqual([
      "Verify vehicle",
      "Provide Delivery result",
      "Resolve the active blocker"
    ]);
  });

  it("reports ready when required checklist and update evidence are satisfied", () => {
    const result = evaluateTaskCompletionReadiness(task({
      checklistItems: [{ key: "vehicle", label: "Verify vehicle", isRequired: true, completed: true }],
      updateFieldValues: { delivery_result: "Customer accepted delivery." }
    }));

    expect(result.ready).toBe(true);
    expect(result.requirements).toEqual([
      { code: "checklist:vehicle", label: "Verify vehicle", satisfied: true }
    ]);
  });

  it("accepts once and returns the existing acceptance on retry", async () => {
    const acceptedAt = new Date("2026-07-11T14:00:00.000Z");
    const initial = task();
    const accepted = task({ acceptedAt, acceptedByUserId: staff.id });
    const repository: TaskExecutionRepository = {
      findTask: vi.fn().mockResolvedValueOnce(initial).mockResolvedValueOnce(accepted),
      acceptTask: vi.fn(async () => accepted),
      overrideCompletion: vi.fn(async () => accepted)
    };
    const recordActivity = vi.fn(async () => undefined);
    const flags = {
      enabled: true,
      startDayGateEnabled: true,
      taskAcceptanceEnabled: true,
      availableWorkEnabled: false,
      endOfDayReportEnabled: false,
      managerHealthEnabled: false
    };

    await acceptTask(staff, initial.id, { flags, now: () => acceptedAt, recordActivity, repository });
    await acceptTask(staff, initial.id, { flags, now: () => acceptedAt, recordActivity, repository });

    expect(repository.acceptTask).toHaveBeenCalledTimes(1);
    expect(recordActivity).toHaveBeenCalledTimes(1);
  });

  it("records a reasoned manager override and emits one audit event", async () => {
    const overriddenAt = new Date("2026-07-11T15:00:00.000Z");
    const initial = task();
    const overridden = task({
      completionOverrideAt: overriddenAt,
      completionOverrideByUserId: manager.id,
      completionOverrideReason: "Customer safety requires immediate documented closure."
    });
    const repository: TaskExecutionRepository = {
      findTask: vi.fn(async () => initial),
      acceptTask: vi.fn(async () => initial),
      overrideCompletion: vi.fn(async () => overridden)
    };
    const recordActivity = vi.fn(async () => undefined);
    const flags = {
      enabled: true,
      startDayGateEnabled: true,
      taskAcceptanceEnabled: true,
      availableWorkEnabled: false,
      endOfDayReportEnabled: false,
      managerHealthEnabled: false
    };

    const result = await overrideTaskCompletion(manager, initial.id, {
      reason: "Customer safety requires immediate documented closure."
    }, { flags, now: () => overriddenAt, recordActivity, repository });

    expect(result.completionOverride?.reason).toContain("Customer safety");
    expect(repository.overrideCompletion).toHaveBeenCalledWith(initial.id, manager.id, expect.any(String), overriddenAt);
    expect(recordActivity).toHaveBeenCalledOnce();
    await expect(overrideTaskCompletion(staff, initial.id, { reason: "A sufficiently long reason." }, { flags, repository })).rejects.toThrow("Manager access is required");
  });
});
