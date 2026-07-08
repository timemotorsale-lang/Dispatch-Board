import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type {
  AppointmentCommandStatus,
  AppointmentCommandType
} from "@/server/appointments/appointment-domain";
import type { AppointmentReservationCommitCandidate } from "@/server/appointments/appointment-reservation-commit-service";

type AppointmentCommandDatabase = Pick<
  PrismaClient,
  "appointment" | "appointmentResourceReservation" | "userLocationAccess"
> & {
  appointmentCommandLedger: {
    create(input: {
      data: Record<string, unknown>;
      select: typeof appointmentCommandLedgerSelect;
    }): Promise<AppointmentCommandLedgerRecord>;
    findUnique(input: {
      where: {
        organizationId_commandType_idempotencyKey: {
          organizationId: string;
          commandType: AppointmentCommandType;
          idempotencyKey: string;
        };
      };
      select: typeof appointmentCommandLedgerSelect;
    }): Promise<AppointmentCommandLedgerRecord | null>;
  };
};

const appointmentCommandAppointmentSelect = {
  id: true,
  appointmentNumber: true,
  organizationId: true,
  locationId: true,
  ownerUserId: true,
  title: true,
  schedulingTimezone: true,
  startsAt: true,
  endsAt: true,
  bookingStatus: true,
  confirmationStatus: true,
  attendanceStatus: true,
  executionStatus: true,
  version: true,
  purposeSnapshot: true,
  customerSnapshot: true,
  vehicleSnapshot: true,
  sourceSnapshot: true
} satisfies Prisma.AppointmentSelect;

const appointmentCommandLedgerSelect = {
  id: true,
  organizationId: true,
  locationId: true,
  appointmentId: true,
  actorUserId: true,
  commandType: true,
  status: true,
  idempotencyKey: true,
  requestHash: true,
  correlationId: true,
  causationId: true,
  expectedAppointmentVersion: true,
  currentAppointmentVersion: true,
  attemptCount: true,
  maxAttempts: true,
  nextRetryAt: true,
  lockedAt: true,
  completedAt: true,
  failedAt: true,
  resultSnapshot: true,
  errorCode: true,
  errorMessage: true,
  createdAt: true,
  updatedAt: true
};

const appointmentLocationAccessSelect = {
  userId: true,
  locationId: true,
  canViewSchedule: true,
  canParticipate: true,
  canOwnAppointments: true,
  canManageAppointments: true,
  canViewLimitedData: true,
  validFrom: true,
  validTo: true
} satisfies Prisma.UserLocationAccessSelect;

const heldReservationCommitCandidateSelect = {
  id: true,
  appointmentId: true,
  requirementId: true,
  startsAt: true,
  endsAt: true,
  capacityUnits: true,
  bufferBeforeMinutes: true,
  bufferAfterMinutes: true,
  appointment: {
    select: {
      id: true,
      locationId: true
    }
  },
  requirement: {
    select: {
      id: true,
      appointmentId: true,
      requirementCode: true
    }
  },
  resource: {
    select: {
      id: true,
      locationId: true,
      name: true,
      status: true,
      capacityMode: true,
      capacity: true,
      conflictPolicy: true,
      effectiveFrom: true,
      effectiveTo: true,
      operatingWindows: {
        select: {
          businessDay: true,
          opensAtMinute: true,
          closesAtMinute: true,
          capacityOverride: true,
          validFrom: true,
          validTo: true
        }
      },
      unavailability: {
        select: {
          id: true,
          type: true,
          startsAt: true,
          endsAt: true,
          capacityReduction: true,
          reason: true
        }
      }
    }
  }
} satisfies Prisma.AppointmentResourceReservationSelect;

export type AppointmentCommandAppointmentRecord = Prisma.AppointmentGetPayload<{
  select: typeof appointmentCommandAppointmentSelect;
}>;

