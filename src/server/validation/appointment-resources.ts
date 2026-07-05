import { BusinessDay } from "@prisma/client";

import {
  RESOURCE_CAPACITY_MODES,
  RESOURCE_CONFLICT_POLICIES,
  RESOURCE_REQUIREMENT_ASSIGNMENT_TIMINGS,
  RESOURCE_RESERVATION_STATUSES,
  RESOURCE_UNAVAILABILITY_TYPES,
  RESOURCE_VISIBILITY_CLASSES,
  SCHEDULABLE_RESOURCE_KINDS,
  SCHEDULABLE_RESOURCE_STATUSES,
  type ResourceCapacityMode,
  type ResourceConflictPolicy,
  type ResourceRequirementAssignmentTiming,
  type ResourceReservationStatus,
  type ResourceUnavailabilityType,
  type ResourceVisibilityClass,
  type SchedulableResourceKind,
  type SchedulableResourceStatus
} from "@/server/appointments/appointment-resource-domain";

const businessDays = new Set<string>(Object.values(BusinessDay));
const resourceKinds = new Set<string>(SCHEDULABLE_RESOURCE_KINDS);
const capacityModes = new Set<string>(RESOURCE_CAPACITY_MODES);
const conflictPolicies = new Set<string>(RESOURCE_CONFLICT_POLICIES);
const visibilityClasses = new Set<string>(RESOURCE_VISIBILITY_CLASSES);
const resourceStatuses = new Set<string>(SCHEDULABLE_RESOURCE_STATUSES);
const assignmentTimings = new Set<string>(RESOURCE_REQUIREMENT_ASSIGNMENT_TIMINGS);
const reservationStatuses = new Set<string>(RESOURCE_RESERVATION_STATUSES);
const unavailabilityTypes = new Set<string>(RESOURCE_UNAVAILABILITY_TYPES);
const stableCodePattern = /^[A-Z0-9]+(?:[-_][A-Z0-9]+)*$/;
const requirementCodePattern = /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/;

function requiredText(value: string, label: string, maximumLength: number) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  if (normalized.length > maximumLength) {
    throw new Error(`${label} cannot exceed ${maximumLength} characters.`);
  }

  return normalized;
}

function optionalText(
  value: string | null | undefined,
  label: string,
  maximumLength: number
) {
  const normalized = value?.trim() ?? "";

  if (normalized.length > maximumLength) {
    throw new Error(`${label} cannot exceed ${maximumLength} characters.`);
  }

  return normalized || null;
}

function stableCode(value: string, label: string) {
  const normalized = requiredText(value, label, 100).toUpperCase();

  if (!stableCodePattern.test(normalized)) {
    throw new Error(`${label} must contain letters, numbers, hyphens, or underscores only.`);
  }

  return normalized;
}

function structuredCode(value: string, label: string) {
  const normalized = requiredText(value, label, 100).toUpperCase();

  if (!requirementCodePattern.test(normalized)) {
    throw new Error(`${label} must contain uppercase letters, numbers, and single underscores only.`);
  }

  return normalized;
}

function optionalDate(value: Date | null | undefined, label: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }

  return new Date(value);
}

function requiredDate(value: Date, label: string) {
  const normalized = optionalDate(value, label);

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function jsonObject(value: unknown, label: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return value;
}

function positiveInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return value;
}

function nonNegativeInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }

  return value;
}

function validateEffectiveRange(validFrom: Date, validTo: Date | null, label: string) {
  if (validTo && validTo < validFrom) {
    throw new Error(`${label} valid-to date cannot be before its valid-from date.`);
  }
}

export type SchedulableResourceTypeInput = {
  organizationId: string;
  code: string;
  name: string;
  kind: string;
  defaultCapacityMode: string;
  defaultCapacity: number;
  defaultConflictPolicy: string;
  visibilityClass: string;
  attributeSchema?: unknown;
  isActive?: boolean;
};

