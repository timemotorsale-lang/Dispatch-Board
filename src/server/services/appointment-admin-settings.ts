import {
  BusinessDay,
  LocationClosureType,
  ResourceCapacityMode,
  ResourceConflictPolicy,
  ResourceUnavailabilityType,
  SchedulableResourceStatus,
  type LocationSchedulingStatus
} from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getInitialMinneapolisLocation } from "@/server/appointments/location-foundation";
import { INITIAL_APPOINTMENT_TEMPLATE_DEFINITIONS } from "@/server/appointments/appointment-template-domain";
import { prisma } from "@/server/db/client";
import { canManageSettings } from "@/server/policies/access";

const orderedBusinessDays = [
  BusinessDay.MONDAY,
  BusinessDay.TUESDAY,
  BusinessDay.WEDNESDAY,
  BusinessDay.THURSDAY,
  BusinessDay.FRIDAY,
  BusinessDay.SATURDAY,
  BusinessDay.SUNDAY
] as const;

const validSchedulingStatuses = new Set<LocationSchedulingStatus>([
  "DRAFT",
  "ACTIVE",
  "SUSPENDED",
  "RETIRED"
]);
const validLocationClosureTypes = new Set<string>(Object.values(LocationClosureType));
const validResourceStatuses = new Set<string>(Object.values(SchedulableResourceStatus));
const validResourceCapacityModes = new Set<string>(Object.values(ResourceCapacityMode));
const validResourceConflictPolicies = new Set<string>(Object.values(ResourceConflictPolicy));
const validResourceUnavailabilityTypes = new Set<string>(Object.values(ResourceUnavailabilityType));

type AppointmentAdminLocationRecord = {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  timezone: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string;
  region: string;
  postalCode: string | null;
  phoneNumber: string | null;
  countryCode: string;
  schedulingStatus: LocationSchedulingStatus;
  organization: {
    id: string;
    code: string;
    name: string;
  };
  operatingWindows: AppointmentAdminOperatingWindowRecord[];
};

type AppointmentAdminOperatingWindowRecord = {
  businessDay: BusinessDay;
  opensAtMinute: number;
  closesAtMinute: number;
  validFrom: Date;
  validTo: Date | null;
};

type AppointmentAdminLocationClosureRecord = {
  id: string;
  type: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  reason: string;
  createdByUserId: string | null;
  createdAt: Date;
};

type AppointmentAdminResourceTypeRecord = {
  id: string;
  code: string;
  name: string;
  kind: string;
  defaultCapacityMode: string;
  defaultCapacity: number;
  defaultConflictPolicy: string;
  isActive: boolean;
};

type AppointmentAdminResourceUnavailabilityRecord = {
  id: string;
  type: string;
  startsAt: Date;
  endsAt: Date;
  capacityReduction: number | null;
  reason: string;
  createdByUserId: string | null;
  createdAt: Date;
};

type AppointmentAdminResourceRecord = {
  id: string;
  code: string;
  name: string;
  status: string;
  capacityMode: string;
  capacity: number;
  conflictPolicy: string;
  userId: string | null;
  vehicleId: string | null;
  resourceType: {
    code: string;
    name: string;
    kind: string;
  };
  unavailability: AppointmentAdminResourceUnavailabilityRecord[];
};

export type AppointmentAdminSettingsRepository = {
  getLocation(): Promise<AppointmentAdminLocationRecord | null>;
  listLocationClosures(locationId: string): Promise<AppointmentAdminLocationClosureRecord[]>;
  listResourceTypes(organizationId: string): Promise<AppointmentAdminResourceTypeRecord[]>;
  listResources(locationId: string): Promise<AppointmentAdminResourceRecord[]>;
  createLocationClosure(input: NormalizedAppointmentLocationClosureInput): Promise<AppointmentAdminLocationClosureRecord>;
  updateLocationClosure(input: NormalizedAppointmentLocationClosureUpdateInput): Promise<AppointmentAdminLocationClosureRecord>;
  deleteLocationClosure(input: AppointmentLocationClosureDeleteInput): Promise<void>;
  updateResource(input: NormalizedAppointmentResourceUpdateInput): Promise<AppointmentAdminResourceRecord>;
  createResourceUnavailability(input: NormalizedAppointmentResourceUnavailabilityInput): Promise<AppointmentAdminResourceUnavailabilityRecord>;
  updateLocationAndHours(input: {
    location: AppointmentAdminLocationInput;
    operatingWindows: NormalizedAppointmentOperatingWindowInput[];
  }): Promise<AppointmentAdminLocationRecord>;
};

export type AppointmentAdminLocationInput = {
  name: string;
  timezone: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city: string;
  region: string;
  postalCode?: string | null;
  phoneNumber?: string | null;
  schedulingStatus: LocationSchedulingStatus;
};

export type AppointmentOperatingWindowInput = {
  businessDay: BusinessDay | string;
  isOpen: boolean;
  opensAt?: string | null;
  closesAt?: string | null;
};

export type AppointmentAdminSettingsInput = {
  location: AppointmentAdminLocationInput;
  operatingWindows: AppointmentOperatingWindowInput[];
};

export type AppointmentLocationClosureInput = {
  type: string;
  name: string;
  startsAt: string;
  endsAt: string;
  reason: string;
};

