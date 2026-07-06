import { Prisma, PrismaClient } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  evaluateResourceAvailability,
  type ResourceAvailabilityOperatingWindow,
  type ResourceAvailabilityReservation,
  type ResourceAvailabilityResource,
  type ResourceAvailabilityUnavailability
} from "@/server/appointments/resource-availability-service";
import { prisma } from "@/server/db/client";
import {
  canMutateAppointment,
  canViewAppointmentSchedule,
  type AppointmentLocationAccessGrant
} from "@/server/policies/access";
import { normalizeAppointmentHistoryEvent } from "@/server/validation/appointment-history-events";

const appointmentResourceCandidateAvailabilitySelect = {
  id: true,
  appointmentNumber: true,
  locationId: true,
  ownerUserId: true,
  version: true,
  bookingStatus: true,
  schedulingTimezone: true,
  startsAt: true,
  endsAt: true,
  resourceRequirements: {
    select: {
      id: true,
      requirementCode: true,
      requiredCapacity: true,
      reservations: {
        where: {
          status: "PROPOSED"
        },
        select: {
          id: true,
          appointmentId: true,
          requirementId: true,
          resourceId: true,
          status: true,
          startsAt: true,
          endsAt: true,
          capacityUnits: true,
          bufferBeforeMinutes: true,
          bufferAfterMinutes: true,
          resource: {
            select: {
              id: true,
              name: true,
              code: true,
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
              },
              reservations: {
                select: {
                  id: true,
                  appointmentId: true,
                  status: true,
                  startsAt: true,
                  endsAt: true,
                  capacityUnits: true,
                  bufferBeforeMinutes: true,
                  bufferAfterMinutes: true
                }
              }
            }
          }
        }
      }
    }
  }
} satisfies Prisma.AppointmentSelect;

