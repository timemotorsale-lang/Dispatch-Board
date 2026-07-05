import { TaskSourceType, TaskStatus, WorkflowArea } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ManagerReviewScreen } from "@/features/manager-review/manager-review-screen";
import type { BoardReadTask } from "@/server/services/board-read";
import type { ManagerAttentionBucket } from "@/server/services/manager-review";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}));

function createTask(id: string, overrides: Partial<BoardReadTask> = {}): BoardReadTask {
  return {
    id,
    title: `Task ${id}`,
    description: "Keep work moving.",
    status: TaskStatus.READY_FOR_REVIEW,
    dueAt: "2026-07-05T16:00:00.000Z",
    updatedAt: "2026-07-05T15:00:00.000Z",
    workflowArea: WorkflowArea.SALES,
    sourceType: TaskSourceType.TEMPLATE,
    requiresManagerApproval: true,
    requiredUpdateFields: [],
    updateFieldValues: {},
    assignedUser: {
      id: `user-${id}`,
      name: `User ${id}`,
      email: `user-${id}@local.test`
    },
    recommendedUser: null,
    recommendation: null,
    vehicleReference: null,
    customerReference: "Taylor R.",
    blockerReason: null,
    readyForReviewAt: "2026-07-05T15:20:00.000Z",
    completedAt: null,
    ...overrides
  };
}

function createAttentionBuckets(): ManagerAttentionBucket[] {
  return [
    {
      label: "Blocked",
      description: "Work is stalled and needs a next decision.",
      status: TaskStatus.BLOCKED,
      tasks: [
        createTask("blocked-1", {
          status: TaskStatus.BLOCKED,
          blockerReason: "Waiting on signed approval."
        })
      ]
    },
    {
      label: "Waiting on Parts",
      description: "Track ETAs and unblock repair or recon work.",
      status: TaskStatus.WAITING_ON_PARTS,
      tasks: []
    },
    {
      label: "Waiting on Approval",
      description: "Manager action is holding the next step.",
      status: TaskStatus.WAITING_ON_APPROVAL,
      tasks: []
    }
  ];
}

describe("manager review screen", () => {
  it("renders both the approval queue and the broader attention queue", () => {
    const markup = renderToStaticMarkup(
      <ManagerReviewScreen
        boardDate="2026-07-05"
        boardExists
        errorMessage={null}
        fullBoardHref="/board?date=2026-07-05"
        generatedAt="2026-07-05T13:00:00.000Z"
        generationStatus="GENERATED"
        initialAttentionBuckets={createAttentionBuckets()}
        initialFocus=""
        initialTasks={[createTask("review-1")]}
        assignableUsers={[
          {
            id: "user-blocked-1",
            name: "User blocked-1",
            email: "user-blocked-1@local.test",
            roles: ["Mechanic"],
            dutySource: "custom",
            dutyPreview: ["Repair follow-up"],
            dutyCount: 1
          },
          {
            id: "manager-1",
            name: "Eli Manager",
            email: "eli@local.test",
            roles: ["General Manager"],
            dutySource: "role_default",
            dutyPreview: ["Review blocked tasks"],
            dutyCount: 1
          }
        ]}
        nowIso="2026-07-05T18:00:00.000Z"
      />
    );

    expect(markup).toContain("Ready for Review");
    expect(markup).toContain("Attention queue");
    expect(markup).toContain("Blocked");
    expect(markup).toContain("Task blocked-1");
    expect(markup).toContain("/manager-review?date=2026-07-05&amp;focus=BLOCKED");
    expect(markup).toContain("Save assignment");
    expect(markup).toContain("Next status");
    expect(markup).toContain("At Risk");
    expect(markup).toContain("Last updated 3h ago");
    expect(markup).toContain("No tasks are currently in this status.");
  });
});
