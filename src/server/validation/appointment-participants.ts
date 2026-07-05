import {
  APPOINTMENT_PARTICIPANT_TYPES,
  CUSTOMER_STATUSES,
  VEHICLE_STATUSES,
  type AppointmentParticipantType,
  type CustomerStatus,
  type VehicleStatus
} from "@/server/appointments/appointment-resource-domain";

const customerStatuses = new Set<string>(CUSTOMER_STATUSES);
const vehicleStatuses = new Set<string>(VEHICLE_STATUSES);
const participantTypes = new Set<string>(APPOINTMENT_PARTICIPANT_TYPES);
const stableCodePattern = /^[A-Z0-9]+(?:[-_][A-Z0-9]+)*$/;
const roleCodePattern = /^[A-Z0-9]+(?:_[A-Z0-9]+)*$/;
const vinPattern = /^[A-HJ-NPR-Z0-9]{17}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function roleCode(value: string) {
  const normalized = requiredText(value, "Participant role code", 100).toUpperCase();

  if (!roleCodePattern.test(normalized)) {
    throw new Error(
      "Participant role code must contain uppercase letters, numbers, and single underscores only."
    );
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

function jsonObject(value: unknown, label: string, required = false) {
  if (value === null || value === undefined) {
    if (required) {
      throw new Error(`${label} is required.`);
    }

    return null;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  return value;
}

function optionalPhoneNumber(value: string | null | undefined) {
  const normalized = optionalText(value, "Customer telephone", 40);

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
    throw new Error("Customer telephone must be a valid international telephone number.");
  }

  return e164;
}

function optionalEmail(value: string | null | undefined) {
  const normalized = optionalText(value, "Customer email", 254)?.toLowerCase() ?? null;

  if (normalized && !emailPattern.test(normalized)) {
    throw new Error("Customer email must be valid.");
  }

  return normalized;
}

export type CustomerReferenceInput = {
  customerId?: string | null;
  organizationId: string;
  customerNumber: string;
  displayName: string;
  phoneNumber?: string | null;
  email?: string | null;
  status: string;
  externalReference?: string | null;
  duplicateKey?: string | null;
  mergedIntoCustomerId?: string | null;
  retentionUntil?: Date | null;
};

export function normalizeCustomerReference(input: CustomerReferenceInput) {
  if (!customerStatuses.has(input.status)) {
    throw new Error(`Customer status is invalid: "${input.status}".`);
  }

  const customerId = optionalText(input.customerId, "Customer ID", 100);
  const mergedIntoCustomerId = optionalText(
    input.mergedIntoCustomerId,
    "Merged-into customer ID",
    100
  );

  if (input.status === "MERGED" && !mergedIntoCustomerId) {
    throw new Error("A merged customer requires the surviving customer ID.");
  }

  if (input.status !== "MERGED" && mergedIntoCustomerId) {
    throw new Error("Only a merged customer may reference a surviving customer.");
  }

  if (customerId && customerId === mergedIntoCustomerId) {
    throw new Error("A customer cannot be merged into itself.");
  }

  return {
    organizationId: requiredText(input.organizationId, "Customer organization", 100),
    customerNumber: stableCode(input.customerNumber, "Customer number"),
    displayName: requiredText(input.displayName, "Customer display name", 200),
    phoneNumber: optionalPhoneNumber(input.phoneNumber),
    email: optionalEmail(input.email),
    status: input.status as CustomerStatus,
    externalReference: optionalText(
      input.externalReference,
      "Customer external reference",
      200
    ),
    duplicateKey: optionalText(input.duplicateKey, "Customer duplicate key", 128),
    mergedIntoCustomerId,
    retentionUntil: optionalDate(input.retentionUntil, "Customer retention date")
  };
}

export type VehicleReferenceInput = {
  organizationId: string;
  vehicleNumber: string;
  vin?: string | null;
  stockNumber?: string | null;
  year?: number | null;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  licensePlate?: string | null;
  status: string;
  externalReference?: string | null;
  duplicateKey?: string | null;
  retentionUntil?: Date | null;
};

export function normalizeVehicleReference(input: VehicleReferenceInput) {
  if (!vehicleStatuses.has(input.status)) {
    throw new Error(`Vehicle status is invalid: "${input.status}".`);
  }

  const vin = optionalText(input.vin, "Vehicle VIN", 17)?.toUpperCase() ?? null;

  if (vin && !vinPattern.test(vin)) {
    throw new Error("Vehicle VIN must be a valid 17-character VIN.");
  }

  const maximumYear = new Date().getUTCFullYear() + 2;

  if (
    input.year !== null &&
    input.year !== undefined &&
    (!Number.isInteger(input.year) || input.year < 1886 || input.year > maximumYear)
  ) {
    throw new Error(`Vehicle year must be between 1886 and ${maximumYear}.`);
  }

  return {
    organizationId: requiredText(input.organizationId, "Vehicle organization", 100),
    vehicleNumber: stableCode(input.vehicleNumber, "Vehicle number"),
    vin,
    stockNumber: optionalText(input.stockNumber, "Vehicle stock number", 100),
    year: input.year ?? null,
    make: optionalText(input.make, "Vehicle make", 100),
    model: optionalText(input.model, "Vehicle model", 100),
    color: optionalText(input.color, "Vehicle color", 100),
    licensePlate: optionalText(input.licensePlate, "Vehicle license plate", 40)?.toUpperCase() ?? null,
    status: input.status as VehicleStatus,
    externalReference: optionalText(
      input.externalReference,
      "Vehicle external reference",
      200
    ),
    duplicateKey: optionalText(input.duplicateKey, "Vehicle duplicate key", 128),
    retentionUntil: optionalDate(input.retentionUntil, "Vehicle retention date")
  };
}

export type AppointmentParticipantInput = {
  appointmentId: string;
  appointmentOrganizationId: string;
  participantType: string;
  roleCode: string;
  userId?: string | null;
  customerId?: string | null;
  customerOrganizationId?: string | null;
  displayNameSnapshot: string;
  contactSnapshot?: unknown;
  isRequired?: boolean;
  isPrimary?: boolean;
  attendanceRequired?: boolean;
};

export function normalizeAppointmentParticipant(input: AppointmentParticipantInput) {
  if (!participantTypes.has(input.participantType)) {
    throw new Error(`Appointment participant type is invalid: "${input.participantType}".`);
  }

  const userId = optionalText(input.userId, "Participant user ID", 100);
  const customerId = optionalText(input.customerId, "Participant customer ID", 100);
  const customerOrganizationId = optionalText(
    input.customerOrganizationId,
    "Participant customer organization",
    100
  );
  const appointmentOrganizationId = requiredText(
    input.appointmentOrganizationId,
    "Participant appointment organization",
    100
  );

  if (input.participantType === "INTERNAL_USER" && (!userId || customerId)) {
    throw new Error("An internal participant requires only a user reference.");
  }

  if (
    input.participantType === "CUSTOMER" &&
    (!customerId || userId || customerOrganizationId !== appointmentOrganizationId)
  ) {
    throw new Error("A customer participant requires only a customer reference.");
  }

  if (
    input.participantType !== "CUSTOMER" &&
    customerOrganizationId
  ) {
    throw new Error("Only a customer participant may provide a customer organization.");
  }

  if (input.participantType === "EXTERNAL" && (userId || customerId)) {
    throw new Error("An external participant cannot reference an internal user or customer.");
  }

  return {
    appointmentId: requiredText(input.appointmentId, "Participant appointment", 100),
    participantType: input.participantType as AppointmentParticipantType,
    roleCode: roleCode(input.roleCode),
    userId,
    customerId,
    displayNameSnapshot: requiredText(
      input.displayNameSnapshot,
      "Participant display-name snapshot",
      200
    ),
    contactSnapshot: jsonObject(input.contactSnapshot, "Participant contact snapshot"),
    isRequired: input.isRequired ?? false,
    isPrimary: input.isPrimary ?? false,
    attendanceRequired: input.attendanceRequired ?? true
  };
}

export type AppointmentVehicleInput = {
  appointmentId: string;
  appointmentOrganizationId: string;
  vehicleId: string;
  vehicleOrganizationId: string;
  roleCode: string;
  vehicleSnapshot: unknown;
  isPrimary?: boolean;
  isRequired?: boolean;
  exclusiveReservationRequired?: boolean;
};

export function normalizeAppointmentVehicle(input: AppointmentVehicleInput) {
  const appointmentOrganizationId = requiredText(
    input.appointmentOrganizationId,
    "Appointment vehicle organization",
    100
  );
  const vehicleOrganizationId = requiredText(
    input.vehicleOrganizationId,
    "Vehicle organization",
    100
  );

  if (appointmentOrganizationId !== vehicleOrganizationId) {
    throw new Error("An appointment vehicle must belong to the appointment organization.");
  }

  return {
    appointmentId: requiredText(input.appointmentId, "Appointment vehicle appointment", 100),
    vehicleId: requiredText(input.vehicleId, "Appointment vehicle reference", 100),
    roleCode: roleCode(input.roleCode),
    vehicleSnapshot: jsonObject(input.vehicleSnapshot, "Appointment vehicle snapshot", true),
    isPrimary: input.isPrimary ?? false,
    isRequired: input.isRequired ?? false,
    exclusiveReservationRequired: input.exclusiveReservationRequired ?? true
  };
}

export type UserLocationAccessInput = {
  userId: string;
  locationId: string;
  canViewSchedule?: boolean;
  canParticipate?: boolean;
  canOwnAppointments?: boolean;
  canManageAppointments?: boolean;
  canViewLimitedData?: boolean;
  validFrom: Date;
  validTo?: Date | null;
};

export function normalizeUserLocationAccess(input: UserLocationAccessInput) {
  const validFrom = optionalDate(input.validFrom, "Location-access valid-from date");
  const validTo = optionalDate(input.validTo, "Location-access valid-to date");

  if (!validFrom) {
    throw new Error("Location-access valid-from date is required.");
  }

  if (validTo && validTo < validFrom) {
    throw new Error("Location-access valid-to date cannot be before its valid-from date.");
  }

  const canViewSchedule = input.canViewSchedule ?? true;
  const canParticipate = input.canParticipate ?? true;
  const canOwnAppointments = input.canOwnAppointments ?? false;
  const canManageAppointments = input.canManageAppointments ?? false;
  const canViewLimitedData = input.canViewLimitedData ?? false;

  if ((canParticipate || canOwnAppointments || canManageAppointments || canViewLimitedData) && !canViewSchedule) {
    throw new Error("Appointment location capabilities require schedule-view access.");
  }

  if (canOwnAppointments && !canParticipate) {
    throw new Error("An appointment owner must also be eligible to participate.");
  }

  return {
    userId: requiredText(input.userId, "Location-access user", 100),
    locationId: requiredText(input.locationId, "Location-access location", 100),
    canViewSchedule,
    canParticipate,
    canOwnAppointments,
    canManageAppointments,
    canViewLimitedData,
    validFrom,
    validTo
  };
}