const locationAccessSelect = {
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

type AppointmentResourceCandidateAvailabilityDatabase = Pick<
  PrismaClient,
  "$transaction" | "appointment" | "userLocationAccess"
>;

export type AppointmentResourceCandidateAvailabilityAppointmentRecord =
  Prisma.AppointmentGetPayload<{
    select: typeof appointmentResourceCandidateAvailabilitySelect;
  }>;

export type AppointmentResourceCandidateAvailabilityLocationAccessRecord =
  Prisma.UserLocationAccessGetPayload<{
    select: typeof locationAccessSelect;
  }>;

export type AppointmentResourceCandidateAvailabilityRepository = {
  findAppointmentById(
    appointmentId: string
  ): Promise<AppointmentResourceCandidateAvailabilityAppointmentRecord | null>;
  findActiveLocationAccess(
    userId: string,
    locationId: string,
    at: Date
  ): Promise<AppointmentResourceCandidateAvailabilityLocationAccessRecord | null>;
};

export type AppointmentResourceCandidateAvailabilityResult = {
  appointmentId: string;
  appointmentNumber: string;
  status: "READY" | "WARNING" | "BLOCKED" | "NO_PROPOSALS";
  canProceedToHold: boolean;
  proposals: Array<{
    reservationId: string;
    requirementId: string | null;
    requirementCode: string;
    resourceId: string;
    resourceCode: string;
    resourceName: string;
    status: "READY" | "WARNING" | "BLOCKED";
    canProceedToHold: boolean;
    reasons: string[];
    availableCapacity: number;
    requiredCapacity: number;
    reservedCapacity: number;
    unavailableCapacity: number;
  }>;
};

export type AppointmentHeldResourceReservation = {
  id: string;
  appointmentId: string;
  requirementId: string | null;
  resourceId: string;
  resourceCode: string;
  resourceName: string;
  status: "HELD";
  startsAt: Date;
  endsAt: Date;
  capacityUnits: number;
  appointmentVersion: number;
  availabilityStatus: "READY" | "WARNING";
  warningReasons: string[];
};

export type HoldAppointmentResourceCandidateInput = {
  reservationId: string;
  expectedAppointmentVersion: number;
  reasonCode: string;
  reasonNotes: string;
  correlationId?: string | null;
};

function assertAuthenticated(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  return user;
}

function isDateWithinAccessWindow(
  access: AppointmentResourceCandidateAvailabilityLocationAccessRecord,
  at: Date
) {
  return access.validFrom <= at && (!access.validTo || access.validTo >= at);
}

function toLocationAccessGrant(
  access: AppointmentResourceCandidateAvailabilityLocationAccessRecord | null
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

function toAvailabilityResource(
  resource: AppointmentResourceCandidateAvailabilityAppointmentRecord["resourceRequirements"][number]["reservations"][number]["resource"]
): ResourceAvailabilityResource {
  return {
    id: resource.id,
    name: resource.name,
    status: resource.status,
    capacityMode: resource.capacityMode,
    capacity: resource.capacity,
    conflictPolicy: resource.conflictPolicy,
    effectiveFrom: resource.effectiveFrom,
    effectiveTo: resource.effectiveTo
  };
}

function toOperatingWindows(
  resource: AppointmentResourceCandidateAvailabilityAppointmentRecord["resourceRequirements"][number]["reservations"][number]["resource"]
): ResourceAvailabilityOperatingWindow[] {
  return resource.operatingWindows;
}

function toUnavailability(
  resource: AppointmentResourceCandidateAvailabilityAppointmentRecord["resourceRequirements"][number]["reservations"][number]["resource"]
): ResourceAvailabilityUnavailability[] {
  return resource.unavailability;
}

function toReservations(
  resource: AppointmentResourceCandidateAvailabilityAppointmentRecord["resourceRequirements"][number]["reservations"][number]["resource"]
): ResourceAvailabilityReservation[] {
  return resource.reservations;
}

function summarizeStatus(
  proposals: AppointmentResourceCandidateAvailabilityResult["proposals"]
): AppointmentResourceCandidateAvailabilityResult["status"] {
  if (proposals.length === 0) {
    return "NO_PROPOSALS";
  }

  if (proposals.some((proposal) => proposal.status === "BLOCKED")) {
    return "BLOCKED";
  }

  if (proposals.some((proposal) => proposal.status === "WARNING")) {
    return "WARNING";
  }

  return "READY";
}

function requiredText(value: string | null | undefined, label: string) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function requiredVersion(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isInteger(value) || value < 1) {
    throw new Error("Expected appointment version is required.");
  }

  return value;
}

function asInputJson(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function nullableInputJson(value: unknown) {
  return value === null || value === undefined ? Prisma.JsonNull : asInputJson(value);
}

function findProposedReservation(
  appointment: AppointmentResourceCandidateAvailabilityAppointmentRecord,
  reservationId: string
) {
  for (const requirement of appointment.resourceRequirements) {
    const reservation = requirement.reservations.find((entry) => entry.id === reservationId);

    if (reservation) {
      return {
        requirement,
        reservation
      };
    }
  }

  return null;
}

function toHeldReservation(input: {
  reservation: AppointmentResourceCandidateAvailabilityAppointmentRecord["resourceRequirements"][number]["reservations"][number];
  appointmentVersion: number;
  availabilityStatus: "READY" | "WARNING";
  warningReasons: string[];
}): AppointmentHeldResourceReservation {
  return {
    id: input.reservation.id,
    appointmentId: input.reservation.appointmentId,
    requirementId: input.reservation.requirementId,
    resourceId: input.reservation.resourceId,
    resourceCode: input.reservation.resource.code,
    resourceName: input.reservation.resource.name,
    status: "HELD",
    startsAt: input.reservation.startsAt,
    endsAt: input.reservation.endsAt,
    capacityUnits: input.reservation.capacityUnits,
    appointmentVersion: input.appointmentVersion,
    availabilityStatus: input.availabilityStatus,
    warningReasons: input.warningReasons
  };
}

export function createAppointmentResourceCandidateAvailabilityRepository(
  database: AppointmentResourceCandidateAvailabilityDatabase = prisma
): AppointmentResourceCandidateAvailabilityRepository {
  return {
    findAppointmentById(appointmentId) {
      return database.appointment.findUnique({
        where: {
          id: appointmentId
        },
        select: appointmentResourceCandidateAvailabilitySelect
      });
    },
    findActiveLocationAccess(userId, locationId, at) {
      return database.userLocationAccess.findFirst({
        where: {
          userId,
          locationId,
          validFrom: {
            lte: at
          },
          OR: [
            {
              validTo: null
            },
            {
              validTo: {
                gte: at
              }
            }
          ]
        },
        select: locationAccessSelect
      });
    }
  };
}

export async function previewAppointmentResourceCandidateAvailability(
  user: AuthenticatedUser | null,
  appointmentId: string,
  repository: AppointmentResourceCandidateAvailabilityRepository =
    createAppointmentResourceCandidateAvailabilityRepository(),
  now = new Date()
): Promise<AppointmentResourceCandidateAvailabilityResult> {
  const actor = assertAuthenticated(user);

  if (!appointmentId.trim()) {
    throw new Error("Appointment id is required.");
  }

  const appointment = await repository.findAppointmentById(appointmentId);

  if (!appointment) {
    throw new Error("Appointment not found.");
  }

  const access = await repository.findActiveLocationAccess(actor.id, appointment.locationId, now);

  if (!access || !isDateWithinAccessWindow(access, now)) {
    throw new Error("Appointment schedule is not authorized.");
  }

  const locationAccess = toLocationAccessGrant(access);

  if (!canViewAppointmentSchedule({ actor, locationAccess })) {
    throw new Error("Appointment schedule is not authorized.");
  }

  if (
    !canMutateAppointment({
      actor,
      ownerUserId: appointment.ownerUserId,
      locationAccess
    })
  ) {
    throw new Error("Appointment command is not authorized.");
  }

  if (!appointment.startsAt || !appointment.endsAt || appointment.endsAt <= appointment.startsAt) {
    throw new Error("Resource candidate availability requires a valid appointment time window.");
  }

  const proposals = appointment.resourceRequirements.flatMap((requirement) =>
    requirement.reservations.map((reservation) => {
      const availability = evaluateResourceAvailability({
        resource: toAvailabilityResource(reservation.resource),
        timezone: appointment.schedulingTimezone,
        operatingWindows: toOperatingWindows(reservation.resource),
        unavailability: toUnavailability(reservation.resource),
        reservations: toReservations(reservation.resource),
        startsAt: reservation.startsAt,
        endsAt: reservation.endsAt,
        requiredCapacity: reservation.capacityUnits
      });
      const status: AppointmentResourceCandidateAvailabilityResult["proposals"][number]["status"] = availability.isAvailable
        ? "READY"
        : availability.isHardBlocked
          ? "BLOCKED"
          : "WARNING";

      return {
        reservationId: reservation.id,
        requirementId: reservation.requirementId,
        requirementCode: requirement.requirementCode,
        resourceId: reservation.resourceId,
        resourceCode: reservation.resource.code,
        resourceName: reservation.resource.name,
        status,
        canProceedToHold: !availability.isHardBlocked,
        reasons: availability.reasons,
        availableCapacity: availability.availableCapacity,
        requiredCapacity: reservation.capacityUnits,
        reservedCapacity: availability.reservedCapacity,
        unavailableCapacity: availability.unavailableCapacity
      };
    })
  );
  const status = summarizeStatus(proposals);

  return {
    appointmentId: appointment.id,
    appointmentNumber: appointment.appointmentNumber,
    status,
    canProceedToHold: status === "READY" || status === "WARNING",
    proposals
  };
}

export async function holdAppointmentResourceCandidate(
  user: AuthenticatedUser | null,
  appointmentId: string,
  input: HoldAppointmentResourceCandidateInput,
  database: AppointmentResourceCandidateAvailabilityDatabase = prisma,
  now = new Date()
): Promise<AppointmentHeldResourceReservation> {
  const actor = assertAuthenticated(user);
  const normalizedAppointmentId = requiredText(appointmentId, "Appointment id");
  const reservationId = requiredText(input.reservationId, "Resource reservation");
  const expectedAppointmentVersion = requiredVersion(input.expectedAppointmentVersion);
  const reasonCode = requiredText(input.reasonCode, "Resource hold reason code");
  const reasonNotes = requiredText(input.reasonNotes, "Resource hold reason notes");
  const correlationId =
    input.correlationId?.trim() ||
    `resource-hold-${normalizedAppointmentId}-${reservationId}-${now.getTime()}`;

  const appointment = await database.appointment.findUnique({
    where: {
      id: normalizedAppointmentId
    },
    select: appointmentResourceCandidateAvailabilitySelect
  });

  if (!appointment) {
    throw new Error("Appointment not found.");
  }

  if (appointment.bookingStatus !== "DRAFT" && appointment.bookingStatus !== "PENDING_APPROVAL") {
    throw new Error("Resource candidates can only be held for draft appointments.");
  }

  if (!appointment.startsAt || !appointment.endsAt || appointment.endsAt <= appointment.startsAt) {
    throw new Error("Resource candidate hold requires a valid appointment time window.");
  }

  const proposal = findProposedReservation(appointment, reservationId);

  if (!proposal) {
    throw new Error("Resource candidate proposal not found for this appointment.");
  }

  const access = await database.userLocationAccess.findFirst({
    where: {
      userId: actor.id,
      locationId: appointment.locationId,
      validFrom: {
        lte: now
      },
      OR: [
        {
          validTo: null
        },
        {
          validTo: {
            gte: now
          }
        }
      ]
    },
    select: locationAccessSelect
  });

  if (!access || !isDateWithinAccessWindow(access, now)) {
    throw new Error("Appointment schedule is not authorized.");
  }

  const locationAccess = toLocationAccessGrant(access);

  if (!canViewAppointmentSchedule({ actor, locationAccess })) {
    throw new Error("Appointment schedule is not authorized.");
  }

  if (
    !canMutateAppointment({
      actor,
      ownerUserId: appointment.ownerUserId,
      locationAccess
    })
  ) {
    throw new Error("Appointment command is not authorized.");
  }

  const availability = evaluateResourceAvailability({
    resource: toAvailabilityResource(proposal.reservation.resource),
    timezone: appointment.schedulingTimezone,
    operatingWindows: toOperatingWindows(proposal.reservation.resource),
    unavailability: toUnavailability(proposal.reservation.resource),
    reservations: toReservations(proposal.reservation.resource),
    startsAt: proposal.reservation.startsAt,
    endsAt: proposal.reservation.endsAt,
    requiredCapacity: proposal.reservation.capacityUnits
  });

  if (availability.isHardBlocked) {
    throw new Error("Resource candidate is no longer available to hold.");
  }

  const availabilityStatus: AppointmentHeldResourceReservation["availabilityStatus"] =
    availability.isAvailable ? "READY" : "WARNING";
  const historyEvent = normalizeAppointmentHistoryEvent({
    appointmentId: appointment.id,
    actorType: "HUMAN",
    actorUserId: actor.id,
    eventType: "FIELD_UPDATED",
    message: `Resource candidate ${proposal.reservation.resource.name} was held for ${proposal.requirement.requirementCode}.`,
    reasonCode,
    reasonNotes,
    correlationId,
    priorValue: {
      resourceReservation: {
        id: proposal.reservation.id,
        status: proposal.reservation.status,
        resourceId: proposal.reservation.resourceId
      }
    },
    newValue: {
      resourceReservation: {
        id: proposal.reservation.id,
        status: "HELD",
        resourceId: proposal.reservation.resourceId,
        resourceCode: proposal.reservation.resource.code,
        resourceName: proposal.reservation.resource.name
      },
      availability: {
        status: availabilityStatus,
        warningReasons: availability.reasons
      }
    },
    metadata: {
      source: "APPOINTMENT_BOARD_RESOURCE_PLANNING",
      expectedAppointmentVersion,
      requirementId: proposal.requirement.id,
      reservationId: proposal.reservation.id
    },
    occurredAt: now
  });

  return database.$transaction(async (tx) => {
    const appointmentUpdate = await tx.appointment.updateMany({
      where: {
        id: appointment.id,
        version: expectedAppointmentVersion
      },
      data: {
        version: {
          increment: 1
        }
      }
    });

    if (appointmentUpdate.count !== 1) {
      throw new Error("Appointment version is stale.");
    }

    const reservationUpdate = await tx.appointmentResourceReservation.updateMany({
      where: {
        id: proposal.reservation.id,
        appointmentId: appointment.id,
        status: "PROPOSED"
      },
      data: {
        status: "HELD"
      }
    });

    if (reservationUpdate.count !== 1) {
      throw new Error("Resource candidate proposal was already changed.");
    }

    await tx.appointmentHistoryEvent.create({
      data: {
        appointmentId: historyEvent.appointmentId,
        actorType: historyEvent.actorType,
        actorUserId: historyEvent.actorUserId,
        eventType: historyEvent.eventType,
        message: historyEvent.message,
        reasonCode: historyEvent.reasonCode,
        reasonNotes: historyEvent.reasonNotes,
        correlationId: historyEvent.correlationId,
        priorValue: nullableInputJson(historyEvent.priorValue),
        newValue: nullableInputJson(historyEvent.newValue),
        metadata: asInputJson(historyEvent.metadata),
        occurredAt: historyEvent.occurredAt ?? now
      }
    });

    return toHeldReservation({
      reservation: proposal.reservation,
      appointmentVersion: expectedAppointmentVersion + 1,
      availabilityStatus,
      warningReasons: availability.reasons
    });
  });
}
