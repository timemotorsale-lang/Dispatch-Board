import { TaskAssignmentRequestStatus, TaskStatus, TaskTemplatePriority, WorkflowArea } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type {
  TaskAcquisitionRepository,
  TaskAcquisitionTaskRecord,
  TaskAssignmentRequestRecord
} from "@/server/repositories/task-acquisition-repository";
import {
  claimTask,
  decideTaskAssignmentRequest,
  requestTaskAssignment,
  startAcquiredTask
} from "@/server/services/task-acquisition-service";

const staff: AuthenticatedUser = {
  id: "staff-1",
  name: "Walter Mechanic",
  email: "walter@example.com",
  isActive: true,
  roles: ["Technician"],
  duties: { all: ["Diagnostics"], direct: ["Diagnostics"], roleDefaults: [] }
};
const manager: AuthenticatedUser = {
  ...staff,
  id: "manager-1",
  name: "Eli Manager",
  roles: ["General Manager"]
};
const now = new Date("2026-07-12T14:00:00.000Z");

function task(overrides: Partial<TaskAcquisitionTaskRecord> = {}): TaskAcquisitionTaskRecord {
  return {
    id: "task-1",
    boardDayId: "board-1",
    title: "Diagnose brake vibration",
    assignedUserId: "queue-owner",
    blockerReason: null,
    dueAt: new Date("2026-07-12T15:00:00.000Z"),
    isClaimable: true,
    priority: TaskTemplatePriority.HIGH,
    recommendedUserId: "staff-1",
    requiresManagerApproval: false,
    sourceDutyId: "duty-1",
    status: TaskStatus.NOT_STARTED,
    workflowArea: WorkflowArea.SHOP,
    boardDay: { date: new Date("2026-07-12T00:00:00.000Z") },
    assignedUser: { id: "queue-owner", name: "Service Queue" },
    ...overrides
  };
}

function requestRecord(overrides: Partial<TaskAssignmentRequestRecord> = {}): TaskAssignmentRequestRecord {
  return {
    id: "request-1",
    status: TaskAssignmentRequestStatus.PENDING,
    requestReason: null,
    decisionReason: null,
    decidedAt: null,
    cancelledAt: null,
    createdAt: now,
    updatedAt: now,
    requesterUser: { id: staff.id, name: staff.name, email: staff.email },
    decidedByUser: null,
    task: task(),
    ...overrides
  };
}

function repository(overrides: Partial<TaskAcquisitionRepository> = {}): TaskAcquisitionRepository {
  return {
    findActorProfile: vi.fn(async () => ({
      activeWorkCount: 1,
      dutyIds: ["duty-1"],
      isActive: true,
      workflowAreas: ["SHOP"]
    })),
    findTask: vi.fn(async () => task()),
    listClaimableTasks: vi.fn(async () => []),
    listRequestsForUser: vi.fn(async () => []),
    listPendingRequests: vi.fn(async () => []),
    claimTask: vi.fn(async (_task, userId) => task({ assignedUserId: userId, isClaimable: false, assignedUser: { id: userId, name: staff.name } })),
    createRequest: vi.fn(async () => requestRecord()),
    cancelRequest: vi.fn(async () => requestRecord({ status: TaskAssignmentRequestStatus.CANCELLED, cancelledAt: now })),
    decideRequest: vi.fn(async (input) => requestRecord({ status: input.decision, decidedAt: input.decidedAt, decidedByUser: { id: manager.id, name: manager.name } })),
    startTask: vi.fn(async (_taskId, userId) => task({ assignedUserId: userId, status: TaskStatus.IN_PROGRESS, assignedUser: { id: userId, name: staff.name } })),
    ...overrides
  };
}

describe("task acquisition service", () => {
  it("rechecks policy, claims atomically, and audits", async () => {
    const repo = repository();
    const recordActivity = vi.fn(async () => undefined);
    const result = await claimTask(staff, "task-1", { repository: repo, recordActivity, now: () => now });
    expect(result.decision.policy).toBe("DIRECT_CLAIM");
    expect(repo.claimTask).toHaveBeenCalledWith(expect.objectContaining({ id: "task-1" }), staff.id, now);
    expect(recordActivity).toHaveBeenCalledWith(expect.objectContaining({ eventType: "task.claimed", taskId: "task-1" }));
  });

  it("creates one approval request for approval-controlled work", async () => {
    const repo = repository({ findTask: vi.fn(async () => task({ requiresManagerApproval: true })) });
    const result = await requestTaskAssignment(staff, "task-1", { reason: "I have the right certification." }, { repository: repo, recordActivity: vi.fn(async () => undefined), now: () => now });
    expect(result.status).toBe("PENDING");
    expect(repo.createRequest).toHaveBeenCalledWith("task-1", staff.id, "I have the right certification.");
  });

  it("requires a manager and a decline reason for decisions", async () => {
    const repo = repository();
    await expect(decideTaskAssignmentRequest(staff, "request-1", { decision: "APPROVED" }, { repository: repo })).rejects.toThrow("Manager access required");
    await expect(decideTaskAssignmentRequest(manager, "request-1", { decision: "DECLINED" }, { repository: repo })).rejects.toThrow("reason is required");
    const result = await decideTaskAssignmentRequest(manager, "request-1", { decision: "APPROVED" }, { repository: repo, recordActivity: vi.fn(async () => undefined), now: () => now });
    expect(result.status).toBe("APPROVED");
  });

  it("starts only assigned work and returns the Workbench route", async () => {
    const repo = repository({ findTask: vi.fn(async () => task({ assignedUserId: staff.id, assignedUser: { id: staff.id, name: staff.name } })) });
    const result = await startAcquiredTask(staff, "task-1", { repository: repo, recordActivity: vi.fn(async () => undefined), now: () => now });
    expect(result.workbenchHref).toBe("/tasks/task-1");
    expect(repo.startTask).toHaveBeenCalledWith("task-1", staff.id, now);
  });
});
