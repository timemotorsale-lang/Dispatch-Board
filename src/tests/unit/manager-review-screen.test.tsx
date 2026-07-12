import { TaskSourceType, TaskStatus, WorkflowArea } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ManagerReviewScreen } from "@/features/manager-review/manager-review-screen";
import type { BoardReadTask } from "@/server/services/board-read";
import type {
  ManagerReviewCommandItem,
  ManagerReviewCommandQueue
} from "@/server/services/manager-review";

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
    priority: "HIGH",
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

function createCommandItem(
  task: BoardReadTask,
  queue: ManagerReviewCommandQueue,
  overrides: Partial<Omit<ManagerReviewCommandItem, "task" | "queue">> = {}
): ManagerReviewCommandItem {
  return {
    task,
    queue,
    attentionReason: "Current task state requires a manager decision.",
    isPastTaskDue: true,
    requiredUpdateCount: 0,
    completedRequiredUpdateCount: 0,
    missingRequiredUpdateCount: 0,
    ...overrides
  };
}

function createCommandItems(): ManagerReviewCommandItem[] {
  return [
    createCommandItem(
      createTask("review-1", {
        priority: "CRITICAL",
        vehicleReference: "Stock #TMS-4821",
        customerReference: null
      }),
      "READY_FOR_REVIEW",
      {
        attentionReason: "Critical task priority; ready for a manager completion decision."
      }
    ),
    createCommandItem(
      createTask("blocked-1", {
        status: TaskStatus.BLOCKED,
        blockerReason: "Waiting on signed approval.",
        requiresManagerApproval: false
      }),
      "BLOCKED",
      {
        attentionReason: "Blocked: Waiting on signed approval."
      }
    ),
    createCommandItem(
      createTask("claimable-1", {
        status: TaskStatus.NOT_STARTED,
        isClaimable: true,
        requiresManagerApproval: false
      }),
      "NEEDS_ASSIGNMENT",
      {
        attentionReason: "Claimable work needs an accountable assignment."
      }
    )
  ];
}

describe("manager review screen", () => {
  function renderCommandCenter() {
    return renderToStaticMarkup(
      <ManagerReviewScreen
        boardDate="2026-07-05"
        boardExists
        errorMessage={null}
        fullBoardHref="/board?date=2026-07-05"
        generatedAt="2026-07-05T13:00:00.000Z"
        generationStatus="GENERATED"
        initialCommandItems={createCommandItems()}
        initialFocus=""
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
  }

  it("renders the approved queue, ranked worklist, and persistent decision workbench", () => {
    const markup = renderCommandCenter();

    expect(markup).toContain("Manager Review Command Center");
    expect(markup).toContain('aria-label="Manager Review Command Center"');
    expect(markup).toContain('aria-label="Manager review summary"');
    expect(markup).toContain('aria-label="Manager review queues"');
    expect(markup).toContain('aria-label="Ranked manager worklist"');
    expect(markup).toContain('aria-label="Selected review workbench"');
    expect(markup).toContain('class="manager-review-command-layout"');
    expect(markup).toContain('class="manager-review-command-queue-rail"');
    expect(markup).toContain('class="manager-review-command-worklist"');
    expect(markup).toContain('class="manager-review-command-workbench"');
    expect(markup).toContain("Search manager work");
    expect(markup).toContain("Live Command");
    expect(markup).toContain("Review health");
    expect(markup).toContain("Task review-1");
    expect(markup).toContain("Stock #TMS-4821");
    expect(markup).toContain('aria-label="Select Task review-1"');
    expect(markup).toContain("Decision required");
    expect(markup).toContain("Approve completion or return this work for correction.");
    expect(markup).toContain('aria-label="Manager review decisions"');
    expect(markup).toContain("Approve");
    expect(markup).toContain("Return to work");
    expect(markup).toContain("Request evidence");
    expect(markup).toContain("Reassign");
    expect(markup).toContain("Escalate");
    expect(markup).toContain("Task blocked-1");
    expect(markup).toContain("Task claimable-1");
    expect(markup).toContain("<strong>3</strong><span>Awaiting decision</span>");
  });

  it("labels unavailable review metrics honestly instead of rendering mockup values", () => {
    const markup = renderCommandCenter();

    expect(markup).toContain("Past task due");
    expect(markup).toContain("Not review SLA");
    expect(markup).toContain("Customer risk");
    expect(markup).toContain("Risk model planned");
    expect(markup).toContain("Returned work");
    expect(markup).toContain("Review history planned");
    expect(markup).toContain("Within review SLA");
    expect(markup).toContain("Review SLA planned");
    expect(markup).toContain("Not configured");
    expect(markup).toContain("No structured submission fields configured");
    expect(markup).toContain("MAE-1 risk scoring and review SLA explanations remain planned.");
    expect(markup).not.toContain("92%");
    expect(markup).not.toContain("Priority 87");
    expect(markup).not.toContain("SLA breached");
  });
});
