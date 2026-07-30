import { describe, expect, it } from "vitest";

import {
  mapSalesTaskPromise,
  salesTaskPromiseIntegration,
  salesTaskPromiseWritesRemainGoverned
} from "@/features/sales/sales-console-m53-task-promise-integration";

describe("Sales Console M53 task promise integration", () => {
  it("maps task and promise source records into queue context", () => {
    const task = mapSalesTaskPromise(
      {
        taskId: "TASK-1",
        title: "Collect proof of income",
        dueAt: "2026-07-30T14:00:00.000Z",
        ownerId: "USER-2",
        ownerRole: "Salesperson",
        blockerOwner: "Customer",
        promiseType: "document",
        evidenceStatus: "missing",
        sourceRoute: "/tasks/TASK-1",
        opportunityId: "REV-1002",
        completed: false,
        updatedAt: "2026-07-30T09:00:00.000Z"
      },
      new Date("2026-07-30T15:00:00.000Z")
    );

    expect(task.dueLabel).toBe("overdue");
    expect(task.freshness).toBe("stale");
    expect(task.visibleToRoles).toContain("Sales Manager");
  });

  it("keeps task completion writes governed by task infrastructure", () => {
    const task = mapSalesTaskPromise(
      {
        taskId: "TASK-2",
        title: "Confirm appointment",
        dueAt: "2026-07-31T14:00:00.000Z",
        ownerId: "BDC-1",
        ownerRole: "BDC / Lead Coordinator",
        promiseType: "callback",
        evidenceStatus: "not-required",
        sourceRoute: "/tasks/TASK-2",
        completed: false,
        updatedAt: "2026-07-30T09:00:00.000Z"
      },
      new Date("2026-07-30T15:00:00.000Z")
    );

    expect(salesTaskPromiseWritesRemainGoverned(task)).toBe(true);
    expect(salesTaskPromiseIntegration.governedWrites).toContain("complete task");
  });
});
