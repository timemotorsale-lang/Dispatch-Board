import { TaskSourceType, TaskStatus, WorkflowArea } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { vi } from "vitest";
import { TaskDetailWorkspace } from "@/features/tasks/detail/task-detail-workspace";
import type { TaskReadModel } from "@/server/services/task-read";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn()
  })
}));

function createTask(overrides: Partial<TaskReadModel> = {}): TaskReadModel {
  return {
    id: "TMS-1493",
    boardDayId: "board-day-1",
    boardDate: "2026-07-04",
    title: "Vehicle Recon & Inspection",
    description: "The vehicle reconditioning and inspection on the 2018 Ford Explorer should be completed before sale.",
    status: TaskStatus.IN_PROGRESS,
    dueAt: "2026-07-04T17:00:00.000Z",
    workflowArea: WorkflowArea.SHOP,
    sourceType: TaskSourceType.TEMPLATE,
    requiresManagerApproval: true,
    requiredUpdateFields: [],
    updateFieldValues: {},
    templateChecklistItems: [],
    completionCriteria: null,
    approvalRules: null,
    intelligenceSignalType: null,
    vehicleReference: "2018 Ford Explorer",
    customerReference: null,
    blockerReason: null,
    readyForReviewAt: null,
    completedAt: null,
    createdAt: "2026-07-04T13:00:00.000Z",
    updatedAt: "2026-07-04T14:00:00.000Z",
    assignedUser: {
      id: "user-sarah",
      name: "Sarah M.",
      email: "sarah@local.test"
    },
    recommendedUser: null,
    recommendation: null,
    createdByUser: null,
    reviewedByUser: null,
    checklistItems: [],
    activityHistory: [],
    comments: [
      {
        id: "comment-1",
        taskId: "TMS-1493",
        authorUserId: "user-sarah",
        body: "Need confirmation on brake rotor thickness.",
        createdAt: "2026-07-04T14:05:00.000Z",
        author: {
          id: "user-sarah",
          name: "Sarah M.",
          email: "sarah@local.test"
        }
      }
    ],
    ...overrides
  };
}

describe("task detail workspace", () => {
  it("renders the enterprise split workspace with workbench and metadata rail", () => {
    const markup = renderToStaticMarkup(
      <TaskDetailWorkspace
        activityEvents={[
          {
            id: "event-1",
            boardDate: "2026-07-04",
            eventType: "task.status_updated",
            message: "System updated the task after inspection started.",
            metadata: {},
            createdAt: "2026-07-04T13:30:00.000Z",
            actor: {
              id: "user-system",
              name: "System"
            },
            task: {
              id: "TMS-1493",
              title: "Vehicle Recon & Inspection"
            }
          }
        ]}
        actorIsManager
        assignableUsers={[
          {
            id: "user-sarah",
            name: "Sarah M.",
            email: "sarah@local.test",
            roles: ["Mechanic"],
            dutySource: "custom",
            dutyPreview: [],
            dutyCount: 0
          }
        ]}
        canComment
        canCreateAppointment
        canUpdateStatus
        task={createTask()}
      />
    );

    expect(markup).toContain("Vehicle Recon &amp; Inspection");
    expect(markup).toContain("Description");
    expect(markup).toContain("Definition of Done");
    expect(markup).toContain("Subtasks");
    expect(markup).toContain("Updates &amp; Comments");
    expect(markup).toContain("Attachments");
    expect(markup).toContain("Metadata &amp; Configuration");
    expect(markup).toContain("Ticket Details");
    expect(markup).toContain("Create Appointment");
    expect(markup).toContain("Create linked draft");
    expect(markup).toContain("Open Board");
    expect(markup).toContain("Planning");
  });
});