export type AppointmentCommandLedgerRecord = {
  id: string;
  organizationId: string;
  locationId: string | null;
  appointmentId: string | null;
  actorUserId: string | null;
  commandType: AppointmentCommandType;
  status: AppointmentCommandStatus;
  idempotencyKey: string;
  requestHash: string;
  correlationId: string;
  causationId: string | null;
  expectedAppointmentVersion: number | null;
  currentAppointmentVersion: number | null;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt: Date | null;
  lockedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  resultSnapshot: Prisma.JsonValue | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AppointmentCommandLocationAccessRecord = Prisma.UserLocationAccessGetPayload<{
  select: typeof appointmentLocationAccessSelect;
}>;

export type AppointmentCommandHeldReservationCommitCandidateRecord =
  Prisma.AppointmentResourceReservationGetPayload<{
    select: typeof heldReservationCommitCandidateSelect;
  }>;

export type CreateAppointmentCommandLedgerRecordInput = {
  organizationId: string;
  locationId: string | null;
  appointmentId: string | null;
  actorUserId: string | null;
  commandType: AppointmentCommandType;
  status: AppointmentCommandStatus;
  idempotencyKey: string;
  requestHash: string;
  correlationId: string;
  causationId: string | null;
  expectedAppointmentVersion: number | null;
  currentAppointmentVersion: number | null;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt: Date | null;
  lockedAt: Date | null;
  completedAt: Date | null;
  failedAt: Date | null;
  resultSnapshot: Prisma.InputJsonValue | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export type AppointmentCommandRepository = {
  createCommandLedger(
    input: CreateAppointmentCommandLedgerRecordInput
  ): Promise<AppointmentCommandLedgerRecord>;
  findActiveLocationAccess(
    userId: string,
    locationId: string,
    at: Date
  ): Promise<AppointmentCommandLocationAccessRecord | null>;
  findAppointmentById(appointmentId: string): Promise<AppointmentCommandAppointmentRecord | null>;
  findCommandByIdempotency(input: {
    organizationId: string;
    commandType: AppointmentCommandType;
    idempotencyKey: string;
  }): Promise<AppointmentCommandLedgerRecord | null>;
  findHeldReservationCommitCandidates?(
    appointmentId: string
  ): Promise<AppointmentReservationCommitCandidate[]>;
};

function isDateWithinAccessWindow(
  access: AppointmentCommandLocationAccessRecord,
  at: Date
) {
  return access.validFrom <= at && (!access.validTo || access.validTo >= at);
}

function toCommitCandidate(
  reservation: AppointmentCommandHeldReservationCommitCandidateRecord
): AppointmentReservationCommitCandidate {
  return {
    sourceReservationId: reservation.id,
    appointmentId: reservation.appointmentId,
    appointmentLocationId: reservation.appointment.locationId,
    requirementId: reservation.requirementId,
    requirementAppointmentId: reservation.requirement?.appointmentId ?? null,
    requirementCode: reservation.requirement?.requirementCode ?? "UNASSIGNED_RESOURCE",
    resource: {
      id: reservation.resource.id,
      name: reservation.resource.name,
      status: reservation.resource.status,
      capacityMode: reservation.resource.capacityMode,
      capacity: reservation.resource.capacity,
      conflictPolicy: reservation.resource.conflictPolicy,
      effectiveFrom: reservation.resource.effectiveFrom,
      effectiveTo: reservation.resource.effectiveTo
    },
    resourceLocationId: reservation.resource.locationId,
    operatingWindows: reservation.resource.operatingWindows,
    unavailability: reservation.resource.unavailability,
    startsAt: reservation.startsAt,
    endsAt: reservation.endsAt,
    capacityUnits: reservation.capacityUnits,
    bufferBeforeMinutes: reservation.bufferBeforeMinutes,
    bufferAfterMinutes: reservation.bufferAfterMinutes,
    status: "COMMITTED"
  };
}

export function createAppointmentCommandRepository(
  database: AppointmentCommandDatabase = prisma as unknown as AppointmentCommandDatabase
): AppointmentCommandRepository {
  return {
    async createCommandLedger(input) {
      return database.appointmentCommandLedger.create({
        data: {
          organizationId: input.organizationId,
          ...(input.locationId ? { locationId: input.locationId } : {}),
          ...(input.appointmentId ? { appointmentId: input.appointmentId } : {}),
          ...(input.actorUserId ? { actorUserId: input.actorUserId } : {}),
          commandType: input.commandType,
          status: input.status,
          idempotencyKey: input.idempotencyKey,
          requestHash: input.requestHash,
          correlationId: input.correlationId,
          ...(input.causationId ? { causationId: input.causationId } : {}),
          ...(input.expectedAppointmentVersion
            ? { expectedAppointmentVersion: input.expectedAppointmentVersion }
            : {}),
          ...(input.currentAppointmentVersion
            ? { currentAppointmentVersion: input.currentAppointmentVersion }
            : {}),
          attemptCount: input.attemptCount,
          maxAttempts: input.maxAttempts,
          ...(input.nextRetryAt ? { nextRetryAt: input.nextRetryAt } : {}),
          ...(input.lockedAt ? { lockedAt: input.lockedAt } : {}),
          ...(input.completedAt ? { completedAt: input.completedAt } : {}),
          ...(input.failedAt ? { failedAt: input.failedAt } : {}),
          ...(input.resultSnapshot ? { resultSnapshot: input.resultSnapshot } : {}),
          ...(input.errorCode ? { errorCode: input.errorCode } : {}),
          ...(input.errorMessage ? { errorMessage: input.errorMessage } : {})
        },
        select: appointmentCommandLedgerSelect
      });
    },

    async findActiveLocationAccess(userId, locationId, at) {
      const access = await database.userLocationAccess.findUnique({
        where: {
          userId_locationId: {
            userId,
            locationId
          }
        },
        select: appointmentLocationAccessSelect
      });

      if (!access || !isDateWithinAccessWindow(access, at)) {
        return null;
      }

      return access;
    },

    async findAppointmentById(appointmentId) {
      return database.appointment.findUnique({
        where: {
          id: appointmentId
        },
        select: appointmentCommandAppointmentSelect
      });
    },

    async findCommandByIdempotency(input) {
      return database.appointmentCommandLedger.findUnique({
        where: {
          organizationId_commandType_idempotencyKey: {
            organizationId: input.organizationId,
            commandType: input.commandType,
            idempotencyKey: input.idempotencyKey
          }
        },
        select: appointmentCommandLedgerSelect
      });
    },

    async findHeldReservationCommitCandidates(appointmentId) {
      const reservations = await database.appointmentResourceReservation.findMany({
        where: {
          appointmentId,
          status: "HELD"
        },
        orderBy: {
          createdAt: "asc"
        },
        select: heldReservationCommitCandidateSelect
      });

      return reservations.map(toCommitCandidate);
    }
  };
}