export type AppointmentLocationClosureDeleteInput = {
  locationId: string;
  closureId: string;
};

export type AppointmentResourceUpdateInput = {
  resourceId: string;
  status: string;
  capacityMode: string;
  capacity: number;
  conflictPolicy: string;
};

export type AppointmentResourceUnavailabilityInput = {
  resourceId: string;
  type: string;
  startsAt: string;
  endsAt: string;
  capacityReduction?: number | null;
  reason: string;
};

export type NormalizedAppointmentOperatingWindowInput = {
  businessDay: BusinessDay;
  isOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
  opensAtMinute: number | null;
  closesAtMinute: number | null;
};

export type NormalizedAppointmentLocationClosureInput = {
  locationId: string;
  type: LocationClosureType;
  name: string;
  startsAt: Date;
  endsAt: Date;
  reason: string;
  createdByUserId: string;
};

export type NormalizedAppointmentLocationClosureUpdateInput =
  Omit<NormalizedAppointmentLocationClosureInput, "createdByUserId"> & {
    closureId: string;
  };

export type NormalizedAppointmentResourceUpdateInput = {
  resourceId: string;
  locationId: string;
  status: SchedulableResourceStatus;
  capacityMode: ResourceCapacityMode;
  capacity: number;
  conflictPolicy: ResourceConflictPolicy;
};

export type NormalizedAppointmentResourceUnavailabilityInput = {
  resourceId: string;
  locationId: string;
  type: ResourceUnavailabilityType;
  startsAt: Date;
  endsAt: Date;
  capacityReduction: number | null;
  reason: string;
  createdByUserId: string;
};

export type AppointmentAdminSettings = {
  organization: {
    id: string;
    code: string;
    name: string;
  };
  location: AppointmentAdminLocationInput & {
    id: string;
    organizationId: string;
    code: string;
    countryCode: string;
    displayAddress: string;
    displayPhone: string;
    businessHoursLabel: string;
  };
  operatingWindows: NormalizedAppointmentOperatingWindowInput[];
  closures: Array<{
    id: string;
    type: string;
    name: string;
    startsAtIso: string;
    endsAtIso: string;
    reason: string;
    createdByUserId: string | null;
    createdAtIso: string;
  }>;
  resourceTypes: AppointmentAdminResourceTypeRecord[];
  resources: Array<Omit<AppointmentAdminResourceRecord, "unavailability"> & {
    unavailability: Array<{
      id: string;
      type: string;
      startsAtIso: string;
      endsAtIso: string;
      capacityReduction: number | null;
      reason: string;
      createdByUserId: string | null;
      createdAtIso: string;
    }>;
  }>;
  catalogs: {
    purposes: Array<{
      code: string;
      name: string;
      category: string;
      defaultDurationMinutes: number;
      isActive: boolean;
    }>;
    outcomeCodes: string[];
    followUpDispositionCodes: string[];
    reasonCodes: string[];
  };
  automationRules: Array<{
    code: string;
    purposeCode: string;
    purposeName: string;
    enabled: boolean;
    missingInputBehavior: string;
  }>;
  specialHoursCalendar: {
    horizonStartIso: string;
    horizonEndIso: string;
    days: Array<{
      dateIso: string;
      businessDay: BusinessDay;
      status: "OPEN" | "CLOSED" | "RESOURCE_IMPACT";
      label: string;
      opensAt: string | null;
      closesAt: string | null;
      closureIds: string[];
      closureNames: string[];
      resourceImpactCount: number;
      resourceImpactNames: string[];
      warnings: string[];
    }>;
    summary: {
      openDayCount: number;
      closedDayCount: number;
      resourceImpactDayCount: number;
      upcomingClosureCount: number;
      upcomingResourceImpactCount: number;
      nextClosureName: string | null;
      nextClosureStartsAtIso: string | null;
    };
  };
};

export type AppointmentBoardSettings = {
  organizationId: string;
  locationId: string;
  locationName: string;
  timezone: string;
  addressLine: string;
  phoneNumber: string;
  businessHoursLabel: string;
};

function assertCanManageAppointmentAdminSettings(
  user: AuthenticatedUser | null
): asserts user is AuthenticatedUser {
  if (!user) {
    throw new Error("Authentication required.");
  }

  if (!canManageSettings(user)) {
    throw new Error("Manager access required.");
  }
}

function normalizeText(value: unknown, label: string, maxLength: number) {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  if (normalized.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }

  return normalized;
}

function normalizeOptionalText(value: unknown, label: string, maxLength: number) {
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  }

  return normalized;
}

function normalizePositiveInteger(value: unknown, label: string, maxValue = 1000) {
  const normalized = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error(`${label} must be a positive whole number.`);
  }

  if (normalized > maxValue) {
    throw new Error(`${label} must be ${maxValue} or fewer.`);
  }

  return normalized;
}

