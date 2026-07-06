import type { AuthenticatedUser } from "@/server/auth/store";
import type {
  AppointmentBookingStatus,
  AppointmentCommandType,
  AppointmentHistoryEventType,
  AppointmentSourceType
} from "@/server/appointments/appointment-domain";
import type { AppointmentHardConflict } from "@/server/appointments/appointment-hard-conflict-service";
import type {
  AppointmentReservationCommitCandidate,
  AppointmentReservationReleaseCandidate
} from "@/server/appointments/appointment-reservation-commit-service";
import type { AppointmentWarning } from "@/server/appointments/appointment-warning-service";
import type { AppointmentLocationAccessGrant } from "@/server/policies/access";
import {
  canCreateAppointment,
  canMutateAppointment,
  canTransferAppointmentOwnership
} from "@/server/policies/access";

export const APPOINTMENT_LIFECYCLE_EXECUTION_COMMANDS = [
  "CREATE_DRAFT",
  "SCHEDULE",
  "RESCHEDULE",
  "CANCEL",
  "TRANSFER_OWNER"
] as const satisfies readonly AppointmentCommandType[];

export type AppointmentLifecycleExecutionCommand =
  (typeof APPOINTMENT_LIFECYCLE_EXECUTION_COMMANDS)[number];

export type AppointmentLifecycleCommandAppointment = {
  id: string;
  appointmentNumber: string;
  organizationId: string;
  locationId: string;
  ownerUserId: string | null;
  title: string;
  schedulingTimezone: string;
  startsAt: Date | null;
  endsAt: Date | null;
  bookingStatus: AppointmentBookingStatus;
  version: number;
};

export type AppointmentLifecycleTaskLinkEffect = {
  action: "CREATE_LINK" | "REMOVE_LINK";
  taskId: string;
  linkType: string;
  linkCode: string;
  blocksAppointment: boolean;
  appointmentRequiredForTask: boolean;
};

export type AppointmentLifecycleHistoryEffect = {
  eventType: AppointmentHistoryEventType;
  actorType: "HUMAN" | "SYSTEM" | "AUTOMATION" | "IMPORT";
  actorUserId: string | null;
  message: string;
  reasonCode: string | null;
  reasonNotes: string | null;
  priorValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  correlationId: string;
  causationId: string | null;
  occurredAt: Date;
};

export type AppointmentLifecycleCommandPayload = {
  appointmentNumber?: string;
  title?: string;
  sourceType?: AppointmentSourceType;
  sourceReference?: string | null;
  ownerUserId?: string | null;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  schedulingTimezone?: string;
  purposeSnapshot?: Record<string, unknown> | null;
  customerSnapshot?: Record<string, unknown> | null;
  vehicleSnapshot?: Record<string, unknown> | null;
  sourceSnapshot?: Record<string, unknown> | null;
  reasonCode?: string | null;
  reasonNotes?: string | null;
  followUpDispositionCode?: string | null;
  reservationCandidates?: AppointmentReservationCommitCandidate[];
  releaseReservations?: AppointmentReservationReleaseCandidate[];
  taskLinks?: AppointmentLifecycleTaskLinkEffect[];
  hardConflicts?: AppointmentHardConflict[];
  warnings?: AppointmentWarning[];
  unresolvedWarnings?: AppointmentWarning[];
};

export type AppointmentLifecycleCommandInput = {
  commandId: string;
  commandType: AppointmentLifecycleExecutionCommand;
  actor: AuthenticatedUser | null;
  locationAccess: AppointmentLocationAccessGrant | null;
  appointment: AppointmentLifecycleCommandAppointment | null;
  organizationId: string;
  locationId: string;
  expectedAppointmentVersion: number | null;
  correlationId: string;
  causationId?: string | null;
  payload?: AppointmentLifecycleCommandPayload;
  now?: Date;
};

export type AppointmentLifecycleAppointmentCreateEffect = {
  operation: "CREATE";
  values: {
    appointmentNumber: string;
    organizationId: string;
    locationId: string;
    ownerUserId: string | null;
    createdByUserId: string | null;
    sourceType: AppointmentSourceType;
    sourceReference: string | null;
    title: string;
    schedulingTimezone: string;
    startsAt: Date | null;
    endsAt: Date | null;
    bookingStatus: AppointmentBookingStatus;
    version: 1;
    purposeSnapshot: Record<string, unknown> | null;
    customerSnapshot: Record<string, unknown> | null;
    vehicleSnapshot: Record<string, unknown> | null;
    sourceSnapshot: Record<string, unknown> | null;
  };
};

