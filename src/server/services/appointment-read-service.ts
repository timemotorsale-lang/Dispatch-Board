import type { AuthenticatedUser } from "@/server/auth/store";
import {
  projectCustomerForAppointment,
  projectVehicleForAppointment,
  type AppointmentDataAccessLevel
} from "@/server/appointments/appointment-privacy";
import {
  canMutateAppointment,
  canViewAppointmentLimitedData,
  canViewAppointmentSchedule,
  isManager,
  type AppointmentLocationAccessGrant
} from "@/server/policies/access";
import {
  createAppointmentReadRepository,
  type AppointmentReadAppointmentRecord,
  type AppointmentReadLocationAccessRecord,
  type AppointmentReadParticipantRecord,
  type AppointmentReadRepository,
  type AppointmentReadVehicleRecord
} from "@/server/repositories/appointment-read-repository";

export type AppointmentReadViewerRelationship =
  | "MANAGER"
  | "OWNER"
  | "PARTICIPANT"
  | "LOCATION_VIEWER";

export type AppointmentReadQuery = {
  locationId: string;
  windowStart: Date | string;
  windowEnd: Date | string;
  includeCancelled?: boolean;
};

export type AppointmentReadUserSummary = {
  id: string;
  name: string;
  email?: string;
};

export type AppointmentReadCustomerSummary = {
  customerId: string | null;
  customerNumber: string | null;
  displayName: string;
  phoneNumber: string | null;
  email: string | null;
};

export type AppointmentReadVehicleSummary = {
  appointmentVehicleId: string;
  vehicleId: string;
  vehicleNumber: string;
  stockNumber: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  vin: string | null;
  licensePlate: string | null;
  roleCode: string;
  isPrimary: boolean;
  isRequired: boolean;
};

export type AppointmentReadParticipantSummary = {
  id: string;
  participantType: string;
  roleCode: string;
  userId: string | null;
  customerId: string | null;
  displayName: string;
  isRequired: boolean;
  isPrimary: boolean;
  attendanceRequired: boolean;
};

export type AppointmentReadTaskLinkSummary = {
  id: string;
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  taskDueAt: string;
  assignedUser: AppointmentReadUserSummary;
  linkType: string;
  linkCode: string;
  linkTitle: string;
  explanation: string | null;
  isRequired: boolean;
  blocksAppointment: boolean;
  appointmentRequiredForTask: boolean;
  createdAt: string;
};

export type AppointmentReadResourceReservationSummary = {
  id: string;
  resourceId: string;
  resourceCode: string;
  resourceName: string;
  status: string;
  startsAt: string;
  endsAt: string;
  capacityUnits: number;
};

export type AppointmentReadVisibility = {
  relationship: AppointmentReadViewerRelationship;
  dataAccessLevel: AppointmentDataAccessLevel;
  canMutate: boolean;
  canViewSensitiveContact: boolean;
};

export type AppointmentReadModel = {
  id: string;
  appointmentNumber: string;
  organizationId: string;
  locationId: string;
  title: string;
  sourceType: string;
  sourceReference: string | null;
  schedulingTimezone: string;
  startsAt: string | null;
  endsAt: string | null;
  bookingStatus: string;
  confirmationStatus: string;
  attendanceStatus: string;
  executionStatus: string;
  version: number;
  owner: AppointmentReadUserSummary | null;
  customer: AppointmentReadCustomerSummary | null;
  vehicles: AppointmentReadVehicleSummary[];
  participants: AppointmentReadParticipantSummary[];
  taskLinks: AppointmentReadTaskLinkSummary[];
  resourceReservations: AppointmentReadResourceReservationSummary[];
  outcomeCode: string | null;
  outcomeNotes: string | null;
  followUpDispositionCode: string | null;
  followUpNotes: string | null;
  createdAt: string;
  updatedAt: string;
  visibility: AppointmentReadVisibility;
};

