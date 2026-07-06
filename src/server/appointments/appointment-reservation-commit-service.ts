import type { ResourceReservationStatus } from "@/server/appointments/appointment-resource-domain";
import {
  evaluateResourceAvailability,
  type ResourceAvailabilityOperatingWindow,
  type ResourceAvailabilityReservation,
  type ResourceAvailabilityResource,
  type ResourceAvailabilityResult,
  type ResourceAvailabilityUnavailability
} from "@/server/appointments/resource-availability-service";
import { normalizeAppointmentResourceReservation } from "@/server/validation/appointment-resources";

export const APPOINTMENT_RESERVATION_COMMIT_CONFLICT_CODES = [
  "RESOURCE_CAPACITY_UNAVAILABLE",
  "RESOURCE_WARNING_NOT_ALLOWED"
] as const;

export type AppointmentReservationCommitConflictCode =
  (typeof APPOINTMENT_RESERVATION_COMMIT_CONFLICT_CODES)[number];

export type AppointmentReservationCommitCandidate = {
  sourceReservationId?: string | null;
  appointmentId: string;
  appointmentLocationId: string;
  requirementId?: string | null;
  requirementAppointmentId?: string | null;
  requirementCode: string;
  resource: ResourceAvailabilityResource;
  resourceLocationId: string;
  operatingWindows: ResourceAvailabilityOperatingWindow[];
  unavailability: ResourceAvailabilityUnavailability[];
  startsAt: Date;
  endsAt: Date;
  capacityUnits?: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  status?: Extract<ResourceReservationStatus, "HELD" | "COMMITTED">;
};

export type AppointmentCommittedResourceReservation = {
  id: string;
  appointmentId: string;
  requirementId: string | null;
  resourceId: string;
  status: ResourceReservationStatus;
  startsAt: Date;
  endsAt: Date;
  capacityUnits: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AppointmentReservationCommitConflict = {
  code: AppointmentReservationCommitConflictCode;
  appointmentId: string;
  requirementCode: string;
  resourceId: string;
  message: string;
  reasons: string[];
};

export type AppointmentReservationEvaluation = {
  requirementCode: string;
  resourceId: string;
  result: ResourceAvailabilityResult;
};

export type AppointmentReservationCommitResult = {
  committed: boolean;
  reservations: AppointmentCommittedResourceReservation[];
  conflicts: AppointmentReservationCommitConflict[];
  evaluations: AppointmentReservationEvaluation[];
};

export type AppointmentReservationReleaseCandidate = {
  id: string;
  resourceId: string;
  status: ResourceReservationStatus;
};

export type AppointmentReservationReleaseRecord =
  AppointmentReservationReleaseCandidate & {
    status: Extract<ResourceReservationStatus, "RELEASED" | "CANCELLED">;
    releasedAt: Date;
    releasedByUserId?: string | null;
    reasonCode: string;
    reasonNotes: string;
  };

export type CreateAppointmentResourceReservationInput = Omit<
  AppointmentCommittedResourceReservation,
  "id" | "createdAt" | "updatedAt"
>;

export type ReleaseAppointmentResourceReservationsInput = {
  reservationIds: string[];
  status: Extract<ResourceReservationStatus, "RELEASED" | "CANCELLED">;
  releasedAt: Date;
  releasedByUserId?: string | null;
  reasonCode: string;
  reasonNotes: string;
};

export type AppointmentReservationTransaction = {
  findReservationsForResource(input: {
    resourceId: string;
    startsAt: Date;
    endsAt: Date;
  }): Promise<ResourceAvailabilityReservation[]>;
  createResourceReservations(
    reservations: CreateAppointmentResourceReservationInput[]
  ): Promise<AppointmentCommittedResourceReservation[]>;
  releaseResourceReservations(
    input: ReleaseAppointmentResourceReservationsInput
  ): Promise<AppointmentReservationReleaseRecord[]>;
};

export type AppointmentReservationCommitRepository = {
  withResourceReservationTransaction<T>(
    resourceIds: string[],
    operation: (transaction: AppointmentReservationTransaction) => Promise<T>
  ): Promise<T>;
};

function addMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60 * 1000);
}

function requiredText(value: string | undefined | null, label: string) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function assertNonEmpty<T>(values: T[], label: string) {
  if (values.length === 0) {
    throw new Error(`${label} must include at least one item.`);
  }
}

function getSortedUniqueResourceIds(resourceIds: string[]) {
  return [...new Set(resourceIds)].sort((left, right) => left.localeCompare(right));
}

function getBufferedWindow(input: {
  startsAt: Date;
  endsAt: Date;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
}) {
  return {
    startsAt: addMinutes(input.startsAt, -input.bufferBeforeMinutes),
    endsAt: addMinutes(input.endsAt, input.bufferAfterMinutes)
  };
}