export function normalizeSchedulableResourceType(input: SchedulableResourceTypeInput) {
  if (!resourceKinds.has(input.kind)) {
    throw new Error(`Schedulable resource kind is invalid: "${input.kind}".`);
  }

  if (!capacityModes.has(input.defaultCapacityMode)) {
    throw new Error(`Resource capacity mode is invalid: "${input.defaultCapacityMode}".`);
  }

  if (!conflictPolicies.has(input.defaultConflictPolicy)) {
    throw new Error(`Resource conflict policy is invalid: "${input.defaultConflictPolicy}".`);
  }

  if (!visibilityClasses.has(input.visibilityClass)) {
    throw new Error(`Resource visibility class is invalid: "${input.visibilityClass}".`);
  }

  const defaultCapacity = positiveInteger(
    input.defaultCapacity,
    "Resource-type default capacity"
  );

  if (input.defaultCapacityMode === "EXCLUSIVE" && defaultCapacity !== 1) {
    throw new Error("An exclusive resource type must have capacity 1.");
  }

  return {
    organizationId: requiredText(input.organizationId, "Resource-type organization", 100),
    code: stableCode(input.code, "Resource-type code"),
    name: requiredText(input.name, "Resource-type name", 200),
    kind: input.kind as SchedulableResourceKind,
    defaultCapacityMode: input.defaultCapacityMode as ResourceCapacityMode,
    defaultCapacity,
    defaultConflictPolicy: input.defaultConflictPolicy as ResourceConflictPolicy,
    visibilityClass: input.visibilityClass as ResourceVisibilityClass,
    attributeSchema: jsonObject(input.attributeSchema, "Resource-type attribute schema"),
    isActive: input.isActive ?? true
  };
}

export type SchedulableResourceInput = {
  organizationId: string;
  locationId: string;
  locationOrganizationId: string;
  resourceTypeId: string;
  resourceTypeOrganizationId: string;
  resourceKind: string;
  code: string;
  name: string;
  status: string;
  capacityMode: string;
  capacity: number;
  conflictPolicy: string;
  userId?: string | null;
  vehicleId?: string | null;
  vehicleOrganizationId?: string | null;
  attributes?: unknown;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
};

