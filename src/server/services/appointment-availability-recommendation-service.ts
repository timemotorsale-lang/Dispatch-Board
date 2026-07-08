import { Prisma, PrismaClient } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import {
  getLocationLocalDate,
  getLocationMinuteOfDay
} from "@/server/appointments/location-time-service";
import {
  getInitialAppointmentTemplateDefinition,
  type AppointmentTemplateDefinition
} from "@/server/appointments/appointment-template-domain";
import type { StaffLocationAccess, StaffResource } from "@/server/appointments/staff-availability-service";
import { createUnscheduledAppointmentRequest, rankWaitlistCandidates } from "@/server/appointments/appointment-waitlist-service";
import type { AppointmentLocationAccessGrant } from "@/server/policies/access";
import { canMutateAppointment, canViewAppointmentSchedule } from "@/server/policies/access";
import { prisma } from "@/server/db/client";

const activeReservationStatuses = ["PROPOSED", "HELD", "COMMITTED"] as const;

const appointmentAvailabilityRecommendationSelect = {
  id: true,
  appointmentNumber: true,
  organizationId: true,
  locationId: true,
  ownerUserId: true,
  sourceType: true,
  sourceReference: true,
  title: true,
  schedulingTimezone: true,
  startsAt: true,
  endsAt: true,
  bookingStatus: true,
  purposeSnapshot: true,
  customerSnapshot: true,
  vehicleSnapshot: true,
  sourceSnapshot: true,
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
      attendanceRequired: true,
      user: {
        select: {
          id: true,
          name: true,
          isActive: true
        }
      }
    }
  },
  location: {
    select: {
      id: true,
      timezone: true,
      schedulingStatus: true,
      operatingWindows: {
        select: {
          businessDay: true,
          opensAtMinute: true,
          closesAtMinute: true,
          validFrom: true,
          validTo: true
        }
      },
      closures: {
        select: {
          id: true,
          type: true,
          name: true,
          startsAt: true,
          endsAt: true,
          reason: true
        }
      }
    }
  },
  resourceRequirements: {
    select: {
      id: true,
      requirementCode: true,
      requiredCapacity: true,
      isMandatory: true,
      hardBlockIfUnfulfilled: true,
      reservations: {
        where: {
          status: {
            in: [...activeReservationStatuses]
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        select: {
          id: true,
          appointmentId: true,
          resourceId: true,
          status: true,
          startsAt: true,
          endsAt: true,
          capacityUnits: true,
          bufferBeforeMinutes: true,
          bufferAfterMinutes: true,
          resource: {
            select: {
              id: true,
              name: true,
              status: true,
              capacityMode: true,
              capacity: true,
              conflictPolicy: true,
              effectiveFrom: true,
              effectiveTo: true,
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
            }
          }
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

type AppointmentAvailabilityRecommendationDatabase = Pick<
  PrismaClient,
  "appointment" | "userLocationAccess" | "schedulableResource"
>;

export type AppointmentAvailabilityRecommendationAppointmentRecord = Prisma.AppointmentGetPayload<{
  select: typeof appointmentAvailabilityRecommendationSelect;
}>;

export type AppointmentAvailabilityRecommendationLocationAccessRecord =
  Prisma.UserLocationAccessGetPayload<{
    select: typeof locationAccessSelect;
  }>;

export type AppointmentAvailabilityRecommendationStaffResourceRecord =
  Prisma.SchedulableResourceGetPayload<{
    select: typeof staffResourceSelect;
  }>;

export type AppointmentAvailabilityRecommendationRepository = {
  findAppointmentById(
    appointmentId: string
  ): Promise<AppointmentAvailabilityRecommendationAppointmentRecord | null>;
  findLocationAccess(
    userId: string,
    locationId: string
  ): Promise<AppointmentAvailabilityRecommendationLocationAccessRecord | null>;
  findStaffResourceForUser(
    userId: string,
    locationId: string
  ): Promise<AppointmentAvailabilityRecommendationStaffResourceRecord | null>;
};

export type AppointmentAvailabilityRecommendationOptions = {
  proposedStartsAt?: Date | null;
  proposedEndsAt?: Date | null;
  proposedSchedulingTimezone?: string | null;
  maximumCandidates?: number;
  searchHorizonDays?: number;
};

export type AppointmentAvailabilityRecommendationResult = {
  appointmentId: string;
  appointmentNumber: string;
  bookingStatus: string;
  templateCode: string;
  templateSource: "PURPOSE_SNAPSHOT" | "TASK_FALLBACK" | "GENERAL_FALLBACK";
  windowStartLocalDate: string;
  windowEndLocalDate: string;
  searchedCandidateCount: number;
  truncated: boolean;
  candidateCount: number;
  ownerStaffCount: number;
  requiredParticipantCount: number;
  selectedResourceCount: number;
  candidates: Array<{
    candidateRank: number;
    score: number;
    localDate: string;
    startMinuteOfDay: number;
    startsAt: Date;
    endsAt: Date | null;
    status: "AVAILABLE" | "WARNING";
    canCommit: boolean;
    explanation: string[];
    reasons: string[];
  }>;
};

const DEFAULT_MAXIMUM_CANDIDATES = 5;
const DEFAULT_SEARCH_HORIZON_DAYS = 5;

function assertAuthenticated(user: AuthenticatedUser | null) {
  if (!user) {
    throw new Error("Authentication required.");
  }

  return user;
}

function requiredText(value: string | null | undefined, label: string) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function isDateWithinAccessWindow(
  access: AppointmentAvailabilityRecommendationLocationAccessRecord,
  at: Date
) {
  return access.validFrom <= at && (!access.validTo || access.validTo >= at);
}

function toLocationAccessGrant(
  access: AppointmentAvailabilityRecommendationLocationAccessRecord | null
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
  access: AppointmentAvailabilityRecommendationLocationAccessRecord | null
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
  resource: AppointmentAvailabilityRecommendationStaffResourceRecord | null
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

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getSnapshotString(value: unknown, keys: string[]) {
  const snapshot = asObject(value);

  if (!snapshot) {
    return null;
  }

  for (const key of keys) {
    const candidate = snapshot[key];

    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function addDays(localDate: string, days: number) {
  const date = new Date(`${localDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function getSearchWindow(input: {
  appointment: AppointmentAvailabilityRecommendationAppointmentRecord;
  options: AppointmentAvailabilityRecommendationOptions;
}) {
  const startsAt =
    input.options.proposedStartsAt ?? input.appointment.startsAt ?? null;
  const endsAt = input.options.proposedEndsAt ?? input.appointment.endsAt ?? null;
  const timezone =
    input.options.proposedSchedulingTimezone ?? input.appointment.schedulingTimezone;

  if (!startsAt || !endsAt || endsAt <= startsAt) {
    throw new Error("Availability recommendations require a valid appointment time window.");
  }

  return {
    startsAt,
    endsAt,
    timezone,
    localDate: getLocationLocalDate(startsAt, timezone),
    minuteOfDay: getLocationMinuteOfDay(startsAt, timezone),
    durationMinutes: Math.max(5, Math.round((endsAt.getTime() - startsAt.getTime()) / 60000))
  };
}

function resolveSearchTemplate(input: {
  appointment: AppointmentAvailabilityRecommendationAppointmentRecord;
}): {
  template: AppointmentTemplateDefinition;
  templateSource: AppointmentAvailabilityRecommendationResult["templateSource"];
} {
  const purposeCode = getSnapshotString(input.appointment.purposeSnapshot, [
    "purposeCode",
    "code"
  ]);

  if (purposeCode) {
    const purposeTemplate = getInitialAppointmentTemplateDefinition(purposeCode);

    if (purposeTemplate) {
      return {
        template: purposeTemplate,
        templateSource: "PURPOSE_SNAPSHOT"
      };
    }
  }

  const sourceTaskId = getSnapshotString(input.appointment.sourceSnapshot, [
    "sourceTaskId",
    "taskId"
  ]);

  if (input.appointment.sourceType === "TASK" || sourceTaskId) {
    const taskTemplate = getInitialAppointmentTemplateDefinition("APT-TASK-MEETING");

    if (!taskTemplate) {
      throw new Error("Availability recommendation task template is not configured.");
    }

    return {
      template: taskTemplate,
      templateSource: "TASK_FALLBACK"
    };
  }

  const generalTemplate = getInitialAppointmentTemplateDefinition("APT-GENERAL");

  if (!generalTemplate) {
    throw new Error("Availability recommendation template is not configured.");
  }

  return {
    template: generalTemplate,
    templateSource: "GENERAL_FALLBACK"
  };
}

function buildProvidedContextFields(
  appointment: AppointmentAvailabilityRecommendationAppointmentRecord
) {
  const fields = new Set<string>();
  const sourceTaskId = getSnapshotString(appointment.sourceSnapshot, [
    "sourceTaskId",
    "taskId"
  ]);
  const participantCount =
    appointment.participants.length +
    (getSnapshotString(appointment.customerSnapshot, ["displayName", "customerDisplayName"])
      ? 1
      : 0);

  if (appointment.ownerUserId) {
    fields.add("owner");
  }

  if (participantCount > 0 || sourceTaskId || appointment.ownerUserId) {
    fields.add("participant");
  }

  if (
    getSnapshotString(appointment.customerSnapshot, ["displayName", "customerDisplayName"])
  ) {
    fields.add("customer");
    fields.add("customerOrParty");
    fields.add("customerOrInternalVehicle");
  }

  if (
    getSnapshotString(appointment.vehicleSnapshot, [
      "displayName",
      "vehicleNumber",
      "stockNumber",
      "vin"
    ])
  ) {
    fields.add("vehicle");
    fields.add("soldVehicle");
    fields.add("vehicleOrInventoryReference");
    fields.add("relatedVehicleOrTransaction");
    fields.add("vehicleOrCampaign");
  }

  if (sourceTaskId) {
    fields.add("sourceTask");
  }

  if (appointment.title.trim()) {
    fields.add("detailedReason");
    fields.add("meetingReason");
    fields.add("salesTopic");
    fields.add("issueSummary");
    fields.add("documentPurpose");
    fields.add("reasonCategory");
    fields.add("activityReason");
    fields.add("requestedDeliverable");
    fields.add("documentChecklist");
    fields.add("deliveryReference");
    fields.add("documentationStatus");
    fields.add("arrivalMethod");
    fields.add("complaint");
  }

  if (participantCount > 0) {
    fields.add("participantType");
    fields.add("customerOrParty");
  }

  fields.add("location");
  fields.add("start");
  fields.add("end");

  return [...fields];
}

function toResourceCandidates(
  appointment: AppointmentAvailabilityRecommendationAppointmentRecord
) {
  return appointment.resourceRequirements
    .map((requirement) => {
      const selectedReservation = requirement.reservations[0];

      if (!selectedReservation) {
        return null;
      }

      return {
        requirementCode: requirement.requirementCode,
        isMandatory: requirement.isMandatory,
        hardBlockIfUnfulfilled: requirement.hardBlockIfUnfulfilled,
        resource: {
          id: selectedReservation.resource.id,
          name: selectedReservation.resource.name,
          status: selectedReservation.resource.status,
          capacityMode: selectedReservation.resource.capacityMode,
          capacity: selectedReservation.resource.capacity,
          conflictPolicy: selectedReservation.resource.conflictPolicy,
          effectiveFrom: selectedReservation.resource.effectiveFrom,
          effectiveTo: selectedReservation.resource.effectiveTo
        },
        operatingWindows: selectedReservation.resource.operatingWindows,
        unavailability: selectedReservation.resource.unavailability,
        reservations: selectedReservation.resource.reservations.filter(
          (reservation) => reservation.appointmentId !== appointment.id
        ),
        requiredCapacity: requirement.requiredCapacity
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));
}

async function getStaffCandidates(input: {
  appointment: AppointmentAvailabilityRecommendationAppointmentRecord;
  repository: AppointmentAvailabilityRecommendationRepository;
  now: Date;
}) {
  const members = [
    input.appointment.ownerUser && input.appointment.ownerUserId
      ? {
          role: "OWNER" as const,
          userId: input.appointment.ownerUser.id,
          user: input.appointment.ownerUser
        }
      : null,
    ...input.appointment.participants
      .filter((participant) => participant.user && participant.userId)
      .map((participant) => ({
        role: "PARTICIPANT" as const,
        userId: participant.userId as string,
        user: participant.user!
      }))
  ].filter((member): member is NonNullable<typeof member> => Boolean(member));

  const uniqueMembers = [...new Map(members.map((member) => [member.userId, member])).values()];

  return Promise.all(
    uniqueMembers.map(async (member) => {
      const locationAccess = await input.repository.findLocationAccess(
        member.userId,
        input.appointment.locationId
      );
      const staffResource = await input.repository.findStaffResourceForUser(
        member.userId,
        input.appointment.locationId
      );
      const activeLocationAccess =
        locationAccess && isDateWithinAccessWindow(locationAccess, input.now)
          ? locationAccess
          : null;

      return {
        role: member.role,
        isRequired: true,
        staff: member.user,
        locationAccess: toStaffLocationAccess(activeLocationAccess),
        staffResource:
          staffResource && staffResource.resourceType.kind === "STAFF"
            ? toStaffResource(staffResource)
            : null,
        operatingWindows: staffResource?.operatingWindows ?? [],
        unavailability: staffResource?.unavailability ?? [],
        reservations:
          staffResource?.reservations.filter(
            (reservation) => reservation.appointmentId !== input.appointment.id
          ) ?? []
      };
    })
  );
}

export function createAppointmentAvailabilityRecommendationRepository(
  database: AppointmentAvailabilityRecommendationDatabase = prisma
): AppointmentAvailabilityRecommendationRepository {
  return {
    async findAppointmentById(appointmentId) {
      return database.appointment.findUnique({
        where: {
          id: appointmentId
        },
        select: appointmentAvailabilityRecommendationSelect
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
    }
  };
}

export async function recommendAppointmentAvailability(
  user: AuthenticatedUser | null,
  appointmentId: string,
  repository: AppointmentAvailabilityRecommendationRepository = createAppointmentAvailabilityRecommendationRepository(),
  now = new Date(),
  options: AppointmentAvailabilityRecommendationOptions = {}
): Promise<AppointmentAvailabilityRecommendationResult> {
  const actor = assertAuthenticated(user);
  const normalizedAppointmentId = requiredText(appointmentId, "Appointment id");
  const appointment = await repository.findAppointmentById(normalizedAppointmentId);

  if (!appointment) {
    throw new Error("Appointment not found.");
  }

  const actorAccess = await repository.findLocationAccess(actor.id, appointment.locationId);
  const actorLocationAccess = toLocationAccessGrant(actorAccess);

  if (
    !actorAccess ||
    !isDateWithinAccessWindow(actorAccess, now) ||
    !actorLocationAccess ||
    !canViewAppointmentSchedule({ actor, locationAccess: actorLocationAccess })
  ) {
    throw new Error("Appointment schedule is not authorized.");
  }

  if (
    !canMutateAppointment({
      actor,
      ownerUserId: appointment.ownerUserId,
      locationAccess: actorLocationAccess
    })
  ) {
    throw new Error("Appointment command is not authorized.");
  }

  const searchWindow = getSearchWindow({
    appointment,
    options
  });
  const { template, templateSource } = resolveSearchTemplate({
    appointment
  });
  const providedContextFields = buildProvidedContextFields(appointment);
  const staff = await getStaffCandidates({
    appointment,
    repository,
    now
  });
  const resources = toResourceCandidates(appointment);
  const searchHorizonDays = Math.max(1, options.searchHorizonDays ?? DEFAULT_SEARCH_HORIZON_DAYS);
  const maximumCandidates = Math.max(
    1,
    options.maximumCandidates ?? DEFAULT_MAXIMUM_CANDIDATES
  );
  const request = createUnscheduledAppointmentRequest({
    requestId: `availability-recommendation-${appointment.id}-${searchWindow.localDate}`,
    organizationId: appointment.organizationId,
    locationId: appointment.locationId,
    template,
    source: appointment.sourceType === "TASK" ? ("TASK" as const) : ("MANUAL" as const),
    priority: "NORMAL",
    requestedByUserId: actor.id,
    ownerUserId: appointment.ownerUserId,
    sourceTaskId: getSnapshotString(appointment.sourceSnapshot, ["sourceTaskId", "taskId"]),
    requestedContextFields: providedContextFields,
    reasonCode: "APPOINTMENT_SCHEDULING_RECOMMENDATION",
    reasonNotes: `Availability recommendation for ${appointment.appointmentNumber}.`,
    createdAt: now,
    permission: {
      canViewSchedule: true,
      canCreateDraft: true,
      canRequestManagerReview: true
    }
  });
  const ranked = rankWaitlistCandidates({
    request,
    maximumCandidates,
    searchInput: {
      template,
      location: {
        id: appointment.location.id,
        timezone: searchWindow.timezone,
        schedulingStatus: appointment.location.schedulingStatus
      },
      locationOperatingWindows: appointment.location.operatingWindows,
      locationClosures: appointment.location.closures,
      windowStartLocalDate: searchWindow.localDate,
      windowEndLocalDate: addDays(searchWindow.localDate, searchHorizonDays - 1),
      earliestStartMinuteOfDay: searchWindow.minuteOfDay,
      maximumResults: Math.max(maximumCandidates * 2, maximumCandidates),
      providedContextFields,
      resources,
      staff,
      durationOverride: {
        durationMinutes: searchWindow.durationMinutes,
        reasonCode: "SEARCH_DURATION_OVERRIDE",
        reasonNote: `Selected scheduling duration for ${appointment.appointmentNumber}.`
      },
      durationOverrideActor:
        actor.roles.includes("General Manager") || actor.roles.includes("Manager")
          ? "MANAGER"
          : "OWNER"
    }
  });

  return {
    appointmentId: appointment.id,
    appointmentNumber: appointment.appointmentNumber,
    bookingStatus: appointment.bookingStatus,
    templateCode: template.code,
    templateSource,
    windowStartLocalDate: searchWindow.localDate,
    windowEndLocalDate: addDays(searchWindow.localDate, searchHorizonDays - 1),
    searchedCandidateCount: ranked.searchedCandidateCount,
    truncated:
      ranked.candidates.length >= maximumCandidates &&
      ranked.searchedCandidateCount > ranked.candidates.length,
    candidateCount: ranked.candidates.length,
    ownerStaffCount: appointment.ownerUser ? 1 : 0,
    requiredParticipantCount: appointment.participants.length,
    selectedResourceCount: resources.length,
    candidates: ranked.candidates.map((candidate) => ({
      candidateRank: candidate.candidateRank,
      score: candidate.score,
      localDate: candidate.slot.localDate,
      startMinuteOfDay: candidate.slot.startMinuteOfDay,
      startsAt: candidate.slot.startsAt,
      endsAt: candidate.slot.endsAt,
      status: candidate.slot.status === "WARNING" ? "WARNING" : "AVAILABLE",
      canCommit: candidate.slot.canCommit,
      explanation: candidate.explanation,
      reasons: candidate.slot.warningResult.unresolvedWarnings.map((warning) => warning.message)
    }))
  };
}
