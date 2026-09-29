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
import {
  appointmentScheduleCommitGate,
  submitAndExecuteAppointmentCommand
} from "@/server/services/appointment-command-execution-service";

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
  duplicateAppointments?: AppointmentCommandAppointmentRecord[];
  existingCommand?: AppointmentCommandLedgerRecord | null;
  heldReservationCandidates?: NonNullable<
    AppointmentCommandRepository["findHeldReservationCommitCandidates"]
  > extends (...args: never[]) => Promise<infer Result>
    ? Result
    : never;
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
    version: 3,
    purposeSnapshot: null,
    customerSnapshot: null,
    vehicleSnapshot: null,
    sourceSnapshot: null
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
    },

    async findHeldReservationCommitCandidates() {
      return input?.heldReservationCandidates ?? [];
    },

    async findPotentialDuplicateCustomerAppointments() {
      return input?.duplicateAppointments ?? [];
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
  const completedCommandDetails: Array<{
    commandId: string;
    status: string;
    appointmentId: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    resultSnapshot: Record<string, unknown>;
  }> = [];
  const committedReservationCandidateCounts: number[] = [];
  const createdAppointments: Array<{ id: string; appointmentNumber: string; version: number }> = [];
  const createdTasks: Array<{ id: string; title: string; boardDayId: string }> = [];

  const repository: AppointmentLifecycleTransactionRepository = {
    async withLifecycleTransaction(operation) {
      return operation({
        async createAppointment(effect) {
          const created = {
            id: "appointment-created",
            appointmentNumber: effect.values.appointmentNumber,
            version: 1
          };

          createdAppointments.push(created);
          return created;
        },

        async updateAppointment(effect) {
          return {
            id: effect.appointmentId,
            appointmentNumber: "APT-10245",
            version: effect.expectedVersion + 1
          };
        },

        async commitReservations(effect) {
          committedReservationCandidateCounts.push(effect.candidates.length);
          return [];
        },

        async releaseReservations() {
          return [];
        },

        async createTasks(effects) {
          const records = effects.map((effect, index) => ({
            id: `task-${index + 1}`,
            title: effect.title,
            boardDayId: `board-day-${index + 1}`
          }));

          createdTasks.push(...records);
          return records;
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

        async createActivityEvents() {},

        async completeCommand(completion) {
          completedCommands.push(completion.commandId);
          completedCommandDetails.push({
            commandId: completion.commandId,
            status: completion.status,
            appointmentId: completion.appointmentId,
            errorCode: completion.errorCode,
            errorMessage: completion.errorMessage,
            resultSnapshot: completion.resultSnapshot
          });
          return completion;
        }
      });
    }
  };

  return {
    completedCommands,
    completedCommandDetails,
    committedReservationCandidateCounts,
    createdAppointments,
    createdTasks,
    repository
  };
}

type ExecutionScenario = {
  name: string;
  commandType:
    | "CREATE_DRAFT"
    | "APPROVE"
    | "EDIT"
    | "SCHEDULE"
    | "RESCHEDULE"
    | "CANCEL"
    | "CONFIRM"
    | "DECLINE"
    | "CHECK_IN"
    | "NO_SHOW"
    | "START"
    | "WAIT"
    | "FINISH"
    | "COMPLETE"
    | "TRANSFER_OWNER";
  appointment?: Partial<AppointmentCommandAppointmentRecord> | null;
  payload?: Record<string, unknown>;
  expectedVersion?: number | null;
};

function buildCommandInput(scenario: ExecutionScenario) {
  const input: Record<string, unknown> = {
    commandType: scenario.commandType,
    idempotencyKey: `${scenario.commandType.toLowerCase()}-scenario`,
    correlationId: `corr-${scenario.commandType.toLowerCase()}`
  };

  if (scenario.commandType === "CREATE_DRAFT") {
    input.organizationId = "org-time-motor-sales";
    input.locationId = "loc-time-motor-sales-minneapolis";
    input.ownerUserId = ownerUser.id;
  } else {
    input.appointmentId = "appointment-1";
    input.expectedAppointmentVersion = scenario.expectedVersion ?? 3;
  }

  if (scenario.payload) {
    input.payload = scenario.payload;
  }

  return input;
}

function createScenarioAppointment(
  overrides?: Partial<AppointmentCommandAppointmentRecord> | null
): AppointmentCommandAppointmentRecord | null {
  if (overrides === null) {
    return null;
  }

  return {
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
    version: 3,
    purposeSnapshot: null,
    customerSnapshot: null,
    vehicleSnapshot: null,
    sourceSnapshot: null,
    ...overrides
  };
}

function createLateStaleConflictLifecycleRepository(input: {
  mutableAppointment: AppointmentCommandAppointmentRecord;
  conflictCompletions: Array<{
    commandId: string;
    status: string;
    appointmentId: string | null;
    errorCode: string | null;
    errorMessage: string | null;
    resultSnapshot: Record<string, unknown>;
  }>;
  transactionAttempts: { count: number };
}): AppointmentLifecycleTransactionRepository {
  return {
    async withLifecycleTransaction(operation) {
      input.transactionAttempts.count += 1;

      return operation({
        async createAppointment() {
          throw new Error("Not used in this test.");
        },

        async updateAppointment(effect) {
          input.mutableAppointment.version = effect.expectedVersion + 1;
          throw new Error(
            "Appointment update failed because the expected version no longer matches."
          );
        },

        async commitReservations() {
          return [];
        },

        async releaseReservations() {
          return [];
        },

        async createTasks() {
          return [];
        },

        async createTaskLinks() {
          return [];
        },

        async removeTaskLinks() {
          return [];
        },

        async createHistoryEvents() {
          return [];
        },

        async createActivityEvents() {},

        async completeCommand(completion) {
          input.conflictCompletions.push({
            commandId: completion.commandId,
            status: completion.status,
            appointmentId: completion.appointmentId,
            errorCode: completion.errorCode,
            errorMessage: completion.errorMessage,
            resultSnapshot: completion.resultSnapshot
          });
          return completion;
        }
      });
    }
  };
}

const criticalExecutionScenarios: ExecutionScenario[] = [
  {
    name: "creates a persisted draft appointment",
    commandType: "CREATE_DRAFT",
    appointment: null,
    expectedVersion: null,
    payload: {
      appointmentNumber: "APT-20000",
      schedulingTimezone: "America/Chicago",
      title: "Service / Repair"
    }
  },
  {
    name: "approves a scheduled appointment",
    commandType: "APPROVE",
    appointment: {
      bookingStatus: "PENDING_APPROVAL"
    }
  },
  {
    name: "edits appointment details",
    commandType: "EDIT",
    payload: {
      title: "Updated Service / Repair",
      customerSnapshot: {
        displayName: "Ahmed Ibrahim"
      }
    }
  },
  {
    name: "cancels an appointment with follow-up disposition",
    commandType: "CANCEL",
    payload: {
      reasonCode: "CUSTOMER_CANCELLED",
      reasonNotes: "Customer called to cancel.",
      followUpDispositionCode: "CALLBACK_NOT_REQUIRED"
    }
  },
  {
    name: "confirms an appointment",
    commandType: "CONFIRM"
  },
  {
    name: "records a customer decline",
    commandType: "DECLINE",
    payload: {
      reasonCode: "CUSTOMER_DECLINED",
      reasonNotes: "Customer declined the proposed appointment.",
      followUpDispositionCode: "CALLBACK_REQUIRED"
    }
  },
  {
    name: "records a no-show outcome",
    commandType: "NO_SHOW",
    payload: {
      reasonCode: "CUSTOMER_NO_SHOW",
      reasonNotes: "Customer did not arrive by the grace period.",
      followUpDispositionCode: "CALLBACK_REQUIRED"
    }
  },
  {
    name: "starts execution work",
    commandType: "START"
  },
  {
    name: "moves execution into waiting",
    commandType: "WAIT",
    appointment: {
      executionStatus: "IN_PROGRESS"
    },
    payload: {
      reasonCode: "WAITING_ON_PARTS",
      reasonNotes: "Waiting for ordered brake pads."
    }
  },
  {
    name: "finishes execution work",
    commandType: "FINISH",
    appointment: {
      executionStatus: "WAITING"
    }
  },
  {
    name: "transfers appointment ownership",
    commandType: "TRANSFER_OWNER",
    payload: {
      ownerUserId: "user-other",
      reasonCode: "WORKLOAD_BALANCE",
      reasonNotes: "Move to another staff member."
    }
  }
];

const lateStaleConflictScenarios: ExecutionScenario[] = [
  {
    name: "APPROVE late stale conflict",
    commandType: "APPROVE",
    appointment: {
      bookingStatus: "PENDING_APPROVAL"
    }
  },
  {
    name: "EDIT late stale conflict",
    commandType: "EDIT",
    payload: {
      title: "Updated Service / Repair"
    }
  },
  {
    name: "SCHEDULE late stale conflict",
    commandType: "SCHEDULE",
    appointment: {
      bookingStatus: "DRAFT",
      confirmationStatus: "PENDING",
      startsAt: null,
      endsAt: null
    },
    payload: {
      startsAt: "2026-07-06T16:00:00.000Z",
      endsAt: "2026-07-06T17:00:00.000Z"
    }
  },
  {
    name: "CANCEL late stale conflict",
    commandType: "CANCEL",
    payload: {
      reasonCode: "CUSTOMER_CANCELLED",
      reasonNotes: "Customer called to cancel.",
      followUpDispositionCode: "CALLBACK_NOT_REQUIRED"
    }
  },
  {
    name: "CONFIRM late stale conflict",
    commandType: "CONFIRM"
  },
  {
    name: "DECLINE late stale conflict",
    commandType: "DECLINE",
    payload: {
      reasonCode: "CUSTOMER_DECLINED",
      reasonNotes: "Customer declined the proposed appointment.",
      followUpDispositionCode: "CALLBACK_REQUIRED"
    }
  },
  {
    name: "CHECK_IN late stale conflict",
    commandType: "CHECK_IN"
  },
  {
    name: "NO_SHOW late stale conflict",
    commandType: "NO_SHOW",
    payload: {
      reasonCode: "CUSTOMER_NO_SHOW",
      reasonNotes: "Customer did not arrive by the grace period.",
      followUpDispositionCode: "CALLBACK_REQUIRED"
    }
  },
  {
    name: "START late stale conflict",
    commandType: "START"
  },
  {
    name: "WAIT late stale conflict",
    commandType: "WAIT",
    appointment: {
      executionStatus: "IN_PROGRESS"
    },
    payload: {
      reasonCode: "WAITING_ON_PARTS",
      reasonNotes: "Waiting for ordered brake pads."
    }
  },
  {
    name: "FINISH late stale conflict",
    commandType: "FINISH",
    appointment: {
      executionStatus: "WAITING"
    }
  },
  {
    name: "COMPLETE late stale conflict",
    commandType: "COMPLETE",
    appointment: {
      executionStatus: "FINISHED"
    },
    payload: {
      outcomeCode: "COMPLETED",
      followUpDispositionCode: "NO_FOLLOW_UP_REQUIRED",
      reasonCode: "OUTCOME_RECORDED",
      reasonNotes: "Final appointment result documented from the board."
    }
  },
  {
    name: "TRANSFER_OWNER late stale conflict",
    commandType: "TRANSFER_OWNER",
    payload: {
      ownerUserId: "user-other",
      reasonCode: "WORKLOAD_BALANCE",
      reasonNotes: "Move to another staff member."
    }
  }
];

describe("appointment command execution service", () => {
  it("publishes the schedule commit gate contract for day-one rollout proof", () => {
    expect(appointmentScheduleCommitGate).toMatchObject({
      commandType: "SCHEDULE",
      requiredPayloadFields: ["startsAt", "endsAt"],
      successStatus: "SUCCEEDED",
      terminalFailureStatus: "FAILED_TERMINAL",
      enforcedRejectionCodes: ["HARD_CONFLICT", "UNRESOLVED_WARNING", "PAST_TIME"],
      browserProof: "task-originated-unscheduled-draft-schedules-from-appointment-board"
    });
    expect(appointmentScheduleCommitGate.writeEffects).toEqual(
      expect.arrayContaining([
        "appointment-status-and-window",
        "held-reservation-commit",
        "schedule-history-event",
        "command-completion",
        "schedule-time-automation"
      ])
    );
  });

  it.each(criticalExecutionScenarios)("executes critical scenario: $name", async (scenario) => {
    const commandHarness = createCommandRepositoryHarness({
      appointment: createScenarioAppointment(scenario.appointment)
    });
    const lifecycleHarness = createLifecycleRepositoryHarness();

    const result = await submitAndExecuteAppointmentCommand(
      managerUser,
      buildCommandInput(scenario),
      {
        commandRepository: commandHarness.repository,
        lifecycleRepository: lifecycleHarness.repository,
        now
      }
    );

    expect(result.accepted).toBe(true);
    expect(result.duplicate).toBe(false);
    expect(result.conflict).toBeNull();
    expect(result.command).toMatchObject({
      id: "cmd-1",
      commandType: scenario.commandType,
      status: "SUCCEEDED"
    });
    expect(result.execution).toMatchObject({
      executed: true,
      commandId: "cmd-1",
      commandStatus: "SUCCEEDED"
    });
    expect(lifecycleHarness.completedCommandDetails).toEqual([
      expect.objectContaining({
        commandId: "cmd-1",
        status: "SUCCEEDED",
        errorCode: null
      })
    ]);
  });

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

  it("blocks draft creation when the same customer already has an appointment at the same time", async () => {
    const commandHarness = createCommandRepositoryHarness({
      appointment: null,
      duplicateAppointments: [
        createScenarioAppointment({
          id: "appointment-duplicate",
          appointmentNumber: "APT-20001",
          startsAt: new Date("2026-07-06T16:00:00.000Z"),
          endsAt: new Date("2026-07-06T17:00:00.000Z"),
          bookingStatus: "SCHEDULED",
          customerSnapshot: {
            displayName: "Amina Yusuf"
          }
        }) as AppointmentCommandAppointmentRecord
      ]
    });
    const lifecycleHarness = createLifecycleRepositoryHarness();

    const result = await submitAndExecuteAppointmentCommand(
      managerUser,
      {
        commandType: "CREATE_DRAFT",
        organizationId: "org-time-motor-sales",
        locationId: "loc-time-motor-sales-minneapolis",
        idempotencyKey: "create-draft-duplicate-customer-time",
        correlationId: "corr-create-draft-duplicate-customer-time",
        payload: {
          appointmentNumber: "APT-20002",
          title: "Service / Repair",
          schedulingTimezone: "America/Chicago",
          startsAt: "2026-07-06T16:00:00.000Z",
          endsAt: "2026-07-06T17:00:00.000Z",
          customerSnapshot: {
            displayName: "Amina Yusuf"
          }
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
      command: {
        commandType: "CREATE_DRAFT",
        status: "FAILED_TERMINAL"
      },
      execution: {
        executed: false,
        commandStatus: "FAILED_TERMINAL",
        resultSnapshot: {
          rejectionCode: "UNRESOLVED_WARNING",
          rejectionReasons: [
            expect.stringContaining("Amina Yusuf already has appointment APT-20001")
          ]
        }
      }
    });
    expect(lifecycleHarness.createdAppointments).toEqual([]);
  });

  it("allows duplicate-time draft creation after explicit user confirmation", async () => {
    const commandHarness = createCommandRepositoryHarness({
      appointment: null,
      duplicateAppointments: [
        createScenarioAppointment({
          id: "appointment-duplicate",
          appointmentNumber: "APT-20001",
          startsAt: new Date("2026-07-06T16:00:00.000Z"),
          endsAt: new Date("2026-07-06T17:00:00.000Z"),
          bookingStatus: "SCHEDULED",
          customerSnapshot: {
            displayName: "Amina Yusuf"
          }
        }) as AppointmentCommandAppointmentRecord
      ]
    });
    const lifecycleHarness = createLifecycleRepositoryHarness();

    const result = await submitAndExecuteAppointmentCommand(
      managerUser,
      {
        commandType: "CREATE_DRAFT",
        organizationId: "org-time-motor-sales",
        locationId: "loc-time-motor-sales-minneapolis",
        idempotencyKey: "create-draft-duplicate-customer-time-confirmed",
        correlationId: "corr-create-draft-duplicate-customer-time-confirmed",
        payload: {
          appointmentNumber: "APT-20002",
          title: "Service / Repair",
          schedulingTimezone: "America/Chicago",
          startsAt: "2026-07-06T16:00:00.000Z",
          endsAt: "2026-07-06T17:00:00.000Z",
          duplicateCustomerTimeConfirmed: true,
          customerSnapshot: {
            displayName: "Amina Yusuf"
          }
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
      command: {
        commandType: "CREATE_DRAFT",
        status: "SUCCEEDED"
      },
      execution: {
        executed: true,
        commandStatus: "SUCCEEDED",
        appointment: {
          appointmentNumber: "APT-20002",
          version: 1
        }
      }
    });
    expect(lifecycleHarness.createdAppointments).toEqual([
      {
        id: "appointment-created",
        appointmentNumber: "APT-20002",
        version: 1
      }
    ]);
  });

  it("evaluates proposed schedule times for unscheduled draft staff checks", async () => {
    const commandHarness = createCommandRepositoryHarness({
      appointment: {
        id: "appointment-1",
        appointmentNumber: "APT-10245",
        organizationId: "org-time-motor-sales",
        locationId: "loc-time-motor-sales-minneapolis",
        ownerUserId: ownerUser.id,
        title: "Follow-up: Service / Repair",
        schedulingTimezone: "America/Chicago",
        startsAt: null,
        endsAt: null,
        bookingStatus: "DRAFT",
        confirmationStatus: "PENDING",
        attendanceStatus: "EXPECTED",
        executionStatus: "NOT_STARTED",
        version: 3,
        purposeSnapshot: null,
        customerSnapshot: null,
        vehicleSnapshot: null,
        sourceSnapshot: null
      }
    });
    const lifecycleHarness = createLifecycleRepositoryHarness();
    const proposedWindows: Array<{
      startsAt: string | null;
      endsAt: string | null;
      timezone: string | null | undefined;
    }> = [];
    const result = await submitAndExecuteAppointmentCommand(
      managerUser,
      {
        commandType: "SCHEDULE",
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 3,
        idempotencyKey: "schedule-unscheduled-draft-1",
        correlationId: "corr-schedule-unscheduled-draft-1",
        payload: {
          startsAt: "2026-07-06T16:00:00.000Z",
          endsAt: "2026-07-06T17:00:00.000Z",
          schedulingTimezone: "America/Chicago",
          reasonCode: "UNSCHEDULED_DRAFT_SCHEDULED",
          reasonNotes: "Customer requested the follow-up slot."
        }
      },
      {
        commandRepository: commandHarness.repository,
        lifecycleRepository: lifecycleHarness.repository,
        staffConflictPreview: async (_user, _appointmentId, _repository, _now, options) => {
          proposedWindows.push({
            startsAt: options?.proposedStartsAt?.toISOString() ?? null,
            endsAt: options?.proposedEndsAt?.toISOString() ?? null,
            timezone: options?.proposedSchedulingTimezone
          });

          return {
            appointmentId: "appointment-1",
            appointmentNumber: "APT-10245",
            bookingStatus: "DRAFT",
            status: "READY",
            canProceedWithStaff: true,
            warningOverrideRequired: false,
            warningOverrideSatisfied: false,
            warningKey: null,
            staff: null,
            staffMembers: [],
            checks: [],
            reasons: [],
            availability: null
          };
        },
        now
      }
    );

    expect(result.accepted).toBe(true);
    expect(result.execution).toMatchObject({
      executed: true,
      commandStatus: "SUCCEEDED",
      appointment: {
        id: "appointment-1",
        version: 4
      }
    });
    expect(proposedWindows).toEqual([
      {
        startsAt: "2026-07-06T16:00:00.000Z",
        endsAt: "2026-07-06T17:00:00.000Z",
        timezone: "America/Chicago"
      }
    ]);
  });

  it("adds held resource reservations to schedule execution on the server", async () => {
    const commandHarness = createCommandRepositoryHarness({
      appointment: {
        id: "appointment-1",
        appointmentNumber: "APT-10245",
        organizationId: "org-time-motor-sales",
        locationId: "loc-time-motor-sales-minneapolis",
        ownerUserId: ownerUser.id,
        title: "Service / Repair",
        schedulingTimezone: "America/Chicago",
        startsAt: new Date("2026-07-06T15:00:00.000Z"),
        endsAt: new Date("2026-07-06T16:00:00.000Z"),
        bookingStatus: "DRAFT",
        confirmationStatus: "PENDING",
        attendanceStatus: "EXPECTED",
        executionStatus: "NOT_STARTED",
        version: 3,
        purposeSnapshot: null,
        customerSnapshot: null,
        vehicleSnapshot: null,
        sourceSnapshot: null
      },
      heldReservationCandidates: [
        {
          sourceReservationId: "reservation-held",
          appointmentId: "appointment-1",
          appointmentLocationId: "loc-time-motor-sales-minneapolis",
          requirementId: "requirement-1",
          requirementAppointmentId: "appointment-1",
          requirementCode: "SERVICE_BAY",
          resource: {
            id: "resource-bay-1",
            name: "Service Bay 1",
            status: "ACTIVE",
            capacityMode: "EXCLUSIVE",
            capacity: 1,
            conflictPolicy: "HARD_BLOCK",
            effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
            effectiveTo: null
          },
          resourceLocationId: "loc-time-motor-sales-minneapolis",
          operatingWindows: [],
          unavailability: [],
          startsAt: new Date("2026-07-06T15:00:00.000Z"),
          endsAt: new Date("2026-07-06T16:00:00.000Z"),
          capacityUnits: 1,
          bufferBeforeMinutes: 0,
          bufferAfterMinutes: 0,
          status: "COMMITTED"
        }
      ]
    });
    const lifecycleHarness = createLifecycleRepositoryHarness();
    const result = await submitAndExecuteAppointmentCommand(
      managerUser,
      {
        commandType: "SCHEDULE",
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 3,
        idempotencyKey: "schedule-held-reservation-1",
        correlationId: "corr-schedule-held-1",
        payload: {
          startsAt: "2026-07-06T15:00:00.000Z",
          endsAt: "2026-07-06T16:00:00.000Z"
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
      execution: {
        executed: true,
        resultSnapshot: {
          reservationCandidateCount: 1
        }
      }
    });
    expect(lifecycleHarness.committedReservationCandidateCounts).toEqual([1]);
  });

  it("rejects schedule execution when owner staff warning has not been overridden", async () => {
    const commandHarness = createCommandRepositoryHarness({
      appointment: {
        id: "appointment-1",
        appointmentNumber: "APT-10245",
        organizationId: "org-time-motor-sales",
        locationId: "loc-time-motor-sales-minneapolis",
        ownerUserId: ownerUser.id,
        title: "Service / Repair",
        schedulingTimezone: "America/Chicago",
        startsAt: new Date("2026-07-06T15:00:00.000Z"),
        endsAt: new Date("2026-07-06T16:00:00.000Z"),
        bookingStatus: "DRAFT",
        confirmationStatus: "NOT_REQUIRED",
        attendanceStatus: "EXPECTED",
        executionStatus: "NOT_STARTED",
        version: 3,
        purposeSnapshot: null,
        customerSnapshot: null,
        vehicleSnapshot: null,
        sourceSnapshot: null
      }
    });
    const lifecycleHarness = createLifecycleRepositoryHarness();
    const result = await submitAndExecuteAppointmentCommand(
      managerUser,
      {
        commandType: "SCHEDULE",
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 3,
        idempotencyKey: "schedule-staff-warning-blocked",
        correlationId: "corr-schedule-staff-warning",
        payload: {
          startsAt: "2026-07-06T16:00:00.000Z",
          endsAt: "2026-07-06T17:00:00.000Z"
        }
      },
      {
        commandRepository: commandHarness.repository,
        lifecycleRepository: lifecycleHarness.repository,
        staffConflictPreview: async () => ({
          appointmentId: "appointment-1",
          appointmentNumber: "APT-10245",
          bookingStatus: "DRAFT",
          status: "WARNING",
          canProceedWithStaff: false,
          warningOverrideRequired: true,
          warningOverrideSatisfied: false,
          warningKey: "STAFF|STAFF_OVERLAP|appointment-1|user-owner|resource-staff",
          staff: {
            userId: ownerUser.id,
            name: ownerUser.name,
            role: "OWNER",
            roleCode: "OWNER",
            resourceId: "resource-staff",
            resourceName: ownerUser.name
          },
          staffMembers: [
            {
              userId: ownerUser.id,
              name: ownerUser.name,
              role: "OWNER",
              roleCode: "OWNER",
              resourceId: "resource-staff",
              resourceName: ownerUser.name,
              status: "WARNING",
              warningOverrideRequired: true,
              warningOverrideSatisfied: false,
              warningKey: "STAFF|STAFF_OVERLAP|appointment-1|user-owner|resource-staff",
              reasons: ["Owner staff has a warning-level overlap."]
            }
          ],
          checks: [],
          reasons: ["Owner staff has a warning-level overlap."],
          availability: null
        }),
        now
      }
    );

    expect(result).toMatchObject({
      accepted: false,
      command: {
        commandType: "SCHEDULE",
        status: "FAILED_TERMINAL"
      },
      execution: {
        executed: false,
        commandStatus: "FAILED_TERMINAL",
        resultSnapshot: {
          rejectionCode: "UNRESOLVED_WARNING",
          rejectionReasons: ["Owner staff has a warning-level overlap."]
        }
      }
    });
  });

  it("rejects schedule execution when participant staff warning has not been overridden", async () => {
    const commandHarness = createCommandRepositoryHarness({
      appointment: {
        id: "appointment-1",
        appointmentNumber: "APT-10245",
        organizationId: "org-time-motor-sales",
        locationId: "loc-time-motor-sales-minneapolis",
        ownerUserId: ownerUser.id,
        title: "Service / Repair",
        schedulingTimezone: "America/Chicago",
        startsAt: new Date("2026-07-06T15:00:00.000Z"),
        endsAt: new Date("2026-07-06T16:00:00.000Z"),
        bookingStatus: "DRAFT",
        confirmationStatus: "NOT_REQUIRED",
        attendanceStatus: "EXPECTED",
        executionStatus: "NOT_STARTED",
        version: 3,
        purposeSnapshot: null,
        customerSnapshot: null,
        vehicleSnapshot: null,
        sourceSnapshot: null
      }
    });
    const lifecycleHarness = createLifecycleRepositoryHarness();
    const result = await submitAndExecuteAppointmentCommand(
      managerUser,
      {
        commandType: "SCHEDULE",
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 3,
        idempotencyKey: "schedule-participant-staff-warning-blocked",
        correlationId: "corr-schedule-participant-staff-warning",
        payload: {
          startsAt: "2026-07-06T16:00:00.000Z",
          endsAt: "2026-07-06T17:00:00.000Z"
        }
      },
      {
        commandRepository: commandHarness.repository,
        lifecycleRepository: lifecycleHarness.repository,
        staffConflictPreview: async () => ({
          appointmentId: "appointment-1",
          appointmentNumber: "APT-10245",
          bookingStatus: "DRAFT",
          status: "WARNING",
          canProceedWithStaff: false,
          warningOverrideRequired: true,
          warningOverrideSatisfied: false,
          warningKey: "STAFF|STAFF_OVERLAP|appointment-1|user-rayana|resource-staff-rayana",
          staff: {
            userId: "user-rayana",
            name: "Rayana Hassan",
            role: "PARTICIPANT",
            roleCode: "OFFICE_ADMIN",
            resourceId: "resource-staff-rayana",
            resourceName: "Rayana Hassan"
          },
          staffMembers: [
            {
              userId: ownerUser.id,
              name: ownerUser.name,
              role: "OWNER",
              roleCode: "OWNER",
              resourceId: "resource-staff",
              resourceName: ownerUser.name,
              status: "READY",
              warningOverrideRequired: false,
              warningOverrideSatisfied: false,
              warningKey: null,
              reasons: []
            },
            {
              userId: "user-rayana",
              name: "Rayana Hassan",
              role: "PARTICIPANT",
              roleCode: "OFFICE_ADMIN",
              resourceId: "resource-staff-rayana",
              resourceName: "Rayana Hassan",
              status: "WARNING",
              warningOverrideRequired: true,
              warningOverrideSatisfied: false,
              warningKey:
                "STAFF|STAFF_OVERLAP|appointment-1|user-rayana|resource-staff-rayana",
              reasons: ["Participant staff has a warning-level overlap."]
            }
          ],
          checks: [],
          reasons: ["Participant staff has a warning-level overlap."],
          availability: null
        }),
        now
      }
    );

    expect(result).toMatchObject({
      accepted: false,
      command: {
        commandType: "SCHEDULE",
        status: "FAILED_TERMINAL"
      },
      execution: {
        executed: false,
        commandStatus: "FAILED_TERMINAL",
        resultSnapshot: {
          rejectionCode: "UNRESOLVED_WARNING",
          rejectionReasons: ["Participant staff has a warning-level overlap."]
        }
      }
    });
  });

  it("allows schedule execution when staff warning override is already satisfied", async () => {
    const commandHarness = createCommandRepositoryHarness({
      appointment: {
        id: "appointment-1",
        appointmentNumber: "APT-10245",
        organizationId: "org-time-motor-sales",
        locationId: "loc-time-motor-sales-minneapolis",
        ownerUserId: ownerUser.id,
        title: "Service / Repair",
        schedulingTimezone: "America/Chicago",
        startsAt: null,
        endsAt: null,
        bookingStatus: "DRAFT",
        confirmationStatus: "NOT_REQUIRED",
        attendanceStatus: "EXPECTED",
        executionStatus: "NOT_STARTED",
        version: 3,
        purposeSnapshot: null,
        customerSnapshot: null,
        vehicleSnapshot: null,
        sourceSnapshot: null
      }
    });
    const lifecycleHarness = createLifecycleRepositoryHarness();
    const result = await submitAndExecuteAppointmentCommand(
      managerUser,
      {
        commandType: "SCHEDULE",
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 3,
        idempotencyKey: "schedule-staff-warning-overridden",
        correlationId: "corr-schedule-staff-warning-overridden",
        payload: {
          startsAt: "2026-07-06T16:00:00.000Z",
          endsAt: "2026-07-06T17:00:00.000Z"
        }
      },
      {
        commandRepository: commandHarness.repository,
        lifecycleRepository: lifecycleHarness.repository,
        staffConflictPreview: async () => ({
          appointmentId: "appointment-1",
          appointmentNumber: "APT-10245",
          bookingStatus: "DRAFT",
          status: "WARNING",
          canProceedWithStaff: true,
          warningOverrideRequired: true,
          warningOverrideSatisfied: true,
          warningKey: "STAFF|STAFF_OVERLAP|appointment-1|user-owner|resource-staff",
          staff: {
            userId: ownerUser.id,
            name: ownerUser.name,
            role: "OWNER",
            roleCode: "OWNER",
            resourceId: "resource-staff",
            resourceName: ownerUser.name
          },
          staffMembers: [
            {
              userId: ownerUser.id,
              name: ownerUser.name,
              role: "OWNER",
              roleCode: "OWNER",
              resourceId: "resource-staff",
              resourceName: ownerUser.name,
              status: "WARNING",
              warningOverrideRequired: true,
              warningOverrideSatisfied: true,
              warningKey: "STAFF|STAFF_OVERLAP|appointment-1|user-owner|resource-staff",
              reasons: ["Owner staff warning has a persisted manager override."]
            }
          ],
          checks: [],
          reasons: ["Owner staff warning has a persisted manager override."],
          availability: null
        }),
        now
      }
    );

    expect(result).toMatchObject({
      accepted: true,
      command: {
        commandType: "SCHEDULE",
        status: "SUCCEEDED"
      },
      execution: {
        executed: true,
        commandStatus: "SUCCEEDED",
        appointment: {
          id: "appointment-1",
          version: 4
        },
        historyEventCount: 1
      }
    });
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

  it("converts late update version races into safe conflicts with refreshed version evidence", async () => {
    const mutableAppointment: AppointmentCommandAppointmentRecord = {
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
      version: 3,
      purposeSnapshot: null,
      customerSnapshot: null,
      vehicleSnapshot: null,
      sourceSnapshot: null
    };
    const commandHarness = createCommandRepositoryHarness({
      appointment: mutableAppointment
    });
    const conflictCompletions: Array<{
      commandId: string;
      status: string;
      appointmentId: string | null;
      errorCode: string | null;
      errorMessage: string | null;
      resultSnapshot: Record<string, unknown>;
    }> = [];
    const automationCalls: string[] = [];
    let transactionAttempt = 0;
    const lifecycleRepository: AppointmentLifecycleTransactionRepository = {
      async withLifecycleTransaction(operation) {
        transactionAttempt += 1;

        return operation({
          async createAppointment() {
            throw new Error("Not used in this test.");
          },

          async updateAppointment(effect) {
            mutableAppointment.version = effect.expectedVersion + 1;
            throw new Error(
              "Appointment update failed because the expected version no longer matches."
            );
          },

          async commitReservations() {
            return [];
          },

          async releaseReservations() {
            return [];
          },

          async createTasks() {
            return [];
          },

          async createTaskLinks() {
            return [];
          },

          async removeTaskLinks() {
            return [];
          },

          async createHistoryEvents() {
            return [];
          },

          async createActivityEvents() {},

          async completeCommand(completion) {
            conflictCompletions.push({
              commandId: completion.commandId,
              status: completion.status,
              appointmentId: completion.appointmentId,
              errorCode: completion.errorCode,
              errorMessage: completion.errorMessage,
              resultSnapshot: completion.resultSnapshot
            });
            return completion;
          }
        });
      }
    };

    const result = await submitAndExecuteAppointmentCommand(
      managerUser,
      {
        commandType: "RESCHEDULE",
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 3,
        idempotencyKey: "reschedule-late-stale-conflict",
        correlationId: "corr-reschedule-late-stale",
        payload: {
          startsAt: "2026-07-06T18:00:00.000Z",
          endsAt: "2026-07-06T19:00:00.000Z",
          reasonCode: "CUSTOMER_REQUEST",
          reasonNotes: "Customer requested a later slot."
        }
      },
      {
        commandRepository: commandHarness.repository,
        lifecycleRepository,
        automationRecorder: async () => {
          automationCalls.push("called");
        },
        now
      }
    );

    expect(result).toMatchObject({
      accepted: false,
      duplicate: false,
      conflict: {
        expectedAppointmentVersion: 3,
        currentAppointmentVersion: 4
      },
      command: {
        id: "cmd-1",
        commandType: "RESCHEDULE",
        status: "CONFLICT",
        currentAppointmentVersion: 4,
        errorCode: "STALE_VERSION",
        errorMessage: "Expected appointment version 3; current version is 4.",
        resultSnapshot: {
          appointmentId: "appointment-1",
          commandType: "RESCHEDULE",
          expectedAppointmentVersion: 3,
          currentAppointmentVersion: 4
        }
      },
      execution: null
    });
    expect(transactionAttempt).toBe(2);
    expect(conflictCompletions).toEqual([
      {
        commandId: "cmd-1",
        status: "CONFLICT",
        appointmentId: "appointment-1",
        errorCode: "STALE_VERSION",
        errorMessage: "Expected appointment version 3; current version is 4.",
        resultSnapshot: {
          appointmentId: "appointment-1",
          commandType: "RESCHEDULE",
          expectedAppointmentVersion: 3,
          currentAppointmentVersion: 4
        }
      }
    ]);
    expect(automationCalls).toEqual([]);
  });

  it.each(lateStaleConflictScenarios)(
    "converts mutation-family concurrency races into safe conflicts: $name",
    async (scenario) => {
      const mutableAppointment = createScenarioAppointment(
        scenario.appointment
      ) as AppointmentCommandAppointmentRecord;
      const commandHarness = createCommandRepositoryHarness({
        appointment: mutableAppointment
      });
      const conflictCompletions: Array<{
        commandId: string;
        status: string;
        appointmentId: string | null;
        errorCode: string | null;
        errorMessage: string | null;
        resultSnapshot: Record<string, unknown>;
      }> = [];
      const automationCalls: string[] = [];
      const transactionAttempts = { count: 0 };
      const lifecycleRepository = createLateStaleConflictLifecycleRepository({
        mutableAppointment,
        conflictCompletions,
        transactionAttempts
      });

      const result = await submitAndExecuteAppointmentCommand(
        managerUser,
        buildCommandInput(scenario),
        {
          commandRepository: commandHarness.repository,
          lifecycleRepository,
          automationRecorder: async () => {
            automationCalls.push("called");
          },
          now
        }
      );

      expect(result).toMatchObject({
        accepted: false,
        duplicate: false,
        conflict: {
          expectedAppointmentVersion: 3,
          currentAppointmentVersion: 4
        },
        command: {
          id: "cmd-1",
          commandType: scenario.commandType,
          status: "CONFLICT",
          currentAppointmentVersion: 4,
          errorCode: "STALE_VERSION",
          errorMessage: "Expected appointment version 3; current version is 4.",
          resultSnapshot: {
            appointmentId: "appointment-1",
            commandType: scenario.commandType,
            expectedAppointmentVersion: 3,
            currentAppointmentVersion: 4
          }
        },
        execution: null
      });
      expect(transactionAttempts.count).toBe(2);
      expect(conflictCompletions).toEqual([
        {
          commandId: "cmd-1",
          status: "CONFLICT",
          appointmentId: "appointment-1",
          errorCode: "STALE_VERSION",
          errorMessage: "Expected appointment version 3; current version is 4.",
          resultSnapshot: {
            appointmentId: "appointment-1",
            commandType: scenario.commandType,
            expectedAppointmentVersion: 3,
            currentAppointmentVersion: 4
          }
        }
      ]);
      expect(automationCalls).toEqual([]);
    }
  );

  it("records runtime automation executions after successful outcome-driven automation", async () => {
    const commandHarness = createCommandRepositoryHarness({
      appointment: {
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
        attendanceStatus: "CHECKED_IN",
        executionStatus: "FINISHED",
        version: 3,
        purposeSnapshot: null,
        customerSnapshot: null,
        vehicleSnapshot: null,
        sourceSnapshot: null
      }
    });
    const lifecycleHarness = createLifecycleRepositoryHarness();
    const automationCalls: Array<{
      actorUserId: string;
      appointmentId: string | null;
      commandType: string;
      taskAutomationCount: number;
      appointmentAutomationCount: number;
      generatedTaskIds: string[];
      generatedAppointmentIds: string[];
    }> = [];

    const result = await submitAndExecuteAppointmentCommand(
      managerUser,
      {
        commandType: "COMPLETE",
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 3,
        idempotencyKey: "complete-and-automate-1",
        correlationId: "corr-complete-1",
        payload: {
          outcomeCode: "COMPLETED",
          followUpDispositionCode: "FOLLOW_UP_APPOINTMENT_REQUIRED",
          customerReference: "Ahmed Ibrahim",
          vehicleReference: "2014 Ford Taurus",
          reasonCode: "OUTCOME_RECORDED",
          reasonNotes: "Follow-up visit needed after inspection."
        }
      },
      {
        commandRepository: commandHarness.repository,
        lifecycleRepository: lifecycleHarness.repository,
        automationRecorder: async (input) => {
          automationCalls.push({
            actorUserId: input.actorUserId,
            appointmentId: input.appointmentId,
            commandType: input.commandType,
            taskAutomationCount: input.plan.taskCreateEffects?.length ?? 0,
            appointmentAutomationCount: input.plan.appointmentCreateEffects?.length ?? 0,
            generatedTaskIds: input.execution.createdTasks.map((task) => task.id),
            generatedAppointmentIds: input.execution.createdAppointments.map(
              (appointment) => appointment.id
            )
          });
        },
        now
      }
    );

    expect(result.accepted).toBe(true);
    expect(result.execution?.commandStatus).toBe("SUCCEEDED");
    expect(automationCalls).toEqual([
      {
        actorUserId: managerUser.id,
        appointmentId: "appointment-1",
        commandType: "COMPLETE",
        taskAutomationCount: 1,
        appointmentAutomationCount: 1,
        generatedTaskIds: ["task-1"],
        generatedAppointmentIds: ["appointment-created"]
      }
    ]);
  });
});
