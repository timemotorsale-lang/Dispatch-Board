import type { AuthenticatedUser } from "@/server/auth/store";
import type { AppointmentLocationAccessGrant } from "@/server/policies/access";
import { canOverrideAppointmentWarning } from "@/server/policies/access";
import type {
  AppointmentHardConflictEvaluationResult,
  AppointmentHardConflictSource
} from "@/server/appointments/appointment-hard-conflict-service";

export const APPOINTMENT_WARNING_CODES = [
  "STAFF_OVERLAP",
  "PREPARATION_OR_CLEANUP_BUFFER_OVERLAP",
  "VEHICLE_READINESS_INCOMPLETE",
  "PREPARATION_TASK_AT_RISK",
  "CUSTOMER_NEARBY_APPOINTMENT",
  "OUTSIDE_PREFERRED_PURPOSE_HOURS",
  "DURATION_OVERRIDE_REQUIRES_MANAGER_APPROVAL",
  "RESOURCE_WARNING",
  "CONFIRMATION_PENDING",
  "OWNER_WORKLOAD_THRESHOLD",
  "RECURRENCE_WARNING_OCCURRENCE"
] as const;

export type AppointmentWarningCode = (typeof APPOINTMENT_WARNING_CODES)[number];

export type AppointmentWarningSource =
  | AppointmentHardConflictSource
  | "TASK"
  | "CUSTOMER"
  | "CONFIRMATION"
  | "DURATION";

export type AppointmentWarning = {
  warningKey: string;
  code: AppointmentWarningCode;
  source: AppointmentWarningSource;
  message: string;
  managerOverrideRequired: boolean;
  occurrenceKey?: string;
  resourceId?: string;
  staffUserId?: string;
  taskId?: string;
};

export type AppointmentWarningSignal = Omit<AppointmentWarning, "warningKey"> & {
  warningKey?: string;
};

export type AppointmentWarningOverrideRequest = {
  warningKey: string;
  actor: AuthenticatedUser | null;
  locationAccess: AppointmentLocationAccessGrant | null;
  reasonCode?: string | null;
  reasonNotes?: string | null;
  occurredAt?: Date;
};

export type AppointmentWarningOverrideRecord = {
  warningKey: string;
  warningCode: AppointmentWarningCode;
  overriddenByUserId: string;
  reasonCode: string;
  reasonNotes: string;
  occurredAt: Date;
  priorValue: {
    warning: AppointmentWarning;
  };
  newValue: {
    status: "OVERRIDDEN";
  };
};

export type AppointmentWarningEvaluationResult = {
  canCommit: boolean;
  hasHardConflicts: boolean;
  warnings: AppointmentWarning[];
  unresolvedWarnings: AppointmentWarning[];
  overrideRecords: AppointmentWarningOverrideRecord[];
};

function trimRequired(value: string | null | undefined, label: string) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function buildWarningKey(input: {
  code: AppointmentWarningCode;
  source: AppointmentWarningSource;
  occurrenceKey?: string;
  resourceId?: string;
  staffUserId?: string;
  taskId?: string;
  message: string;
}) {
  return [
    input.source,
    input.code,
    input.occurrenceKey ?? "single",
    input.resourceId ?? "no-resource",
    input.staffUserId ?? "no-staff",
    input.taskId ?? "no-task",
    input.message
  ].join("|");
}

function normalizeWarning(signal: AppointmentWarningSignal): AppointmentWarning {
  const message = trimRequired(signal.message, "Appointment warning message");

  if (!APPOINTMENT_WARNING_CODES.includes(signal.code)) {
    throw new Error(`Appointment warning code is invalid: "${signal.code}".`);
  }

  return {
    ...signal,
    message,
    warningKey:
      signal.warningKey ??
      buildWarningKey({
        code: signal.code,
        source: signal.source,
        occurrenceKey: signal.occurrenceKey,
        resourceId: signal.resourceId,
        staffUserId: signal.staffUserId,
        taskId: signal.taskId,
        message
      })
  };
}

