import { Prisma, PrismaClient } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import {
  canMutateAppointment,
  canViewAppointmentSchedule,
  type AppointmentLocationAccessGrant
} from "@/server/policies/access";

const appointmentScheduleReadinessSelect = {
  id: true,
  appointmentNumber: true,
  locationId: true,
  ownerUserId: true,
  startsAt: true,
  endsAt: true,
  bookingStatus: true,
  customerSnapshot: true,
  vehicleSnapshot: true,
  participants: {
    select: {
      id: true,
      participantType: true,
      customerId: true
    }
  },
  vehicles: {
    select: {
      id: true
    }
  },
  resourceRequirements: {
    select: {
      id: true,
      requirementCode: true,
      isMandatory: true,
      hardBlockIfUnfulfilled: true,
      reservations: {
        select: {
          id: true,
          status: true
        }
      }
    }
  },
  taskLinks: {
    select: {
      id: true,
      blocksAppointment: true,
      blocksTask: true
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

type AppointmentScheduleReadinessDatabase = Pick<
  PrismaClient,
  "appointment" | "userLocationAccess"
>;

export type AppointmentScheduleReadinessAppointmentRecord = Prisma.AppointmentGetPayload<{
  select: typeof appointmentScheduleReadinessSelect;
}>;

export type AppointmentScheduleReadinessLocationAccessRecord = Prisma.UserLocationAccessGetPayload<{
  select: typeof locationAccessSelect;
}>;

export type AppointmentScheduleReadinessRepository = {
  findAppointmentById(
    appointmentId: string
  ): Promise<AppointmentScheduleReadinessAppointmentRecord | null>;
  findActiveLocationAccess(
    userId: string,
    locationId: string,
    at: Date
  ): Promise<AppointmentScheduleReadinessLocationAccessRecord | null>;
};

export type AppointmentScheduleReadinessIssue = {
  code: string;
  message: string;
};

export type AppointmentScheduleReadinessResult = {
  appointmentId: string;
  appointmentNumber: string;
  bookingStatus: string;
  status: "READY" | "WARNING" | "BLOCKED";
  canSubmitSchedule: boolean;
  hardBlocks: AppointmentScheduleReadinessIssue[];
  warnings: AppointmentScheduleReadinessIssue[];
  checks: Array<{
    code: string;
    label: string;
    status: "PASS" | "WARNING" | "BLOCKED";
    message: string;
  }>;
};

export type AppointmentScheduleReadinessOptions = {
  proposedStartsAt?: Date | null;
  proposedEndsAt?: Date | null;
  proposedSchedulingTimezone?: string | null;
};

function assertAuthenticated(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  return user;
}

function isDateWithinAccessWindow(
  access: AppointmentScheduleReadinessLocationAccessRecord,
  at: Date
) {
  return access.validFrom <= at && (!access.validTo || access.validTo >= at);
}

function toLocationAccessGrant(
  access: AppointmentScheduleReadinessLocationAccessRecord | null
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

function hasSnapshotValue(snapshot: unknown, keys: string[]) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return false;
  }

  return keys.some((key) => {
    const value = (snapshot as Record<string, unknown>)[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

function createCheck(input: {
  code: string;
  label: string;
  status: "PASS" | "WARNING" | "BLOCKED";
  message: string;
}) {
  return input;
}

function buildReadiness(appointment: AppointmentScheduleReadinessAppointmentRecord) {
  const hardBlocks: AppointmentScheduleReadinessIssue[] = [];
  const warnings: AppointmentScheduleReadinessIssue[] = [];
  const checks: AppointmentScheduleReadinessResult["checks"] = [];
  const hasCustomerContext =
    appointment.participants.some(
      (participant) => participant.customerId || participant.participantType === "CUSTOMER"
    ) || hasSnapshotValue(appointment.customerSnapshot, ["displayName", "customerDisplayName"]);
  const hasVehicleContext =
    appointment.vehicles.length > 0 ||
    hasSnapshotValue(appointment.vehicleSnapshot, [
      "displayName",
      "vehicleNumber",
      "stockNumber",
      "vin"
    ]);
  const hasResourceRequirements = appointment.resourceRequirements.length > 0;

  if (appointment.bookingStatus !== "DRAFT" && appointment.bookingStatus !== "PENDING_APPROVAL") {
    hardBlocks.push({
      code: "NOT_DRAFT",
      message: "Only draft or pending-approval appointments can use Schedule Draft."
    });
    checks.push(
      createCheck({
        code: "booking_status",
        label: "Draft status",
        status: "BLOCKED",
        message: `Current status is ${appointment.bookingStatus}.`
      })
    );
  } else {
    checks.push(
      createCheck({
        code: "booking_status",
        label: "Draft status",
        status: "PASS",
        message: "Appointment is eligible for draft scheduling."
      })
    );
  }

  if (!appointment.ownerUserId) {
    hardBlocks.push({
      code: "OWNER_REQUIRED",
      message: "A scheduled appointment requires an accountable owner."
    });
    checks.push(
      createCheck({
        code: "owner",
        label: "Owner",
        status: "BLOCKED",
        message: "No owner is assigned."
      })
    );
  } else {
    checks.push(
      createCheck({
        code: "owner",
        label: "Owner",
        status: "PASS",
        message: "Appointment has an accountable owner."
      })
    );
  }

  if (!appointment.startsAt || !appointment.endsAt || appointment.endsAt <= appointment.startsAt) {
    hardBlocks.push({
      code: "INVALID_TIME",
      message: "Scheduling requires a valid start and end time."
    });
    checks.push(
      createCheck({
        code: "time_window",
        label: "Time window",
        status: "BLOCKED",
        message: "Start and end time are missing or invalid."
      })
    );
  } else {
    checks.push(
      createCheck({
        code: "time_window",
        label: "Time window",
        status: "PASS",
        message: "Appointment has a valid time window."
      })
    );
  }

  if (!hasCustomerContext) {
    warnings.push({
      code: "CUSTOMER_CONTEXT_MISSING",
      message: "Customer context is not attached yet. Internal appointments may proceed, but customer-facing appointments should attach customer context."
    });
    checks.push(
      createCheck({
        code: "customer_context",
        label: "Customer context",
        status: "WARNING",
        message: "Customer context is missing."
      })
    );
  } else {
    checks.push(
      createCheck({
        code: "customer_context",
        label: "Customer context",
        status: "PASS",
        message: "Customer context is present."
      })
    );
  }

  if (!hasVehicleContext) {
    warnings.push({
      code: "VEHICLE_CONTEXT_MISSING",
      message: "Vehicle context is not attached yet. This may be acceptable for internal or document appointments."
    });
    checks.push(
      createCheck({
        code: "vehicle_context",
        label: "Vehicle context",
        status: "WARNING",
        message: "Vehicle context is missing."
      })
    );
  } else {
    checks.push(
      createCheck({
        code: "vehicle_context",
        label: "Vehicle context",
        status: "PASS",
        message: "Vehicle context is present."
      })
    );
  }

  if (!hasResourceRequirements) {
    warnings.push({
      code: "RESOURCE_REQUIREMENTS_NOT_SELECTED",
      message: "No schedulable resource requirement is selected yet. Resource reservation selection is the next scheduling slice."
    });
    checks.push(
      createCheck({
        code: "resource_requirements",
        label: "Resource requirements",
        status: "WARNING",
        message: "No resource requirement is selected."
      })
    );
  } else {
    checks.push(
      createCheck({
        code: "resource_requirements",
        label: "Resource requirements",
        status: "PASS",
        message: "Resource requirements are attached."
      })
    );
  }

  const status =
    hardBlocks.length > 0 ? "BLOCKED" : warnings.length > 0 ? "WARNING" : "READY";

  return {
    appointmentId: appointment.id,
    appointmentNumber: appointment.appointmentNumber,
    bookingStatus: appointment.bookingStatus,
    status,
    canSubmitSchedule: hardBlocks.length === 0,
    hardBlocks,
    warnings,
    checks
  } satisfies AppointmentScheduleReadinessResult;
}

export function createAppointmentScheduleReadinessRepository(
  database: AppointmentScheduleReadinessDatabase = prisma
): AppointmentScheduleReadinessRepository {
  return {
    async findAppointmentById(appointmentId) {
      return database.appointment.findUnique({
        where: {
          id: appointmentId
        },
        select: appointmentScheduleReadinessSelect
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
        select: locationAccessSelect
      });

      if (!access || !isDateWithinAccessWindow(access, at)) {
        return null;
      }

      return access;
    }
  };
}

export async function previewAppointmentScheduleReadiness(
  user: AuthenticatedUser | null,
  appointmentId: string,
  repository: AppointmentScheduleReadinessRepository = createAppointmentScheduleReadinessRepository(),
  now = new Date(),
  options: AppointmentScheduleReadinessOptions = {}
): Promise<AppointmentScheduleReadinessResult> {
  const actor = assertAuthenticated(user);
  const normalizedAppointmentId = appointmentId.trim();

  if (!normalizedAppointmentId) {
    throw new Error("Appointment id is required.");
  }

  const appointment = await repository.findAppointmentById(normalizedAppointmentId);

  if (!appointment) {
    throw new Error("Appointment not found.");
  }

  const locationAccess = toLocationAccessGrant(
    await repository.findActiveLocationAccess(actor.id, appointment.locationId, now)
  );

  if (!locationAccess || !canViewAppointmentSchedule({ actor, locationAccess })) {
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

  return buildReadiness({
    ...appointment,
    startsAt: options.proposedStartsAt ?? appointment.startsAt,
    endsAt: options.proposedEndsAt ?? appointment.endsAt
  });
}
