import { TaskStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import type { TaskReadRepository } from "@/server/repositories/task-read-repository";
import { getTaskReadModelById } from "@/server/services/task-read";
import { createTestAuthStore } from "@/tests/support/auth-test-store";

function createTaskReadRepository(): TaskReadRepository {
  return {
    async findTaskById(taskId) {
      if (taskId !== "task-1") {
        return null;
      }

      return {
        id: "task-1",
        title: "Review hot lead",
        description: "Call before lunch.",
        status: TaskStatus.IN_PROGRESS,
        priority: "HIGH",
        dueAt: new Date("2026-06-18T16:00:00.000Z"),
        workflowArea: "SALES",
        sourceType: "MANAGER",
        requiresManagerApproval: true,
        templateSnapshot: {
          conversionContract: {
            origin: { channel: "Workbook", sourceId: "update-1", sourceKind: "COO_WORKBOOK_QUICK_UPDATE", text: "Customer asked for a return call." }
          },
          checklistItems: [
            {
              key: "confirm_customer",
              label: "Confirm customer details",
              description: "Verify the contact record before calling.",
              required: true
            }
          ],
          completionCriteria: {
            mode: "checklist_and_update_fields",
            requiredChecklistKeys: ["confirm_customer"],
            requiredFieldKeys: ["customer_name"]
          },
          approvalRules: {
            mode: "manager_review",
            readyForReviewRequired: true
          },
          intelligenceSignalType: "SALES_UPDATE",
          requiredUpdateFields: [
            {
              key: "customer_name",
              label: "Customer name",
              type: "short_text",
              required: true,
              helpText: null
            }
          ]
        },
        updateFieldValues: {
          customer_name: "Taylor R."
        },
        vehicleReference: "2019 Camry",
        customerReference: "Taylor R.",
        blockerReason: null,
        readyForReviewAt: null,
        completedAt: null,
        createdAt: new Date("2026-06-18T13:00:00.000Z"),
        updatedAt: new Date("2026-06-18T15:00:00.000Z"),
        boardDay: {
          id: "board-day-1",
          date: new Date("2026-06-18T00:00:00.000Z")
        },
        assignedUser: {
          id: "user-sales",
          name: "Baraka Sales",
          email: "jordan.sales@local.test"
        },
        recommendedUser: null,
        recommendationReasonCode: null,
        recommendationExplanation: null,
        createdByUser: {
          id: "user-manager",
          name: "Eli Manager",
          email: "morgan.manager@local.test"
        },
        reviewedByUser: null,
        concernLink: null,
        checklistItems: [],
        appointmentLinks: [
          {
            id: "appointment-link-1",
            linkType: "SOURCE",
            linkCode: "SOURCE_TASK",
            title: "Created from task",
            explanation: "Customer needs an appointment before the task can continue.",
            isRequired: true,
            blocksAppointment: false,
            blocksTask: false,
            createdAt: new Date("2026-06-18T14:30:00.000Z"),
            appointment: {
              id: "appointment-1",
              appointmentNumber: "APT-TASK-1",
              title: "Customer visit",
              startsAt: null,
              endsAt: null,
              bookingStatus: "DRAFT",
              attendanceStatus: "EXPECTED",
              executionStatus: "NOT_STARTED",
              followUpDispositionCode: null
            }
          }
        ],
        activityEvents: [
          {
            id: "event-1",
            eventType: "COMMENT_ADDED",
            message: "Jordan added a progress update.",
            createdAt: new Date("2026-06-18T14:20:00.000Z"),
            actorUser: {
              id: "user-manager",
              name: "Eli Manager",
              email: "morgan.manager@local.test"
            }
          }
        ],
        comments: [
          {
            id: "comment-1",
            taskId: "task-1",
            authorUserId: "user-manager",
            body: "Call logged with lender.\nWaiting on approval.",
            createdAt: new Date("2026-06-18T14:15:00.000Z"),
            authorUser: {
              id: "user-manager",
              name: "Eli Manager",
              email: "morgan.manager@local.test"
            }
          }
        ]
      };
    }
  };
}

describe("task read service", () => {
  it("exposes an encoded repair-order link for RO assignments", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const repository = createTaskReadRepository();
    const record = await repository.findTaskById("task-1");
    if (!record) throw new Error("Missing test task");
    const result = await getTaskReadModelById(usersByEmail.get("jordan.sales@local.test") ?? null, "task-1", {
      ...repository,
      findTaskById: async () => ({ ...record, sourceType: "REPAIR_ORDER", templateSnapshot: { repairOrderId: "ro/1" } })
    });
    expect(result?.repairOrderHref).toBe("/vehicles/repair-workbench?repairOrderId=ro%2F1");
  });
  it("returns a normalized task detail read model for authenticated users", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const staffUser = usersByEmail.get("jordan.sales@local.test") ?? null;

    const result = await getTaskReadModelById(staffUser, "task-1", createTaskReadRepository());

    expect(result).toEqual({
      id: "task-1",
      boardDayId: "board-day-1",
      boardDate: "2026-06-18",
      title: "Review hot lead",
      description: "Call before lunch.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      dueAt: "2026-06-18T16:00:00.000Z",
      executionAssurance: {
        startedAt: null,
        lastProgressAt: null,
        nextCheckpointAt: null,
        lastProgressNote: null,
        blockerPlan: null,
        state: "CHECK_IN_DUE"
      },
      workflowArea: "SALES",
      sourceType: "MANAGER",
      sourceContext: {
        channel: "Workbook",
        href: "/vehicles/coo-workbook/quick-update#source-update-1",
        sourceId: "update-1",
        sourceKind: "COO_WORKBOOK_QUICK_UPDATE",
        text: "Customer asked for a return call."
      },
      repairOrderHref: null,
      nextActionRecommendation: expect.objectContaining({
        triggers: ["latest-update:waiting"]
      }),
      requiresManagerApproval: true,
      requiredUpdateFields: [
        {
          key: "customer_name",
          label: "Customer name",
          type: "short_text",
          required: true,
          helpText: null
        }
      ],
      updateFieldValues: {
        customer_name: "Taylor R."
      },
      templateChecklistItems: [
        {
          key: "confirm_customer",
          label: "Confirm customer details",
          description: "Verify the contact record before calling.",
          required: true
        }
      ],
      completionCriteria: {
        mode: "checklist_and_update_fields",
        requiredChecklistKeys: ["confirm_customer"],
        requiredFieldKeys: ["customer_name"]
      },
      approvalRules: {
        mode: "manager_review",
        readyForReviewRequired: true
      },
      intelligenceSignalType: "SALES_UPDATE",
      vehicleReference: "2019 Camry",
      customerReference: "Taylor R.",
      blockerReason: null,
      readyForReviewAt: null,
      completedAt: null,
      createdAt: "2026-06-18T13:00:00.000Z",
      updatedAt: "2026-06-18T15:00:00.000Z",
      assignedUser: {
        id: "user-sales",
        name: "Baraka Sales",
        email: "jordan.sales@local.test"
      },
      recommendedUser: null,
      recommendation: null,
      createdByUser: {
        id: "user-manager",
        name: "Eli Manager",
        email: "morgan.manager@local.test"
      },
      reviewedByUser: null,
      concernWorkspace: null,
      checklistItems: [],
      collaborators: [],
      activityHistory: [
        {
          id: "event-1",
          eventType: "COMMENT_ADDED",
          message: "Jordan added a progress update.",
          createdAt: "2026-06-18T14:20:00.000Z",
          actor: {
            id: "user-manager",
            name: "Eli Manager",
            email: "morgan.manager@local.test"
          }
        }
      ],
      appointmentLinks: [
        {
          id: "appointment-link-1",
          appointmentId: "appointment-1",
          appointmentNumber: "APT-TASK-1",
          appointmentTitle: "Customer visit",
          startsAt: null,
          endsAt: null,
          bookingStatus: "DRAFT",
          attendanceStatus: "EXPECTED",
          executionStatus: "NOT_STARTED",
          followUpDispositionCode: null,
          linkType: "SOURCE",
          linkCode: "SOURCE_TASK",
          linkTitle: "Created from task",
          explanation: "Customer needs an appointment before the task can continue.",
          isRequired: true,
          blocksAppointment: false,
          blocksTask: false,
          createdAt: "2026-06-18T14:30:00.000Z"
        }
      ],
      comments: [
        {
          id: "comment-1",
          taskId: "task-1",
          authorUserId: "user-manager",
          body: "Call logged with lender.\nWaiting on approval.",
          createdAt: "2026-06-18T14:15:00.000Z",
          author: {
            id: "user-manager",
            name: "Eli Manager",
            email: "morgan.manager@local.test"
          }
        }
      ]
    });
  });

  it("returns null when the task does not exist", async () => {
    const { usersByEmail } = await createTestAuthStore();
    const managerUser = usersByEmail.get("morgan.manager@local.test") ?? null;

    await expect(
      getTaskReadModelById(managerUser, "missing-task", createTaskReadRepository())
    ).resolves.toBeNull();
  });
});