export function normalizeSchedulableResource(input: SchedulableResourceInput) {
  if (!resourceKinds.has(input.resourceKind)) {
    throw new Error(`Schedulable resource kind is invalid: "${input.resourceKind}".`);
  }

  if (!resourceStatuses.has(input.status)) {
    throw new Error(`Schedulable resource status is invalid: "${input.status}".`);
  }

  if (!capacityModes.has(input.capacityMode)) {
    throw new Error(`Resource capacity mode is invalid: "${input.capacityMode}".`);
  }

  if (!conflictPolicies.has(input.conflictPolicy)) {
    throw new Error(`Resource conflict policy is invalid: "${input.conflictPolicy}".`);
  }

  const userId = optionalText(input.userId, "Resource user ID", 100);
  const vehicleId = optionalText(input.vehicleId, "Resource vehicle ID", 100);
  const organizationId = requiredText(input.organizationId, "Resource organization", 100);
  const locationOrganizationId = requiredText(
    input.locationOrganizationId,
    "Resource location organization",
    100
  );
  const resourceTypeOrganizationId = requiredText(
    input.resourceTypeOrganizationId,
    "Resource-type organization",
    100
  );
  const vehicleOrganizationId = optionalText(
    input.vehicleOrganizationId,
    "Resource vehicle organization",
    100
  );

  if (
    organizationId !== locationOrganizationId ||
    organizationId !== resourceTypeOrganizationId
  ) {
    throw new Error("A resource, location, and resource type must belong to one organization.");
  }

  if (input.resourceKind === "STAFF" && (!userId || vehicleId)) {
    throw new Error("A staff resource requires only an internal user reference.");
  }

  if (input.resourceKind === "VEHICLE" && (!vehicleId || userId)) {
    throw new Error("A vehicle resource requires only a vehicle reference.");
  }

  if (
    input.resourceKind === "VEHICLE" &&
    vehicleOrganizationId !== organizationId
  ) {
    throw new Error("A vehicle resource must reference a vehicle in the same organization.");
  }

  if (input.resourceKind !== "VEHICLE" && vehicleOrganizationId) {
    throw new Error("Only a vehicle resource may provide a vehicle organization.");
  }

  if (!["STAFF", "VEHICLE"].includes(input.resourceKind) && (userId || vehicleId)) {
    throw new Error("Only staff and vehicle resources may reference a user or vehicle.");
  }

  const capacity = positiveInteger(input.capacity, "Resource capacity");

  if (input.capacityMode === "EXCLUSIVE" && capacity !== 1) {
    throw new Error("An exclusive resource must have capacity 1.");
  }

  const effectiveFrom = requiredDate(input.effectiveFrom, "Resource effective-from date");
  const effectiveTo = optionalDate(input.effectiveTo, "Resource effective-to date");
  validateEffectiveRange(effectiveFrom, effectiveTo, "Resource");

  return {
    organizationId,
    locationId: requiredText(input.locationId, "Resource location", 100),
    resourceTypeId: requiredText(input.resourceTypeId, "Resource type", 100),
    resourceKind: input.resourceKind as SchedulableResourceKind,
    code: stableCode(input.code, "Resource code"),
    name: requiredText(input.name, "Resource name", 200),
    status: input.status as SchedulableResourceStatus,
    capacityMode: input.capacityMode as ResourceCapacityMode,
    capacity,
    conflictPolicy: input.conflictPolicy as ResourceConflictPolicy,
    userId,
    vehicleId,
    attributes: jsonObject(input.attributes, "Resource attributes"),
    effectiveFrom,
    effectiveTo
  };
}

export type ResourcePoolMemberInput = {
  poolResourceId: string;
  memberResourceId: string;
  poolResourceKind: string;
  capacityContribution: number;
  validFrom: Date;
  validTo?: Date | null;
};

export function normalizeResourcePoolMember(input: ResourcePoolMemberInput) {
  if (input.poolResourceKind !== "POOL") {
    throw new Error("A resource-pool membership requires a pool resource.");
  }

  const poolResourceId = requiredText(input.poolResourceId, "Pool resource", 100);
  const memberResourceId = requiredText(input.memberResourceId, "Pool member resource", 100);

  if (poolResourceId === memberResourceId) {
    throw new Error("A resource cannot be a member of itself.");
  }

  const validFrom = requiredDate(input.validFrom, "Pool membership valid-from date");
  const validTo = optionalDate(input.validTo, "Pool membership valid-to date");
  validateEffectiveRange(validFrom, validTo, "Pool membership");

  return {
    poolResourceId,
    memberResourceId,
    capacityContribution: positiveInteger(
      input.capacityContribution,
      "Pool-member capacity contribution"
    ),
    validFrom,
    validTo
  };
}

export type ResourceOperatingWindowInput = {
  resourceId: string;
  businessDay: string;
  opensAtMinute: number;
  closesAtMinute: number;
  capacityOverride?: number | null;
  validFrom: Date;
  validTo?: Date | null;
};