export type AppointmentReadResult = {
  locationId: string;
  windowStart: string;
  windowEnd: string;
  appointmentCount: number;
  appointments: AppointmentReadModel[];
};

function assertAuthenticated(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  return user;
}

function parseQueryDate(value: Date | string, fieldName: string) {
  const parsed = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Appointment read query ${fieldName} must be a valid date.`);
  }

  return parsed;
}

function normalizeQuery(input: AppointmentReadQuery) {
  const locationId = input.locationId.trim();

  if (!locationId) {
    throw new Error("Appointment read query requires a location.");
  }

  const windowStart = parseQueryDate(input.windowStart, "windowStart");
  const windowEnd = parseQueryDate(input.windowEnd, "windowEnd");

  if (windowEnd <= windowStart) {
    throw new Error("Appointment read query windowEnd must be after windowStart.");
  }

  return {
    locationId,
    windowStart,
    windowEnd,
    includeCancelled: input.includeCancelled === true
  };
}

function toLocationAccessGrant(
  access: AppointmentReadLocationAccessRecord | null
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

function toUserSummary(
  user: AppointmentReadAppointmentRecord["ownerUser"]
): AppointmentReadUserSummary | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email || undefined
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringFromSnapshot(value: unknown, key: string) {
  if (!isPlainObject(value)) {
    return null;
  }

  const snapshotValue = value[key];

  return typeof snapshotValue === "string" && snapshotValue.trim()
    ? snapshotValue.trim()
    : null;
}

function numberFromSnapshot(value: unknown, key: string) {
  if (!isPlainObject(value)) {
    return null;
  }

  const snapshotValue = value[key];

  return typeof snapshotValue === "number" ? snapshotValue : null;
}

function maskParticipantName(displayName: string) {
  const projected = projectCustomerForAppointment(
    {
      customerNumber: "",
      displayName,
      phoneNumber: null,
      email: null
    },
    "SCHEDULE_SUMMARY"
  );

  return projected.displayName;
}

function toCustomerSummary(
  appointment: AppointmentReadAppointmentRecord,
  accessLevel: AppointmentDataAccessLevel
): AppointmentReadCustomerSummary | null {
  const primaryCustomer =
    appointment.participants.find((participant) => participant.customer && participant.isPrimary) ??
    appointment.participants.find((participant) => participant.customer) ??
    null;

  if (primaryCustomer?.customer) {
    const projected = projectCustomerForAppointment(
      {
        customerNumber: primaryCustomer.customer.customerNumber,
        displayName: primaryCustomer.customer.displayName,
        phoneNumber: primaryCustomer.customer.phoneNumber,
        email: primaryCustomer.customer.email
      },
      accessLevel
    );

    return {
      customerId: primaryCustomer.customer.id,
      customerNumber: projected.customerNumber || null,
      displayName: projected.displayName,
      phoneNumber: projected.phoneNumber,
      email: projected.email
    };
  }

  const displayName =
    stringFromSnapshot(appointment.customerSnapshot, "displayName") ??
    stringFromSnapshot(appointment.customerSnapshot, "customerDisplayName");

  if (!displayName) {
    return null;
  }

  const projected = projectCustomerForAppointment(
    {
      customerNumber:
        stringFromSnapshot(appointment.customerSnapshot, "customerNumber") ?? "snapshot-customer",
      displayName,
      phoneNumber: stringFromSnapshot(appointment.customerSnapshot, "phoneNumber"),
      email: stringFromSnapshot(appointment.customerSnapshot, "email")
    },
    accessLevel
  );

  return {
    customerId: null,
    customerNumber: projected.customerNumber,
    displayName: projected.displayName,
    phoneNumber: projected.phoneNumber,
    email: projected.email
  };
}

function toVehicleSummary(
  vehicle: AppointmentReadVehicleRecord,
  accessLevel: AppointmentDataAccessLevel
): AppointmentReadVehicleSummary {
  const projected = projectVehicleForAppointment(
    {
      vehicleNumber:
        vehicle.vehicle.vehicleNumber ??
        stringFromSnapshot(vehicle.vehicleSnapshot, "vehicleNumber") ??
        vehicle.vehicleId,
      stockNumber:
        vehicle.vehicle.stockNumber ?? stringFromSnapshot(vehicle.vehicleSnapshot, "stockNumber"),
      year: vehicle.vehicle.year ?? numberFromSnapshot(vehicle.vehicleSnapshot, "year"),
      make: vehicle.vehicle.make ?? stringFromSnapshot(vehicle.vehicleSnapshot, "make"),
      model: vehicle.vehicle.model ?? stringFromSnapshot(vehicle.vehicleSnapshot, "model"),
      vin: vehicle.vehicle.vin ?? stringFromSnapshot(vehicle.vehicleSnapshot, "vin"),
      licensePlate:
        vehicle.vehicle.licensePlate ?? stringFromSnapshot(vehicle.vehicleSnapshot, "licensePlate")
    },
    accessLevel
  );

  return {
    appointmentVehicleId: vehicle.id,
    vehicleId: vehicle.vehicleId,
    vehicleNumber: projected.vehicleNumber,
    stockNumber: projected.stockNumber,
    year: projected.year,
    make: projected.make,
    model: projected.model,
    vin: projected.vin,
    licensePlate: projected.licensePlate,
    roleCode: vehicle.roleCode,
    isPrimary: vehicle.isPrimary,
    isRequired: vehicle.isRequired
  };
}

function toParticipantSummary(
  participant: AppointmentReadParticipantRecord,
  accessLevel: AppointmentDataAccessLevel
): AppointmentReadParticipantSummary {
  return {
    id: participant.id,
    participantType: participant.participantType,
    roleCode: participant.roleCode,
    userId: participant.userId,
    customerId: participant.customerId,
    displayName:
      accessLevel === "LIMITED_DETAIL"
        ? participant.displayNameSnapshot
        : maskParticipantName(participant.displayNameSnapshot),
    isRequired: participant.isRequired,
    isPrimary: participant.isPrimary,
    attendanceRequired: participant.attendanceRequired
  };
}

function getViewerRelationship(input: {
  actor: AuthenticatedUser;
  appointment: AppointmentReadAppointmentRecord;
  locationAccess: AppointmentLocationAccessGrant;
}): AppointmentReadViewerRelationship {
  if (isManager(input.actor) && input.locationAccess.canManageAppointments) {
    return "MANAGER";
  }

  if (input.appointment.ownerUserId === input.actor.id) {
    return "OWNER";
  }

  if (input.appointment.participants.some((participant) => participant.userId === input.actor.id)) {
    return "PARTICIPANT";
  }

  return "LOCATION_VIEWER";
}

function resolveVisibility(input: {
  actor: AuthenticatedUser;
  appointment: AppointmentReadAppointmentRecord;
  locationAccess: AppointmentLocationAccessGrant;
}): AppointmentReadVisibility {
  const relationship = getViewerRelationship(input);
  const canViewSensitiveContact = canViewAppointmentLimitedData({
    actor: input.actor,
    ownerUserId: input.appointment.ownerUserId,
    locationAccess: input.locationAccess
  });
  const canMutate = canMutateAppointment({
    actor: input.actor,
    ownerUserId: input.appointment.ownerUserId,
    locationAccess: input.locationAccess
  });

  return {
    relationship,
    dataAccessLevel: canViewSensitiveContact ? "LIMITED_DETAIL" : "SCHEDULE_SUMMARY",
    canMutate,
    canViewSensitiveContact
  };
}

function toAppointmentReadModel(input: {
  actor: AuthenticatedUser;
  appointment: AppointmentReadAppointmentRecord;
  locationAccess: AppointmentLocationAccessGrant;
}): AppointmentReadModel {
  const visibility = resolveVisibility(input);
  const accessLevel = visibility.dataAccessLevel;

  return {
    id: input.appointment.id,
    appointmentNumber: input.appointment.appointmentNumber,
    organizationId: input.appointment.organizationId,
    locationId: input.appointment.locationId,
    title: input.appointment.title,
    sourceType: input.appointment.sourceType,
    sourceReference: input.appointment.sourceReference,
    schedulingTimezone: input.appointment.schedulingTimezone,
    startsAt: input.appointment.startsAt?.toISOString() ?? null,
    endsAt: input.appointment.endsAt?.toISOString() ?? null,
    bookingStatus: input.appointment.bookingStatus,
    confirmationStatus: input.appointment.confirmationStatus,
    attendanceStatus: input.appointment.attendanceStatus,
    executionStatus: input.appointment.executionStatus,
    version: input.appointment.version,
    owner: toUserSummary(input.appointment.ownerUser),
    customer: toCustomerSummary(input.appointment, accessLevel),
    vehicles: input.appointment.vehicles.map((vehicle) => toVehicleSummary(vehicle, accessLevel)),
    participants: input.appointment.participants.map((participant) =>
      toParticipantSummary(participant, accessLevel)
    ),
    taskLinks: input.appointment.taskLinks.map((taskLink) => ({
      id: taskLink.id,
      taskId: taskLink.taskId,
      taskTitle: taskLink.task.title,
      taskStatus: taskLink.task.status,
      taskDueAt: taskLink.task.dueAt.toISOString(),
      assignedUser: toUserSummary(taskLink.task.assignedUser)!,
      linkType: taskLink.linkType,
      linkCode: taskLink.linkCode,
      linkTitle: taskLink.title,
      explanation: taskLink.explanation,
      isRequired: taskLink.isRequired,
      blocksAppointment: taskLink.blocksAppointment,
      appointmentRequiredForTask: taskLink.blocksTask,
      createdAt: taskLink.createdAt.toISOString()
    })),
    resourceReservations: input.appointment.resourceReservations.map((reservation) => ({
      id: reservation.id,
      resourceId: reservation.resourceId,
      resourceCode: reservation.resource.code,
      resourceName: reservation.resource.name,
      status: reservation.status,
      startsAt: reservation.startsAt.toISOString(),
      endsAt: reservation.endsAt.toISOString(),
      capacityUnits: reservation.capacityUnits
    })),
    outcomeCode: input.appointment.outcomeCode,
    outcomeNotes: input.appointment.outcomeNotes,
    followUpDispositionCode: input.appointment.followUpDispositionCode,
    followUpNotes: input.appointment.followUpNotes,
    createdAt: input.appointment.createdAt.toISOString(),
    updatedAt: input.appointment.updatedAt.toISOString(),
    visibility
  };
}

export async function listAppointmentReadModels(
  user: AuthenticatedUser | null,
  query: AppointmentReadQuery,
  repository: AppointmentReadRepository = createAppointmentReadRepository(),
  now = new Date()
): Promise<AppointmentReadResult> {
  const actor = assertAuthenticated(user);
  const normalizedQuery = normalizeQuery(query);
  const locationAccess = toLocationAccessGrant(
    await repository.findActiveLocationAccess(actor.id, normalizedQuery.locationId, now)
  );

  if (!locationAccess || !canViewAppointmentSchedule({ actor, locationAccess })) {
    throw new Error("Appointment schedule is not authorized.");
  }

  const appointments = await repository.listAppointmentsForLocationWindow(normalizedQuery);

  return {
    locationId: normalizedQuery.locationId,
    windowStart: normalizedQuery.windowStart.toISOString(),
    windowEnd: normalizedQuery.windowEnd.toISOString(),
    appointmentCount: appointments.length,
    appointments: appointments.map((appointment) =>
      toAppointmentReadModel({
        actor,
        appointment,
        locationAccess
      })
    )
  };
}
