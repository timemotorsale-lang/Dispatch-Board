import { describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type { TaskAppointmentDraftResult } from "@/server/services/task-appointment-service";
import { runTaskAppointmentAutomationForTaskEvent } from "@/server/services/task-appointment-automation-service";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

function createTaskReadModel() {
  return {
    id: "task-1",
    boardDayId: "board-day-1",
    boardDate: "2026-07-08",
    title: "Call lender and verify packet",
    description: "Confirm remaining lender items and next steps.",
    status: "BLOCKED",
    dueAt: "2026-07-08T17:00:00.000Z",
    workflowArea: "SALES",
    sourceType: "MANAGER",
    requiresManagerApproval: false,
    requiredUpdateFields: [],
    updateFieldValues: {},
    templateChecklistItems: [],
    completionCriteria: null,
    approvalRules: null,
    intelligenceSignalType: null,
    vehicleReference: "2019 Camry",
    customerReference: "Taylor R.",
    blockerReason: "Waiting on lender paperwork.",
    readyForReviewAt: null,
    completedAt: null,
    createdAt: "2026-07-08T15:00:00.000Z",
    updatedAt: "2026-07-08T15:00:00.000Z",
    assignedUser: {
      id: "user-jordan.sales@local.test",
      name: "Jordan Sales",
      email: "jordan.sales@local.test"
    },
    recommendedUser: null,
    recommendation: null,
    createdByUser: {
      id: "user-morgan.manager@local.test",
      name: "Morgan Manager",
      email: "morgan.manager@local.test"
    },
    reviewedByUser: null,
    checklistItems: [],
    activityHistory: [],
    appointmentLinks: [],
    comments: []
  };
}

function createActiveRule() {
  return {
    id: "rule-1",
    organizationId: "org-time-motor-sales",
    catalogVersionId: "catalog-version-1",
    ruleCode: "RULE-BLOCKED-TASK-REVIEW",
    name: "Blocked task review",
    description: "Create a review appointment when a task becomes blocked.",
    triggerCode: "BLOCKED_TASK_REVIEW",
    purposeCode: "APT-TASK-MEETING",
    status: "ACTIVE" as const,
    priority: 100,
    missingInputBehavior: "CREATE_REVIEW_ITEM",
    validationSnapshot: {
      isValid: true,
      errors: [],
      warnings: [],
      version: 2
    },
    simulationSnapshot: {
      version: 2,
      catalogVersionId: "catalog-version-1"
    },
    reason: "Seeded for automation tests.",
    createdByUserId: "user-morgan.manager@local.test",
    activatedByUserId: "user-morgan.manager@local.test",
    activatedAt: new Date("2026-07-08T15:00:00.000Z"),
    pausedAt: null,
    retiredAt: null,
    createdAt: new Date("2026-07-08T15:00:00.000Z"),
    updatedAt: new Date("2026-07-08T15:00:00.000Z")
  };
}

async function createManagerUser(): Promise<AuthenticatedUser> {
  const { usersByEmail } = await createTestAuthStore();
  return usersByEmail.get("morgan.manager@local.test") as AuthenticatedUser;
}

describe("task appointment automation service", () => {
  it("creates an automated appointment draft for an active matching rule", async () => {
    const manager = await createManagerUser();
    const recordExecution = vi.fn().mockResolvedValue(undefined);
    const recordActivity = vi.fn().mockResolvedValue(undefined);
    const appointmentDraftCreator = vi.fn().mockResolvedValue({
      appointmentId: "appointment-1",
      appointmentNumber: "APT-TASK-1",
      commandId: "command-1",
      commandStatus: "SUCCEEDED",
      createdTaskLinkCount: 1,
      taskId: "task-1"
    } satisfies TaskAppointmentDraftResult);

    const result = await runTaskAppointmentAutomationForTaskEvent(
      manager,
      {
        taskId: "task-1",
        triggerCode: "blocked_task_review",
        reasonNotes: "Waiting on lender paperwork."
      },
      {
        automationRepository: {
          listRules: vi.fn().mockResolvedValue([createActiveRule()]),
          listExecutions: vi.fn(),
          getExecutionById: vi.fn(),
          listRuleEvents: vi.fn(),
          listExecutionEvents: vi.fn(),
          recordExecution,
          finalizeExecution: vi.fn(),
          upsertRuleDraft: vi.fn(),
          transitionRule: vi.fn(),
          transitionExecution: vi.fn()
        },
        appointmentRepository: {
          findExistingAutomatedAppointment: vi.fn().mockResolvedValue(null)
        },
        appointmentDraftCreator,
        recordActivity,
        taskReader: vi.fn().mockResolvedValue(createTaskReadModel())
      }
    );

    expect(result).toMatchObject({
      taskId: "task-1",
      triggerCode: "BLOCKED_TASK_REVIEW",
      evaluatedRuleCount: 1,
      createdAppointmentCount: 1
    });
    expect(appointmentDraftCreator).toHaveBeenCalledWith(
      manager,
      "task-1",
      expect.objectContaining({
        reasonNotes: "Waiting on lender paperwork.",
        title: "Blocked task review: Call lender and verify packet"
      }),
      expect.objectContaining({
        draftOptions: expect.objectContaining({
          automationRuleCode: "RULE-BLOCKED-TASK-REVIEW",
          automationRuleVersion: 2,
          purposeCode: "APT-TASK-MEETING",
          sourceType: "AUTOMATION",
          triggerCode: "BLOCKED_TASK_REVIEW"
        })
      })
    );
    expect(recordExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleCode: "RULE-BLOCKED-TASK-REVIEW",
        sourceType: "TASK",
        sourceReference: "task-1",
        status: "SUCCEEDED"
      })
    );
    expect(recordActivity).not.toHaveBeenCalled();
  });

  it("records a skipped execution when an automated appointment already exists", async () => {
    const manager = await createManagerUser();
    const recordExecution = vi.fn().mockResolvedValue(undefined);
    const recordActivity = vi.fn().mockResolvedValue(undefined);
    const appointmentDraftCreator = vi.fn();

    const result = await runTaskAppointmentAutomationForTaskEvent(
      manager,
      {
        taskId: "task-1",
        triggerCode: "BLOCKED_TASK_REVIEW"
      },
      {
        automationRepository: {
          listRules: vi.fn().mockResolvedValue([createActiveRule()]),
          listExecutions: vi.fn(),
          getExecutionById: vi.fn(),
          listRuleEvents: vi.fn(),
          listExecutionEvents: vi.fn(),
          recordExecution,
          finalizeExecution: vi.fn(),
          upsertRuleDraft: vi.fn(),
          transitionRule: vi.fn(),
          transitionExecution: vi.fn()
        },
        appointmentRepository: {
          findExistingAutomatedAppointment: vi.fn().mockResolvedValue({
            id: "appointment-1",
            appointmentNumber: "APT-TASK-1",
            title: "Blocked task review: Call lender and verify packet"
          })
        },
        appointmentDraftCreator,
        recordActivity,
        taskReader: vi.fn().mockResolvedValue(createTaskReadModel())
      }
    );

    expect(result.createdAppointmentCount).toBe(0);
    expect(result.executions[0]).toMatchObject({
      status: "SKIPPED",
      appointmentId: "appointment-1",
      appointmentNumber: "APT-TASK-1"
    });
    expect(appointmentDraftCreator).not.toHaveBeenCalled();
    expect(recordExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "SKIPPED"
      })
    );
    expect(recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "task.appointment_automation_skipped",
        taskId: "task-1"
      })
    );
  });

  it("records review-required failures when appointment draft creation throws a validation error", async () => {
    const manager = await createManagerUser();
    const recordExecution = vi.fn().mockResolvedValue(undefined);
    const recordActivity = vi.fn().mockResolvedValue(undefined);
    const appointmentDraftCreator = vi
      .fn()
      .mockRejectedValue(new Error("Valid task appointment reason is required."));

    const result = await runTaskAppointmentAutomationForTaskEvent(
      manager,
      {
        taskId: "task-1",
        triggerCode: "BLOCKED_TASK_REVIEW"
      },
      {
        automationRepository: {
          listRules: vi.fn().mockResolvedValue([createActiveRule()]),
          listExecutions: vi.fn(),
          getExecutionById: vi.fn(),
          listRuleEvents: vi.fn(),
          listExecutionEvents: vi.fn(),
          recordExecution,
          finalizeExecution: vi.fn(),
          upsertRuleDraft: vi.fn(),
          transitionRule: vi.fn(),
          transitionExecution: vi.fn()
        },
        appointmentRepository: {
          findExistingAutomatedAppointment: vi.fn().mockResolvedValue(null)
        },
        appointmentDraftCreator,
        recordActivity,
        taskReader: vi.fn().mockResolvedValue(createTaskReadModel())
      }
    );

    expect(result.executions[0]).toMatchObject({
      status: "REVIEW_REQUIRED",
      failureCode: "TASK_AUTOMATION_REVIEW_REQUIRED"
    });
    expect(recordExecution).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "REVIEW_REQUIRED",
        failureCode: "TASK_AUTOMATION_REVIEW_REQUIRED"
      })
    );
    expect(recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "task.appointment_automation_review_required",
        taskId: "task-1"
      })
    );
  });

  it("builds ready-for-review automation reason notes for escalation triggers", async () => {
    const manager = await createManagerUser();
    const recordExecution = vi.fn().mockResolvedValue(undefined);
    const appointmentDraftCreator = vi.fn().mockResolvedValue({
      appointmentId: "appointment-1",
      appointmentNumber: "APT-TASK-1",
      commandId: "command-1",
      commandStatus: "SUCCEEDED",
      createdTaskLinkCount: 1,
      taskId: "task-1"
    } satisfies TaskAppointmentDraftResult);

    await runTaskAppointmentAutomationForTaskEvent(
      manager,
      {
        taskId: "task-1",
        triggerCode: "ESCALATION_TASK_REVIEW"
      },
      {
        automationRepository: {
          listRules: vi.fn().mockResolvedValue([
            {
              ...createActiveRule(),
              ruleCode: "RULE-ESCALATION-TASK-REVIEW",
              triggerCode: "ESCALATION_TASK_REVIEW"
            }
          ]),
          listExecutions: vi.fn(),
          getExecutionById: vi.fn(),
          listRuleEvents: vi.fn(),
          listExecutionEvents: vi.fn(),
          recordExecution,
          finalizeExecution: vi.fn(),
          upsertRuleDraft: vi.fn(),
          transitionRule: vi.fn(),
          transitionExecution: vi.fn()
        },
        appointmentRepository: {
          findExistingAutomatedAppointment: vi.fn().mockResolvedValue(null)
        },
        appointmentDraftCreator,
        recordActivity: vi.fn().mockResolvedValue(undefined),
        taskReader: vi.fn().mockResolvedValue(createTaskReadModel())
      }
    );

    expect(appointmentDraftCreator).toHaveBeenCalledWith(
      manager,
      "task-1",
      expect.objectContaining({
        reasonNotes:
          'Automation created a review appointment because task "Call lender and verify packet" moved to ready for review.'
      }),
      expect.any(Object)
    );
  });
});
