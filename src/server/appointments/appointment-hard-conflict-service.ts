import {
  buildAppointmentTimeFootprint,
  type AppointmentDurationOverride,
  type AppointmentDurationOverrideActor,
  type AppointmentTimeFootprint
} from "@/server/appointments/appointment-duration-rules";
import type { AppointmentTemplateDefinition } from "@/server/appointments/appointment-template-domain";
import {
  evaluateLocationScheduleCandidate,
  type LocationScheduleCandidateResult,
  type LocationTimeClosure,
  type LocationTimeLocation,
  type LocationTimeOperatingWindow
} from "@/server/appointments/location-time-service";
import {
  evaluateResourceAvailability,
  type ResourceAvailabilityOperatingWindow,
  type ResourceAvailabilityReservation,
  type ResourceAvailabilityResource,
  type ResourceAvailabilityResult,
  type ResourceAvailabilityUnavailability
} from "@/server/appointments/resource-availability-service";
import {
  evaluateStaffAvailability,
  type StaffAvailabilityResult,
  type StaffAvailabilityUser,
  type StaffLocationAccess,
  type StaffResource,
  type StaffSchedulingRole
} from "@/server/appointments/staff-availability-service";

export const APPOINTMENT_HARD_CONFLICT_CODES = [
  "INVALID_TIME",
  "INACTIVE_TEMPLATE",
  "REQUIRED_CONTEXT_MISSING",
  "LOCATION_UNAVAILABLE",
  "REQUIRED_RESOURCE_UNAVAILABLE",
  "OWNER_UNAVAILABLE_OR_UNAUTHORIZED",
  "STAFF_UNAVAILABLE_OR_UNAUTHORIZED",
  "RECURRENCE_OCCURRENCE_INVALID"
] as const;

export type AppointmentHardConflictCode =
  (typeof APPOINTMENT_HARD_CONFLICT_CODES)[number];

export type AppointmentHardConflictSource =
  | "TIME"
  | "TEMPLATE"
  | "LOCATION"
  | "RESOURCE"
  | "STAFF"
  | "RECURRENCE";

export type AppointmentHardConflict = {
  code: AppointmentHardConflictCode;
  source: AppointmentHardConflictSource;
  message: string;
  occurrenceKey?: string;
  resourceId?: string;
  staffUserId?: string;
  contextField?: string;
};

export type AppointmentHardConflictResourceCandidate = {
  requirementCode: string;
  isMandatory?: boolean;
  hardBlockIfUnfulfilled?: boolean;
  resource: ResourceAvailabilityResource;
  operatingWindows: ResourceAvailabilityOperatingWindow[];
  unavailability: ResourceAvailabilityUnavailability[];
  reservations: ResourceAvailabilityReservation[];
  requiredCapacity?: number;
};

export type AppointmentHardConflictStaffCandidate = {
  role: StaffSchedulingRole;
  isRequired?: boolean;
  staff: StaffAvailabilityUser;
  locationAccess: StaffLocationAccess | null;
  staffResource: StaffResource | null;
  operatingWindows: ResourceAvailabilityOperatingWindow[];
  unavailability: ResourceAvailabilityUnavailability[];
  reservations: ResourceAvailabilityReservation[];
  requiredCapacity?: number;
};

export type AppointmentHardConflictEvaluationInput = {
  template: AppointmentTemplateDefinition;
  location: LocationTimeLocation;
  locationOperatingWindows: LocationTimeOperatingWindow[];
  locationClosures: LocationTimeClosure[];
  startsAt: Date;
  providedContextFields?: string[];
  durationOverride?: AppointmentDurationOverride;
  durationOverrideActor?: AppointmentDurationOverrideActor;
  resources?: AppointmentHardConflictResourceCandidate[];
  staff?: AppointmentHardConflictStaffCandidate[];
  occurrenceKey?: string;
};

