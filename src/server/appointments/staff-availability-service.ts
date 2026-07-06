import type { AppointmentLocationAccessGrant } from "@/server/policies/access";
import {
  evaluateResourceAvailability,
  type ResourceAvailabilityOperatingWindow,
  type ResourceAvailabilityReservation,
  type ResourceAvailabilityResource,
  type ResourceAvailabilityResult,
  type ResourceAvailabilityUnavailability
} from "@/server/appointments/resource-availability-service";
import { getLocationLocalDate } from "@/server/appointments/location-time-service";

export type StaffSchedulingRole = "OWNER" | "PARTICIPANT" | "MANAGER";

export type StaffAvailabilityUser = {
  id: string;
  name: string;
  isActive: boolean;
};

export type StaffLocationAccess = AppointmentLocationAccessGrant & {
  userId: string;
  locationId: string;
  validFrom: Date;
  validTo?: Date | null;
};

export type StaffResource = ResourceAvailabilityResource & {
  locationId: string;
  resourceKind: string;
  userId: string | null;
};

export type StaffAvailabilityResult = {
  staffUserId: string;
  locationId: string;
  requestedRole: StaffSchedulingRole;
  localDate: string;
  isEligible: boolean;
  isAvailable: boolean;
  isSchedulable: boolean;
  isHardBlocked: boolean;
  isWarningOnly: boolean;
  reasons: string[];
  resourceAvailability: ResourceAvailabilityResult | null;
};

function assertValidDate(value: Date, label: string) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }
}

function getDateOnly(value: Date) {
  assertValidDate(value, "Staff eligibility effective date");
  return value.toISOString().slice(0, 10);
}

function isAccessEffectiveForLocalDate(input: {
  access: StaffLocationAccess;
  localDate: string;
}) {
  const validFrom = getDateOnly(input.access.validFrom);
  const validTo = input.access.validTo ? getDateOnly(input.access.validTo) : null;

  return validFrom <= input.localDate && (!validTo || validTo >= input.localDate);
}

function getLocationEligibilityReasons(input: {
  staff: StaffAvailabilityUser;
  access: StaffLocationAccess | null;
  localDate: string;
  locationId: string;
  requestedRole: StaffSchedulingRole;
}) {
  const reasons: string[] = [];

  if (!input.staff.isActive) {
    reasons.push("Staff user is inactive.");
  }

  if (!input.access) {
    reasons.push("Staff user has no location access grant.");
    return reasons;
  }

  if (input.access.userId !== input.staff.id) {
    reasons.push("Location access grant does not belong to the staff user.");
  }

  if (input.access.locationId !== input.locationId) {
    reasons.push("Location access grant does not match the requested location.");
  }

  if (!isAccessEffectiveForLocalDate({ access: input.access, localDate: input.localDate })) {
    reasons.push("Staff location access is not effective on the candidate date.");
  }

  if (!input.access.canViewSchedule) {
    reasons.push("Staff user cannot view this location schedule.");
  }

  if (input.requestedRole === "PARTICIPANT" && !input.access.canParticipate) {
    reasons.push("Staff user cannot participate in appointments at this location.");
  }

  if (input.requestedRole === "OWNER") {
    if (!input.access.canParticipate) {
      reasons.push("Appointment owners must be allowed to participate at this location.");
    }

    if (!input.access.canOwnAppointments) {
      reasons.push("Staff user cannot own appointments at this location.");
    }
  }

  if (input.requestedRole === "MANAGER" && !input.access.canManageAppointments) {
    reasons.push("Staff user cannot manage appointments at this location.");
  }

  return reasons;
}

function getStaffResourceReasons(input: {
  staff: StaffAvailabilityUser;
  resource: StaffResource | null;
  locationId: string;
}) {
  const reasons: string[] = [];

  if (!input.resource) {
    reasons.push("Staff user has no schedulable staff resource.");
    return reasons;
  }

  if (input.resource.resourceKind !== "STAFF") {
    reasons.push("Schedulable resource is not a staff resource.");
  }

  if (input.resource.userId !== input.staff.id) {
    reasons.push("Staff resource does not belong to the staff user.");
  }

  if (input.resource.locationId !== input.locationId) {
    reasons.push("Staff resource does not belong to the requested location.");
  }

  return reasons;
}

export function evaluateStaffAvailability(input: {
  staff: StaffAvailabilityUser;
  locationId: string;
  timezone: string;
  requestedRole: StaffSchedulingRole;
  locationAccess: StaffLocationAccess | null;
  staffResource: StaffResource | null;
  operatingWindows: ResourceAvailabilityOperatingWindow[];
  unavailability: ResourceAvailabilityUnavailability[];
  reservations: ResourceAvailabilityReservation[];
  startsAt: Date;
  endsAt: Date;
  requiredCapacity?: number;
}): StaffAvailabilityResult {
  assertValidDate(input.startsAt, "Staff availability start");
  assertValidDate(input.endsAt, "Staff availability end");

  const localDate = getLocationLocalDate(input.startsAt, input.timezone);
  const eligibilityReasons = getLocationEligibilityReasons({
    staff: input.staff,
    access: input.locationAccess,
    localDate,
    locationId: input.locationId,
    requestedRole: input.requestedRole
  });
  const staffResourceReasons = getStaffResourceReasons({
    staff: input.staff,
    resource: input.staffResource,
    locationId: input.locationId
  });
  const staffResource = input.staffResource;
  const canEvaluateResource = staffResource !== null && staffResourceReasons.length === 0;
  const resourceAvailability = canEvaluateResource
    ? evaluateResourceAvailability({
        resource: staffResource,
        timezone: input.timezone,
        operatingWindows: input.operatingWindows,
        unavailability: input.unavailability,
        reservations: input.reservations,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        requiredCapacity: input.requiredCapacity
      })
    : null;
  const reasons = [
    ...eligibilityReasons,
    ...staffResourceReasons,
    ...(resourceAvailability?.reasons ?? [])
  ];
  const isEligible = eligibilityReasons.length === 0 && staffResourceReasons.length === 0;
  const isAvailable = Boolean(resourceAvailability?.isAvailable);
  const isSchedulable = isEligible && isAvailable;

  return {
    staffUserId: input.staff.id,
    locationId: input.locationId,
    requestedRole: input.requestedRole,
    localDate,
    isEligible,
    isAvailable,
    isSchedulable,
    isHardBlocked:
      !isSchedulable &&
      (eligibilityReasons.length > 0 ||
        staffResourceReasons.length > 0 ||
        Boolean(resourceAvailability?.isHardBlocked)),
    isWarningOnly:
      !isSchedulable &&
      eligibilityReasons.length === 0 &&
      staffResourceReasons.length === 0 &&
      Boolean(resourceAvailability?.isWarningOnly),
    reasons: [...new Set(reasons)],
    resourceAvailability
  };
}
