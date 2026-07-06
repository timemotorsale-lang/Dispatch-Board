import { Prisma, PrismaClient } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  evaluateStaffAvailability,
  type StaffAvailabilityResult,
  type StaffLocationAccess,
  type StaffResource
} from "@/server/appointments/staff-availability-service";
import { prisma } from "@/server/db/client";
import {
  canMutateAppointment,
  canViewAppointmentSchedule,
  type AppointmentLocationAccessGrant
} from "@/server/policies/access";

const appointmentStaffConflictPreviewSelect = {
  id: true,
  appointmentNumber: true,
  locationId: true,
  ownerUserId: true,
  startsAt: true,
  endsAt: true,
  schedulingTimezone: true,
  bookingStatus: true,
  ownerUser: {
    select: {
      id: true,
      name: true,
      isActive: true
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

const staffResourceSelect = {
  id: true,
  locationId: true,
  userId: true,
  name: true,
  status: true,
  capacityMode: true,
  capacity: true,
  conflictPolicy: true,
  effectiveFrom: true,
  effectiveTo: true,
  resourceType: {
    select: {
      kind: true
    }
  },
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
} satisfies Prisma.SchedulableResourceSelect;

type AppointmentStaffConflictPreviewDatabase = Pick<
  PrismaClient,
  "appointment" | "userLocationAccess" | "schedulableResource"
>;

export type AppointmentStaffConflictPreviewAppointmentRecord = Prisma.AppointmentGetPayload<{
  select: typeof appointmentStaffConflictPreviewSelect;
}>;

export type AppointmentStaffConflictPreviewLocationAccessRecord =
  Prisma.UserLocationAccessGetPayload<{
    select: typeof locationAccessSelect;
  }>;

export type AppointmentStaffConflictPreviewStaffResourceRecord =
  Prisma.SchedulableResourceGetPayload<{
    select: typeof staffResourceSelect;
  }>;

export type AppointmentStaffConflictPreviewRepository = {
  findAppointmentById(
    appointmentId: string
  ): Promise<AppointmentStaffConflictPreviewAppointmentRecord | null>;
  findLocationAccess(
    userId: string,
    locationId: string
  ): Promise<AppointmentStaffConflictPreviewLocationAccessRecord | null>;
  findStaffResourceForUser(
    userId: string,
    locationId: string
  ): Promise<AppointmentStaffConflictPreviewStaffResourceRecord | null>;
};

export type AppointmentStaffConflictPreviewResult = {
  appointmentId: string;
  appointmentNumber: string;
  bookingStatus: string;
  status: "READY" | "WARNING" | "BLOCKED";
  canProceedWithStaff: boolean;
  staff: {
    userId: string;
    name: string;
    role: "OWNER";
    resourceId: string | null;
    resourceName: string | null;
  } | null;
  checks: Array<{
    code: string;
    label: string;
    status: "PASS" | "WARNING" | "BLOCKED";
    message: string;
  }>;
  reasons: string[];
  availability: StaffAvailabilityResult | null;
};

function assertAuthenticated(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  return user;
}

function isDateWithinAccessWindow(
  access: AppointmentStaffConflictPreviewLocationAccessRecord,
  at: Date
) {
  return access.validFrom <= at && (!access.validTo || access.validTo >= at);
}

function toLocationAccessGrant(
  access: AppointmentStaffConflictPreviewLocationAccessRecord | null
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

function toStaffLocationAccess(
  access: AppointmentStaffConflictPreviewLocationAccessRecord | null
): StaffLocationAccess | null {
  if (!access) {
    return null;
  }

  return {
    userId: access.userId,
    locationId: access.locationId,
    canViewSchedule: access.canViewSchedule,
    canParticipate: access.canParticipate,
    canOwnAppointments: access.canOwnAppointments,
    canManageAppointments: access.canManageAppointments,
    canViewLimitedData: access.canViewLimitedData,
    validFrom: access.validFrom,
    validTo: access.validTo
  };
}

function toStaffResource(
  resource: AppointmentStaffConflictPreviewStaffResourceRecord | null
): StaffResource | null {
  if (!resource) {
    return null;
  }

  return {
    id: resource.id,
    locationId: resource.locationId,
    resourceKind: resource.resourceType.kind,
    userId: resource.userId,
    name: resource.name,
    status: resource.status,
    capacityMode: resource.capacityMode,
    capacity: resource.capacity,
    conflictPolicy: resource.conflictPolicy,
    effectiveFrom: resource.effectiveFrom,
    effectiveTo: resource.effectiveTo
  };
}

function toReservations(
  resource: AppointmentStaffConflictPreviewStaffResourceRecord | null,
  appointmentId: string
) {
  return (resource?.reservations ?? [])
    .filter((reservation) => reservation.appointmentId !== appointmentId)
    .map((reservation) => ({
      id: reservation.id,
      appointmentId: reservation.appointmentId,
      status: reservation.status,
      startsAt: reservation.startsAt,
      endsAt: reservation.endsAt,
      capacityUnits: reservation.capacityUnits,
      bufferBeforeMinutes: reservation.bufferBeforeMinutes,
      bufferAfterMinutes: reservation.bufferAfterMinutes
    }));
}

function createCheck(input: {
  code: string;
  label: string;
  status: "PASS" | "WARNING" | "BLOCKED";
  message: string;
}) {
  return input;
}

function buildMissingOwnerResult(
  appointment: AppointmentStaffConflictPreviewAppointmentRecord
): AppointmentStaffConflictPreviewResult {
  return {
    appointmentId: appointment.id,
    appointmentNumber: appointment.appointmentNumber,
    bookingStatus: appointment.bookingStatus,
    status: "BLOCKED",
    canProceedWithStaff: false,
    staff: null,
    checks: [
      createCheck({
        code: "owner_required",
        label: "Owner staff",
        status: "BLOCKED",
        message: "No accountable appointment owner is assigned."
      })
    ],
    reasons: ["A staff owner is required before staff conflicts can be evaluated."],
    availability: null
  };
}

function buildInvalidTimeResult(
  appointment: AppointmentStaffConflictPreviewAppointmentRecord
): AppointmentStaffConflictPreviewResult {
  return {
    appointmentId: appointment.id,
    appointmentNumber: appointment.appointmentNumber,
    bookingStatus: appointment.bookingStatus,
    status: "BLOCKED",
    canProceedWithStaff: false,
    staff: appointment.ownerUser
      ? {
          userId: appointment.ownerUser.id,
          name: appointment.ownerUser.name,
          role: "OWNER",
          resourceId: null,
          resourceName: null
        }
      : null,
    checks: [
      createCheck({
        code: "time_window",
        label: "Time window",
        status: "BLOCKED",
        message: "Staff conflict preview requires a valid appointment start and end time."
      })
    ],
    reasons: ["Staff conflict preview requires a valid appointment start and end time."],
    availability: null
  };
}

function buildPreview(input: {
  appointment: AppointmentStaffConflictPreviewAppointmentRecord;
  ownerAccess: AppointmentStaffConflictPreviewLocationAccessRecord | null;
  staffResource: AppointmentStaffConflictPreviewStaffResourceRecord | null;
}) {
  if (!input.appointment.ownerUser) {
    return buildMissingOwnerResult(input.appointment);
  }

  if (
    !input.appointment.startsAt ||
    !input.appointment.endsAt ||
    input.appointment.endsAt <= input.appointment.startsAt
  ) {
    return buildInvalidTimeResult(input.appointment);
  }

  const availability = evaluateStaffAvailability({
    staff: input.appointment.ownerUser,
    locationId: input.appointment.locationId,
    timezone: input.appointment.schedulingTimezone,
    requestedRole: "OWNER",
    locationAccess: toStaffLocationAccess(input.ownerAccess),
    staffResource: toStaffResource(input.staffResource),
    operatingWindows: input.staffResource?.operatingWindows ?? [],
    unavailability: input.staffResource?.unavailability ?? [],
    reservations: toReservations(input.staffResource, input.appointment.id),
    startsAt: input.appointment.startsAt,
    endsAt: input.appointment.endsAt,
    requiredCapacity: 1
  });
  const status = availability.isSchedulable
    ? "READY"
    : availability.isWarningOnly
      ? "WARNING"
      : "BLOCKED";

  return {
    appointmentId: input.appointment.id,
    appointmentNumber: input.appointment.appointmentNumber,
    bookingStatus: input.appointment.bookingStatus,
    status,
    canProceedWithStaff: availability.isSchedulable || availability.isWarningOnly,
    staff: {
      userId: input.appointment.ownerUser.id,
      name: input.appointment.ownerUser.name,
      role: "OWNER",
      resourceId: input.staffResource?.id ?? null,
      resourceName: input.staffResource?.name ?? null
    },
    checks: [
      createCheck({
        code: "owner_staff",
        label: "Owner staff",
        status:
          status === "READY" ? "PASS" : status === "WARNING" ? "WARNING" : "BLOCKED",
        message:
          availability.reasons.length > 0
            ? availability.reasons.join(" ")
            : `${input.appointment.ownerUser.name} is available for this appointment window.`
      })
    ],
    reasons: availability.reasons,
    availability
  } satisfies AppointmentStaffConflictPreviewResult;
}

export function createAppointmentStaffConflictPreviewRepository(
  database: AppointmentStaffConflictPreviewDatabase = prisma
): AppointmentStaffConflictPreviewRepository {
  return {
    async findAppointmentById(appointmentId) {
      return database.appointment.findUnique({
        where: {
          id: appointmentId
        },
        select: appointmentStaffConflictPreviewSelect
      });
    },

    async findLocationAccess(userId, locationId) {
      return database.userLocationAccess.findUnique({
        where: {
          userId_locationId: {
            userId,
            locationId
          }
        },
        select: locationAccessSelect
      });
    },

    async findStaffResourceForUser(userId, locationId) {
      return database.schedulableResource.findFirst({
        where: {
          userId,
          locationId,
          status: "ACTIVE"
        },
        select: staffResourceSelect
      });
    }
  };
}

export async function previewAppointmentStaffConflicts(
  user: AuthenticatedUser | null,
  appointmentId: string,
  repository: AppointmentStaffConflictPreviewRepository =
    createAppointmentStaffConflictPreviewRepository(),
  now = new Date()
): Promise<AppointmentStaffConflictPreviewResult> {
  const actor = assertAuthenticated(user);
  const normalizedAppointmentId = appointmentId.trim();

  if (!normalizedAppointmentId) {
    throw new Error("Appointment id is required.");
  }

  const appointment = await repository.findAppointmentById(normalizedAppointmentId);

  if (!appointment) {
    throw new Error("Appointment not found.");
  }

  const actorAccess = await repository.findLocationAccess(actor.id, appointment.locationId);
  const locationAccess = toLocationAccessGrant(actorAccess);

  if (
    !actorAccess ||
    !isDateWithinAccessWindow(actorAccess, now) ||
    !canViewAppointmentSchedule({ actor, locationAccess })
  ) {
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

  const ownerAccess = appointment.ownerUserId
    ? await repository.findLocationAccess(appointment.ownerUserId, appointment.locationId)
    : null;
  const staffResource = appointment.ownerUserId
    ? await repository.findStaffResourceForUser(appointment.ownerUserId, appointment.locationId)
    : null;

  return buildPreview({
    appointment,
    ownerAccess,
    staffResource
  });
}
