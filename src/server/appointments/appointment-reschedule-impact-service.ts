import type { ResourceReservationStatus } from "@/server/appointments/appointment-resource-domain";
import {
  evaluateAppointmentHardConflicts,
  type AppointmentHardConflictEvaluationInput,
  type AppointmentHardConflictEvaluationResult
} from "@/server/appointments/appointment-hard-conflict-service";
import {
  type AppointmentRecurrenceEditScope,
  type AppointmentRecurrenceOccurrenceForEdit,
  previewRecurrenceEditImpact,
  type RecurrenceEditImpactPreview
} from "@/server/appointments/appointment-recurrence-service";
import {
  evaluateAppointmentWarnings,
  type AppointmentWarningEvaluationResult,
  type AppointmentWarningSignal
} from "@/server/appointments/appointment-warning-service";

export const APPOINTMENT_RESCHEDULE_RESERVATION_ACTIONS = [
  "UNCHANGED",
  "RELEASE_AND_RECREATE",
  "RELEASE_ONLY"
] as const;

export type AppointmentRescheduleReservationAction =
  (typeof APPOINTMENT_RESCHEDULE_RESERVATION_ACTIONS)[number];

export type AppointmentRescheduleReservationSnapshot = {
  id: string;
  requirementCode?: string;
  resourceId: string;
  status: ResourceReservationStatus;
  startsAt: Date;
  endsAt: Date;
  capacityUnits: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
};

export type AppointmentRescheduleCurrentState = {
  appointmentId: string;
  startsAt: Date;
  endsAt: Date;
  reservations: AppointmentRescheduleReservationSnapshot[];
};

export type AppointmentReservationImpact = AppointmentRescheduleReservationSnapshot & {
  action: AppointmentRescheduleReservationAction;
  reason: string;
};

export type AppointmentRescheduleImpactPreview = {
  appointmentId: string;
  prior: {
    startsAt: Date;
    endsAt: Date;
  };
  proposed: {
    startsAt: Date;
    endsAt: Date | null;
    resourceWindowStartsAt: Date | null;
    resourceWindowEndsAt: Date | null;
  };
  canApply: boolean;
  reasonRequired: boolean;
  hardConflictResult: AppointmentHardConflictEvaluationResult;
  warningResult: AppointmentWarningEvaluationResult;
  reservationImpacts: AppointmentReservationImpact[];
  proposedReservationResourceIds: string[];
};

export type AppointmentRecurrenceRescheduleOccurrenceInput = {
  occurrenceKey: string;
  localDate: string;
  status: AppointmentRecurrenceOccurrenceForEdit["status"];
  current: AppointmentRescheduleCurrentState;
  proposedStartsAt: Date;
  candidate: Omit<AppointmentHardConflictEvaluationInput, "startsAt" | "occurrenceKey">;
  warningSignals?: AppointmentWarningSignal[];
};

export type AppointmentRecurrenceRescheduleImpactPreview = {
  scope: AppointmentRecurrenceEditScope;
  targetOccurrenceKey: string;
  canApply: boolean;
  recurrenceImpact: RecurrenceEditImpactPreview;
  occurrencePreviews: AppointmentRescheduleImpactPreview[];
  blockedOccurrenceKeys: string[];
  warningOccurrenceKeys: string[];
  preservedOccurrenceKeys: string[];
};

const capacityConsumingReservationStatuses = new Set<ResourceReservationStatus>([
  "HELD",
  "COMMITTED"
]);

function isSameInstant(left: Date, right: Date) {
  return left.getTime() === right.getTime();
}

function getReservationAction(input: {
  reservation: AppointmentRescheduleReservationSnapshot;
  proposedStartsAt: Date;
  proposedEndsAt: Date | null;
}) {
  if (!capacityConsumingReservationStatuses.has(input.reservation.status)) {
    return {
      action: "UNCHANGED" as const,
      reason: "Reservation does not currently consume capacity."
    };
  }

  if (!input.proposedEndsAt) {
    return {
      action: "RELEASE_ONLY" as const,
      reason: "Proposed appointment time is invalid, so current consuming capacity must be released only if the reschedule is later cancelled or replaced by another valid operation."
    };
  }

  if (
    isSameInstant(input.reservation.startsAt, input.proposedStartsAt) &&
    isSameInstant(input.reservation.endsAt, input.proposedEndsAt)
  ) {
    return {
      action: "UNCHANGED" as const,
      reason: "Reservation time already matches the proposed appointment window."
    };
  }

  return {
    action: "RELEASE_AND_RECREATE" as const,
    reason: "Reservation consumes capacity and must be recreated for the proposed time."
  };
}