export type AppointmentHardConflictEvaluationResult = {
  canCommit: boolean;
  occurrenceKey: string | null;
  hardConflicts: AppointmentHardConflict[];
  timeFootprint: AppointmentTimeFootprint | null;
  locationResult: LocationScheduleCandidateResult | null;
  resourceResults: Array<{
    requirementCode: string;
    result: ResourceAvailabilityResult;
  }>;
  staffResults: Array<{
    role: StaffSchedulingRole;
    result: StaffAvailabilityResult;
  }>;
};

export type AppointmentHardConflictOccurrenceInput =
  AppointmentHardConflictEvaluationInput & {
    occurrenceKey: string;
  };

export type AppointmentRecurrenceHardConflictResult = {
  canCommitSeries: boolean;
  hardConflicts: AppointmentHardConflict[];
  occurrenceResults: AppointmentHardConflictEvaluationResult[];
};

function addConflict(
  conflicts: AppointmentHardConflict[],
  conflict: AppointmentHardConflict
) {
  conflicts.push(conflict);
}

function getProvidedContextSet(fields: string[] | undefined) {
  return new Set((fields ?? []).map((field) => field.trim()).filter(Boolean));
}

function getDurationConflict(error: unknown, occurrenceKey?: string): AppointmentHardConflict {
  return {
    code: "INVALID_TIME",
    source: "TIME",
    message: error instanceof Error ? error.message : "Appointment time is invalid.",
    occurrenceKey
  };
}

function getLocationConflict(input: {
  reason: string;
  occurrenceKey?: string;
}): AppointmentHardConflict {
  return {
    code: "LOCATION_UNAVAILABLE",
    source: "LOCATION",
    message: input.reason,
    occurrenceKey: input.occurrenceKey
  };
}

function getResourceConflict(input: {
  reason: string;
  resourceId: string;
  occurrenceKey?: string;
}): AppointmentHardConflict {
  return {
    code: "REQUIRED_RESOURCE_UNAVAILABLE",
    source: "RESOURCE",
    message: input.reason,
    resourceId: input.resourceId,
    occurrenceKey: input.occurrenceKey
  };
}

function getStaffConflictCode(role: StaffSchedulingRole) {
  return role === "OWNER"
    ? "OWNER_UNAVAILABLE_OR_UNAUTHORIZED"
    : "STAFF_UNAVAILABLE_OR_UNAUTHORIZED";
}

function getStaffConflict(input: {
  reason: string;
  staffUserId: string;
  role: StaffSchedulingRole;
  occurrenceKey?: string;
}): AppointmentHardConflict {
  return {
    code: getStaffConflictCode(input.role),
    source: "STAFF",
    message: input.reason,
    staffUserId: input.staffUserId,
    occurrenceKey: input.occurrenceKey
  };
}

