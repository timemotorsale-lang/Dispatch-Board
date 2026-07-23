import { TaskSourceType, TaskStatus, WorkflowArea } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { vi } from "vitest";
import { TaskDetailWorkspace } from "@/features/tasks/detail/task-detail-workspace";
import { normalizeRequiredUpdateProgress } from "@/features/tasks/detail/task-required-update-progress";
import { TaskWorkbenchActionBar } from "@/features/tasks/detail/task-workbench-action-bar";
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
    priority: "HIGH",
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
    appointmentLinks: [],
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
    concernWorkspace: null,
    ...overrides
  };
}

describe("task detail workspace", () => {
  it("keeps task actions available when completion progress is absent", () => {
    const markup = renderToStaticMarkup(
      <TaskWorkbenchActionBar
        canComplete
        returnTo="/tasks"
        status={TaskStatus.IN_PROGRESS}
        taskId="task-with-legacy-data"
      />
    );

    expect(markup).toContain("Review completion");
    expect(markup).not.toContain("of <!-- -->0<!-- --> ready");
  });

  it("normalizes malformed completion progress instead of exposing unsafe state", () => {
    expect(normalizeRequiredUpdateProgress(undefined)).toEqual({
      missingFieldKeys: [],
      readyCount: 0,
      totalCount: 0
    });
    expect(normalizeRequiredUpdateProgress({
      missingFieldKeys: ["focus_summary", null, 42],
      readyCount: 9,
      totalCount: 3
    })).toEqual({
      missingFieldKeys: ["focus_summary"],
      readyCount: 3,
      totalCount: 3
    });
  });

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
    expect(markup).toContain("Task Resolution Workbench");
    expect(markup).toContain("Generated Resolution Tasks");
    expect(markup).toContain("Checklist");
    expect(markup).toContain("Confirm the reported symptom and operating conditions");
    expect(markup).toContain("Inspect the affected safety or mechanical system");
    expect(markup).toContain("Case Notes");
    expect(markup).toContain('class="etw-note-heading"');
    expect(markup).toContain("Expand All");
    expect(markup).toContain("Collapse All");
    expect(markup).toContain("Customer Communication");
    expect(markup).toContain("SLA &amp; Risk");
    expect(markup).toContain("Customer &amp; Vehicle");
    expect(markup).toContain("Workflow Command");
    expect(markup).toContain("Create Appointment");
    expect(markup).toContain("Create linked draft");
    expect(markup).toContain("Open Board");
    expect(markup).toContain("No appointment is linked yet.");
    expect(markup).toContain("Estimated Time");
    expect(markup).toContain("Review completion");
    expect(markup).toContain('class="etw-new-action"');
    expect(markup).toContain("Task Intake");
    expect(markup).not.toContain("+ New");
    expect(markup).not.toContain('class="primary" href="/tasks/intake');
    expect(markup).toContain("Focus view");
    expect(markup).toContain("Collaborators");
    expect(markup).toContain("Share");
    expect(markup).toContain("Subtasks");
    expect(markup).toContain("Add a subtask...");
    expect(markup).not.toContain("Activity (Latest)");
    expect(markup).toContain("More task actions");
    expect(markup).toContain("Open note templates");
    expect(markup).toContain(">Comment</button>");
    expect(markup).not.toContain(">Add Note</button>");
    expect(markup).not.toContain('class="etw-note-actions"');
    expect(markup).not.toContain("Internal Notes (Manager Only)");
  });

  it("guides incomplete completion updates to the authoritative form", () => {
    const markup = renderToStaticMarkup(
      <TaskDetailWorkspace
        activityEvents={[]}
        actorIsManager
        assignableUsers={[]}
        canComment
        canCreateAppointment
        canUpdateStatus
        task={createTask({
          requiredUpdateFields: [
            { key: "focus_summary", label: "Focus summary", type: "long_text", required: true, helpText: null },
            { key: "top_priority", label: "Top priority", type: "short_text", required: true, helpText: null },
            { key: "staffing_risk", label: "Staffing risk", type: "boolean", required: false, helpText: null }
          ],
          updateFieldValues: {}
        })}
      />
    );

    expect(markup).toContain("Finish required update");
    expect(markup).toContain("0 of 2 required fields complete");
    expect(markup).not.toContain("1 of 3 ready");
    expect(markup.match(/data-state="required"/g)).toHaveLength(2);
    expect(markup.match(/data-state="optional"/g)).toHaveLength(1);
    expect(markup).toContain("Review summary");
    expect(markup).toContain("What did you review, and what did you find?");
    expect(markup).toContain("Example: Reviewed overdue work and found two ownership gaps.");
    expect(markup).toContain("Highest-priority next action");
    expect(markup).toContain("What must happen next, who owns it, and when is it due?");
    expect(markup).toContain("Example: Assign the overdue service task to Walter by 10:00 AM.");
    expect(markup).toContain('id="required-task-update"');
    expect(markup).toContain('id="task-update-focus_summary"');
    expect(markup).toContain('id="task-update-top_priority"');
  });

  it("shows linked appointments on the task rail with a board return path", () => {
    const markup = renderToStaticMarkup(
      <TaskDetailWorkspace
        activityEvents={[]}
        actorIsManager
        assignableUsers={[]}
        canComment
        canCreateAppointment
        canUpdateStatus
        task={createTask({
          appointmentLinks: [
            {
              id: "appointment-link-1",
              appointmentId: "appointment-1",
              appointmentNumber: "APT-TASK-1",
              appointmentTitle: "Customer approval visit",
              startsAt: null,
              endsAt: null,
              bookingStatus: "DRAFT",
              attendanceStatus: "EXPECTED",
              executionStatus: "NOT_STARTED",
              followUpDispositionCode: null,
              linkType: "SOURCE",
              linkCode: "SOURCE_TASK",
              linkTitle: "Created from task",
              explanation: "Customer must approve the next step.",
              isRequired: true,
              blocksAppointment: false,
              blocksTask: false,
              createdAt: "2026-07-04T14:30:00.000Z"
            }
          ]
        })}
      />
    );

    expect(markup).toContain("Linked Appointments (1)");
    expect(markup).toContain("Customer approval visit");
    expect(markup).toContain("APT-TASK-1");
    expect(markup).toContain("Unscheduled draft");
    expect(markup).toContain("Open on Board");
    expect(markup).toContain("/appointments?sourceTask=TMS-1493&amp;appointment=APT-TASK-1");
  });
});