export function normalizeResourceOperatingWindow(input: ResourceOperatingWindowInput) {
  if (!businessDays.has(input.businessDay)) {
    throw new Error(`Resource operating window has an invalid business day: "${input.businessDay}".`);
  }

  if (
    !Number.isInteger(input.opensAtMinute) ||
    !Number.isInteger(input.closesAtMinute) ||
    input.opensAtMinute < 0 ||
    input.opensAtMinute >= input.closesAtMinute ||
    input.closesAtMinute > 1440
  ) {
    throw new Error("Resource operating window must open before it closes within one local day.");
  }

  const validFrom = requiredDate(input.validFrom, "Resource-window valid-from date");
  const validTo = optionalDate(input.validTo, "Resource-window valid-to date");
  validateEffectiveRange(validFrom, validTo, "Resource operating window");

  return {
    resourceId: requiredText(input.resourceId, "Operating-window resource", 100),
    businessDay: input.businessDay as BusinessDay,
    opensAtMinute: input.opensAtMinute,
    closesAtMinute: input.closesAtMinute,
    capacityOverride:
      input.capacityOverride === null || input.capacityOverride === undefined
        ? null
        : positiveInteger(input.capacityOverride, "Resource-window capacity override"),
    validFrom,
    validTo
  };
}

export type ResourceUnavailabilityInput = {
  resourceId: string;
  type: string;
  startsAt: Date;
  endsAt: Date;
  capacityReduction?: number | null;
  reason: string;
  createdByUserId?: string | null;
};

export function normalizeResourceUnavailability(input: ResourceUnavailabilityInput) {
  if (!unavailabilityTypes.has(input.type)) {
    throw new Error(`Resource unavailability type is invalid: "${input.type}".`);
  }

  const startsAt = requiredDate(input.startsAt, "Resource unavailability start");
  const endsAt = requiredDate(input.endsAt, "Resource unavailability end");

  if (endsAt <= startsAt) {
    throw new Error("Resource unavailability must end after it starts.");
  }

  const capacityReduction =
    input.capacityReduction === null || input.capacityReduction === undefined
      ? null
      : positiveInteger(input.capacityReduction, "Resource capacity reduction");

  if (input.type === "CAPACITY_REDUCTION" && !capacityReduction) {
    throw new Error("A capacity-reduction window requires a positive reduction.");
  }

  if (input.type !== "CAPACITY_REDUCTION" && capacityReduction) {
    throw new Error("Only a capacity-reduction window may specify reduced capacity.");
  }

  return {
    resourceId: requiredText(input.resourceId, "Unavailable resource", 100),
    type: input.type as ResourceUnavailabilityType,
    startsAt,
    endsAt,
    capacityReduction,
    reason: requiredText(input.reason, "Resource unavailability reason", 1000),
    createdByUserId: optionalText(
      input.createdByUserId,
      "Resource unavailability creator",
      100
    )
  };
}

export type AppointmentResourceRequirementInput = {
  appointmentId: string;
  appointmentOrganizationId: string;
  resourceTypeId: string;
  resourceTypeOrganizationId: string;
  requirementCode: string;
  requiredCapacity: number;
  isMandatory?: boolean;
  assignmentTiming: string;
  hardBlockIfUnfulfilled?: boolean;
  characteristics?: unknown;
};

export function normalizeAppointmentResourceRequirement(
  input: AppointmentResourceRequirementInput
) {
  if (!assignmentTimings.has(input.assignmentTiming)) {
    throw new Error(`Resource assignment timing is invalid: "${input.assignmentTiming}".`);
  }

  const appointmentOrganizationId = requiredText(
    input.appointmentOrganizationId,
    "Resource requirement appointment organization",
    100
  );
  const resourceTypeOrganizationId = requiredText(
    input.resourceTypeOrganizationId,
    "Resource requirement type organization",
    100
  );

  if (appointmentOrganizationId !== resourceTypeOrganizationId) {
    throw new Error("A resource requirement type must belong to the appointment organization.");
  }

  const isMandatory = input.isMandatory ?? true;
  const hardBlockIfUnfulfilled = input.hardBlockIfUnfulfilled ?? true;

  if (!isMandatory && hardBlockIfUnfulfilled) {
    throw new Error("An optional resource requirement cannot hard-block scheduling.");
  }

  if (input.assignmentTiming === "OPTIONAL" && (isMandatory || hardBlockIfUnfulfilled)) {
    throw new Error("Optional assignment timing requires an optional, non-blocking requirement.");
  }

  return {
    appointmentId: requiredText(input.appointmentId, "Resource requirement appointment", 100),
    resourceTypeId: requiredText(input.resourceTypeId, "Resource requirement type", 100),
    requirementCode: structuredCode(input.requirementCode, "Resource requirement code"),
    requiredCapacity: positiveInteger(
      input.requiredCapacity,
      "Resource requirement capacity"
    ),
    isMandatory,
    assignmentTiming: input.assignmentTiming as ResourceRequirementAssignmentTiming,
    hardBlockIfUnfulfilled,
    characteristics: jsonObject(
      input.characteristics,
      "Resource requirement characteristics"
    )
  };
}