function getResourceWarnings(
  hardConflictResult: AppointmentHardConflictEvaluationResult
): AppointmentWarningSignal[] {
  return hardConflictResult.resourceResults.flatMap(({ result }) => {
    if (!result.isWarningOnly) {
      return [];
    }

    return result.reasons.map((reason) => ({
      code: "RESOURCE_WARNING" as const,
      source: "RESOURCE" as const,
      message: reason,
      managerOverrideRequired: true,
      occurrenceKey: hardConflictResult.occurrenceKey ?? undefined,
      resourceId: result.resourceId
    }));
  });
}

function getStaffWarnings(
  hardConflictResult: AppointmentHardConflictEvaluationResult
): AppointmentWarningSignal[] {
  return hardConflictResult.staffResults.flatMap(({ result }) => {
    if (!result.isWarningOnly) {
      return [];
    }

    return result.reasons.map((reason) => ({
      code: "STAFF_OVERLAP" as const,
      source: "STAFF" as const,
      message: reason,
      managerOverrideRequired: true,
      occurrenceKey: hardConflictResult.occurrenceKey ?? undefined,
      staffUserId: result.staffUserId
    }));
  });
}

function getDurationOverrideWarning(
  hardConflictResult: AppointmentHardConflictEvaluationResult
): AppointmentWarningSignal[] {
  if (!hardConflictResult.timeFootprint?.managerApprovalRequired) {
    return [];
  }

  return [
    {
      code: "DURATION_OVERRIDE_REQUIRES_MANAGER_APPROVAL" as const,
      source: "DURATION" as const,
      message: "Duration or buffer override requires manager approval.",
      managerOverrideRequired: true,
      occurrenceKey: hardConflictResult.occurrenceKey ?? undefined
    }
  ];
}

function createOverrideRecord(input: {
  warning: AppointmentWarning;
  override: AppointmentWarningOverrideRequest;
}) {
  if (!input.warning.managerOverrideRequired) {
    throw new Error("This appointment warning does not require a manager override.");
  }

  if (
    !canOverrideAppointmentWarning({
      actor: input.override.actor,
      locationAccess: input.override.locationAccess
    })
  ) {
    throw new Error("Only an authorized manager can override appointment warnings.");
  }

  return {
    warningKey: input.warning.warningKey,
    warningCode: input.warning.code,
    overriddenByUserId: input.override.actor?.id ?? "",
    reasonCode: trimRequired(
      input.override.reasonCode,
      "Appointment warning override reason code"
    ),
    reasonNotes: trimRequired(
      input.override.reasonNotes,
      "Appointment warning override reason notes"
    ),
    occurredAt: input.override.occurredAt ?? new Date(),
    priorValue: {
      warning: input.warning
    },
    newValue: {
      status: "OVERRIDDEN" as const
    }
  };
}

export function evaluateAppointmentWarnings(input: {
  hardConflictResult: AppointmentHardConflictEvaluationResult;
  warningSignals?: AppointmentWarningSignal[];
  overrideRequests?: AppointmentWarningOverrideRequest[];
}): AppointmentWarningEvaluationResult {
  const warnings = [
    ...getDurationOverrideWarning(input.hardConflictResult),
    ...getResourceWarnings(input.hardConflictResult),
    ...getStaffWarnings(input.hardConflictResult),
    ...(input.warningSignals ?? [])
  ].map(normalizeWarning);
  const warningByKey = new Map(warnings.map((warning) => [warning.warningKey, warning]));
  const overrideRecords = (input.overrideRequests ?? []).map((override) => {
    const warning = warningByKey.get(override.warningKey);

    if (!warning) {
      throw new Error(`Cannot override unknown appointment warning: ${override.warningKey}.`);
    }

    return createOverrideRecord({ warning, override });
  });
  const overriddenKeys = new Set(overrideRecords.map((record) => record.warningKey));
  const unresolvedWarnings = warnings.filter(
    (warning) => warning.managerOverrideRequired && !overriddenKeys.has(warning.warningKey)
  );
  const hasHardConflicts = !input.hardConflictResult.canCommit;

  return {
    canCommit: !hasHardConflicts && unresolvedWarnings.length === 0,
    hasHardConflicts,
    warnings,
    unresolvedWarnings,
    overrideRecords
  };
}