export type AppointmentLifecycleAppointmentUpdateEffect = {
  operation: "UPDATE";
  appointmentId: string;
  expectedVersion: number;
  set: Record<string, unknown>;
  incrementVersion: 1;
};

export type AppointmentLifecycleAppointmentEffect =
  | AppointmentLifecycleAppointmentCreateEffect
  | AppointmentLifecycleAppointmentUpdateEffect;

export type AppointmentLifecycleReservationEffect =
  | {
      action: "COMMIT_RESERVATIONS";
      candidates: AppointmentReservationCommitCandidate[];
      allowWarningCommit: boolean;
    }
  | {
      action: "RELEASE_RESERVATIONS";
      reservations: AppointmentReservationReleaseCandidate[];
      reasonCode: string;
      reasonNotes: string;
      releasedByUserId: string | null;
    };

export type AppointmentLifecycleCommandExecutionPlan = {
  commandId: string;
  commandType: AppointmentLifecycleExecutionCommand;
  executable: boolean;
  rejectionCode: string | null;
  rejectionReasons: string[];
  appointmentEffect: AppointmentLifecycleAppointmentEffect | null;
  reservationEffects: AppointmentLifecycleReservationEffect[];
  taskLinkEffects: AppointmentLifecycleTaskLinkEffect[];
  historyEffects: AppointmentLifecycleHistoryEffect[];
  commandResultSnapshot: Record<string, unknown>;
};

function requiredText(value: string | null | undefined, label: string) {
  const normalized = value?.trim();

  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function optionalText(value: string | null | undefined) {
  const normalized = value?.trim();

  return normalized || null;
}

function parseOptionalDate(value: Date | string | null | undefined, label: string) {
  if (value === null || value === undefined) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }

  return date;
}

function isExecutionCommand(commandType: AppointmentCommandType): commandType is AppointmentLifecycleExecutionCommand {
  return APPOINTMENT_LIFECYCLE_EXECUTION_COMMANDS.includes(
    commandType as AppointmentLifecycleExecutionCommand
  );
}

function rejectPlan(input: {
  commandId: string;
  commandType: AppointmentLifecycleExecutionCommand;
  rejectionCode: string;
  rejectionReasons: string[];
  commandResultSnapshot?: Record<string, unknown>;
}): AppointmentLifecycleCommandExecutionPlan {
  return {
    commandId: input.commandId,
    commandType: input.commandType,
    executable: false,
    rejectionCode: input.rejectionCode,
    rejectionReasons: input.rejectionReasons,
    appointmentEffect: null,
    reservationEffects: [],
    taskLinkEffects: [],
    historyEffects: [],
    commandResultSnapshot: {
      rejected: true,
      rejectionCode: input.rejectionCode,
      rejectionReasons: input.rejectionReasons,
      ...(input.commandResultSnapshot ?? {})
    }
  };
}

function getRequiredReason(payload: AppointmentLifecycleCommandPayload | undefined) {
  return {
    reasonCode: requiredText(payload?.reasonCode, "Appointment command reason code"),
    reasonNotes: requiredText(payload?.reasonNotes, "Appointment command reason notes")
  };
}

function buildHistoryEffect(input: {
  command: AppointmentLifecycleCommandInput;
  eventType: AppointmentHistoryEventType;
  message: string;
  reasonCode?: string | null;
  reasonNotes?: string | null;
  priorValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}): AppointmentLifecycleHistoryEffect {
  return {
    eventType: input.eventType,
    actorType: "HUMAN",
    actorUserId: input.command.actor?.id ?? null,
    message: input.message,
    reasonCode: input.reasonCode ?? null,
    reasonNotes: input.reasonNotes ?? null,
    priorValue: input.priorValue ?? null,
    newValue: input.newValue ?? null,
    correlationId: input.command.correlationId,
    causationId: input.command.causationId ?? input.command.commandId,
    occurredAt: input.command.now ?? new Date()
  };
}

function assertNoSchedulingBlocks(input: AppointmentLifecycleCommandInput) {
  const hardConflicts = input.payload?.hardConflicts ?? [];
  const unresolvedWarnings = input.payload?.unresolvedWarnings ?? [];

  if (hardConflicts.length > 0) {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "HARD_CONFLICT",
      rejectionReasons: hardConflicts.map((conflict) => conflict.message),
      commandResultSnapshot: {
        hardConflicts
      }
    });
  }

  if (unresolvedWarnings.length > 0) {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "UNRESOLVED_WARNING",
      rejectionReasons: unresolvedWarnings.map((warning) => warning.message),
      commandResultSnapshot: {
        unresolvedWarnings
      }
    });
  }

  return null;
}