function normalizeCandidate(candidate: AppointmentReservationCommitCandidate) {
  return {
    requirementCode: requiredText(
      candidate.requirementCode,
      "Resource reservation requirement code"
    ),
    operatingWindows: candidate.operatingWindows,
    unavailability: candidate.unavailability,
    resource: candidate.resource,
    reservation: normalizeAppointmentResourceReservation({
      appointmentId: candidate.appointmentId,
      appointmentLocationId: candidate.appointmentLocationId,
      requirementId: candidate.requirementId,
      requirementAppointmentId: candidate.requirementAppointmentId,
      resourceId: candidate.resource.id,
      resourceLocationId: candidate.resourceLocationId,
      status: candidate.status ?? "COMMITTED",
      startsAt: candidate.startsAt,
      endsAt: candidate.endsAt,
      capacityUnits: candidate.capacityUnits ?? 1,
      resourceCapacity: candidate.resource.capacity,
      resourceCapacityMode: candidate.resource.capacityMode,
      bufferBeforeMinutes: candidate.bufferBeforeMinutes,
      bufferAfterMinutes: candidate.bufferAfterMinutes
    })
  };
}

function getCommitConflict(input: {
  candidate: ReturnType<typeof normalizeCandidate>;
  result: ResourceAvailabilityResult;
}): AppointmentReservationCommitConflict {
  const warningOnly = input.result.isWarningOnly;

  return {
    code: warningOnly ? "RESOURCE_WARNING_NOT_ALLOWED" : "RESOURCE_CAPACITY_UNAVAILABLE",
    appointmentId: input.candidate.reservation.appointmentId,
    requirementCode: input.candidate.requirementCode,
    resourceId: input.result.resourceId,
    message: warningOnly
      ? "Resource warning requires an explicit override before reservation commitment."
      : "Resource capacity is unavailable for reservation commitment.",
    reasons: input.result.reasons
  };
}

export async function commitAppointmentResourceReservationsAtomically(input: {
  repository: AppointmentReservationCommitRepository;
  timezone: string;
  candidates: AppointmentReservationCommitCandidate[];
  allowWarningCommit?: boolean;
}): Promise<AppointmentReservationCommitResult> {
  assertNonEmpty(input.candidates, "Resource reservation commitment");

  const candidates = input.candidates.map(normalizeCandidate);
  const resourceIds = getSortedUniqueResourceIds(
    candidates.map((candidate) => candidate.reservation.resourceId)
  );

  return input.repository.withResourceReservationTransaction(resourceIds, async (tx) => {
    const evaluations: AppointmentReservationEvaluation[] = [];
    const conflicts: AppointmentReservationCommitConflict[] = [];

    for (const candidate of candidates) {
      const window = getBufferedWindow(candidate.reservation);
      const currentReservations = await tx.findReservationsForResource({
        resourceId: candidate.reservation.resourceId,
        startsAt: window.startsAt,
        endsAt: window.endsAt
      });
      const result = evaluateResourceAvailability({
        resource: candidate.resource,
        timezone: input.timezone,
        operatingWindows: candidate.operatingWindows,
        unavailability: candidate.unavailability,
        reservations: currentReservations,
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        requiredCapacity: candidate.reservation.capacityUnits
      });

      evaluations.push({
        requirementCode: candidate.requirementCode,
        resourceId: candidate.reservation.resourceId,
        result
      });

      if (!result.isAvailable && (!input.allowWarningCommit || result.isHardBlocked)) {
        conflicts.push(getCommitConflict({ candidate, result }));
      }
    }

    if (conflicts.length > 0) {
      return {
        committed: false,
        reservations: [],
        conflicts,
        evaluations
      };
    }

    const reservations = await tx.createResourceReservations(
      candidates.map((candidate) => candidate.reservation)
    );

    return {
      committed: true,
      reservations,
      conflicts: [],
      evaluations
    };
  });
}

export async function releaseAppointmentResourceReservationsAtomically(input: {
  repository: AppointmentReservationCommitRepository;
  reservations: AppointmentReservationReleaseCandidate[];
  releasedAt: Date;
  releasedByUserId?: string | null;
  reasonCode: string;
  reasonNotes: string;
  status?: Extract<ResourceReservationStatus, "RELEASED" | "CANCELLED">;
}) {
  assertNonEmpty(input.reservations, "Resource reservation release");

  const reasonCode = requiredText(input.reasonCode, "Reservation release reason code");
  const reasonNotes = requiredText(input.reasonNotes, "Reservation release reason notes");
  const releasableReservations = input.reservations.filter(
    (reservation) => reservation.status === "HELD" || reservation.status === "COMMITTED"
  );
  const resourceIds = getSortedUniqueResourceIds(
    input.reservations.map((reservation) => reservation.resourceId)
  );

  return input.repository.withResourceReservationTransaction(resourceIds, async (tx) => {
    if (releasableReservations.length === 0) {
      return [];
    }

    return tx.releaseResourceReservations({
      reservationIds: releasableReservations.map((reservation) => reservation.id),
      status: input.status ?? "RELEASED",
      releasedAt: input.releasedAt,
      releasedByUserId: input.releasedByUserId,
      reasonCode,
      reasonNotes
    });
  });
}
