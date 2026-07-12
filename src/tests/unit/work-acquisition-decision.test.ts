import { TaskStatus, TaskTemplatePriority, WorkflowArea } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { decideWorkAcquisition } from "@/server/services/work-acquisition-decision";

const now = new Date("2026-07-12T14:00:00.000Z");
const candidate = {
  assignedUserId: "queue-owner",
  blockerReason: null,
  dueAt: new Date("2026-07-12T15:00:00.000Z"),
  id: "task-1",
  isClaimable: true,
  priority: TaskTemplatePriority.HIGH,
  recommendedUserId: "user-1",
  requiresManagerApproval: false,
  sourceDutyId: "duty-1",
  status: TaskStatus.NOT_STARTED,
  workflowArea: WorkflowArea.SHOP
};
const actor = {
  activeWorkCount: 2,
  dutyIds: new Set(["duty-1"]),
  isActive: true,
  isManager: false,
  userId: "user-1",
  workflowAreas: new Set(["SHOP"])
};

describe("work acquisition decision engine", () => {
  it("allows a strong eligible match to claim directly", () => {
    const decision = decideWorkAcquisition({ actor, candidate, now });
    expect(decision.policy).toBe("DIRECT_CLAIM");
    expect(decision.eligible).toBe(true);
    expect(decision.score).toBeGreaterThan(70);
    expect(decision.explanation).toContain("claim this task now");
  });

  it("routes approval-controlled work through a request", () => {
    const decision = decideWorkAcquisition({
      actor,
      candidate: { ...candidate, requiresManagerApproval: true },
      now
    });
    expect(decision.policy).toBe("APPROVAL_REQUIRED");
  });

  it("rejects blocked and over-capacity work with reasons", () => {
    const decision = decideWorkAcquisition({
      actor: { ...actor, activeWorkCount: 8 },
      candidate: { ...candidate, blockerReason: "Waiting for a lift" },
      now
    });
    expect(decision.policy).toBe("UNAVAILABLE");
    expect(decision.reasons).toContain("This task has an active blocker.");
    expect(decision.reasons).toContain("Your active workload is at its configured limit.");
  });

  it("keeps general-manager work manager-assigned", () => {
    const decision = decideWorkAcquisition({
      actor,
      candidate: { ...candidate, workflowArea: WorkflowArea.GENERAL_MANAGER },
      now
    });
    expect(decision.policy).toBe("MANAGER_ASSIGN_ONLY");
  });
});
