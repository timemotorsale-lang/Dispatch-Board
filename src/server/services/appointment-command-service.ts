import { createHash, randomUUID } from "node:crypto";

import type { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  canCreateAppointment,
  canMutateAppointment,
  canOverrideAppointmentWarning,
  canTransferAppointmentOwnership,
  type AppointmentLocationAccessGrant
} from "@/server/policies/access";
import {
  createAppointmentCommandRepository,
  type AppointmentCommandAppointmentRecord,
  type AppointmentCommandLedgerRecord,
  type AppointmentCommandRepository
} from "@/server/repositories/appointment-command-repository";
import type { AppointmentCommandType } from "@/server/appointments/appointment-domain";
import {
  normalizeAppointmentCommandRequest,
  type NormalizedAppointmentCommandRequest
} from "@/server/validation/appointment-command";
import { normalizeAppointmentCommandLedgerEntry } from "@/server/validation/appointment-command-ledger";

const existingAppointmentCommands = new Set<AppointmentCommandType>([
  "SCHEDULE",
  "RESCHEDULE",
  "CANCEL",
  "COMPLETE",
  "CONFIRM",
  "DECLINE",
  "CHECK_IN",
  "NO_SHOW",
  "START",
  "WAIT",
  "FINISH",
  "TRANSFER_OWNER",
  "OVERRIDE_WARNING",
  "LINK_TASK",
  "UNLINK_TASK"
]);

export type AppointmentCommandBoundaryResult = {
  command: AppointmentCommandLedgerReadModel;
  duplicate: boolean;
  accepted: boolean;
  conflict: {
    expectedAppointmentVersion: number;
    currentAppointmentVersion: number;
  } | null;
};