function assertExistingAppointment(input: AppointmentLifecycleCommandInput) {
  if (!input.appointment) {
    throw new Error(`${input.commandType} requires an existing appointment.`);
  }

  return input.appointment;
}

function assertExpectedVersion(input: AppointmentLifecycleCommandInput) {
  const appointment = assertExistingAppointment(input);

  if (input.expectedAppointmentVersion !== appointment.version) {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "STALE_VERSION",
      rejectionReasons: [
        `Expected appointment version ${input.expectedAppointmentVersion}; current version is ${appointment.version}.`
      ],
      commandResultSnapshot: {
        appointmentId: appointment.id,
        expectedAppointmentVersion: input.expectedAppointmentVersion,
        currentAppointmentVersion: appointment.version
      }
    });
  }

  return null;
}

function buildCreateDraftPlan(
  input: AppointmentLifecycleCommandInput
): AppointmentLifecycleCommandExecutionPlan {
  const ownerUserId = optionalText(input.payload?.ownerUserId) ?? input.actor?.id ?? null;

  if (
    !canCreateAppointment({
      actor: input.actor,
      ownerUserId,
      locationAccess: input.locationAccess
    })
  ) {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "UNAUTHORIZED",
      rejectionReasons: ["Actor is not authorized to create this appointment."]
    });
  }

  const now = input.now ?? new Date();
  const appointmentNumber = requiredText(
    input.payload?.appointmentNumber,
    "Appointment number"
  );
  const title = requiredText(input.payload?.title, "Appointment title");
  const effect: AppointmentLifecycleAppointmentCreateEffect = {
    operation: "CREATE",
    values: {
      appointmentNumber,
      organizationId: input.organizationId,
      locationId: input.locationId,
      ownerUserId,
      createdByUserId: input.actor?.id ?? null,
      sourceType: input.payload?.sourceType ?? "MANUAL",
      sourceReference: input.payload?.sourceReference ?? null,
      title,
      schedulingTimezone: requiredText(
        input.payload?.schedulingTimezone,
        "Appointment scheduling timezone"
      ),
      startsAt: parseOptionalDate(input.payload?.startsAt, "Appointment start"),
      endsAt: parseOptionalDate(input.payload?.endsAt, "Appointment end"),
      bookingStatus: "DRAFT",
      version: 1,
      purposeSnapshot: input.payload?.purposeSnapshot ?? null,
      customerSnapshot: input.payload?.customerSnapshot ?? null,
      vehicleSnapshot: input.payload?.vehicleSnapshot ?? null,
      sourceSnapshot: input.payload?.sourceSnapshot ?? null
    }
  };

  return {
    commandId: input.commandId,
    commandType: input.commandType,
    executable: true,
    rejectionCode: null,
    rejectionReasons: [],
    appointmentEffect: effect,
    reservationEffects: [],
    taskLinkEffects: input.payload?.taskLinks ?? [],
    historyEffects: [
      buildHistoryEffect({
        command: { ...input, now },
        eventType: "CREATED",
        message: `Appointment ${appointmentNumber} draft created.`,
        newValue: effect.values
      })
    ],
    commandResultSnapshot: {
      appointmentNumber,
      bookingStatus: "DRAFT",
      taskLinkCount: input.payload?.taskLinks?.length ?? 0
    }
  };
}

