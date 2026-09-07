import { TaskSourceType, TaskStatus, WorkflowArea } from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { vi } from "vitest";
import { TASK_CHECKLIST_ITEM_KIND } from "@/lib/task-checklist-kind";
import { TaskDetailWorkspace } from "@/features/tasks/detail/task-detail-workspace";
import { TaskExecutionChecklistCard } from "@/features/tasks/detail/task-execution-checklist-card";
import { buildDefinitionOfDone, buildSubtasks } from "@/features/tasks/detail/task-detail-mappers";
import { normalizeRequiredUpdateProgress } from "@/features/tasks/detail/task-required-update-progress";
import { TaskWorkbenchActionBar } from "@/features/tasks/detail/task-workbench-action-bar";
import { TaskStatusPanel } from "@/features/tasks/task-status-panel";
import { buildTaskNextActionRecommendation } from "@/server/services/task-next-action";
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
        canOpenFullWorkbench
        canUpdateStatus
        initialView="workbench"
        task={createTask()}
      />
    );

    expect(markup).toContain("Vehicle Recon &amp; Inspection");
    expect(markup).toContain("Task Resolution Workbench");
    expect(markup).toContain("Generated Resolution Tasks");
    expect(markup).toContain("Checklist");
    expect(markup).toContain("Confirm the repair concern, vehicle condition, and current recon stage");
    expect(markup).toContain("Select the right repair path: internal repair, outside vendor, bodywork, detail/prep, or inspection only");
    expect(markup).toContain("Case Notes");
    expect(markup).toContain("etw-note-heading-button");
    expect(markup).toContain('aria-expanded="false"');
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

  it("renders a simplified execution view for quick-update tasks without replacing the full workbench", () => {
    const markup = renderToStaticMarkup(
      <TaskDetailWorkspace
        activityEvents={[]}
        actorIsManager
        assignableUsers={[]}
        canComment
        canCreateAppointment
        canUpdateStatus
        initialView="simple"
        task={createTask({
          title: "Follow up: Bobby called to check new vehicles for detailing",
          description: "Converted from Advisor Workbook Quick Update. Category: Vendor. Person: Bobby. Company: Detailing issue. Bobby called to check if we have new vehicles for detailing.",
          sourceType: TaskSourceType.STAFF,
          status: TaskStatus.NOT_STARTED,
          requiredUpdateFields: [
            { key: "outcome", label: "Outcome", type: "long_text", required: true, helpText: null }
          ]
        })}
      />
    );

    expect(markup).toContain("Task Execution View");
    expect(markup).toContain("Workbook Quick Update");
    expect(markup).toContain("Vendor");
    expect(markup).toContain("Shop execution");
    expect(markup).toContain("Next Action");
    expect(markup).toContain("Contact Bobby, confirm the next commitment, and record the outcome.");
    expect(markup).toContain("Tools for this next action");
    expect(markup).toContain("Record update");
    expect(markup).toContain("Add subtask");
    expect(markup).toContain("Open checklist");
    expect(markup).not.toContain("Full tools");
    expect(markup).toContain("Owner");
    expect(markup).toContain("Due");
    expect(markup).toContain("Calendar planner");
    expect(markup).toContain("No linked appointment yet");
    expect(markup).toContain("Plan event");
    expect(markup).toContain("Board");
    expect(markup).not.toContain("Open events");
    expect(markup).toContain("Change");
    expect(markup).toContain("Path");
    expect(markup).toContain("Shop &amp; Recon");
    expect(markup).toContain("Initiate path");
    expect(markup).toContain("Past due");
    expect(markup).toContain("Elevated");
    expect(markup).toContain("Progress / Updates");
    expect(markup).toContain("Subtasks");
    expect(markup).toContain("Checklist");
    expect(markup).toContain("Comments");
    expect(markup).toContain("Signals");
    expect(markup).not.toContain("Repair Details");
    expect(markup).not.toContain("Source backed");
    expect(markup).not.toContain("Role aware");
    expect(markup).not.toContain('id="required-task-update"');
    expect(markup).toContain("Simple View");
    expect(markup).not.toContain("Full Workbench");
    expect(markup).not.toContain("view=workbench");
    expect(markup).not.toContain("Generated Resolution Tasks");
  });

  it("adds a compact delivery planner shortcut to delivery task templates", () => {
    const markup = renderToStaticMarkup(
      <TaskDetailWorkspace
        activityEvents={[]}
        actorIsManager
        assignableUsers={[]}
        canComment
        canCreateAppointment
        canUpdateStatus
        initialView="simple"
        task={createTask({
          title: "Deliver All Sold Vehicles",
          description:
            "We have 4 vehicles already sold that need to be delivered on Tuesday 9/8/2026 -2023 Toyota Camry Gray - windshield, trunk lid alignment.",
          workflowArea: WorkflowArea.SALES
        })}
      />
    );

    expect(markup).toContain("Delivery planner");
    expect(markup).toContain("No linked appointment yet");
    expect(markup).toContain("Plan deliveries");
    expect(markup).toContain("Hide scheduling planner");
    expect(markup).toContain("Board");
    expect(markup).toContain("/appointments?sourceTask=TMS-1493");
  });

  it("opens linked scheduled events under the task when appointments already exist", () => {
    const markup = renderToStaticMarkup(
      <TaskDetailWorkspace
        activityEvents={[]}
        actorIsManager
        assignableUsers={[]}
        canComment
        canCreateAppointment
        canOpenFullWorkbench
        canUpdateStatus
        initialView="simple"
        task={createTask({
          appointmentLinks: [
            {
              id: "appointment-link-1",
              appointmentId: "appointment-1",
              appointmentNumber: "APT-TASK-1",
              appointmentTitle: "Delivery handoff",
              startsAt: "2026-09-08T15:00:00.000Z",
              endsAt: "2026-09-08T16:00:00.000Z",
              bookingStatus: "CONFIRMED",
              attendanceStatus: "EXPECTED",
              executionStatus: "NOT_STARTED",
              followUpDispositionCode: null,
              linkType: "SOURCE",
              linkCode: "SOURCE_TASK",
              linkTitle: "Created from task",
              explanation: "Delivery needs scheduled customer handoff.",
              isRequired: true,
              blocksAppointment: false,
              blocksTask: false,
              createdAt: "2026-09-07T14:30:00.000Z"
            }
          ]
        })}
      />
    );

    expect(markup).toContain("1 scheduled / 1 linked");
    expect(markup).toContain("Open events");
    expect(markup).toContain("task-linked-appointments");
    expect(markup).toContain("Plan event");
  });

  it("keeps full workbench retrievable when archived access is allowed", () => {
    const markup = renderToStaticMarkup(
      <TaskDetailWorkspace
        activityEvents={[]}
        actorIsManager
        assignableUsers={[]}
        canComment
        canCreateAppointment
        canOpenFullWorkbench
        canUpdateStatus
        initialView="simple"
        task={createTask()}
      />
    );

    expect(markup).toContain("Simple View");
    expect(markup).toContain("Full Workbench");
    expect(markup).toContain("view=workbench");
  });

  it("keeps the simplified task card available when due date data needs review", () => {
    const markup = renderToStaticMarkup(
      <TaskDetailWorkspace
        activityEvents={[]}
        actorIsManager
        assignableUsers={[]}
        canComment
        canCreateAppointment
        canUpdateStatus
        initialView="simple"
        task={createTask({
          description: "Converted from Advisor Workbook Quick Update. Category: Vendor. Person: Bobby.",
          dueAt: "invalid-date"
        })}
      />
    );

    expect(markup).toContain("Task Execution View");
    expect(markup).toContain("Due date needs review");
    expect(markup).toContain("Change");
  });

  it("offers a subtask expansion action when subtasks can become task tickets", () => {
    const markup = renderToStaticMarkup(
      <TaskExecutionChecklistCard
        allowExpandToTask
        embedded
        initialItems={[{ id: "subtask-1", label: "Call Bobby back", completed: false }]}
        kind={TASK_CHECKLIST_ITEM_KIND.SUBTASK}
        taskId="TMS-1493"
        title="Subtasks"
      />
    );

    expect(markup).toContain("Open task");
    expect(markup).toContain("Open subtask Call Bobby back as a task");
  });

  it("shows when the latest progress update was recorded", () => {
    const markup = renderToStaticMarkup(
      <TaskStatusPanel
        actorIsManager
        canUpdate
        task={createTask({
          status: TaskStatus.IN_PROGRESS,
          executionAssurance: {
            startedAt: "2026-09-01T14:00:00.000Z",
            lastProgressAt: "2026-09-01T17:20:00.000Z",
            nextCheckpointAt: "2026-09-01T19:20:00.000Z",
            lastProgressNote: "Brock started assessing what needs to be done.",
            blockerPlan: null,
            state: "ON_TRACK"
          }
        })}
      />
    );

    expect(markup).toContain("Latest progress recorded");
    expect(markup).toContain("Sep 1, 2026");
    expect(markup).toContain("Brock started assessing what needs to be done.");
  });

  it("changes generated execution workflow items when the task path is Shop and Recon", () => {
    const task = createTask({
      title: "Customer wants brake repairs",
      description: "Customer wants us to check brakes and advise repair path.",
      workflowArea: WorkflowArea.SHOP,
      checklistItems: []
    });

    expect(buildDefinitionOfDone(task).map((item) => item.label)).toContain(
      "Select the right repair path: internal repair, outside vendor, bodywork, detail/prep, or inspection only"
    );
    expect(buildSubtasks(task).map((item) => item.label)).toContain(
      "Choose repair path: internal, outside vendor, bodywork, detail/prep, or inspection only"
    );
  });

  it("recommends the next action from backend task evidence instead of a static sentence", () => {
    const recommendation = buildTaskNextActionRecommendation(
      createTask({
        comments: [
          {
            id: "comment-done",
            taskId: "TMS-1493",
            authorUserId: "user-sarah",
            body: "Work completed and ready for final check.",
            createdAt: "2026-09-01T15:00:00.000Z",
            author: {
              id: "user-sarah",
              name: "Sarah M.",
              email: "sarah@local.test"
            }
          }
        ],
        checklistItems: [
          {
            id: "check-1",
            kind: TASK_CHECKLIST_ITEM_KIND.DEFINITION_OF_DONE,
            key: "final-qc",
            label: "Confirm final quality check",
            required: true,
            completed: false,
            sortOrder: 1,
            completedAt: null,
            completedByUserId: null,
            createdAt: "2026-09-01T14:00:00.000Z",
            updatedAt: "2026-09-01T14:00:00.000Z"
          }
        ]
      }),
      new Date("2026-09-01T15:30:00.000Z")
    );

    expect(recommendation.label).toBe("Verify the remaining checklist item: Confirm final quality check.");
    expect(recommendation.triggers).toContain("latest-update:completion");
    expect(recommendation.triggers).toContain("checklist:open");
  });

  it("changes the backend next action when transportation details are added to report or filing work", () => {
    const recommendation = buildTaskNextActionRecommendation(
      createTask({
        title: "2023 Ford F-150 White - AJ - file an arbitration for the accident report",
        description: "Expanded from subtask. Parent task context: Resume the accident report filing.",
        comments: [
          {
            id: "comment-transportation",
            taskId: "TMS-1493",
            authorUserId: "user-sarah",
            body: "Transportation information added: vehicle pickup and delivery details are now confirmed.",
            createdAt: "2026-09-01T21:00:00.000Z",
            author: {
              id: "user-sarah",
              name: "Sarah M.",
              email: "sarah@local.test"
            }
          }
        ]
      }),
      new Date("2026-09-01T21:05:00.000Z")
    );

    expect(recommendation.label).toBe(
      "Use the transportation details to complete the report or filing step, then record the filing status."
    );
    expect(recommendation.triggers).toContain("latest-update:transportation");
    expect(recommendation.triggers).toContain("task-context:report-filing");
  });

  it("guides incomplete completion updates to the authoritative form", () => {
    const markup = renderToStaticMarkup(
      <TaskDetailWorkspace
        activityEvents={[]}
        actorIsManager
        assignableUsers={[]}
        canComment
        canCreateAppointment
        canOpenFullWorkbench
        canUpdateStatus
        initialView="workbench"
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
        canOpenFullWorkbench
        canUpdateStatus
        initialView="workbench"
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

  it("adds a delivery appointment planner for sold-vehicle delivery tasks", () => {
    const markup = renderToStaticMarkup(
      <TaskDetailWorkspace
        activityEvents={[]}
        actorIsManager
        assignableUsers={[]}
        canComment
        canCreateAppointment
        canOpenFullWorkbench
        canUpdateStatus
        initialView="workbench"
        task={createTask({
          title: "Deliver All Sold Vehicles",
          description:
            "We have 4 vehicles already sold that need to be delivered on Tuesday 9/8/2026 -2023 Toyota Camry Gray - windshield, trunk lid alignment. - 2016 Chevrolet Malibu Gold - check engine light on.",
          workflowArea: WorkflowArea.SALES
        })}
      />
    );

    expect(markup).toContain("Delivery Appointments");
    expect(markup).toContain("Delivery schedule blocks");
    expect(markup).toContain("2023 Toyota Camry Gray");
    expect(markup).toContain("2016 Chevrolet Malibu Gold");
    expect(markup).toContain("2026-09-08");
    expect(markup).toContain("Create 2 delivery drafts");
    expect(markup).toContain("Create one general draft");
  });
});
