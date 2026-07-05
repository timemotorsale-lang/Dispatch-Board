import { BusinessDay } from "@prisma/client";

import type {
  ResourceCapacityMode,
  ResourceConflictPolicy,
  ResourceReservationStatus,
  ResourceUnavailabilityType,
  SchedulableResourceStatus
} from "@/server/appointments/appointment-resource-domain";
import {
  getBusinessDayForLocalDate,
  getLocationLocalDate,
  locationLocalDateMinuteToInstant
} from "@/server/appointments/location-time-service";

const capacityConsumingReservationStatuses = new Set<ResourceReservationStatus>([
  "HELD",
  "COMMITTED"
]);

const fullCapacityUnavailabilityTypes = new Set<ResourceUnavailabilityType>([
  "ABSENCE",
  "OUTAGE",
  "MAINTENANCE",
  "OTHER"
]);

export type ResourceAvailabilityResource = {
  id: string;
  name: string;
  status: SchedulableResourceStatus | string;
  capacityMode: ResourceCapacityMode | string;
  capacity: number;
  conflictPolicy: ResourceConflictPolicy | string;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
};

export type ResourceAvailabilityOperatingWindow = {
  businessDay: BusinessDay | string;
  opensAtMinute: number;
  closesAtMinute: number;
  capacityOverride?: number | null;
  validFrom: Date;
  validTo?: Date | null;
};

export type ResourceAvailabilityUnavailability = {
  id?: string;
  type: ResourceUnavailabilityType | string;
  startsAt: Date;
  endsAt: Date;
  capacityReduction?: number | null;
  reason: string;
};

export type ResourceAvailabilityReservation = {
  id?: string;
  appointmentId: string;
  status: ResourceReservationStatus | string;
  startsAt: Date;
  endsAt: Date;
  capacityUnits: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
};

export type ResourceAvailabilityResult = {
  resourceId: string;
  localDate: string;
  businessDay: BusinessDay;
  isAvailable: boolean;
  isHardBlocked: boolean;
  isWarningOnly: boolean;
  reasons: string[];
  capacityMode: string;
  conflictPolicy: string;
  configuredCapacity: number;
  effectiveWindowCapacity: number;
  reservedCapacity: number;
  unavailableCapacity: number;
  availableCapacity: number;
  matchingOperatingWindow: {
    businessDay: BusinessDay;
    opensAtMinute: number;
    closesAtMinute: number;
    startsAt: Date;
    endsAt: Date;
    capacity: number;
  } | null;
  overlappingReservations: ResourceAvailabilityReservation[];
  overlappingUnavailability: ResourceAvailabilityUnavailability[];
};

function assertValidDate(value: Date, label: string) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }
}

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function assertCandidateRange(startsAt: Date, endsAt: Date) {
  assertValidDate(startsAt, "Resource availability start");
  assertValidDate(endsAt, "Resource availability end");

  if (endsAt <= startsAt) {
    throw new Error("Resource availability end must be after start.");
  }
}

function getDateOnly(value: Date) {
  assertValidDate(value, "Resource effective date");
  return value.toISOString().slice(0, 10);
}

function overlaps(leftStart: Date, leftEnd: Date, rightStart: Date, rightEnd: Date) {
  return leftStart < rightEnd && rightStart < leftEnd;
}

function addMinutes(value: Date, minutes: number) {
  return new Date(value.getTime() + minutes * 60 * 1000);
}

function getBufferedReservationWindow(reservation: ResourceAvailabilityReservation) {
  return {
    startsAt: addMinutes(reservation.startsAt, -(reservation.bufferBeforeMinutes ?? 0)),
    endsAt: addMinutes(reservation.endsAt, reservation.bufferAfterMinutes ?? 0)
  };
}

function isEffectiveForLocalDate(input: {
  validFrom: Date;
  validTo?: Date | null;
  localDate: string;
}) {
  const validFrom = getDateOnly(input.validFrom);
  const validTo = input.validTo ? getDateOnly(input.validTo) : null;

  return validFrom <= input.localDate && (!validTo || validTo >= input.localDate);
}

function getUnavailableCapacity(input: {
  unavailability: ResourceAvailabilityUnavailability;
  effectiveWindowCapacity: number;
}) {
  if (input.unavailability.type === "CAPACITY_REDUCTION") {
    return Math.min(
      input.effectiveWindowCapacity,
      input.unavailability.capacityReduction ?? 0
    );
  }

  if (fullCapacityUnavailabilityTypes.has(input.unavailability.type as ResourceUnavailabilityType)) {
    return input.effectiveWindowCapacity;
  }

  return 0;
}

function getSeverity(input: {
  isAvailable: boolean;
  conflictPolicy: string;
  reasons: string[];
}) {
  if (input.isAvailable) {
    return {
      isHardBlocked: false,
      isWarningOnly: false
    };
  }

  return {
    isHardBlocked: input.conflictPolicy === "HARD_BLOCK",
    isWarningOnly: input.conflictPolicy === "WARNING"
  };
}

