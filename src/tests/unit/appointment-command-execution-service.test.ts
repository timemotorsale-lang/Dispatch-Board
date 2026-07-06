import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type {
  AppointmentCommandAppointmentRecord,
  AppointmentCommandLedgerRecord,
  AppointmentCommandLocationAccessRecord,
  AppointmentCommandRepository,
  CreateAppointmentCommandLedgerRecordInput
} from "@/server/repositories/appointment-command-repository";
import type { AppointmentLifecycleTransactionRepository } from "@/server/appointments/appointment-lifecycle-transaction-service";
import { submitAndExecuteAppointmentCommand } from "@/server/services/appointment-command-execution-service";

const now = new Date("2026-07-06T15:00:00.000Z");

const managerUser: AuthenticatedUser = {
  id: "user-manager",
  name: "Abdi Farah",
  email: "manager@local.test",
  isActive: true,
  roles: ["General Manager"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

const ownerUser: AuthenticatedUser = {
  id: "user-owner",
  name: "Brock Peterson",
  email: "owner@local.test",
  isActive: true,
  roles: ["Service Advisor"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

function createCommandRepositoryHarness(input?: {
  appointment?: AppointmentCommandAppointmentRecord | null;
  existingCommand?: AppointmentCommandLedgerRecord | null;
}) {
  const createdCommands: CreateAppointmentCommandLedgerRecordInput[] = [];
  const appointment = input?.appointment ?? {
    id: "appointment-1",
    appointmentNumber: "APT-10245",
    organizationId: "org-time-motor-sales",
    locationId: "loc-time-motor-sales-minneapolis",
    ownerUserId: ownerUser.id,
    title: "Service / Repair",
    schedulingTimezone: "America/Chicago",
    startsAt: new Date("2026-07-06T15:00:00.000Z"),
    endsAt: new Date("2026-07-06T16:00:00.000Z"),
    bookingStatus: "SCHEDULED",
    confirmationStatus: "CONFIRMED",
    attendanceStatus: "EXPECTED",
    executionStatus: "NOT_STARTED",
    version: 3
  };
  const access: AppointmentCommandLocationAccessRecord = {
    userId: managerUser.id,
    locationId: "loc-time-motor-sales-minneapolis",
    canViewSchedule: true,
    canParticipate: true,
    canOwnAppointments: true,
    canManageAppointments: true,
    canViewLimitedData: true,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validTo: null
  };

  function toLedgerRecord(
    command: CreateAppointmentCommandLedgerRecordInput,
    id = `cmd-${createdCommands.length}`
  ): AppointmentCommandLedgerRecord {
    return {
      id,
      organizationId: command.organizationId,
      locationId: command.locationId,
      appointmentId: command.appointmentId,
      actorUserId: command.actorUserId,
      commandType: command.commandType,
      status: command.status,
      idempotencyKey: command.idempotencyKey,
      requestHash: command.requestHash,
      correlationId: command.correlationId,
      causationId: command.causationId,
      expectedAppointmentVersion: command.expectedAppointmentVersion,
      currentAppointmentVersion: command.currentAppointmentVersion,
      attemptCount: command.attemptCount,
      maxAttempts: command.maxAttempts,
      nextRetryAt: command.nextRetryAt,
      lockedAt: command.lockedAt,
      completedAt: command.completedAt,
      failedAt: command.failedAt,
      resultSnapshot: command.resultSnapshot,
      errorCode: command.errorCode,
      errorMessage: command.errorMessage,
      createdAt: now,
      updatedAt: now
    };
  }

  const repository: AppointmentCommandRepository = {
    async createCommandLedger(command) {
      createdCommands.push(command);
      return toLedgerRecord(command);
    },

    async findActiveLocationAccess(userId, locationId) {
      return userId === managerUser.id && locationId === access.locationId ? access : null;
    },

    async findAppointmentById(appointmentId) {
      return appointment?.id === appointmentId ? appointment : null;
    },

    async findCommandByIdempotency() {
      return input?.existingCommand ?? null;
    }
  };

  return {
    createdCommands,
    repository,
    toLedgerRecord
  };
}

function createLifecycleRepositoryHarness() {
  const completedCommands: string[] = [];

  const repository: AppointmentLifecycleTransactionRepository = {
    async withLifecycleTransaction(operation) {
      return operation({
        async createAppointment(effect) {
          return {
            id: "appointment-created",
            appointmentNumber: effect.values.appointmentNumber,
            version: 1
          };
        },

        async updateAppointment(effect) {
          return {
            id: effect.appointmentId,
            appointmentNumber: "APT-10245",
            version: effect.expectedVersion + 1
          };
        },

        async commitReservations() {
          return [];
        },

        async releaseReservations() {
          return [];
        },

        async createTaskLinks() {
          return [];
        },

        async removeTaskLinks() {
          return [];
        },

        async createHistoryEvents(input) {
          return input.events.map((event, index) => ({
            id: `history-${index + 1}`,
            appointmentId: input.appointmentId,
            eventType: event.eventType
          }));
        },

        async completeCommand(completion) {
          completedCommands.push(completion.commandId);
          return completion;
        }
      });
    }
  };

  return {
    completedCommands,
    repository
  };
}

describe("appointment command execution service", () => {
  it("submits and executes supported lifecycle commands through the transaction boundary", async () => {
    const commandHarness = createCommandRepositoryHarness();
    const lifecycleHarness = createLifecycleRepositoryHarness();
    const result = await submitAndExecuteAppointmentCommand(
      managerUser,
      {
        commandType: "SCHEDULE",
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 3,
        idempotencyKey: "schedule-and-execute-1",
        correlationId: "corr-schedule-1",
        payload: {
          startsAt: "2026-07-06T16:00:00.000Z",
          endsAt: "2026-07-06T17:00:00.000Z"
        }
      },
      {
        commandRepository: commandHarness.repository,
        lifecycleRepository: lifecycleHarness.repository,
        now
      }
    );

    expect(result).toMatchObject({
      accepted: true,
      duplicate: false,
      conflict: null,
      command: {
        id: "cmd-1",
        commandType: "SCHEDULE",
        status: "SUCCEEDED"
      },
      execution: {
        executed: true,
        commandId: "cmd-1",
        commandStatus: "SUCCEEDED",
        appointment: {
          id: "appointment-1",
          version: 4
        },
        historyEventCount: 1
      }
    });
    expect(lifecycleHarness.completedCommands).toEqual(["cmd-1"]);
  });

  it("executes operational appointment commands through the same transaction boundary", async () => {
    const commandHarness = createCommandRepositoryHarness();
    const lifecycleHarness = createLifecycleRepositoryHarness();
    const result = await submitAndExecuteAppointmentCommand(
      managerUser,
      {
        commandType: "CHECK_IN",
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 3,
        idempotencyKey: "check-in-and-execute-1",
        correlationId: "corr-check-in-1"
      },
      {
        commandRepository: commandHarness.repository,
        lifecycleRepository: lifecycleHarness.repository,
        now
      }
    );

    expect(result).toMatchObject({
      accepted: true,
      command: {
        id: "cmd-1",
        commandType: "CHECK_IN",
        status: "SUCCEEDED"
      },
      execution: {
        executed: true,
        commandId: "cmd-1",
        commandStatus: "SUCCEEDED",
        appointment: {
          id: "appointment-1",
          version: 4
        },
        historyEventCount: 1
      }
    });
    expect(lifecycleHarness.completedCommands).toEqual(["cmd-1"]);
  });

  it("does not execute duplicate command submissions", async () => {
    const firstHarness = createCommandRepositoryHarness();
    const lifecycleHarness = createLifecycleRepositoryHarness();
    await submitAndExecuteAppointmentCommand(
      managerUser,
      {
        commandType: "SCHEDULE",
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 3,
        idempotencyKey: "schedule-duplicate-safe",
        payload: {
          startsAt: "2026-07-06T16:00:00.000Z",
          endsAt: "2026-07-06T17:00:00.000Z"
        }
      },
      {
        commandRepository: firstHarness.repository,
        lifecycleRepository: lifecycleHarness.repository,
        now
      }
    );
    const duplicateHarness = createCommandRepositoryHarness({
      existingCommand: firstHarness.toLedgerRecord(firstHarness.createdCommands[0], "cmd-existing")
    });
    const duplicate = await submitAndExecuteAppointmentCommand(
      managerUser,
      {
        commandType: "SCHEDULE",
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 3,
        idempotencyKey: "schedule-duplicate-safe",
        payload: {
          startsAt: "2026-07-06T16:00:00.000Z",
          endsAt: "2026-07-06T17:00:00.000Z"
        }
      },
      {
        commandRepository: duplicateHarness.repository,
        lifecycleRepository: lifecycleHarness.repository,
        now
      }
    );

    expect(duplicate).toMatchObject({
      duplicate: true,
      execution: null
    });
    expect(lifecycleHarness.completedCommands).toEqual(["cmd-1"]);
  });

  it("does not execute stale-version command conflicts", async () => {
    const commandHarness = createCommandRepositoryHarness();
    const lifecycleHarness = createLifecycleRepositoryHarness();
    const result = await submitAndExecuteAppointmentCommand(
      managerUser,
      {
        commandType: "RESCHEDULE",
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 2,
        idempotencyKey: "reschedule-stale-not-executed",
        payload: {
          startsAt: "2026-07-06T18:00:00.000Z",
          endsAt: "2026-07-06T19:00:00.000Z",
          reasonCode: "CUSTOMER_REQUEST",
          reasonNotes: "Customer requested another time."
        }
      },
      {
        commandRepository: commandHarness.repository,
        lifecycleRepository: lifecycleHarness.repository,
        now
      }
    );

    expect(result).toMatchObject({
      accepted: false,
      conflict: {
        expectedAppointmentVersion: 2,
        currentAppointmentVersion: 3
      },
      execution: null
    });
    expect(lifecycleHarness.completedCommands).toEqual([]);
  });
});