function normalizeDate(value: unknown, label: string) {
  const date = typeof value === "string" || value instanceof Date ? new Date(value) : null;

  if (!date || Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date and time.`);
  }

  return date;
}

function assertValidTimezone(timezone: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error("Appointment location timezone must be a valid timezone.");
  }
}

function assertValidDateRange(startsAt: Date, endsAt: Date, label: string) {
  if (endsAt <= startsAt) {
    throw new Error(`${label} must end after it starts.`);
  }
}

function parseTimeToMinute(value: string, label: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);

  if (!match) {
    throw new Error(`${label} must use HH:mm format.`);
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function minuteToTime(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function formatTime(value: string | null) {
  if (!value) {
    return "";
  }

  const [hourText, minuteText] = value.split(":");
  const date = new Date(Date.UTC(2026, 0, 1, Number(hourText), Number(minuteText), 0, 0));

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC"
  }).format(date);
}

function formatPhoneNumber(value: string | null) {
  if (!value) {
    return "No phone configured";
  }

  const digits = value.replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

  if (national.length === 10) {
    return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
  }

  return value;
}

function formatAddress(location: Pick<AppointmentAdminLocationRecord, "addressLine1" | "addressLine2" | "city" | "region" | "postalCode">) {
  return [
    location.addressLine1,
    location.addressLine2,
    [location.city, location.region, location.postalCode].filter(Boolean).join(" ")
  ]
    .filter(Boolean)
    .join(", ");
}

function getBusinessHoursLabel(windows: NormalizedAppointmentOperatingWindowInput[]) {
  const openWindows = windows.filter((window) => window.isOpen && window.opensAt && window.closesAt);

  if (openWindows.length === 0) {
    return "No open appointment hours configured";
  }

  const firstOpen = openWindows[0].opensAt;
  const firstClose = openWindows[0].closesAt;
  const allSame = openWindows.every(
    (window) => window.opensAt === firstOpen && window.closesAt === firstClose
  );

  if (allSame) {
    return `${formatTime(firstOpen)} - ${formatTime(firstClose)}`;
  }

  return "Custom appointment hours";
}

function toWindowForm(
  windows: AppointmentAdminOperatingWindowRecord[]
): NormalizedAppointmentOperatingWindowInput[] {
  return orderedBusinessDays.map((businessDay) => {
    const window = windows.find((candidate) => candidate.businessDay === businessDay && !candidate.validTo);

    if (!window) {
      return {
        businessDay,
        isOpen: false,
        opensAt: null,
        closesAt: null,
        opensAtMinute: null,
        closesAtMinute: null
      };
    }

    return {
      businessDay,
      isOpen: true,
      opensAt: minuteToTime(window.opensAtMinute),
      closesAt: minuteToTime(window.closesAtMinute),
      opensAtMinute: window.opensAtMinute,
      closesAtMinute: window.closesAtMinute
    };
  });
}

export function normalizeAppointmentAdminSettingsInput(
  input: AppointmentAdminSettingsInput
): {
  location: AppointmentAdminLocationInput;
  operatingWindows: NormalizedAppointmentOperatingWindowInput[];
} {
  const timezone = normalizeText(input.location?.timezone, "Appointment location timezone", 80);
  const schedulingStatus = input.location?.schedulingStatus;

  assertValidTimezone(timezone);

  if (!validSchedulingStatuses.has(schedulingStatus)) {
    throw new Error("Appointment location scheduling status is invalid.");
  }

  const location = {
    name: normalizeText(input.location?.name, "Appointment location name", 120),
    timezone,
    addressLine1: normalizeOptionalText(input.location?.addressLine1, "Address line 1", 160),
    addressLine2: normalizeOptionalText(input.location?.addressLine2, "Address line 2", 160),
    city: normalizeText(input.location?.city, "City", 80),
    region: normalizeText(input.location?.region, "State/region", 20),
    postalCode: normalizeOptionalText(input.location?.postalCode, "Postal code", 20),
    phoneNumber: normalizeOptionalText(input.location?.phoneNumber, "Phone number", 40),
    schedulingStatus
  };
  const windowsByDay = new Map(
    (input.operatingWindows ?? []).map((window) => [String(window.businessDay), window])
  );
  const operatingWindows = orderedBusinessDays.map((businessDay) => {
    const window = windowsByDay.get(businessDay);

    if (!window?.isOpen) {
      return {
        businessDay,
        isOpen: false,
        opensAt: null,
        closesAt: null,
        opensAtMinute: null,
        closesAtMinute: null
      };
    }

    const opensAt = normalizeText(window.opensAt, `${businessDay} opening time`, 5);
    const closesAt = normalizeText(window.closesAt, `${businessDay} closing time`, 5);
    const opensAtMinute = parseTimeToMinute(opensAt, `${businessDay} opening time`);
    const closesAtMinute = parseTimeToMinute(closesAt, `${businessDay} closing time`);

    if (closesAtMinute <= opensAtMinute) {
      throw new Error(`${businessDay} closing time must be after opening time.`);
    }

    return {
      businessDay,
      isOpen: true,
      opensAt,
      closesAt,
      opensAtMinute,
      closesAtMinute
    };
  });

  if (!operatingWindows.some((window) => window.isOpen)) {
    throw new Error("At least one appointment operating day must be open.");
  }

  return {
    location,
    operatingWindows
  };
}

export function normalizeAppointmentLocationClosureInput(input: {
  locationId: string;
  userId: string;
  closure: AppointmentLocationClosureInput;
}): NormalizedAppointmentLocationClosureInput {
  const normalized = normalizeAppointmentLocationClosureFields({
    locationId: input.locationId,
    closure: input.closure
  });

  return {
    ...normalized,
    createdByUserId: normalizeText(input.userId, "Closure creator", 120)
  };
}

function normalizeAppointmentLocationClosureFields(input: {
  locationId: string;
  closure: AppointmentLocationClosureInput;
}) {
  const type = normalizeText(input.closure?.type, "Closure type", 40);

  if (!validLocationClosureTypes.has(type)) {
    throw new Error("Location closure type is invalid.");
  }

  const startsAt = normalizeDate(input.closure?.startsAt, "Closure start");
  const endsAt = normalizeDate(input.closure?.endsAt, "Closure end");
  assertValidDateRange(startsAt, endsAt, "Location closure");

  return {
    locationId: normalizeText(input.locationId, "Closure location", 120),
    type: type as LocationClosureType,
    name: normalizeText(input.closure?.name, "Closure name", 120),
    startsAt,
    endsAt,
    reason: normalizeText(input.closure?.reason, "Closure reason", 1000)
  };
}

export function normalizeAppointmentLocationClosureUpdateInput(input: {
  locationId: string;
  closureId: string;
  closure: AppointmentLocationClosureInput;
}): NormalizedAppointmentLocationClosureUpdateInput {
  return {
    ...normalizeAppointmentLocationClosureFields({
      locationId: input.locationId,
      closure: input.closure
    }),
    closureId: normalizeText(input.closureId, "Closure", 120)
  };
}

export function normalizeAppointmentResourceUpdateInput(input: {
  locationId: string;
  resourceId: string;
  update: AppointmentResourceUpdateInput;
}): NormalizedAppointmentResourceUpdateInput {
  const status = normalizeText(input.update?.status, "Resource status", 40);
  const capacityMode = normalizeText(input.update?.capacityMode, "Resource capacity mode", 40);
  const conflictPolicy = normalizeText(input.update?.conflictPolicy, "Resource conflict policy", 40);
  const capacity = normalizePositiveInteger(input.update?.capacity, "Resource capacity", 1000);

  if (!validResourceStatuses.has(status)) {
    throw new Error("Resource status is invalid.");
  }

  if (!validResourceCapacityModes.has(capacityMode)) {
    throw new Error("Resource capacity mode is invalid.");
  }

  if (!validResourceConflictPolicies.has(conflictPolicy)) {
    throw new Error("Resource conflict policy is invalid.");
  }

  if (capacityMode === "EXCLUSIVE" && capacity !== 1) {
    throw new Error("An exclusive resource must have capacity 1.");
  }

  return {
    resourceId: normalizeText(input.resourceId, "Resource", 120),
    locationId: normalizeText(input.locationId, "Resource location", 120),
    status: status as SchedulableResourceStatus,
    capacityMode: capacityMode as ResourceCapacityMode,
    capacity,
    conflictPolicy: conflictPolicy as ResourceConflictPolicy
  };
}

export function normalizeAppointmentResourceUnavailabilityInput(input: {
  locationId: string;
  resourceId: string;
  userId: string;
  unavailability: AppointmentResourceUnavailabilityInput;
}): NormalizedAppointmentResourceUnavailabilityInput {
  const type = normalizeText(input.unavailability?.type, "Resource unavailability type", 40);

  if (!validResourceUnavailabilityTypes.has(type)) {
    throw new Error("Resource unavailability type is invalid.");
  }

  const startsAt = normalizeDate(input.unavailability?.startsAt, "Resource unavailability start");
  const endsAt = normalizeDate(input.unavailability?.endsAt, "Resource unavailability end");
  assertValidDateRange(startsAt, endsAt, "Resource unavailability");

  const rawCapacityReduction = input.unavailability?.capacityReduction;
  const capacityReduction =
    rawCapacityReduction === null || rawCapacityReduction === undefined
      ? null
      : normalizePositiveInteger(rawCapacityReduction, "Resource capacity reduction", 1000);

  if (type === "CAPACITY_REDUCTION" && !capacityReduction) {
    throw new Error("A capacity-reduction window requires a positive reduction.");
  }

  if (type !== "CAPACITY_REDUCTION" && capacityReduction) {
    throw new Error("Only a capacity-reduction window may specify reduced capacity.");
  }

  return {
    resourceId: normalizeText(input.resourceId, "Resource", 120),
    locationId: normalizeText(input.locationId, "Resource location", 120),
    type: type as ResourceUnavailabilityType,
    startsAt,
    endsAt,
    capacityReduction,
    reason: normalizeText(input.unavailability?.reason, "Resource unavailability reason", 1000),
    createdByUserId: normalizeText(input.userId, "Resource unavailability creator", 120)
  };
}

function getCatalogs() {
  const outcomeCodes = new Set<string>();
  const followUpDispositionCodes = new Set<string>();
  const reasonCodes = new Set<string>([
    "UNSCHEDULED_DRAFT_SCHEDULED",
    "APPOINTMENT_OWNER_TRANSFERRED",
    "OUTCOME_RECORDED",
    "CUSTOMER_NO_SHOW",
    "CUSTOMER_REQUEST",
    "RESOURCE_WARNING_OVERRIDDEN",
    "STAFF_WARNING_OVERRIDDEN"
  ]);

  for (const definition of INITIAL_APPOINTMENT_TEMPLATE_DEFINITIONS) {
    definition.outcomeCodes.forEach((code) => outcomeCodes.add(code));
    definition.followUpDispositionCodes.forEach((code) => followUpDispositionCodes.add(code));
    definition.hardConflictCodes.forEach((code) => reasonCodes.add(code));
    definition.warningCodes.forEach((code) => reasonCodes.add(code));
  }

  return {
    purposes: INITIAL_APPOINTMENT_TEMPLATE_DEFINITIONS.map((definition) => ({
      code: definition.code,
      name: definition.name,
      category: definition.category,
      defaultDurationMinutes: definition.defaultDurationMinutes,
      isActive: definition.isActive
    })),
    outcomeCodes: [...outcomeCodes].sort(),
    followUpDispositionCodes: [...followUpDispositionCodes].sort(),
    reasonCodes: [...reasonCodes].sort()
  };
}

function getAutomationRules() {
  return INITIAL_APPOINTMENT_TEMPLATE_DEFINITIONS.flatMap((definition) =>
    definition.automationTriggers.map((trigger) => ({
      code: trigger,
      purposeCode: definition.code,
      purposeName: definition.name,
      enabled: definition.isActive,
      missingInputBehavior: definition.missingInputBehavior
    }))
  );
}

function serializeClosure(closure: AppointmentAdminLocationClosureRecord) {
  return {
    id: closure.id,
    type: closure.type,
    name: closure.name,
    startsAtIso: closure.startsAt.toISOString(),
    endsAtIso: closure.endsAt.toISOString(),
    reason: closure.reason,
    createdByUserId: closure.createdByUserId,
    createdAtIso: closure.createdAt.toISOString()
  };
}

function serializeResource(resource: AppointmentAdminResourceRecord) {
  return {
    ...resource,
    unavailability: resource.unavailability.map((entry) => ({
      id: entry.id,
      type: entry.type,
      startsAtIso: entry.startsAt.toISOString(),
      endsAtIso: entry.endsAt.toISOString(),
      capacityReduction: entry.capacityReduction,
      reason: entry.reason,
      createdByUserId: entry.createdByUserId,
      createdAtIso: entry.createdAt.toISOString()
    }))
  };
}

function localDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);

  return next;
}

function businessDayFromDate(date: Date): BusinessDay {
  const day = date.getUTCDay();

  return (
    [
      BusinessDay.SUNDAY,
      BusinessDay.MONDAY,
      BusinessDay.TUESDAY,
      BusinessDay.WEDNESDAY,
      BusinessDay.THURSDAY,
      BusinessDay.FRIDAY,
      BusinessDay.SATURDAY
    ] as const
  )[day];
}

function minutesToTime(value: number | null) {
  if (value === null) {
    return null;
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function overlapsDay(input: { startsAt: Date; endsAt: Date }, dayStart: Date) {
  const dayEnd = addUtcDays(dayStart, 1);

  return input.startsAt < dayEnd && input.endsAt > dayStart;
}

function buildSpecialHoursCalendar(input: {
  windows: AppointmentAdminOperatingWindowRecord[];
  closures: AppointmentAdminLocationClosureRecord[];
  resources: AppointmentAdminResourceRecord[];
}): AppointmentAdminSettings["specialHoursCalendar"] {
  const earliestClosure = input.closures
    .map((closure) => closure.startsAt)
    .sort((left, right) => left.getTime() - right.getTime())[0];
  const horizonStart = startOfUtcDay(earliestClosure ?? new Date());
  const horizonEnd = addUtcDays(horizonStart, 13);
  const windowsByDay = new Map(
    input.windows.map((window) => [window.businessDay, window])
  );
  const resourceImpacts = input.resources.flatMap((resource) =>
    resource.unavailability.map((entry) => ({
      ...entry,
      resourceName: resource.name
    }))
  );
  const days = Array.from({ length: 14 }, (_, index) => {
    const day = addUtcDays(horizonStart, index);
    const businessDay = businessDayFromDate(day);
    const window = windowsByDay.get(businessDay);
    const closures = input.closures.filter((closure) => overlapsDay(closure, day));
    const impacts = resourceImpacts.filter((impact) => overlapsDay(impact, day));
    const isOpen = Boolean(window);
    const status: AppointmentAdminSettings["specialHoursCalendar"]["days"][number]["status"] =
      closures.length > 0
        ? "CLOSED"
        : impacts.length > 0
          ? "RESOURCE_IMPACT"
          : isOpen
            ? "OPEN"
            : "CLOSED";
    const warnings = [
      closures.length > 0 ? "Location closure blocks appointment scheduling." : null,
      impacts.length > 0 ? "Resource availability is reduced on this day." : null,
      !isOpen && closures.length === 0 ? "No operating window configured for this day." : null
    ].filter((warning): warning is string => Boolean(warning));

    return {
      dateIso: localDateKey(day),
      businessDay,
      status,
      label:
        status === "CLOSED"
          ? closures[0]?.name ?? "Closed"
          : status === "RESOURCE_IMPACT"
            ? "Resource impact"
            : "Open",
      opensAt: minutesToTime(window?.opensAtMinute ?? null),
      closesAt: minutesToTime(window?.closesAtMinute ?? null),
      closureIds: closures.map((closure) => closure.id),
      closureNames: closures.map((closure) => closure.name),
      resourceImpactCount: impacts.length,
      resourceImpactNames: [...new Set(impacts.map((impact) => impact.resourceName))],
      warnings
    };
  });
  const upcomingClosures = input.closures
    .filter((closure) => closure.endsAt >= horizonStart)
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());

  return {
    horizonStartIso: localDateKey(horizonStart),
    horizonEndIso: localDateKey(horizonEnd),
    days,
    summary: {
      openDayCount: days.filter((day) => day.status === "OPEN").length,
      closedDayCount: days.filter((day) => day.status === "CLOSED").length,
      resourceImpactDayCount: days.filter((day) => day.status === "RESOURCE_IMPACT").length,
      upcomingClosureCount: upcomingClosures.length,
      upcomingResourceImpactCount: resourceImpacts.length,
      nextClosureName: upcomingClosures[0]?.name ?? null,
      nextClosureStartsAtIso: upcomingClosures[0]?.startsAt.toISOString() ?? null
    }
  };
}

function toSettings(input: {
  location: AppointmentAdminLocationRecord;
  closures: AppointmentAdminLocationClosureRecord[];
  resourceTypes: AppointmentAdminResourceTypeRecord[];
  resources: AppointmentAdminResourceRecord[];
}): AppointmentAdminSettings {
  const operatingWindows = toWindowForm(input.location.operatingWindows);

  return {
    organization: input.location.organization,
    location: {
      id: input.location.id,
      organizationId: input.location.organizationId,
      code: input.location.code,
      name: input.location.name,
      timezone: input.location.timezone,
      addressLine1: input.location.addressLine1,
      addressLine2: input.location.addressLine2,
      city: input.location.city,
      region: input.location.region,
      postalCode: input.location.postalCode,
      phoneNumber: input.location.phoneNumber,
      countryCode: input.location.countryCode,
      schedulingStatus: input.location.schedulingStatus,
      displayAddress: formatAddress(input.location),
      displayPhone: formatPhoneNumber(input.location.phoneNumber),
      businessHoursLabel: getBusinessHoursLabel(operatingWindows)
    },
    operatingWindows,
    closures: input.closures.map(serializeClosure),
    resourceTypes: input.resourceTypes,
    resources: input.resources.map(serializeResource),
    catalogs: getCatalogs(),
    automationRules: getAutomationRules(),
    specialHoursCalendar: buildSpecialHoursCalendar({
      windows: input.location.operatingWindows,
      closures: input.closures,
      resources: input.resources
    })
  };
}

function toBoardSettings(settings: AppointmentAdminSettings): AppointmentBoardSettings {
  return {
    organizationId: settings.organization.id,
    locationId: settings.location.id,
    locationName: settings.location.name,
    timezone: settings.location.timezone,
    addressLine: settings.location.displayAddress,
    phoneNumber: settings.location.displayPhone,
    businessHoursLabel: settings.location.businessHoursLabel
  };
}

export function createAppointmentAdminSettingsRepository(): AppointmentAdminSettingsRepository {
  const initialLocation = getInitialMinneapolisLocation();

  return {
    async getLocation() {
      return prisma.location.findUnique({
        where: { id: initialLocation.id },
        select: {
          id: true,
          organizationId: true,
          code: true,
          name: true,
          timezone: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          region: true,
          postalCode: true,
          phoneNumber: true,
          countryCode: true,
          schedulingStatus: true,
          organization: {
            select: {
              id: true,
              code: true,
              name: true
            }
          },
          operatingWindows: {
            select: {
              businessDay: true,
              opensAtMinute: true,
              closesAtMinute: true,
              validFrom: true,
              validTo: true
            },
            orderBy: [{ businessDay: "asc" }, { opensAtMinute: "asc" }]
          }
        }
      });
    },
    async listLocationClosures(locationId) {
      return prisma.locationClosure.findMany({
        where: {
          locationId,
          endsAt: {
            gte: new Date("2026-07-01T00:00:00.000Z")
          }
        },
        select: {
          id: true,
          type: true,
          name: true,
          startsAt: true,
          endsAt: true,
          reason: true,
          createdByUserId: true,
          createdAt: true
        },
        orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
        take: 25
      });
    },
    async listResourceTypes(organizationId) {
      return prisma.schedulableResourceType.findMany({
        where: { organizationId },
        select: {
          id: true,
          code: true,
          name: true,
          kind: true,
          defaultCapacityMode: true,
          defaultCapacity: true,
          defaultConflictPolicy: true,
          isActive: true
        },
        orderBy: [{ kind: "asc" }, { code: "asc" }]
      });
    },
    async listResources(locationId) {
      return prisma.schedulableResource.findMany({
        where: { locationId },
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          capacityMode: true,
          capacity: true,
          conflictPolicy: true,
          userId: true,
          vehicleId: true,
          resourceType: {
            select: {
              code: true,
              name: true,
              kind: true
            }
          },
          unavailability: {
            where: {
              endsAt: {
                gte: new Date("2026-07-01T00:00:00.000Z")
              }
            },
            select: {
              id: true,
              type: true,
              startsAt: true,
              endsAt: true,
              capacityReduction: true,
              reason: true,
              createdByUserId: true,
              createdAt: true
            },
            orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
            take: 8
          }
        },
        orderBy: [{ resourceType: { kind: "asc" } }, { name: "asc" }]
      });
    },
    async createLocationClosure(input) {
      return prisma.locationClosure.create({
        data: input,
        select: {
          id: true,
          type: true,
          name: true,
          startsAt: true,
          endsAt: true,
          reason: true,
          createdByUserId: true,
          createdAt: true
        }
      });
    },
    async updateLocationClosure(input) {
      return prisma.locationClosure.update({
        where: {
          id: input.closureId,
          locationId: input.locationId
        },
        data: {
          type: input.type,
          name: input.name,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          reason: input.reason
        },
        select: {
          id: true,
          type: true,
          name: true,
          startsAt: true,
          endsAt: true,
          reason: true,
          createdByUserId: true,
          createdAt: true
        }
      });
    },
    async deleteLocationClosure(input) {
      await prisma.locationClosure.delete({
        where: {
          id: input.closureId,
          locationId: input.locationId
        }
      });
    },
    async updateResource(input) {
      return prisma.schedulableResource.update({
        where: {
          id: input.resourceId,
          locationId: input.locationId
        },
        data: {
          status: input.status,
          capacityMode: input.capacityMode,
          capacity: input.capacity,
          conflictPolicy: input.conflictPolicy
        },
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
          capacityMode: true,
          capacity: true,
          conflictPolicy: true,
          userId: true,
          vehicleId: true,
          resourceType: {
            select: {
              code: true,
              name: true,
              kind: true
            }
          },
          unavailability: {
            where: {
              endsAt: {
                gte: new Date("2026-07-01T00:00:00.000Z")
              }
            },
            select: {
              id: true,
              type: true,
              startsAt: true,
              endsAt: true,
              capacityReduction: true,
              reason: true,
              createdByUserId: true,
              createdAt: true
            },
            orderBy: [{ startsAt: "asc" }, { createdAt: "asc" }],
            take: 8
          }
        }
      });
    },
    async createResourceUnavailability(input) {
      const resource = await prisma.schedulableResource.findFirst({
        where: {
          id: input.resourceId,
          locationId: input.locationId
        },
        select: { id: true }
      });

      if (!resource) {
        throw new Error("Resource is not configured for this appointment location.");
      }

      return prisma.resourceUnavailability.create({
        data: {
          resourceId: input.resourceId,
          type: input.type,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          capacityReduction: input.capacityReduction,
          reason: input.reason,
          createdByUserId: input.createdByUserId
        },
        select: {
          id: true,
          type: true,
          startsAt: true,
          endsAt: true,
          capacityReduction: true,
          reason: true,
          createdByUserId: true,
          createdAt: true
        }
      });
    },
    async updateLocationAndHours(input) {
      const validFrom = new Date("2026-07-05T00:00:00.000Z");
      const openWindows = input.operatingWindows.filter(
        (window) => window.isOpen && window.opensAtMinute !== null && window.closesAtMinute !== null
      );

      return prisma.$transaction(async (transaction) => {
        const updatedLocation = await transaction.location.update({
          where: { id: initialLocation.id },
          data: input.location,
          select: {
            id: true,
            organizationId: true,
            code: true,
            name: true,
            timezone: true,
            addressLine1: true,
            addressLine2: true,
            city: true,
            region: true,
            postalCode: true,
            phoneNumber: true,
            countryCode: true,
            schedulingStatus: true,
            organization: {
              select: {
                id: true,
                code: true,
                name: true
              }
            },
            operatingWindows: {
              select: {
                businessDay: true,
                opensAtMinute: true,
                closesAtMinute: true,
                validFrom: true,
                validTo: true
              }
            }
          }
        });

        await transaction.locationOperatingWindow.deleteMany({
          where: { locationId: updatedLocation.id }
        });
        await transaction.locationOperatingWindow.createMany({
          data: openWindows.map((window) => ({
            locationId: updatedLocation.id,
            businessDay: window.businessDay,
            opensAtMinute: window.opensAtMinute!,
            closesAtMinute: window.closesAtMinute!,
            validFrom,
            validTo: null
          }))
        });

        const staffResources = await transaction.schedulableResource.findMany({
          where: {
            locationId: updatedLocation.id,
            resourceType: {
              kind: "STAFF"
            }
          },
          select: { id: true }
        });
        const staffResourceIds = staffResources.map((resource) => resource.id);

        if (staffResourceIds.length > 0) {
          await transaction.resourceOperatingWindow.deleteMany({
            where: {
              resourceId: {
                in: staffResourceIds
              }
            }
          });
          await transaction.resourceOperatingWindow.createMany({
            data: staffResourceIds.flatMap((resourceId) =>
              openWindows.map((window) => ({
                resourceId,
                businessDay: window.businessDay,
                opensAtMinute: window.opensAtMinute!,
                closesAtMinute: window.closesAtMinute!,
                capacityOverride: null,
                validFrom,
                validTo: null
              }))
            )
          });
        }

        const operatingWindows = await transaction.locationOperatingWindow.findMany({
          where: { locationId: updatedLocation.id },
          select: {
            businessDay: true,
            opensAtMinute: true,
            closesAtMinute: true,
            validFrom: true,
            validTo: true
          },
          orderBy: [{ businessDay: "asc" }, { opensAtMinute: "asc" }]
        });

        return {
          ...updatedLocation,
          operatingWindows
        };
      });
    }
  };
}

export async function getAppointmentAdminSettings(
  repository: AppointmentAdminSettingsRepository = createAppointmentAdminSettingsRepository()
) {
  const location = await repository.getLocation();

  if (!location) {
    throw new Error("Appointment location settings are not configured.");
  }

  const [closures, resourceTypes, resources] = await Promise.all([
    repository.listLocationClosures(location.id),
    repository.listResourceTypes(location.organizationId),
    repository.listResources(location.id)
  ]);

  return toSettings({ location, closures, resourceTypes, resources });
}

export async function getAppointmentBoardSettings(
  repository: AppointmentAdminSettingsRepository = createAppointmentAdminSettingsRepository()
) {
  return toBoardSettings(await getAppointmentAdminSettings(repository));
}

export async function getAppointmentAdminSettingsForManager(
  user: AuthenticatedUser | null,
  repository: AppointmentAdminSettingsRepository = createAppointmentAdminSettingsRepository()
) {
  assertCanManageAppointmentAdminSettings(user);

  return getAppointmentAdminSettings(repository);
}

export async function updateAppointmentAdminSettings(
  user: AuthenticatedUser | null,
  input: AppointmentAdminSettingsInput,
  repository: AppointmentAdminSettingsRepository = createAppointmentAdminSettingsRepository()
) {
  assertCanManageAppointmentAdminSettings(user);

  const normalizedInput = normalizeAppointmentAdminSettingsInput(input);
  await repository.updateLocationAndHours(normalizedInput);

  return getAppointmentAdminSettings(repository);
}

export async function createAppointmentLocationClosureForManager(
  user: AuthenticatedUser | null,
  input: AppointmentLocationClosureInput,
  repository: AppointmentAdminSettingsRepository = createAppointmentAdminSettingsRepository()
) {
  assertCanManageAppointmentAdminSettings(user);

  const location = await repository.getLocation();

  if (!location) {
    throw new Error("Appointment location settings are not configured.");
  }

  await repository.createLocationClosure(
    normalizeAppointmentLocationClosureInput({
      locationId: location.id,
      userId: user.id,
      closure: input
    })
  );

  return getAppointmentAdminSettings(repository);
}

export async function updateAppointmentLocationClosureForManager(
  user: AuthenticatedUser | null,
  closureId: string,
  input: AppointmentLocationClosureInput,
  repository: AppointmentAdminSettingsRepository = createAppointmentAdminSettingsRepository()
) {
  assertCanManageAppointmentAdminSettings(user);

  const location = await repository.getLocation();

  if (!location) {
    throw new Error("Appointment location settings are not configured.");
  }

  await repository.updateLocationClosure(
    normalizeAppointmentLocationClosureUpdateInput({
      locationId: location.id,
      closureId,
      closure: input
    })
  );

  return getAppointmentAdminSettings(repository);
}

export async function deleteAppointmentLocationClosureForManager(
  user: AuthenticatedUser | null,
  closureId: string,
  repository: AppointmentAdminSettingsRepository = createAppointmentAdminSettingsRepository()
) {
  assertCanManageAppointmentAdminSettings(user);

  const location = await repository.getLocation();

  if (!location) {
    throw new Error("Appointment location settings are not configured.");
  }

  await repository.deleteLocationClosure({
    locationId: location.id,
    closureId: normalizeText(closureId, "Closure", 120)
  });

  return getAppointmentAdminSettings(repository);
}

export async function updateAppointmentResourceForManager(
  user: AuthenticatedUser | null,
  input: AppointmentResourceUpdateInput,
  repository: AppointmentAdminSettingsRepository = createAppointmentAdminSettingsRepository()
) {
  assertCanManageAppointmentAdminSettings(user);

  const location = await repository.getLocation();

  if (!location) {
    throw new Error("Appointment location settings are not configured.");
  }

  await repository.updateResource(
    normalizeAppointmentResourceUpdateInput({
      locationId: location.id,
      resourceId: input.resourceId,
      update: input
    })
  );

  return getAppointmentAdminSettings(repository);
}

export async function createAppointmentResourceUnavailabilityForManager(
  user: AuthenticatedUser | null,
  input: AppointmentResourceUnavailabilityInput,
  repository: AppointmentAdminSettingsRepository = createAppointmentAdminSettingsRepository()
) {
  assertCanManageAppointmentAdminSettings(user);

  const location = await repository.getLocation();

  if (!location) {
    throw new Error("Appointment location settings are not configured.");
  }

  await repository.createResourceUnavailability(
    normalizeAppointmentResourceUnavailabilityInput({
      locationId: location.id,
      resourceId: input.resourceId,
      userId: user.id,
      unavailability: input
    })
  );

  return getAppointmentAdminSettings(repository);
}