export function evaluateAppointmentHardConflicts(
  input: AppointmentHardConflictEvaluationInput
): AppointmentHardConflictEvaluationResult {
  const hardConflicts: AppointmentHardConflict[] = [];
  const occurrenceKey = input.occurrenceKey;
  const providedContextFields = getProvidedContextSet(input.providedContextFields);
  let timeFootprint: AppointmentTimeFootprint | null = null;
  let locationResult: LocationScheduleCandidateResult | null = null;
  const resourceResults: AppointmentHardConflictEvaluationResult["resourceResults"] = [];
  const staffResults: AppointmentHardConflictEvaluationResult["staffResults"] = [];

  if (!input.template.isActive) {
    addConflict(hardConflicts, {
      code: "INACTIVE_TEMPLATE",
      source: "TEMPLATE",
      message: `Appointment template ${input.template.code} is inactive.`,
      occurrenceKey
    });
  }

  for (const field of input.template.requiredContextFields) {
    if (!providedContextFields.has(field)) {
      addConflict(hardConflicts, {
        code: "REQUIRED_CONTEXT_MISSING",
        source: "TEMPLATE",
        message: `Required appointment context is missing: ${field}.`,
        contextField: field,
        occurrenceKey
      });
    }
  }

  try {
    timeFootprint = buildAppointmentTimeFootprint({
      template: input.template,
      startsAt: input.startsAt,
      timezone: input.location.timezone,
      override: input.durationOverride,
      actor: input.durationOverrideActor
    });
  } catch (error) {
    addConflict(hardConflicts, getDurationConflict(error, occurrenceKey));
  }

  if (timeFootprint) {
    locationResult = evaluateLocationScheduleCandidate({
      location: input.location,
      operatingWindows: input.locationOperatingWindows,
      closures: input.locationClosures,
      startsAt: timeFootprint.appointmentStartsAt,
      endsAt: timeFootprint.appointmentEndsAt
    });

    if (!locationResult.isSchedulable) {
      for (const reason of locationResult.reasons) {
        addConflict(hardConflicts, getLocationConflict({ reason, occurrenceKey }));
      }
    }

    for (const candidate of input.resources ?? []) {
      const isHardRequired =
        (candidate.isMandatory ?? true) && (candidate.hardBlockIfUnfulfilled ?? true);
      const result = evaluateResourceAvailability({
        resource: candidate.resource,
        timezone: input.location.timezone,
        operatingWindows: candidate.operatingWindows,
        unavailability: candidate.unavailability,
        reservations: candidate.reservations,
        startsAt: timeFootprint.resourceWindowStartsAt,
        endsAt: timeFootprint.resourceWindowEndsAt,
        requiredCapacity: candidate.requiredCapacity
      });

      resourceResults.push({
        requirementCode: candidate.requirementCode,
        result
      });

      if (isHardRequired && result.isHardBlocked) {
        for (const reason of result.reasons) {
          addConflict(
            hardConflicts,
            getResourceConflict({
              reason,
              resourceId: result.resourceId,
              occurrenceKey
            })
          );
        }
      }
    }

    for (const candidate of input.staff ?? []) {
      const result = evaluateStaffAvailability({
        staff: candidate.staff,
        locationId: input.location.id,
        timezone: input.location.timezone,
        requestedRole: candidate.role,
        locationAccess: candidate.locationAccess,
        staffResource: candidate.staffResource,
        operatingWindows: candidate.operatingWindows,
        unavailability: candidate.unavailability,
        reservations: candidate.reservations,
        startsAt: timeFootprint.appointmentStartsAt,
        endsAt: timeFootprint.appointmentEndsAt,
        requiredCapacity: candidate.requiredCapacity
      });

      staffResults.push({
        role: candidate.role,
        result
      });

      if ((candidate.isRequired ?? true) && result.isHardBlocked) {
        for (const reason of result.reasons) {
          addConflict(
            hardConflicts,
            getStaffConflict({
              reason,
              staffUserId: result.staffUserId,
              role: candidate.role,
              occurrenceKey
            })
          );
        }
      }
    }
  }

  return {
    canCommit: hardConflicts.length === 0,
    occurrenceKey: occurrenceKey ?? null,
    hardConflicts,
    timeFootprint,
    locationResult,
    resourceResults,
    staffResults
  };
}

export function evaluateAppointmentRecurrenceHardConflicts(input: {
  occurrences: AppointmentHardConflictOccurrenceInput[];
  requireAllOccurrencesValid?: boolean;
}): AppointmentRecurrenceHardConflictResult {
  const occurrenceResults = input.occurrences.map((occurrence) =>
    evaluateAppointmentHardConflicts(occurrence)
  );
  const occurrenceConflicts = occurrenceResults.flatMap((result) => result.hardConflicts);
  const seriesConflicts: AppointmentHardConflict[] =
    input.requireAllOccurrencesValid === false
      ? []
      : occurrenceResults
          .filter((result) => !result.canCommit)
          .map((result) => ({
            code: "RECURRENCE_OCCURRENCE_INVALID",
            source: "RECURRENCE",
            message: `Recurring occurrence ${result.occurrenceKey} has hard conflicts.`,
            occurrenceKey: result.occurrenceKey ?? undefined
          }));
  const hardConflicts = [...seriesConflicts, ...occurrenceConflicts];

  return {
    canCommitSeries: hardConflicts.length === 0,
    hardConflicts,
    occurrenceResults
  };
}