function buildSchedulePlan(
  input: AppointmentLifecycleCommandInput
): AppointmentLifecycleCommandExecutionPlan {
  const appointment = assertExistingAppointment(input);
  const stalePlan = assertExpectedVersion(input);

  if (stalePlan) {
    return stalePlan;
  }

  if (
    !canMutateAppointment({
      actor: input.actor,
      ownerUserId: appointment.ownerUserId,
      locationAccess: input.locationAccess
    })
  ) {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "UNAUTHORIZED",
      rejectionReasons: ["Actor is not authorized to schedule this appointment."]
    });
  }

  const blockedPlan = assertNoSchedulingBlocks(input);

  if (blockedPlan) {
    return blockedPlan;
  }

  const startsAt = parseOptionalDate(input.payload?.startsAt, "Appointment start");
  const endsAt = parseOptionalDate(input.payload?.endsAt, "Appointment end");

  if (!appointment.ownerUserId) {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "OWNER_REQUIRED",
      rejectionReasons: ["A scheduled appointment requires an accountable owner."]
    });
  }

  if (!startsAt || !endsAt || endsAt <= startsAt) {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "INVALID_TIME",
      rejectionReasons: ["Scheduling requires a valid start and end time."]
    });
  }

  const set = {
    startsAt,
    endsAt,
    bookingStatus: "SCHEDULED",
    schedulingTimezone: input.payload?.schedulingTimezone ?? appointment.schedulingTimezone
  };

  return {
    commandId: input.commandId,
    commandType: input.commandType,
    executable: true,
    rejectionCode: null,
    rejectionReasons: [],
    appointmentEffect: {
      operation: "UPDATE",
      appointmentId: appointment.id,
      expectedVersion: appointment.version,
      set,
      incrementVersion: 1
    },
    reservationEffects:
      input.payload?.reservationCandidates && input.payload.reservationCandidates.length > 0
        ? [
            {
              action: "COMMIT_RESERVATIONS",
              candidates: input.payload.reservationCandidates,
              allowWarningCommit: Boolean(input.payload.warnings?.length)
            }
          ]
        : [],
    taskLinkEffects: input.payload?.taskLinks ?? [],
    historyEffects: [
      buildHistoryEffect({
        command: input,
        eventType: "SCHEDULED",
        message: `Appointment ${appointment.appointmentNumber} scheduled.`,
        priorValue: {
          startsAt: appointment.startsAt,
          endsAt: appointment.endsAt,
          bookingStatus: appointment.bookingStatus
        },
        newValue: set
      })
    ],
    commandResultSnapshot: {
      appointmentId: appointment.id,
      bookingStatus: "SCHEDULED",
      reservationCandidateCount: input.payload?.reservationCandidates?.length ?? 0
    }
  };
}

function buildReschedulePlan(
  input: AppointmentLifecycleCommandInput
): AppointmentLifecycleCommandExecutionPlan {
  const appointment = assertExistingAppointment(input);
  const stalePlan = assertExpectedVersion(input);

  if (stalePlan) {
    return stalePlan;
  }

  if (
    !canMutateAppointment({
      actor: input.actor,
      ownerUserId: appointment.ownerUserId,
      locationAccess: input.locationAccess
    })
  ) {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "UNAUTHORIZED",
      rejectionReasons: ["Actor is not authorized to reschedule this appointment."]
    });
  }

  const blockedPlan = assertNoSchedulingBlocks(input);

  if (blockedPlan) {
    return blockedPlan;
  }

  const { reasonCode, reasonNotes } = getRequiredReason(input.payload);
  const startsAt = parseOptionalDate(input.payload?.startsAt, "Appointment start");
  const endsAt = parseOptionalDate(input.payload?.endsAt, "Appointment end");

  if (!startsAt || !endsAt || endsAt <= startsAt) {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "INVALID_TIME",
      rejectionReasons: ["Rescheduling requires a valid start and end time."]
    });
  }

  const set = {
    startsAt,
    endsAt,
    schedulingTimezone: input.payload?.schedulingTimezone ?? appointment.schedulingTimezone
  };
  const reservationEffects: AppointmentLifecycleReservationEffect[] = [];

  if (input.payload?.releaseReservations?.length) {
    reservationEffects.push({
      action: "RELEASE_RESERVATIONS",
      reservations: input.payload.releaseReservations,
      reasonCode,
      reasonNotes,
      releasedByUserId: input.actor?.id ?? null
    });
  }

  if (input.payload?.reservationCandidates?.length) {
    reservationEffects.push({
      action: "COMMIT_RESERVATIONS",
      candidates: input.payload.reservationCandidates,
      allowWarningCommit: Boolean(input.payload.warnings?.length)
    });
  }

  return {
    commandId: input.commandId,
    commandType: input.commandType,
    executable: true,
    rejectionCode: null,
    rejectionReasons: [],
    appointmentEffect: {
      operation: "UPDATE",
      appointmentId: appointment.id,
      expectedVersion: appointment.version,
      set,
      incrementVersion: 1
    },
    reservationEffects,
    taskLinkEffects: input.payload?.taskLinks ?? [],
    historyEffects: [
      buildHistoryEffect({
        command: input,
        eventType: "RESCHEDULED",
        message: `Appointment ${appointment.appointmentNumber} rescheduled.`,
        reasonCode,
        reasonNotes,
        priorValue: {
          startsAt: appointment.startsAt,
          endsAt: appointment.endsAt
        },
        newValue: set
      })
    ],
    commandResultSnapshot: {
      appointmentId: appointment.id,
      rescheduled: true,
      releaseReservationCount: input.payload?.releaseReservations?.length ?? 0,
      reservationCandidateCount: input.payload?.reservationCandidates?.length ?? 0
    }
  };
}

