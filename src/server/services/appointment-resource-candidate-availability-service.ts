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

const appointmentResourceCandidateAvailabilitySelect = {
  id: true,
  appointmentNumber: true,
  locationId: true,
  ownerUserId: true,
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
  "appointment" | "userLocationAccess"
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
