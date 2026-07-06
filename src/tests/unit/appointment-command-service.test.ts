import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import type {
  AppointmentCommandAppointmentRecord,
  AppointmentCommandLedgerRecord,
  AppointmentCommandLocationAccessRecord,
  AppointmentCommandRepository,
  CreateAppointmentCommandLedgerRecordInput
} from "@/server/repositories/appointment-command-repository";
import { submitAppointmentCommand } from "@/server/services/appointment-command-service";

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

const otherUser: AuthenticatedUser = {
  id: "user-other",
  name: "Casey Mechanic",
  email: "other@local.test",
  isActive: true,
  roles: ["Technician"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

function createAppointmentCommandRepositoryHarness(input?: {
  appointment?: AppointmentCommandAppointmentRecord | null;
  existingCommand?: AppointmentCommandLedgerRecord | null;
  accessByUserId?: Record<string, AppointmentCommandLocationAccessRecord>;
}) {
  const createdCommands: CreateAppointmentCommandLedgerRecordInput[] = [];
  const appointment = input?.appointment ?? {
    id: "appointment-1",
    appointmentNumber: "APT-10245",
    organizationId: "org-time-motor-sales",
    locationId: "loc-time-motor-sales-minneapolis",
    ownerUserId: ownerUser.id,
    title: "Service / Repair",
    bookingStatus: "SCHEDULED",
    confirmationStatus: "CONFIRMED",
    attendanceStatus: "EXPECTED",
    executionStatus: "NOT_STARTED",
    version: 3
  };
  const accessByUserId = input?.accessByUserId ?? {
    [managerUser.id]: {
      userId: managerUser.id,
      locationId: "loc-time-motor-sales-minneapolis",
      canViewSchedule: true,
      canParticipate: true,
      canOwnAppointments: true,
      canManageAppointments: true,
      canViewLimitedData: true,
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validTo: null
    },
    [ownerUser.id]: {
      userId: ownerUser.id,
      locationId: "loc-time-motor-sales-minneapolis",
      canViewSchedule: true,
      canParticipate: true,
      canOwnAppointments: true,
      canManageAppointments: false,
      canViewLimitedData: true,
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validTo: null
    },
    [otherUser.id]: {
      userId: otherUser.id,
      locationId: "loc-time-motor-sales-minneapolis",
      canViewSchedule: true,
      canParticipate: true,
      canOwnAppointments: true,
      canManageAppointments: false,
      canViewLimitedData: true,
      validFrom: new Date("2026-01-01T00:00:00.000Z"),
      validTo: null
    }
  };

  function toLedgerRecord(
    command: CreateAppointmentCommandLedgerRecordInput,
    id = `cmd-${createdCommands.length + 1}`
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
      const access = accessByUserId[userId];
      return access?.locationId === locationId ? access : null;
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

describe("appointment command service boundary", () => {
  it("accepts an owner-created draft through the command ledger boundary", async () => {
    const { createdCommands, repository } = createAppointmentCommandRepositoryHarness();

    const result = await submitAppointmentCommand(
      ownerUser,
      {
        commandType: "CREATE_DRAFT",
        organizationId: "org-time-motor-sales",
        locationId: "loc-time-motor-sales-minneapolis",
        ownerUserId: ownerUser.id,
        idempotencyKey: "draft-service-20260706-1",
        correlationId: "corr-draft-1",
        payload: {
          title: "Service / Repair"
        }
      },
      repository,
      now
    );

    expect(result).toMatchObject({
      accepted: true,
      duplicate: false,
      conflict: null,
      command: {
        commandType: "CREATE_DRAFT",
        status: "PENDING",
        appointmentId: null,
        actorUserId: ownerUser.id,
        correlationId: "corr-draft-1"
      }
    });
    expect(createdCommands).toHaveLength(1);
    expect(createdCommands[0]).toMatchObject({
      organizationId: "org-time-motor-sales",
      locationId: "loc-time-motor-sales-minneapolis",
      appointmentId: null,
      commandType: "CREATE_DRAFT",
      status: "PENDING"
    });
  });

  it("records stale existing-appointment commands as conflicts instead of mutating", async () => {
    const { createdCommands, repository } = createAppointmentCommandRepositoryHarness();

    const result = await submitAppointmentCommand(
      managerUser,
      {
        commandType: "RESCHEDULE",
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 2,
        idempotencyKey: "reschedule-stale-1",
        correlationId: "corr-stale-1",
        payload: {
          startsAt: "2026-07-06T17:00:00.000Z"
        }
      },
      repository,
      now
    );

    expect(result).toMatchObject({
      accepted: false,
      duplicate: false,
      conflict: {
        expectedAppointmentVersion: 2,
        currentAppointmentVersion: 3
      },
      command: {
        commandType: "RESCHEDULE",
        status: "CONFLICT",
        errorCode: "STALE_VERSION",
        expectedAppointmentVersion: 2,
        currentAppointmentVersion: 3
      }
    });
    expect(createdCommands[0]).toMatchObject({
      status: "CONFLICT",
      failedAt: now,
      errorCode: "STALE_VERSION"
    });
  });

  it("accepts approve commands only from an authorized appointment manager", async () => {
    const { createdCommands, repository } = createAppointmentCommandRepositoryHarness();

    await expect(
      submitAppointmentCommand(
        ownerUser,
        {
          commandType: "APPROVE",
          appointmentId: "appointment-1",
          expectedAppointmentVersion: 3,
          idempotencyKey: "approve-owner-rejected-1",
          payload: {}
        },
        repository,
        now
      )
    ).rejects.toThrow("Appointment command is not authorized.");

    const result = await submitAppointmentCommand(
      managerUser,
      {
        commandType: "APPROVE",
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 3,
        idempotencyKey: "approve-manager-1",
        payload: {}
      },
      repository,
      now
    );

    expect(result).toMatchObject({
      accepted: true,
      command: {
        commandType: "APPROVE",
        status: "PENDING",
        appointmentId: "appointment-1",
        actorUserId: managerUser.id
      }
    });
    expect(createdCommands).toHaveLength(1);
    expect(createdCommands[0]).toMatchObject({
      commandType: "APPROVE",
      status: "PENDING"
    });
  });

  it("returns same-hash idempotency duplicates without creating another command", async () => {
    const { repository, toLedgerRecord, createdCommands } =
      createAppointmentCommandRepositoryHarness();
    const firstResult = await submitAppointmentCommand(
      managerUser,
      {
        commandType: "RESCHEDULE",
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 3,
        idempotencyKey: "reschedule-duplicate-1",
        payload: {
          startsAt: "2026-07-06T17:00:00.000Z"
        }
      },
      repository,
      now
    );
    const existingCommand = toLedgerRecord(createdCommands[0], "cmd-existing");
    const duplicateHarness = createAppointmentCommandRepositoryHarness({
      existingCommand
    });

    const duplicateResult = await submitAppointmentCommand(
      managerUser,
      {
        commandType: "RESCHEDULE",
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 3,
        idempotencyKey: "reschedule-duplicate-1",
        payload: {
          startsAt: "2026-07-06T17:00:00.000Z"
        }
      },
      duplicateHarness.repository,
      now
    );

    expect(firstResult.duplicate).toBe(false);
    expect(duplicateResult).toMatchObject({
      duplicate: true,
      command: {
        id: "cmd-existing",
        status: "PENDING"
      }
    });
    expect(duplicateHarness.createdCommands).toHaveLength(0);
  });

  it("rejects reused idempotency keys when the request hash is different", async () => {
    const { repository, toLedgerRecord, createdCommands } =
      createAppointmentCommandRepositoryHarness();
    await submitAppointmentCommand(
      managerUser,
      {
        commandType: "RESCHEDULE",
        appointmentId: "appointment-1",
        expectedAppointmentVersion: 3,
        idempotencyKey: "reschedule-reused-key",
        payload: {
          startsAt: "2026-07-06T17:00:00.000Z"
        }
      },
      repository,
      now
    );
    const duplicateHarness = createAppointmentCommandRepositoryHarness({
      existingCommand: toLedgerRecord(createdCommands[0], "cmd-existing")
    });

    await expect(
      submitAppointmentCommand(
        managerUser,
        {
          commandType: "RESCHEDULE",
          appointmentId: "appointment-1",
          expectedAppointmentVersion: 3,
          idempotencyKey: "reschedule-reused-key",
          payload: {
            startsAt: "2026-07-06T18:00:00.000Z"
          }
        },
        duplicateHarness.repository,
        now
      )
    ).rejects.toThrow("Idempotency key already used for a different appointment command.");
  });

  it("keeps existing appointment mutation limited to manager or owner", async () => {
    const { repository } = createAppointmentCommandRepositoryHarness();

    await expect(
      submitAppointmentCommand(
        otherUser,
        {
          commandType: "CANCEL",
          appointmentId: "appointment-1",
          expectedAppointmentVersion: 3,
          idempotencyKey: "cancel-unauthorized-1",
          payload: {
            reasonCode: "CUSTOMER_REQUEST"
          }
        },
        repository,
        now
      )
    ).rejects.toThrow("Appointment command is not authorized.");
  });
});