export type AppointmentResourceReservationInput = {
  appointmentId: string;
  appointmentLocationId: string;
  requirementId?: string | null;
  requirementAppointmentId?: string | null;
  resourceId: string;
  resourceLocationId: string;
  status: string;
  startsAt: Date;
  endsAt: Date;
  capacityUnits: number;
  resourceCapacity: number;
  resourceCapacityMode: string;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
};

export function normalizeAppointmentResourceReservation(
  input: AppointmentResourceReservationInput
) {
  if (!reservationStatuses.has(input.status)) {
    throw new Error(`Resource reservation status is invalid: "${input.status}".`);
  }

  if (!capacityModes.has(input.resourceCapacityMode)) {
    throw new Error(`Resource capacity mode is invalid: "${input.resourceCapacityMode}".`);
  }

  const appointmentId = requiredText(input.appointmentId, "Reservation appointment", 100);
  const appointmentLocationId = requiredText(
    input.appointmentLocationId,
    "Reservation appointment location",
    100
  );
  const requirementId = optionalText(input.requirementId, "Reservation requirement", 100);
  const requirementAppointmentId = optionalText(
    input.requirementAppointmentId,
    "Reservation requirement appointment",
    100
  );
  const resourceLocationId = requiredText(
    input.resourceLocationId,
    "Reserved-resource location",
    100
  );

  if (appointmentLocationId !== resourceLocationId) {
    throw new Error("A reserved resource must belong to the appointment location.");
  }

  if (
    (requirementId && requirementAppointmentId !== appointmentId) ||
    (!requirementId && requirementAppointmentId)
  ) {
    throw new Error("A reservation requirement must belong to the same appointment.");
  }

  const startsAt = requiredDate(input.startsAt, "Resource reservation start");
  const endsAt = requiredDate(input.endsAt, "Resource reservation end");

  if (endsAt <= startsAt) {
    throw new Error("Resource reservation must end after it starts.");
  }

  const resourceCapacity = positiveInteger(input.resourceCapacity, "Resource capacity");
  const capacityUnits = positiveInteger(input.capacityUnits, "Reservation capacity units");

  if (capacityUnits > resourceCapacity) {
    throw new Error("Reservation capacity cannot exceed the configured resource capacity.");
  }

  if (input.resourceCapacityMode === "EXCLUSIVE" && capacityUnits !== 1) {
    throw new Error("An exclusive-resource reservation must reserve exactly one unit.");
  }

  const bufferBeforeMinutes = nonNegativeInteger(
    input.bufferBeforeMinutes ?? 0,
    "Reservation preparation buffer"
  );
  const bufferAfterMinutes = nonNegativeInteger(
    input.bufferAfterMinutes ?? 0,
    "Reservation cleanup buffer"
  );

  if (bufferBeforeMinutes > 1440 || bufferAfterMinutes > 1440) {
    throw new Error("Reservation buffers cannot exceed one day.");
  }

  return {
    appointmentId,
    requirementId,
    resourceId: requiredText(input.resourceId, "Reserved resource", 100),
    status: input.status as ResourceReservationStatus,
    startsAt,
    endsAt,
    capacityUnits,
    bufferBeforeMinutes,
    bufferAfterMinutes
  };
}
