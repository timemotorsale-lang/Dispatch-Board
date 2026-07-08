import { describe, expect, it } from "vitest";

import type { AppointmentAutomationExecutionRecord } from "@/server/services/appointment-automation-operations-console";
import {
  runAppointmentAutomationRetryReplay,
  type AppointmentAutomationRetryReplayRepository
} from "@/server/services/appointment-automation-retry-replay-engine";

function createExecution(
  overrides: Partial<AppointmentAutomationExecutionRecord> = {}
): AppointmentAutomationExecutionRecord {
  return {
    id: "execution-1",
    organizationId: "org-time-motor-sales",
    automationRuleId: null,
    triggerCode: "APPOINTMENT_OUTCOME_RECORDED",
    purposeCode: "FOLLOW_UP_APPOINTMENT",
    status: "FAILED_RETRYABLE",
    sourceType: "APPOINTMENT",
    sourceReference: "appointment-1",
    inputSnapshot: {
      automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_APPOINTMENT"
    },
    resultSnapshot: {
      automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_APPOINTMENT",
      generatedAppointmentNumber: "FUP-APT-10245-AAA",
      generatedAppointmentTitle: "Follow-up: Service / Repair"
    },
    failureCode: "SIMULATED_FAILURE",
    failureMessage: "Simulated failure",
    attemptCount: 1,
    maxAttempts: 3,
    nextRetryAt: null,
    resolvedAt: null,
    createdAt: new Date("2026-07-07T12:00:00.000Z"),
    updatedAt: new Date("2026-07-07T12:00:00.000Z"),
    ...overrides
  };
}

function createRuntimeRepositoryHarness(input?: {
  ownerUserId?: string | null;
  existingFollowUpAppointment?: { id: string; appointmentNumber: string; title: string } | null;
  existingFollowUpTask?: { taskId: string; taskTitle: string; linkCode: string } | null;
  existingTaskAppointment?: { id: string; appointmentNumber: string; title: string } | null;
}) {
  const createdAppointments: Array<{ appointmentNumber: string; title: string }> = [];
  const createdTasks: Array<{ taskTitle: string; linkCode: string }> = [];
  let existingFollowUpAppointment = input?.existingFollowUpAppointment ?? null;
  let existingFollowUpTask = input?.existingFollowUpTask ?? null;
  let existingTaskAppointment = input?.existingTaskAppointment ?? null;

  const repository: AppointmentAutomationRetryReplayRepository = {
    async findSourceAppointmentById(appointmentId) {
      return appointmentId === "appointment-1"
        ? {
            id: "appointment-1",
            appointmentNumber: "APT-10245",
            organizationId: "org-time-motor-sales",
            locationId: "loc-time-motor-sales-minneapolis",
            ownerUserId: input?.ownerUserId === undefined ? "user-owner" : input.ownerUserId,
            createdByUserId: "user-manager",
            title: "Service / Repair",
            schedulingTimezone: "America/Chicago",
            customerSnapshot: { displayName: "Ahmed Ibrahim" },
            vehicleSnapshot: { displayName: "2014 Ford Taurus" },
            sourceSnapshot: null,
            completedAt: new Date("2026-07-07T11:00:00.000Z"),
            outcomeCode: "FOLLOW_UP_REQUIRED",
            followUpDispositionCode: "FOLLOW_UP_APPOINTMENT_REQUIRED",
            followUpNotes: "Bring the vehicle back for a follow-up visit."
          }
        : null;
    },
    async findSourceTaskById(taskId) {
      return taskId === "task-1"
        ? {
            id: "task-1",
            boardDayId: "board-day-1",
            assignedUserId: "user-owner",
            title: "Call lender and verify packet",
            description: "Confirm remaining lender items and next steps.",
            status: "BLOCKED",
            workflowArea: "SALES",
            dueAt: new Date("2026-07-08T17:00:00.000Z"),
            customerReference: "Ahmed Ibrahim",
            vehicleReference: "2014 Ford Taurus"
          }
        : null;
    },
    async findGeneratedFollowUpAppointment() {
      return existingFollowUpAppointment;
    },
    async findGeneratedTaskAppointment() {
      return existingTaskAppointment;
    },
    async findGeneratedFollowUpTask() {
      return existingFollowUpTask;
    },
    async createGeneratedFollowUpAppointment(input) {
      createdAppointments.push({
        appointmentNumber: input.appointmentNumber,
        title: input.title
      });
      existingFollowUpAppointment = {
        id: "generated-appointment-1",
        appointmentNumber: input.appointmentNumber,
        title: input.title
      };
      return existingFollowUpAppointment;
    },
    async createGeneratedTaskAppointment(input) {
      createdAppointments.push({
        appointmentNumber: input.appointmentNumber,
        title: input.title
      });
      existingTaskAppointment = {
        id: "generated-task-appointment-1",
        appointmentNumber: input.appointmentNumber,
        title: input.title
      };
      return existingTaskAppointment;
    },
    async createGeneratedFollowUpTask(input) {
      createdTasks.push({
        taskTitle: input.taskTitle,
        linkCode: input.linkCode
      });
      existingFollowUpTask = {
        taskId: "generated-task-1",
        taskTitle: input.taskTitle,
        linkCode: input.linkCode
      };
      return existingFollowUpTask;
    }
  };

  return {
    createdAppointments,
    createdTasks,
    repository
  };
}

