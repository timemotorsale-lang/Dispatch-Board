import { Prisma, PrismaClient } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  evaluateStaffAvailability,
  type StaffAvailabilityResult,
  type StaffLocationAccess,
  type StaffResource
} from "@/server/appointments/staff-availability-service";
import { prisma } from "@/server/db/client";
import {
  canOverrideAppointmentWarning,
  canMutateAppointment,
  canViewAppointmentSchedule,
  type AppointmentLocationAccessGrant
} from "@/server/policies/access";
import { normalizeAppointmentHistoryEvent } from "@/server/validation/appointment-history-events";

const appointmentStaffConflictPreviewSelect = {
  id: true,
  appointmentNumber: true,
  locationId: true,
  ownerUserId: true,
  startsAt: true,
  endsAt: true,
  schedulingTimezone: true,
  bookingStatus: true,
  ownerUser: {
    select: {
      id: true,
      name: true,
      isActive: true
    }
  },
  participants: {
    where: {
      participantType: "INTERNAL_USER",
      attendanceRequired: true
    },
    select: {
      id: true,
      roleCode: true,
      userId: true,
      displayNameSnapshot: true,
      isRequired: true,
      isPrimary: true,
      attendanceRequired: true,
      user: {
        select: {
          id: true,
          name: true,
          isActive: true
        }
      }
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

const staffResourceSelect = {
  id: true,
  locationId: true,
  userId: true,
  name: true,
  status: true,
  capacityMode: true,
  capacity: true,
  conflictPolicy: true,
  effectiveFrom: true,
  effectiveTo: true,
  resourceType: {
    select: {
      kind: true
    }
  },
  operatingWindows: {
    select: {
      businessDay: true,
      opensAtMinute: true,
      closesAtMinute: true,
      capacityOverride: true,
      validFrom: true,
      validTo: true
    }
  },
  unavailability: {
    select: {
      id: true,
      type: true,
      startsAt: true,
      endsAt: true,
      capacityReduction: true,
      reason: true
    }
  },
  reservations: {
    select: {
      id: true,
      appointmentId: true,
      status: true,
      startsAt: true,
      endsAt: true,
      capacityUnits: true,
      bufferBeforeMinutes: true,
      bufferAfterMinutes: true
    }
  }
} satisfies Prisma.SchedulableResourceSelect;

type AppointmentStaffConflictPreviewDatabase = Pick<
  PrismaClient,
  "$transaction" | "appointment" | "appointmentHistoryEvent" | "userLocationAccess" | "schedulableResource"
>;

export type AppointmentStaffConflictPreviewAppointmentRecord = Prisma.AppointmentGetPayload<{
  select: typeof appointmentStaffConflictPreviewSelect;
}>;

export type AppointmentStaffConflictPreviewLocationAccessRecord =
  Prisma.UserLocationAccessGetPayload<{
    select: typeof locationAccessSelect;
  }>;

export type AppointmentStaffConflictPreviewStaffResourceRecord =
  Prisma.SchedulableResourceGetPayload<{
    select: typeof staffResourceSelect;
  }>;

export type AppointmentStaffConflictPreviewRepository = {
  findAppointmentById(
    appointmentId: string
  ): Promise<AppointmentStaffConflictPreviewAppointmentRecord | null>;
  findLocationAccess(
    userId: string,
    locationId: string
  ): Promise<AppointmentStaffConflictPreviewLocationAccessRecord | null>;
  findStaffResourceForUser(
    userId: string,
    locationId: string
  ): Promise<AppointmentStaffConflictPreviewStaffResourceRecord | null>;
  findStaffWarningOverrideKeys?(
    appointmentId: string,
    warningKeys: string[]
  ): Promise<string[]>;
};

export type AppointmentStaffConflictPreviewResult = {
  appointmentId: string;
  appointmentNumber: string;
  bookingStatus: string;
  status: "READY" | "WARNING" | "BLOCKED";
  canProceedWithStaff: boolean;
  warningOverrideRequired: boolean;
  warningOverrideSatisfied: boolean;
  warningKey: string | null;
  staff: {
    userId: string;
    name: string;
    role: "OWNER" | "PARTICIPANT";
    roleCode: string;
    resourceId: string | null;
    resourceName: string | null;
  } | null;
  staffMembers: Array<{
    userId: string;
    name: string;
    role: "OWNER" | "PARTICIPANT";
    roleCode: string;
    resourceId: string | null;
    resourceName: string | null;
    status: "READY" | "WARNING" | "BLOCKED";
    warningOverrideRequired: boolean;
    warningOverrideSatisfied: boolean;
    warningKey: string | null;
    reasons: string[];
  }>;
  checks: Array<{
    code: string;
    label: string;
    status: "PASS" | "WARNING" | "BLOCKED";
    message: string;
    staffUserId?: string;
    staffRole?: "OWNER" | "PARTICIPANT";
    staffRoleCode?: string;
    warningKey?: string | null;
    warningOverrideRequired?: boolean;
    warningOverrideSatisfied?: boolean;
  }>;
  reasons: string[];
  availability: StaffAvailabilityResult | null;
};

export type AppointmentStaffConflictPreviewOptions = {
  proposedStartsAt?: Date | null;
  proposedEndsAt?: Date | null;
  proposedSchedulingTimezone?: string | null;
};

export type OverrideAppointmentStaffWarningInput = {
  expectedAppointmentVersion: number;
  reasonCode: string;
  reasonNotes: string;
  correlationId?: string | null;
  proposedStartsAt?: Date | null;
  proposedEndsAt?: Date | null;
  proposedSchedulingTimezone?: string | null;
};

export type AppointmentStaffWarningOverride = {
  appointmentId: string;
  appointmentNumber: string;
  staffUserId: string;
  staffName: string;
  staffRole: "OWNER" | "PARTICIPANT";
  staffRoleCode: string;
  resourceId: string | null;
  resourceName: string | null;
  status: "OVERRIDDEN";
  warningCode: "STAFF_OVERLAP";
  warningKey: string;
  reasons: string[];
  appointmentVersion: number;
};

function assertAuthenticated(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  return user;
}

function isDateWithinAccessWindow(
  access: AppointmentStaffConflictPreviewLocationAccessRecord,
  at: Date
) {
  return access.validFrom <= at && (!access.validTo || access.validTo >= at);
}

function toLocationAccessGrant(
  access: AppointmentStaffConflictPreviewLocationAccessRecord | null
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

function toStaffLocationAccess(
  access: AppointmentStaffConflictPreviewLocationAccessRecord | null
): StaffLocationAccess | null {
  if (!access) {
    return null;
  }

  return {
    userId: access.userId,
    locationId: access.locationId,
    canViewSchedule: access.canViewSchedule,
    canParticipate: access.canParticipate,
    canOwnAppointments: access.canOwnAppointments,
    canManageAppointments: access.canManageAppointments,
    canViewLimitedData: access.canViewLimitedData,
    validFrom: access.validFrom,
    validTo: access.validTo
  };
}

function toStaffResource(
  resource: AppointmentStaffConflictPreviewStaffResourceRecord | null
): StaffResource | null {
  if (!resource) {
    return null;
  }

  return {
    id: resource.id,
    locationId: resource.locationId,
    resourceKind: resource.resourceType.kind,
    userId: resource.userId,
    name: resource.name,
    status: resource.status,
    capacityMode: resource.capacityMode,
    capacity: resource.capacity,
    conflictPolicy: resource.conflictPolicy,
    effectiveFrom: resource.effectiveFrom,
    effectiveTo: resource.effectiveTo
  };
}

function toReservations(
  resource: AppointmentStaffConflictPreviewStaffResourceRecord | null,
  appointmentId: string
) {
  return (resource?.reservations ?? [])
    .filter((reservation) => reservation.appointmentId !== appointmentId)
    .map((reservation) => ({
      id: reservation.id,
      appointmentId: reservation.appointmentId,
      status: reservation.status,
      startsAt: reservation.startsAt,
      endsAt: reservation.endsAt,
      capacityUnits: reservation.capacityUnits,
      bufferBeforeMinutes: reservation.bufferBeforeMinutes,
      bufferAfterMinutes: reservation.bufferAfterMinutes
    }));
}

function createCheck(input: {
  code: string;
  label: string;
  status: "PASS" | "WARNING" | "BLOCKED";
  message: string;
  staffUserId?: string;
  staffRole?: "OWNER" | "PARTICIPANT";
  staffRoleCode?: string;
  warningKey?: string | null;
  warningOverrideRequired?: boolean;
  warningOverrideSatisfied?: boolean;
}) {
  return input;
}

function buildMissingOwnerResult(
  appointment: AppointmentStaffConflictPreviewAppointmentRecord
): AppointmentStaffConflictPreviewResult {
  return {
    appointmentId: appointment.id,
    appointmentNumber: appointment.appointmentNumber,
    bookingStatus: appointment.bookingStatus,
    status: "BLOCKED",
    canProceedWithStaff: false,
    warningOverrideRequired: false,
    warningOverrideSatisfied: false,
    warningKey: null,
    staff: null,
    staffMembers: [],
    checks: [
      createCheck({
        code: "owner_required",
        label: "Owner staff",
        status: "BLOCKED",
        message: "No accountable appointment owner is assigned."
      })
    ],
    reasons: ["A staff owner is required before staff conflicts can be evaluated."],
    availability: null
  };
}

function buildInvalidTimeResult(
  appointment: AppointmentStaffConflictPreviewAppointmentRecord
): AppointmentStaffConflictPreviewResult {
  return {
    appointmentId: appointment.id,
    appointmentNumber: appointment.appointmentNumber,
    bookingStatus: appointment.bookingStatus,
    status: "BLOCKED",
    canProceedWithStaff: false,
    warningOverrideRequired: false,
    warningOverrideSatisfied: false,
    warningKey: null,
    staff: appointment.ownerUser
      ? {
          userId: appointment.ownerUser.id,
          name: appointment.ownerUser.name,
          role: "OWNER",
          roleCode: "OWNER",
          resourceId: null,
          resourceName: null
        }
      : null,
    staffMembers: appointment.ownerUser
      ? [
          {
            userId: appointment.ownerUser.id,
            name: appointment.ownerUser.name,
            role: "OWNER",
            roleCode: "OWNER",
            resourceId: null,
            resourceName: null,
            status: "BLOCKED",
            warningOverrideRequired: false,
            warningOverrideSatisfied: false,
            warningKey: null,
            reasons: ["Staff conflict preview requires a valid appointment start and end time."]
          }
        ]
      : [],
    checks: [
      createCheck({
        code: "time_window",
        label: "Time window",
        status: "BLOCKED",
        message: "Staff conflict preview requires a valid appointment start and end time."
      })
    ],
    reasons: ["Staff conflict preview requires a valid appointment start and end time."],
    availability: null
  };
}

function buildStaffWarningKey(input: {
  appointmentId: string;
  staffUserId: string;
  resourceId: string | null;
  reasons: string[];
}) {
  return [
    "STAFF",
    "STAFF_OVERLAP",
    input.appointmentId,
    input.staffUserId,
    input.resourceId ?? "no-resource",
    input.reasons.join("|")
  ].join("|");
}

type StaffConflictMemberInput = {
  userId: string;
  name: string;
  isActive: boolean;
  role: "OWNER" | "PARTICIPANT";
  roleCode: string;
  locationAccess: AppointmentStaffConflictPreviewLocationAccessRecord | null;
  staffResource: AppointmentStaffConflictPreviewStaffResourceRecord | null;
};

function getStaffMembersFromAppointment(
  appointment: AppointmentStaffConflictPreviewAppointmentRecord
) {
  const members: Array<{
    userId: string;
    name: string;
    isActive: boolean;
    role: "OWNER" | "PARTICIPANT";
    roleCode: string;
  }> = [];

  if (appointment.ownerUser) {
    members.push({
      userId: appointment.ownerUser.id,
      name: appointment.ownerUser.name,
      isActive: appointment.ownerUser.isActive,
      role: "OWNER",
      roleCode: "OWNER"
    });
  }

  for (const participant of appointment.participants) {
    if (!participant.user || !participant.userId) {
      continue;
    }

    if (members.some((member) => member.userId === participant.userId)) {
      continue;
    }

    members.push({
      userId: participant.user.id,
      name: participant.user.name || participant.displayNameSnapshot,
      isActive: participant.user.isActive,
      role: "PARTICIPANT",
      roleCode: participant.roleCode
    });
  }

  return members;
}

function requiredText(value: string | null | undefined, label: string) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function requiredVersion(value: number | null | undefined) {
  if (!Number.isInteger(value) || (value ?? 0) < 1) {
    throw new Error("Expected appointment version is required.");
  }

  return value as number;
}

function buildPreview(input: {
  appointment: AppointmentStaffConflictPreviewAppointmentRecord;
  members: StaffConflictMemberInput[];
  overriddenWarningKeys?: Set<string>;
}) {
  if (!input.appointment.ownerUser) {
    return buildMissingOwnerResult(input.appointment);
  }

  if (
    !input.appointment.startsAt ||
    !input.appointment.endsAt ||
    input.appointment.endsAt <= input.appointment.startsAt
  ) {
    return buildInvalidTimeResult(input.appointment);
  }

  const staffMembers = input.members.map((member) => {
    const availability = evaluateStaffAvailability({
      staff: {
        id: member.userId,
        name: member.name,
        isActive: member.isActive
      },
      locationId: input.appointment.locationId,
      timezone: input.appointment.schedulingTimezone,
      requestedRole: member.role,
      locationAccess: toStaffLocationAccess(member.locationAccess),
      staffResource: toStaffResource(member.staffResource),
      operatingWindows: member.staffResource?.operatingWindows ?? [],
      unavailability: member.staffResource?.unavailability ?? [],
      reservations: toReservations(member.staffResource, input.appointment.id),
      startsAt: input.appointment.startsAt!,
      endsAt: input.appointment.endsAt!,
      requiredCapacity: 1
    });
    const status: "READY" | "WARNING" | "BLOCKED" = availability.isSchedulable
      ? "READY"
      : availability.isWarningOnly
        ? "WARNING"
        : "BLOCKED";
    const warningKey =
      status === "WARNING"
        ? buildStaffWarningKey({
            appointmentId: input.appointment.id,
            staffUserId: member.userId,
            resourceId: member.staffResource?.id ?? null,
            reasons: availability.reasons
          })
        : null;
    const warningOverrideRequired = status === "WARNING";
    const warningOverrideSatisfied = Boolean(
      warningKey && input.overriddenWarningKeys?.has(warningKey)
    );

    return {
      userId: member.userId,
      name: member.name,
      role: member.role,
      roleCode: member.roleCode,
      resourceId: member.staffResource?.id ?? null,
      resourceName: member.staffResource?.name ?? null,
      status,
      warningOverrideRequired,
      warningOverrideSatisfied,
      warningKey,
      reasons: availability.reasons,
      availability
    };
  });
  const blockedMember = staffMembers.find((member) => member.status === "BLOCKED") ?? null;
  const warningMembers = staffMembers.filter((member) => member.status === "WARNING");
  const firstUnsatisfiedWarning =
    warningMembers.find((member) => !member.warningOverrideSatisfied) ?? null;
  const firstWarning = warningMembers[0] ?? null;
  const focusedMember =
    blockedMember ??
    firstUnsatisfiedWarning ??
    firstWarning ??
    staffMembers.find((member) => member.role === "OWNER") ??
    staffMembers[0] ??
    null;
  const status = blockedMember ? "BLOCKED" : warningMembers.length > 0 ? "WARNING" : "READY";
  const warningOverrideRequired = warningMembers.length > 0;
  const warningOverrideSatisfied =
    warningMembers.length > 0 &&
    warningMembers.every((member) => member.warningOverrideSatisfied);
  const warningKey = firstUnsatisfiedWarning?.warningKey ?? firstWarning?.warningKey ?? null;
  const reasons = [
    ...new Set(
      staffMembers.flatMap((member) => (member.status === "READY" ? [] : member.reasons))
    )
  ];

  return {
    appointmentId: input.appointment.id,
    appointmentNumber: input.appointment.appointmentNumber,
    bookingStatus: input.appointment.bookingStatus,
    status,
    canProceedWithStaff: status === "READY" || (status === "WARNING" && warningOverrideSatisfied),
    warningOverrideRequired,
    warningOverrideSatisfied,
    warningKey,
    staff: focusedMember
      ? {
          userId: focusedMember.userId,
          name: focusedMember.name,
          role: focusedMember.role,
          roleCode: focusedMember.roleCode,
          resourceId: focusedMember.resourceId,
          resourceName: focusedMember.resourceName
        }
      : null,
    staffMembers: staffMembers.map((member) => ({
      userId: member.userId,
      name: member.name,
      role: member.role,
      roleCode: member.roleCode,
      resourceId: member.resourceId,
      resourceName: member.resourceName,
      status: member.status,
      warningOverrideRequired: member.warningOverrideRequired,
      warningOverrideSatisfied: member.warningOverrideSatisfied,
      warningKey: member.warningKey,
      reasons: member.reasons
    })),
    checks: staffMembers.map((member) =>
      createCheck({
        code:
          member.role === "OWNER"
            ? "owner_staff"
            : `participant_staff_${member.userId}_${member.roleCode}`,
        label:
          member.role === "OWNER"
            ? "Owner staff"
            : `Participant staff (${member.roleCode.replaceAll("_", " ")})`,
        status:
          member.status === "READY"
            ? "PASS"
            : member.status === "WARNING"
              ? "WARNING"
              : "BLOCKED",
        message:
          member.reasons.length > 0
            ? member.reasons.join(" ")
            : `${member.name} is available for this appointment window.`,
        staffUserId: member.userId,
        staffRole: member.role,
        staffRoleCode: member.roleCode,
        warningKey: member.warningKey,
        warningOverrideRequired: member.warningOverrideRequired,
        warningOverrideSatisfied: member.warningOverrideSatisfied
      })
    ),
    reasons,
    availability: focusedMember?.availability ?? null
  } satisfies AppointmentStaffConflictPreviewResult;
}

export function createAppointmentStaffConflictPreviewRepository(
  database: AppointmentStaffConflictPreviewDatabase = prisma
): AppointmentStaffConflictPreviewRepository {
  return {
    async findAppointmentById(appointmentId) {
      return database.appointment.findUnique({
        where: {
          id: appointmentId
        },
        select: appointmentStaffConflictPreviewSelect
      });
    },

    async findLocationAccess(userId, locationId) {
      return database.userLocationAccess.findUnique({
        where: {
          userId_locationId: {
            userId,
            locationId
          }
        },
        select: locationAccessSelect
      });
    },

    async findStaffResourceForUser(userId, locationId) {
      return database.schedulableResource.findFirst({
        where: {
          userId,
          locationId,
          status: "ACTIVE"
        },
        select: staffResourceSelect
      });
    },

    async findStaffWarningOverrideKeys(appointmentId, warningKeys) {
      if (warningKeys.length === 0) {
        return [];
      }

      const results = await Promise.all(
        [...new Set(warningKeys)].map(async (warningKey) => {
          const event = await database.appointmentHistoryEvent.findFirst({
            where: {
              appointmentId,
              eventType: "WARNING_OVERRIDDEN",
              metadata: {
                path: ["warningKey"],
                equals: warningKey
              }
            },
            select: {
              id: true
            }
          });

          return event ? warningKey : null;
        })
      );

      return results.filter((warningKey): warningKey is string => Boolean(warningKey));
    }
  };
}

export async function previewAppointmentStaffConflicts(
  user: AuthenticatedUser | null,
  appointmentId: string,
  repository: AppointmentStaffConflictPreviewRepository =
    createAppointmentStaffConflictPreviewRepository(),
  now = new Date(),
  options: AppointmentStaffConflictPreviewOptions = {}
): Promise<AppointmentStaffConflictPreviewResult> {
  const actor = assertAuthenticated(user);
  const normalizedAppointmentId = appointmentId.trim();

  if (!normalizedAppointmentId) {
    throw new Error("Appointment id is required.");
  }

  const appointment = await repository.findAppointmentById(normalizedAppointmentId);

  if (!appointment) {
    throw new Error("Appointment not found.");
  }

  const actorAccess = await repository.findLocationAccess(actor.id, appointment.locationId);
  const locationAccess = toLocationAccessGrant(actorAccess);

  if (
    !actorAccess ||
    !isDateWithinAccessWindow(actorAccess, now) ||
    !canViewAppointmentSchedule({ actor, locationAccess })
  ) {
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

  const appointmentForPreview = {
    ...appointment,
    startsAt: options.proposedStartsAt ?? appointment.startsAt,
    endsAt: options.proposedEndsAt ?? appointment.endsAt,
    schedulingTimezone: options.proposedSchedulingTimezone ?? appointment.schedulingTimezone
  };
  const staffMemberIdentities = getStaffMembersFromAppointment(appointmentForPreview);
  const members = await Promise.all(
    staffMemberIdentities.map(async (member) => ({
      ...member,
      locationAccess: await repository.findLocationAccess(
        member.userId,
        appointmentForPreview.locationId
      ),
      staffResource: await repository.findStaffResourceForUser(
        member.userId,
        appointmentForPreview.locationId
      )
    }))
  );
  const initialPreview = buildPreview({
    appointment: appointmentForPreview,
    members
  });
  const warningKeys = initialPreview.staffMembers
    .map((member) => member.warningKey)
    .filter((warningKey): warningKey is string => Boolean(warningKey));
  const overriddenWarningKeys =
    warningKeys.length > 0 && repository.findStaffWarningOverrideKeys
      ? await repository.findStaffWarningOverrideKeys(appointment.id, warningKeys)
      : [];

  return buildPreview({
    appointment: appointmentForPreview,
    members,
    overriddenWarningKeys: new Set(overriddenWarningKeys)
  });
}

export async function overrideAppointmentStaffWarning(
  user: AuthenticatedUser | null,
  appointmentId: string,
  input: OverrideAppointmentStaffWarningInput,
  database: AppointmentStaffConflictPreviewDatabase = prisma,
  now = new Date()
): Promise<AppointmentStaffWarningOverride> {
  const actor = assertAuthenticated(user);
  const normalizedAppointmentId = requiredText(appointmentId, "Appointment id");
  const expectedAppointmentVersion = requiredVersion(input.expectedAppointmentVersion);
  const reasonCode = requiredText(input.reasonCode, "Staff warning override reason code");
  const reasonNotes = requiredText(input.reasonNotes, "Staff warning override reason notes");
  const correlationId =
    input.correlationId?.trim() ||
    `staff-warning-override-${normalizedAppointmentId}-${now.getTime()}`;
  const repository = createAppointmentStaffConflictPreviewRepository(database);
  const appointment = await repository.findAppointmentById(normalizedAppointmentId);

  if (!appointment) {
    throw new Error("Appointment not found.");
  }

  if (appointment.bookingStatus !== "DRAFT" && appointment.bookingStatus !== "PENDING_APPROVAL") {
    throw new Error("Staff warning overrides can only be recorded for draft appointments.");
  }

  const actorAccess = await repository.findLocationAccess(actor.id, appointment.locationId);
  const locationAccess = toLocationAccessGrant(actorAccess);

  if (
    !actorAccess ||
    !isDateWithinAccessWindow(actorAccess, now) ||
    !canViewAppointmentSchedule({ actor, locationAccess })
  ) {
    throw new Error("Appointment schedule is not authorized.");
  }

  if (!canOverrideAppointmentWarning({ actor, locationAccess })) {
    throw new Error("Only an authorized manager can override appointment warnings.");
  }

  const appointmentForPreview = {
    ...appointment,
    startsAt: input.proposedStartsAt ?? appointment.startsAt,
    endsAt: input.proposedEndsAt ?? appointment.endsAt,
    schedulingTimezone: input.proposedSchedulingTimezone ?? appointment.schedulingTimezone
  };
  const staffMemberIdentities = getStaffMembersFromAppointment(appointmentForPreview);
  const members = await Promise.all(
    staffMemberIdentities.map(async (member) => ({
      ...member,
      locationAccess: await repository.findLocationAccess(
        member.userId,
        appointmentForPreview.locationId
      ),
      staffResource: await repository.findStaffResourceForUser(
        member.userId,
        appointmentForPreview.locationId
      )
    }))
  );
  const preview = buildPreview({
    appointment: appointmentForPreview,
    members
  });

  if (preview.status === "READY") {
    throw new Error("Required staff does not have a warning to override.");
  }

  if (preview.status === "BLOCKED" || !preview.warningKey || !preview.staff) {
    throw new Error("Staff hard blocks cannot be overridden.");
  }

  const staff = preview.staff;
  const warningKey = preview.warningKey;
  const historyEvent = normalizeAppointmentHistoryEvent({
    appointmentId: appointment.id,
    actorType: "HUMAN",
    actorUserId: actor.id,
    eventType: "WARNING_OVERRIDDEN",
    message: `Staff warning for ${preview.staff.name} was overridden.`,
    reasonCode,
    reasonNotes,
    correlationId,
    priorValue: {
      warning: {
        warningKey,
        warningCode: "STAFF_OVERLAP",
        source: "STAFF",
        staffUserId: staff.userId,
        staffRole: staff.role,
        staffRoleCode: staff.roleCode,
        resourceId: staff.resourceId,
        reasons: preview.reasons
      }
    },
    newValue: {
      status: "OVERRIDDEN"
    },
    metadata: {
      source: "APPOINTMENT_BOARD_STAFF_CONFLICT_PREVIEW",
      expectedAppointmentVersion,
      staffUserId: staff.userId,
      staffRole: staff.role,
      staffRoleCode: staff.roleCode,
      resourceId: staff.resourceId,
      warningKey,
      proposedStartsAt: input.proposedStartsAt?.toISOString() ?? null,
      proposedEndsAt: input.proposedEndsAt?.toISOString() ?? null,
      proposedSchedulingTimezone: input.proposedSchedulingTimezone ?? null
    },
    occurredAt: now
  });

  return database.$transaction(async (tx) => {
    const appointmentUpdate = await tx.appointment.updateMany({
      where: {
        id: appointment.id,
        version: expectedAppointmentVersion
      },
      data: {
        version: {
          increment: 1
        }
      }
    });

    if (appointmentUpdate.count !== 1) {
      throw new Error("Appointment version is stale.");
    }

    await tx.appointmentHistoryEvent.create({
      data: {
        appointmentId: historyEvent.appointmentId,
        actorType: historyEvent.actorType,
        actorUserId: historyEvent.actorUserId,
        eventType: historyEvent.eventType,
        message: historyEvent.message,
        reasonCode: historyEvent.reasonCode,
        reasonNotes: historyEvent.reasonNotes,
        correlationId: historyEvent.correlationId,
        priorValue: historyEvent.priorValue as Prisma.InputJsonValue,
        newValue: historyEvent.newValue as Prisma.InputJsonValue,
        metadata: historyEvent.metadata as Prisma.InputJsonValue,
        occurredAt: historyEvent.occurredAt ?? now
      }
    });

    return {
      appointmentId: appointment.id,
      appointmentNumber: appointment.appointmentNumber,
      staffUserId: staff.userId,
      staffName: staff.name,
      staffRole: staff.role,
      staffRoleCode: staff.roleCode,
      resourceId: staff.resourceId,
      resourceName: staff.resourceName,
      status: "OVERRIDDEN",
      warningCode: "STAFF_OVERLAP",
      warningKey,
      reasons: preview.reasons,
      appointmentVersion: expectedAppointmentVersion + 1
    };
  });
}