function buildCancelPlan(
  input: AppointmentLifecycleCommandInput
): AppointmentLifecycleCommandExecutionPlan {
  const appointment = assertExistingAppointment(input);
  const stalePlan = assertExpectedVersion(input);

  if (stalePlan) {
    return stalePlan;
  }

  if (
    !canMutateAppointment({
      actor: input.actor,
      ownerUserId: appointment.ownerUserId,
      locationAccess: input.locationAccess
    })
  ) {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "UNAUTHORIZED",
      rejectionReasons: ["Actor is not authorized to cancel this appointment."]
    });
  }

  const { reasonCode, reasonNotes } = getRequiredReason(input.payload);
  const now = input.now ?? new Date();
  const followUpDispositionCode = requiredText(
    input.payload?.followUpDispositionCode,
    "Cancellation follow-up disposition"
  );
  const set = {
    bookingStatus: "CANCELLED",
    cancelledAt: now,
    cancellationReasonCode: reasonCode,
    cancellationReasonNotes: reasonNotes,
    followUpDispositionCode
  };

  return {
    commandId: input.commandId,
    commandType: input.commandType,
    executable: true,
    rejectionCode: null,
    rejectionReasons: [],
    appointmentEffect: {
      operation: "UPDATE",
      appointmentId: appointment.id,
      expectedVersion: appointment.version,
      set,
      incrementVersion: 1
    },
    reservationEffects: input.payload?.releaseReservations?.length
      ? [
          {
            action: "RELEASE_RESERVATIONS",
            reservations: input.payload.releaseReservations,
            reasonCode,
            reasonNotes,
            releasedByUserId: input.actor?.id ?? null
          }
        ]
      : [],
    taskLinkEffects: input.payload?.taskLinks ?? [],
    historyEffects: [
      buildHistoryEffect({
        command: { ...input, now },
        eventType: "CANCELLED",
        message: `Appointment ${appointment.appointmentNumber} cancelled.`,
        reasonCode,
        reasonNotes,
        priorValue: {
          bookingStatus: appointment.bookingStatus
        },
        newValue: set
      })
    ],
    commandResultSnapshot: {
      appointmentId: appointment.id,
      bookingStatus: "CANCELLED",
      releaseReservationCount: input.payload?.releaseReservations?.length ?? 0
    }
  };
}

function buildTransferOwnerPlan(
  input: AppointmentLifecycleCommandInput
): AppointmentLifecycleCommandExecutionPlan {
  const appointment = assertExistingAppointment(input);
  const stalePlan = assertExpectedVersion(input);

  if (stalePlan) {
    return stalePlan;
  }

  if (
    !canTransferAppointmentOwnership({
      actor: input.actor,
      locationAccess: input.locationAccess
    })
  ) {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "UNAUTHORIZED",
      rejectionReasons: ["Only an authorized manager can transfer appointment ownership."]
    });
  }

  const { reasonCode, reasonNotes } = getRequiredReason(input.payload);
  const ownerUserId = requiredText(input.payload?.ownerUserId, "New appointment owner");
  const set = {
    ownerUserId
  };

  return {
    commandId: input.commandId,
    commandType: input.commandType,
    executable: true,
    rejectionCode: null,
    rejectionReasons: [],
    appointmentEffect: {
      operation: "UPDATE",
      appointmentId: appointment.id,
      expectedVersion: appointment.version,
      set,
      incrementVersion: 1
    },
    reservationEffects: [],
    taskLinkEffects: input.payload?.taskLinks ?? [],
    historyEffects: [
      buildHistoryEffect({
        command: input,
        eventType: "OWNER_CHANGED",
        message: `Appointment ${appointment.appointmentNumber} owner changed.`,
        reasonCode,
        reasonNotes,
        priorValue: {
          ownerUserId: appointment.ownerUserId
        },
        newValue: set
      })
    ],
    commandResultSnapshot: {
      appointmentId: appointment.id,
      ownerUserId
    }
  };
}

export function planAppointmentLifecycleCommandExecution(
  input: AppointmentLifecycleCommandInput
): AppointmentLifecycleCommandExecutionPlan {
  if (!isExecutionCommand(input.commandType)) {
    throw new Error(`Appointment command execution is not supported for ${input.commandType}.`);
  }

  switch (input.commandType) {
    case "CREATE_DRAFT":
      return buildCreateDraftPlan(input);
    case "SCHEDULE":
      return buildSchedulePlan(input);
    case "RESCHEDULE":
      return buildReschedulePlan(input);
    case "CANCEL":
      return buildCancelPlan(input);
    case "TRANSFER_OWNER":
      return buildTransferOwnerPlan(input);
  }
}