export function evaluateResourceAvailability(input: {
  resource: ResourceAvailabilityResource;
  timezone: string;
  operatingWindows: ResourceAvailabilityOperatingWindow[];
  unavailability: ResourceAvailabilityUnavailability[];
  reservations: ResourceAvailabilityReservation[];
  startsAt: Date;
  endsAt: Date;
  requiredCapacity?: number;
}): ResourceAvailabilityResult {
  const { resource, timezone, startsAt, endsAt } = input;
  const requiredCapacity = input.requiredCapacity ?? 1;

  assertCandidateRange(startsAt, endsAt);
  assertPositiveInteger(resource.capacity, "Resource capacity");
  assertPositiveInteger(requiredCapacity, "Required resource capacity");

  const localDate = getLocationLocalDate(startsAt, timezone);
  const localEndDate = getLocationLocalDate(new Date(endsAt.getTime() - 1), timezone);
  const businessDay = getBusinessDayForLocalDate(localDate);
  const reasons: string[] = [];

  if (localEndDate !== localDate) {
    reasons.push("Resource candidate must fit within one location-local day.");
  }

  if (resource.status !== "ACTIVE") {
    reasons.push(`Resource status is ${resource.status}.`);
  }

  if (
    !isEffectiveForLocalDate({
      validFrom: resource.effectiveFrom,
      validTo: resource.effectiveTo,
      localDate
    })
  ) {
    reasons.push("Resource is not effective on the candidate date.");
  }

  if (resource.capacityMode === "EXCLUSIVE" && requiredCapacity !== 1) {
    reasons.push("Exclusive resources can only satisfy one required unit.");
  }

  if (requiredCapacity > resource.capacity) {
    reasons.push("Required capacity exceeds configured resource capacity.");
  }

  const activeWindows = input.operatingWindows
    .filter(
      (window) =>
        window.businessDay === businessDay &&
        isEffectiveForLocalDate({ ...window, localDate })
    )
    .sort((left, right) => left.opensAtMinute - right.opensAtMinute);
  const matchingOperatingWindow =
    activeWindows
      .map((window) => {
        const startsAtForWindow = locationLocalDateMinuteToInstant({
          localDate,
          minuteOfDay: window.opensAtMinute,
          timezone
        });
        const endsAtForWindow = locationLocalDateMinuteToInstant({
          localDate,
          minuteOfDay: window.closesAtMinute,
          timezone
        });
        const capacity =
          window.capacityOverride === null || window.capacityOverride === undefined
            ? resource.capacity
            : Math.min(resource.capacity, window.capacityOverride);

        return {
          businessDay,
          opensAtMinute: window.opensAtMinute,
          closesAtMinute: window.closesAtMinute,
          startsAt: startsAtForWindow,
          endsAt: endsAtForWindow,
          capacity
        };
      })
      .find((window) => startsAt >= window.startsAt && endsAt <= window.endsAt) ?? null;

  if (!matchingOperatingWindow) {
    reasons.push("Resource candidate is outside resource operating hours.");
  }

  const overlappingUnavailability = input.unavailability.filter((entry) =>
    overlaps(startsAt, endsAt, entry.startsAt, entry.endsAt)
  );
  const unavailableCapacity = matchingOperatingWindow
    ? Math.min(
        matchingOperatingWindow.capacity,
        overlappingUnavailability.reduce(
          (total, entry) =>
            total +
            getUnavailableCapacity({
              unavailability: entry,
              effectiveWindowCapacity: matchingOperatingWindow.capacity
            }),
          0
        )
      )
    : 0;

  if (unavailableCapacity > 0) {
    reasons.push("Resource capacity is reduced or unavailable during the candidate window.");
  }

  const overlappingReservations = input.reservations.filter((reservation) => {
    if (!capacityConsumingReservationStatuses.has(reservation.status as ResourceReservationStatus)) {
      return false;
    }

    const bufferedWindow = getBufferedReservationWindow(reservation);
    return overlaps(startsAt, endsAt, bufferedWindow.startsAt, bufferedWindow.endsAt);
  });
  const reservedCapacity = overlappingReservations.reduce(
    (total, reservation) => total + reservation.capacityUnits,
    0
  );

  if (reservedCapacity > 0) {
    reasons.push("Resource capacity is already reserved during the candidate window.");
  }

  const effectiveWindowCapacity = matchingOperatingWindow?.capacity ?? 0;
  const availableCapacity = Math.max(
    0,
    effectiveWindowCapacity - unavailableCapacity - reservedCapacity
  );

  if (availableCapacity < requiredCapacity) {
    reasons.push("Resource does not have enough available capacity.");
  }

  const isAvailable = reasons.length === 0;
  const severity = getSeverity({
    isAvailable,
    conflictPolicy: resource.conflictPolicy,
    reasons
  });

  return {
    resourceId: resource.id,
    localDate,
    businessDay,
    isAvailable,
    ...severity,
    reasons: [...new Set(reasons)],
    capacityMode: resource.capacityMode,
    conflictPolicy: resource.conflictPolicy,
    configuredCapacity: resource.capacity,
    effectiveWindowCapacity,
    reservedCapacity,
    unavailableCapacity,
    availableCapacity,
    matchingOperatingWindow,
    overlappingReservations,
    overlappingUnavailability
  };
}
