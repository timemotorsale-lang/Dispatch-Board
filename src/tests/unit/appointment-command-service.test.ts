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

const participantUser: AuthenticatedUser = {
  id: "user-participant",
  name: "Sadia Hassan",
  email: "participant@local.test",
  isActive: true,
  roles: ["Technician"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

const viewerUser: AuthenticatedUser = {
  id: "user-viewer",
  name: "Queue Viewer",
  email: "viewer@local.test",
  isActive: true,
  roles: ["Appointment Viewer"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

const appointmentAdminUser: AuthenticatedUser = {
  id: "user-appointment-admin",
  name: "Appointment Admin",
  email: "appointment-admin@local.test",
  isActive: true,
  roles: ["Appointment Administrator"],
  duties: {
    direct: [],
    roleDefaults: [],
    all: []
  }
};

function createLocationAccess(
  userId: string,
  overrides: Partial<
    Omit<AppointmentCommandLocationAccessRecord, "userId" | "locationId" | "validFrom" | "validTo">
  > = {}
): AppointmentCommandLocationAccessRecord {
  return {
    userId,
    locationId: "loc-time-motor-sales-minneapolis",
    canViewSchedule: true,
    canParticipate: true,
    canOwnAppointments: false,
    canManageAppointments: false,
    canViewLimitedData: true,
    validFrom: new Date("2026-01-01T00:00:00.000Z"),
    validTo: null,
    ...overrides
  };
}

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
    [managerUser.id]: createLocationAccess(managerUser.id, {
      canOwnAppointments: true,
      canManageAppointments: true
    }),
    [ownerUser.id]: createLocationAccess(ownerUser.id, {
      canOwnAppointments: true
    }),
    [otherUser.id]: createLocationAccess(otherUser.id, {
      canOwnAppointments: true
    }),
    [participantUser.id]: createLocationAccess(participantUser.id),
    [viewerUser.id]: createLocationAccess(viewerUser.id, {
      canParticipate: false,
      canViewLimitedData: false
    }),
    [appointmentAdminUser.id]: createLocationAccess(appointmentAdminUser.id, {
      canParticipate: false
    })
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

  it("enforces the MVP live-appointment mutation boundary across board actors", async () => {
    const { createdCommands, repository } = createAppointmentCommandRepositoryHarness();

    const deniedActors = [
      [participantUser, "participant"],
      [viewerUser, "viewer"],
      [appointmentAdminUser, "appointment-admin"]
    ] as const;

    for (const [actor, key] of deniedActors) {
      await expect(
        submitAppointmentCommand(
          actor,
          {
            commandType: "CANCEL",
            appointmentId: "appointment-1",
            expectedAppointmentVersion: 3,
            idempotencyKey: `cancel-${key}-denied-1`,
            payload: {
              reasonCode: "CUSTOMER_REQUEST"
            }
          },
          repository,
          now
        )
      ).rejects.toThrow("Appointment command is not authorized.");
    }

    expect(createdCommands).toHaveLength(0);

    await expect(
      submitAppointmentCommand(
        ownerUser,
        {
          commandType: "CANCEL",
          appointmentId: "appointment-1",
          expectedAppointmentVersion: 3,
          idempotencyKey: "cancel-owner-allowed-1",
          payload: {
            reasonCode: "CUSTOMER_REQUEST"
          }
        },
        repository,
        now
      )
    ).resolves.toMatchObject({
      accepted: true,
      command: {
        actorUserId: ownerUser.id,
        commandType: "CANCEL",
        status: "PENDING"
      }
    });

    await expect(
      submitAppointmentCommand(
        managerUser,
        {
          commandType: "CANCEL",
          appointmentId: "appointment-1",
          expectedAppointmentVersion: 3,
          idempotencyKey: "cancel-manager-allowed-1",
          payload: {
            reasonCode: "CUSTOMER_REQUEST"
          }
        },
        repository,
        now
      )
    ).resolves.toMatchObject({
      accepted: true,
      command: {
        actorUserId: managerUser.id,
        commandType: "CANCEL",
        status: "PENDING"
      }
    });

    expect(createdCommands).toHaveLength(2);
  });

  it("keeps manager-only appointment actions unavailable to owners and admin-only actors", async () => {
    const { createdCommands, repository } = createAppointmentCommandRepositoryHarness();

    for (const actor of [ownerUser, appointmentAdminUser]) {
      await expect(
        submitAppointmentCommand(
          actor,
          {
            commandType: "TRANSFER_OWNER",
            appointmentId: "appointment-1",
            expectedAppointmentVersion: 3,
            idempotencyKey: `transfer-owner-${actor.id}-denied-1`,
            payload: {
              ownerUserId: otherUser.id,
              reasonCode: "WORKLOAD_BALANCE",
              reasonNotes: "Manager-only transfer safety check."
            }
          },
          repository,
          now
        )
      ).rejects.toThrow("Appointment command is not authorized.");

      await expect(
        submitAppointmentCommand(
          actor,
          {
            commandType: "OVERRIDE_WARNING",
            appointmentId: "appointment-1",
            expectedAppointmentVersion: 3,
            idempotencyKey: `override-warning-${actor.id}-denied-1`,
            payload: {
              warningCode: "STAFF_CONFLICT",
              reasonCode: "MANAGER_ACCEPTED",
              reasonNotes: "Manager-only warning override safety check."
            }
          },
          repository,
          now
        )
      ).rejects.toThrow("Appointment command is not authorized.");
    }

    expect(createdCommands).toHaveLength(0);

    await expect(
      submitAppointmentCommand(
        managerUser,
        {
          commandType: "TRANSFER_OWNER",
          appointmentId: "appointment-1",
          expectedAppointmentVersion: 3,
          idempotencyKey: "transfer-owner-manager-allowed-1",
          payload: {
            ownerUserId: otherUser.id,
            reasonCode: "WORKLOAD_BALANCE",
            reasonNotes: "Manager approved ownership transfer."
          }
        },
        repository,
        now
      )
    ).resolves.toMatchObject({
      accepted: true,
      command: {
        actorUserId: managerUser.id,
        commandType: "TRANSFER_OWNER",
        status: "PENDING"
      }
    });
    expect(createdCommands).toHaveLength(1);
  });

  it("requires location-level management authority even when the actor has a manager role", async () => {
    const { createdCommands, repository } = createAppointmentCommandRepositoryHarness({
      accessByUserId: {
        [managerUser.id]: createLocationAccess(managerUser.id, {
          canOwnAppointments: true,
          canManageAppointments: false
        })
      }
    });

    await expect(
      submitAppointmentCommand(
        managerUser,
        {
          commandType: "APPROVE",
          appointmentId: "appointment-1",
          expectedAppointmentVersion: 3,
          idempotencyKey: "approve-manager-no-location-authority-1",
          payload: {}
        },
        repository,
        now
      )
    ).rejects.toThrow("Appointment command is not authorized.");

    await expect(
      submitAppointmentCommand(
        managerUser,
        {
          commandType: "RESCHEDULE",
          appointmentId: "appointment-1",
          expectedAppointmentVersion: 3,
          idempotencyKey: "reschedule-manager-no-location-authority-1",
          payload: {
            startsAt: "2026-07-06T17:00:00.000Z"
          }
        },
        repository,
        now
      )
    ).rejects.toThrow("Appointment command is not authorized.");

    expect(createdCommands).toHaveLength(0);
  });
});
