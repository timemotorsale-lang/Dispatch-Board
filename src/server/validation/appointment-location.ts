import {
  BusinessDay,
  LocationClosureType,
  LocationSchedulingStatus
} from "@prisma/client";

const businessDayValues = new Set(Object.values(BusinessDay));
const closureTypeValues = new Set(Object.values(LocationClosureType));
const schedulingStatusValues = new Set(Object.values(LocationSchedulingStatus));
const locationCodePattern = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const countryCodePattern = /^[A-Z]{2}$/;

function normalizeRequiredText(value: string, label: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function normalizeOptionalPhoneNumber(value: string | null | undefined) {
  const normalized = normalizeOptionalText(value);

  if (!normalized) {
    return null;
  }

  const digits = normalized.replace(/\D/g, "");
  const e164 =
    digits.length === 10
      ? `+1${digits}`
      : digits.length === 11 && digits.startsWith("1")
        ? `+${digits}`
        : normalized.startsWith("+")
          ? `+${digits}`
          : "";

  if (!/^\+[1-9]\d{7,14}$/.test(e164)) {
    throw new Error("Location telephone must be a valid international telephone number.");
  }

  return e164;
}

function requireValidDate(value: Date, label: string) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }

  return new Date(value);
}

function requireValidTimezone(value: string) {
  const timezone = normalizeRequiredText(value, "Location timezone");

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
  } catch {
    throw new Error(`Location timezone must be valid. Received "${value}".`);
  }

  return timezone;
}

export type LocationConfigurationInput = {
  organizationId: string;
  code: string;
  name: string;
  timezone: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city: string;
  region: string;
  postalCode?: string | null;
  phoneNumber?: string | null;
  countryCode: string;
  schedulingStatus: string;
};

export function normalizeLocationConfiguration(input: LocationConfigurationInput) {
  const organizationId = normalizeRequiredText(input.organizationId, "Location organization");
  const code = normalizeRequiredText(input.code, "Location code").toUpperCase();

  if (!locationCodePattern.test(code)) {
    throw new Error("Location code must contain uppercase letters, numbers, and single hyphens only.");
  }

  const name = normalizeRequiredText(input.name, "Location name");
  const timezone = requireValidTimezone(input.timezone);
  const city = normalizeRequiredText(input.city, "Location city");
  const region = normalizeRequiredText(input.region, "Location region").toUpperCase();
  const countryCode = normalizeRequiredText(input.countryCode, "Location country code").toUpperCase();

  if (!countryCodePattern.test(countryCode)) {
    throw new Error("Location country code must be a two-letter ISO-style code.");
  }

  if (!schedulingStatusValues.has(input.schedulingStatus as LocationSchedulingStatus)) {
    throw new Error(`Location scheduling status is invalid: "${input.schedulingStatus}".`);
  }

  const addressLine1 = normalizeOptionalText(input.addressLine1);
  const addressLine2 = normalizeOptionalText(input.addressLine2);
  const postalCode = normalizeOptionalText(input.postalCode);
  const phoneNumber = normalizeOptionalPhoneNumber(input.phoneNumber);
  const schedulingStatus = input.schedulingStatus as LocationSchedulingStatus;

  if (schedulingStatus === LocationSchedulingStatus.ACTIVE && (!addressLine1 || !postalCode)) {
    throw new Error("An active scheduling location requires a street address and postal code.");
  }

  return {
    organizationId,
    code,
    name,
    timezone,
    addressLine1,
    addressLine2,
    city,
    region,
    postalCode,
    phoneNumber,
    countryCode,
    schedulingStatus
  };
}

export type LocationOperatingWindowInput = {
  locationId: string;
  businessDay: string;
  opensAtMinute: number;
  closesAtMinute: number;
  validFrom: Date;
  validTo?: Date | null;
};

export function normalizeLocationOperatingWindow(input: LocationOperatingWindowInput) {
  const locationId = normalizeRequiredText(input.locationId, "Operating-window location");

  if (!businessDayValues.has(input.businessDay as BusinessDay)) {
    throw new Error(`Operating window contains an invalid business day: "${input.businessDay}".`);
  }

  if (!Number.isInteger(input.opensAtMinute) || !Number.isInteger(input.closesAtMinute)) {
    throw new Error("Operating-window times must be whole minutes after midnight.");
  }

  if (
    input.opensAtMinute < 0 ||
    input.opensAtMinute >= input.closesAtMinute ||
    input.closesAtMinute > 1440
  ) {
    throw new Error("Operating window must open before it closes within one local calendar day.");
  }

  const validFrom = requireValidDate(input.validFrom, "Operating-window valid-from date");
  const validTo = input.validTo
    ? requireValidDate(input.validTo, "Operating-window valid-to date")
    : null;

  if (validTo && validTo < validFrom) {
    throw new Error("Operating-window valid-to date cannot be before its valid-from date.");
  }

  return {
    locationId,
    businessDay: input.businessDay as BusinessDay,
    opensAtMinute: input.opensAtMinute,
    closesAtMinute: input.closesAtMinute,
    validFrom,
    validTo
  };
}

export type LocationClosureInput = {
  locationId: string;
  type: string;
  name: string;
  startsAt: Date;
  endsAt: Date;
  reason: string;
  createdByUserId?: string | null;
};

export function normalizeLocationClosure(input: LocationClosureInput) {
  const locationId = normalizeRequiredText(input.locationId, "Closure location");

  if (!closureTypeValues.has(input.type as LocationClosureType)) {
    throw new Error(`Location closure type is invalid: "${input.type}".`);
  }

  const name = normalizeRequiredText(input.name, "Closure name");
  const reason = normalizeRequiredText(input.reason, "Closure reason");
  const startsAt = requireValidDate(input.startsAt, "Closure start");
  const endsAt = requireValidDate(input.endsAt, "Closure end");

  if (endsAt <= startsAt) {
    throw new Error("Location closure must end after it starts.");
  }

  return {
    locationId,
    type: input.type as LocationClosureType,
    name,
    startsAt,
    endsAt,
    reason,
    createdByUserId: normalizeOptionalText(input.createdByUserId)
  };
}