describe("appointment automation retry/replay engine", () => {
  it("reuses an existing generated follow-up appointment instead of duplicating it", async () => {
    const harness = createRuntimeRepositoryHarness({
      existingFollowUpAppointment: {
        id: "generated-appointment-1",
        appointmentNumber: "FUP-APT-10245-AAA",
        title: "Follow-up: Service / Repair"
      }
    });

    const outcome = await runAppointmentAutomationRetryReplay({
      action: "REPLAY",
      execution: createExecution(),
      actorUserId: "user-manager",
      repository: harness.repository
    });

    expect(outcome.status).toBe("SUCCEEDED");
    expect(outcome.resultSnapshot.createdFollowUpAppointmentCount).toBe(0);
    expect(outcome.resultSnapshot.existingFollowUpAppointmentNumber).toBe("FUP-APT-10245-AAA");
    expect(harness.createdAppointments).toHaveLength(0);
  });

  it("recreates a missing generated follow-up task from the stored automation context", async () => {
    const harness = createRuntimeRepositoryHarness();

    const outcome = await runAppointmentAutomationRetryReplay({
      action: "RETRY",
      execution: createExecution({
        inputSnapshot: {
          automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_TASK",
          followUpLinkCode: "OUTCOME_FOLLOW_UP_APPOINTMENT_REQUIRED"
        },
        resultSnapshot: {
          automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_TASK",
          generatedTaskTitle: "Schedule follow-up appointment for APT-10245",
          generatedTaskBoardDate: "2026-07-08",
          workflowArea: "SHOP"
        }
      }),
      actorUserId: "user-manager",
      repository: harness.repository
    });

    expect(outcome.status).toBe("SUCCEEDED");
    expect(outcome.resultSnapshot.createdFollowUpTaskCount).toBe(1);
    expect(outcome.resultSnapshot.generatedFollowUpTaskId).toBe("generated-task-1");
    expect(harness.createdTasks).toEqual([
      {
        taskTitle: "Schedule follow-up appointment for APT-10245",
        linkCode: "OUTCOME_FOLLOW_UP_APPOINTMENT_REQUIRED"
      }
    ]);
  });

  it("returns review required for unsupported automation rules", async () => {
    const harness = createRuntimeRepositoryHarness();

    const outcome = await runAppointmentAutomationRetryReplay({
      action: "REPLAY",
      execution: createExecution({
        inputSnapshot: { automationRuleCode: "UNKNOWN_AUTOMATION_RULE" },
        resultSnapshot: { automationRuleCode: "UNKNOWN_AUTOMATION_RULE" }
      }),
      actorUserId: "user-manager",
      repository: harness.repository
    });

    expect(outcome).toMatchObject({
      status: "REVIEW_REQUIRED",
      failureCode: "AUTOMATION_RULE_NOT_SUPPORTED"
    });
  });

  it("replays task-sourced automation executions by regenerating the missing appointment", async () => {
    const harness = createRuntimeRepositoryHarness();

    const outcome = await runAppointmentAutomationRetryReplay({
      action: "REPLAY",
      execution: createExecution({
        triggerCode: "BLOCKED_TASK_REVIEW",
        purposeCode: "APT-TASK-MEETING",
        sourceType: "TASK",
        sourceReference: "task-1",
        inputSnapshot: {
          automationRuleCode: "RULE-BLOCKED-TASK-REVIEW",
          automationRuleVersion: 2,
          purposeCode: "APT-TASK-MEETING"
        },
        resultSnapshot: {
          automationRuleCode: "RULE-BLOCKED-TASK-REVIEW",
          automationRuleVersion: 2,
          purposeCode: "APT-TASK-MEETING"
        }
      }),
      actorUserId: "user-manager",
      repository: harness.repository
    });

    expect(outcome.status).toBe("SUCCEEDED");
    expect(outcome.resultSnapshot.createdFollowUpAppointmentCount).toBe(1);
    expect(outcome.resultSnapshot.generatedAppointmentNumber).toBeTruthy();
    expect(harness.createdAppointments).toHaveLength(1);
  });
});
