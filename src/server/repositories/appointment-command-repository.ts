import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type {
  AppointmentCommandStatus,
  AppointmentCommandType
} from "@/server/appointments/appointment-domain";

type AppointmentCommandDatabase = Pick<
  PrismaClient,
  "appointment" | "userLocationAccess"
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
  version: true
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
};

function isDateWithinAccessWindow(
  access: AppointmentCommandLocationAccessRecord,
  at: Date
) {
  return access.validFrom <= at && (!access.validTo || access.validTo >= at);
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
    }
  };
}