function getProposedReservationResourceIds(
  hardConflictResult: AppointmentHardConflictEvaluationResult
) {
  return [
    ...new Set(
      hardConflictResult.resourceResults.map(({ result }) => result.resourceId)
    )
  ].sort((left, right) => left.localeCompare(right));
}

export function previewAppointmentRescheduleImpact(input: {
  current: AppointmentRescheduleCurrentState;
  proposedStartsAt: Date;
  candidate: Omit<AppointmentHardConflictEvaluationInput, "startsAt">;
  warningSignals?: AppointmentWarningSignal[];
}): AppointmentRescheduleImpactPreview {
  const hardConflictResult = evaluateAppointmentHardConflicts({
    ...input.candidate,
    startsAt: input.proposedStartsAt
  });
  const warningResult = evaluateAppointmentWarnings({
    hardConflictResult,
    warningSignals: input.warningSignals
  });
  const proposedEndsAt = hardConflictResult.timeFootprint?.appointmentEndsAt ?? null;
  const reservationImpacts = input.current.reservations.map((reservation) => ({
    ...reservation,
    ...getReservationAction({
      reservation,
      proposedStartsAt: input.proposedStartsAt,
      proposedEndsAt
    })
  }));

  return {
    appointmentId: input.current.appointmentId,
    prior: {
      startsAt: input.current.startsAt,
      endsAt: input.current.endsAt
    },
    proposed: {
      startsAt: input.proposedStartsAt,
      endsAt: proposedEndsAt,
      resourceWindowStartsAt:
        hardConflictResult.timeFootprint?.resourceWindowStartsAt ?? null,
      resourceWindowEndsAt: hardConflictResult.timeFootprint?.resourceWindowEndsAt ?? null
    },
    canApply: warningResult.canCommit,
    reasonRequired: true,
    hardConflictResult,
    warningResult,
    reservationImpacts,
    proposedReservationResourceIds: getProposedReservationResourceIds(hardConflictResult)
  };
}

export function previewRecurrenceRescheduleImpact(input: {
  scope: AppointmentRecurrenceEditScope;
  targetOccurrenceKey: string;
  occurrences: AppointmentRecurrenceRescheduleOccurrenceInput[];
}): AppointmentRecurrenceRescheduleImpactPreview {
  const recurrenceImpact = previewRecurrenceEditImpact({
    scope: input.scope,
    targetOccurrenceKey: input.targetOccurrenceKey,
    occurrences: input.occurrences.map((occurrence) => ({
      occurrenceKey: occurrence.occurrenceKey,
      localDate: occurrence.localDate,
      status: occurrence.status
    }))
  });
  const affectedKeys = new Set(recurrenceImpact.affectedOccurrenceKeys);
  const occurrencePreviews = input.occurrences
    .filter((occurrence) => affectedKeys.has(occurrence.occurrenceKey))
    .map((occurrence) =>
      previewAppointmentRescheduleImpact({
        current: occurrence.current,
        proposedStartsAt: occurrence.proposedStartsAt,
        candidate: {
          ...occurrence.candidate,
          occurrenceKey: occurrence.occurrenceKey
        },
        warningSignals: occurrence.warningSignals
      })
    );
  const blockedOccurrenceKeys = occurrencePreviews
    .filter((preview) => !preview.hardConflictResult.canCommit)
    .map((preview) => preview.hardConflictResult.occurrenceKey)
    .filter((occurrenceKey): occurrenceKey is string => Boolean(occurrenceKey));
  const warningOccurrenceKeys = occurrencePreviews
    .filter(
      (preview) =>
        preview.hardConflictResult.canCommit &&
        preview.warningResult.unresolvedWarnings.length > 0
    )
    .map((preview) => preview.hardConflictResult.occurrenceKey)
    .filter((occurrenceKey): occurrenceKey is string => Boolean(occurrenceKey));

  return {
    scope: input.scope,
    targetOccurrenceKey: input.targetOccurrenceKey,
    canApply:
      blockedOccurrenceKeys.length === 0 &&
      warningOccurrenceKeys.length === 0,
    recurrenceImpact,
    occurrencePreviews,
    blockedOccurrenceKeys,
    warningOccurrenceKeys,
    preservedOccurrenceKeys: recurrenceImpact.preservedOccurrenceKeys
  };
}