export type AppointmentCommandLedgerReadModel = {
  id: string;
  organizationId: string;
  locationId: string | null;
  appointmentId: string | null;
  actorUserId: string | null;
  commandType: string;
  status: string;
  idempotencyKey: string;
  requestHash: string;
  correlationId: string;
  causationId: string | null;
  expectedAppointmentVersion: number | null;
  currentAppointmentVersion: number | null;
  attemptCount: number;
  maxAttempts: number;
  nextRetryAt: string | null;
  lockedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  resultSnapshot: unknown;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

function assertAuthenticated(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  return user;
}

function stableSerialize(value: unknown): string {
  if (value instanceof Date) {
    return JSON.stringify(value.toISOString());
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerialize(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableSerialize(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function buildRequestHash(input: NormalizedAppointmentCommandRequest) {
  return `sha256:${createHash("sha256")
    .update(
      stableSerialize({
        appointmentId: input.appointmentId,
        commandType: input.commandType,
        expectedAppointmentVersion: input.expectedAppointmentVersion,
        locationId: input.locationId,
        organizationId: input.organizationId,
        ownerUserId: input.ownerUserId,
        payload: input.payload
      })
    )
    .digest("hex")}`;
}

function toLocationAccessGrant(
  access: AppointmentLocationAccessGrant | null
): AppointmentLocationAccessGrant | null {
  if (!access) {
    return null;
  }

  return {
    canViewSchedule: access.canViewSchedule,
    canParticipate: access.canParticipate,
    canOwnAppointments: access.canOwnAppointments,
    canManageAppointments: access.canManageAppointments,
    canViewLimitedData: access.canViewLimitedData
  };
}

function toCommandReadModel(
  command: AppointmentCommandLedgerRecord
): AppointmentCommandLedgerReadModel {
  return {
    id: command.id,
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
    nextRetryAt: command.nextRetryAt?.toISOString() ?? null,
    lockedAt: command.lockedAt?.toISOString() ?? null,
    completedAt: command.completedAt?.toISOString() ?? null,
    failedAt: command.failedAt?.toISOString() ?? null,
    resultSnapshot: command.resultSnapshot,
    errorCode: command.errorCode,
    errorMessage: command.errorMessage,
    createdAt: command.createdAt.toISOString(),
    updatedAt: command.updatedAt.toISOString()
  };
}

function assertCommandAuthorization(input: {
  actor: AuthenticatedUser;
  appointment: AppointmentCommandAppointmentRecord | null;
  commandType: AppointmentCommandType;
  locationAccess: AppointmentLocationAccessGrant | null;
  ownerUserId: string | null;
}) {
  if (input.commandType === "TRANSFER_OWNER") {
    if (
      !canTransferAppointmentOwnership({
        actor: input.actor,
        locationAccess: input.locationAccess
      })
    ) {
      throw new Error("Appointment command is not authorized.");
    }

    return;
  }

  if (input.commandType === "OVERRIDE_WARNING") {
    if (
      !canOverrideAppointmentWarning({
        actor: input.actor,
        locationAccess: input.locationAccess
      })
    ) {
      throw new Error("Appointment command is not authorized.");
    }

    return;
  }

  if (input.commandType === "CREATE_DRAFT") {
    if (
      !canCreateAppointment({
        actor: input.actor,
        ownerUserId: input.ownerUserId,
        locationAccess: input.locationAccess
      })
    ) {
      throw new Error("Appointment command is not authorized.");
    }

    return;
  }

  if (
    !canMutateAppointment({
      actor: input.actor,
      ownerUserId: input.appointment?.ownerUserId ?? null,
      locationAccess: input.locationAccess
    })
  ) {
    throw new Error("Appointment command is not authorized.");
  }
}

async function resolveAppointmentCommandContext(input: {
  actor: AuthenticatedUser;
  command: NormalizedAppointmentCommandRequest;
  now: Date;
  repository: AppointmentCommandRepository;
}) {
  const appointment = input.command.appointmentId
    ? await input.repository.findAppointmentById(input.command.appointmentId)
    : null;

  if (existingAppointmentCommands.has(input.command.commandType) && !appointment) {
    throw new Error("Appointment not found.");
  }

  const organizationId = appointment?.organizationId ?? input.command.organizationId;
  const locationId = appointment?.locationId ?? input.command.locationId;

  if (!organizationId || !locationId) {
    throw new Error("Appointment command requires an organization and location.");
  }

  const locationAccess = toLocationAccessGrant(
    await input.repository.findActiveLocationAccess(input.actor.id, locationId, input.now)
  );

  return {
    appointment,
    organizationId,
    locationId,
    locationAccess
  };
}

function buildLedgerResult(input: {
  command: AppointmentCommandLedgerRecord;
  duplicate: boolean;
  conflict: AppointmentCommandBoundaryResult["conflict"];
}): AppointmentCommandBoundaryResult {
  return {
    command: toCommandReadModel(input.command),
    duplicate: input.duplicate,
    accepted: input.command.status === "PENDING" || input.command.status === "RUNNING",
    conflict: input.conflict
  };
}

export async function submitAppointmentCommand(
  user: AuthenticatedUser | null,
  input: unknown,
  repository: AppointmentCommandRepository = createAppointmentCommandRepository(),
  now = new Date()
): Promise<AppointmentCommandBoundaryResult> {
  const actor = assertAuthenticated(user);
  const commandRequest = normalizeAppointmentCommandRequest(input);
  const requestHash = buildRequestHash(commandRequest);
  const context = await resolveAppointmentCommandContext({
    actor,
    command: commandRequest,
    now,
    repository
  });

  assertCommandAuthorization({
    actor,
    appointment: context.appointment,
    commandType: commandRequest.commandType,
    locationAccess: context.locationAccess,
    ownerUserId: commandRequest.ownerUserId ?? actor.id
  });

  const existingCommand = await repository.findCommandByIdempotency({
    organizationId: context.organizationId,
    commandType: commandRequest.commandType,
    idempotencyKey: commandRequest.idempotencyKey
  });

  if (existingCommand) {
    if (existingCommand.requestHash !== requestHash) {
      throw new Error("Idempotency key already used for a different appointment command.");
    }

    return buildLedgerResult({
      command: existingCommand,
      duplicate: true,
      conflict:
        existingCommand.status === "CONFLICT" &&
        existingCommand.expectedAppointmentVersion &&
        existingCommand.currentAppointmentVersion
          ? {
              expectedAppointmentVersion: existingCommand.expectedAppointmentVersion,
              currentAppointmentVersion: existingCommand.currentAppointmentVersion
            }
          : null
    });
  }

  const expectedVersion = commandRequest.expectedAppointmentVersion;
  const currentVersion = context.appointment?.version ?? null;
  const isStale =
    expectedVersion !== null && currentVersion !== null && expectedVersion !== currentVersion;
  const ledgerEntry = normalizeAppointmentCommandLedgerEntry({
    organizationId: context.organizationId,
    locationId: context.locationId,
    appointmentId: context.appointment?.id ?? commandRequest.appointmentId,
    actorUserId: actor.id,
    commandType: commandRequest.commandType,
    status: isStale ? "CONFLICT" : "PENDING",
    idempotencyKey: commandRequest.idempotencyKey,
    requestHash,
    correlationId: commandRequest.correlationId ?? `corr-${randomUUID()}`,
    causationId: commandRequest.causationId,
    expectedAppointmentVersion: expectedVersion,
    currentAppointmentVersion: isStale ? currentVersion : null,
    attemptCount: 0,
    maxAttempts: commandRequest.maxAttempts,
    failedAt: isStale ? now : null,
    errorCode: isStale ? "STALE_VERSION" : null,
    errorMessage: isStale
      ? `Expected appointment version ${expectedVersion}; current version is ${currentVersion}.`
      : null,
    resultSnapshot: isStale
      ? {
          appointmentId: context.appointment?.id,
          commandType: commandRequest.commandType
        }
      : null
  });

  const createdCommand = await repository.createCommandLedger({
    organizationId: ledgerEntry.organizationId,
    locationId: ledgerEntry.locationId,
    appointmentId: ledgerEntry.appointmentId,
    actorUserId: ledgerEntry.actorUserId,
    commandType: ledgerEntry.commandType,
    status: ledgerEntry.status,
    idempotencyKey: ledgerEntry.idempotencyKey,
    requestHash: ledgerEntry.requestHash,
    correlationId: ledgerEntry.correlationId,
    causationId: ledgerEntry.causationId,
    expectedAppointmentVersion: ledgerEntry.expectedAppointmentVersion,
    currentAppointmentVersion: ledgerEntry.currentAppointmentVersion,
    attemptCount: ledgerEntry.attemptCount,
    maxAttempts: ledgerEntry.maxAttempts,
    nextRetryAt: ledgerEntry.nextRetryAt,
    lockedAt: ledgerEntry.lockedAt,
    completedAt: ledgerEntry.completedAt,
    failedAt: ledgerEntry.failedAt,
    resultSnapshot: ledgerEntry.resultSnapshot as Prisma.InputJsonValue | null,
    errorCode: ledgerEntry.errorCode,
    errorMessage: ledgerEntry.errorMessage
  });

  return buildLedgerResult({
    command: createdCommand,
    duplicate: false,
    conflict:
      isStale && expectedVersion && currentVersion
        ? {
            expectedAppointmentVersion: expectedVersion,
            currentAppointmentVersion: currentVersion
          }
        : null
  });
}
