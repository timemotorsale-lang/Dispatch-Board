import { BusinessDay, type LocationSchedulingStatus } from "@prisma/client";

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
};

export type AppointmentAdminSettingsRepository = {
  getLocation(): Promise<AppointmentAdminLocationRecord | null>;
  listResourceTypes(organizationId: string): Promise<AppointmentAdminResourceTypeRecord[]>;
  listResources(locationId: string): Promise<AppointmentAdminResourceRecord[]>;
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

export type NormalizedAppointmentOperatingWindowInput = {
  businessDay: BusinessDay;
  isOpen: boolean;
  opensAt: string | null;
  closesAt: string | null;
  opensAtMinute: number | null;
  closesAtMinute: number | null;
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
  resourceTypes: AppointmentAdminResourceTypeRecord[];
  resources: AppointmentAdminResourceRecord[];
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

function assertCanManageAppointmentAdminSettings(user: AuthenticatedUser | null) {
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

function assertValidTimezone(timezone: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error("Appointment location timezone must be a valid timezone.");
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

function toSettings(input: {
  location: AppointmentAdminLocationRecord;
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
    resourceTypes: input.resourceTypes,
    resources: input.resources,
    catalogs: getCatalogs(),
    automationRules: getAutomationRules()
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
          }
        },
        orderBy: [{ resourceType: { kind: "asc" } }, { name: "asc" }]
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

  const [resourceTypes, resources] = await Promise.all([
    repository.listResourceTypes(location.organizationId),
    repository.listResources(location.id)
  ]);

  return toSettings({ location, resourceTypes, resources });
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
