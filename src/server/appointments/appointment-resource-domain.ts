export const CUSTOMER_STATUSES = ["ACTIVE", "INACTIVE", "MERGED", "RETIRED"] as const;

export const VEHICLE_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "SOLD",
  "OUT_OF_SERVICE",
  "RETIRED"
] as const;

export const APPOINTMENT_PARTICIPANT_TYPES = [
  "INTERNAL_USER",
  "CUSTOMER",
  "EXTERNAL"
] as const;

export const SCHEDULABLE_RESOURCE_KINDS = [
  "STAFF",
  "VEHICLE",
  "SERVICE_BAY",
  "ROOM",
  "EQUIPMENT",
  "POOL",
  "LOCATION",
  "OTHER"
] as const;

export const RESOURCE_CAPACITY_MODES = ["EXCLUSIVE", "CAPACITY"] as const;
export const RESOURCE_CONFLICT_POLICIES = ["HARD_BLOCK", "WARNING", "INFORMATION"] as const;
export const RESOURCE_VISIBILITY_CLASSES = ["OPERATIONAL", "LIMITED", "RESTRICTED"] as const;
export const SCHEDULABLE_RESOURCE_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "OUT_OF_SERVICE",
  "RETIRED"
] as const;
export const RESOURCE_REQUIREMENT_ASSIGNMENT_TIMINGS = [
  "AT_BOOKING",
  "BEFORE_START",
  "OPTIONAL"
] as const;
export const RESOURCE_RESERVATION_STATUSES = [
  "PROPOSED",
  "HELD",
  "COMMITTED",
  "RELEASED",
  "CANCELLED"
] as const;
export const RESOURCE_UNAVAILABILITY_TYPES = [
  "ABSENCE",
  "OUTAGE",
  "MAINTENANCE",
  "CAPACITY_REDUCTION",
  "OTHER"
] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];
export type AppointmentParticipantType = (typeof APPOINTMENT_PARTICIPANT_TYPES)[number];
export type SchedulableResourceKind = (typeof SCHEDULABLE_RESOURCE_KINDS)[number];
export type ResourceCapacityMode = (typeof RESOURCE_CAPACITY_MODES)[number];
export type ResourceConflictPolicy = (typeof RESOURCE_CONFLICT_POLICIES)[number];
export type ResourceVisibilityClass = (typeof RESOURCE_VISIBILITY_CLASSES)[number];
export type SchedulableResourceStatus = (typeof SCHEDULABLE_RESOURCE_STATUSES)[number];
export type ResourceRequirementAssignmentTiming =
  (typeof RESOURCE_REQUIREMENT_ASSIGNMENT_TIMINGS)[number];
export type ResourceReservationStatus = (typeof RESOURCE_RESERVATION_STATUSES)[number];
export type ResourceUnavailabilityType = (typeof RESOURCE_UNAVAILABILITY_TYPES)[number];
