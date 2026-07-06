import type { AuthenticatedUser } from "@/server/auth/store";
import type {
  AppointmentBookingStatus,
  AppointmentCommandType,
  AppointmentAttendanceStatus,
  AppointmentConfirmationStatus,
  AppointmentExecutionStatus,
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
  canApproveAppointment,
  canCreateAppointment,
  canMutateAppointment,
  canTransferAppointmentOwnership
} from "@/server/policies/access";

export const APPOINTMENT_LIFECYCLE_EXECUTION_COMMANDS = [
  "CREATE_DRAFT",
  "APPROVE",
  "EDIT",
  "SCHEDULE",
  "RESCHEDULE",
  "CANCEL",
  "COMPLETE",
  "CONFIRM",
  "DECLINE",
  "CHECK_IN",
  "NO_SHOW",
  "START",
  "WAIT",
  "FINISH",
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
  confirmationStatus: AppointmentConfirmationStatus;
  attendanceStatus: AppointmentAttendanceStatus;
  executionStatus: AppointmentExecutionStatus;
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

export type AppointmentLifecycleTaskCreateEffect = {
  action: "CREATE_TASK";
  automationRuleCode: string;
  templateVersion: number;
  title: string;
  description: string;
  assignedUserId: string;
  createdByUserId: string;
  boardDate: string;
  dueAt: Date;
  status: "NOT_STARTED" | "IN_PROGRESS" | "BLOCKED" | "WAITING_ON_PARTS" | "WAITING_ON_APPROVAL" | "READY_FOR_REVIEW" | "COMPLETED";
  workflowArea:
    | "INVENTORY"
    | "ADVERTISING"
    | "MARKETING"
    | "SALES"
    | "ADMIN"
    | "COLLECTIONS"
    | "SHOP"
    | "GENERAL_MANAGER";
  sourceType: "MANAGER" | "STAFF" | "TEMPLATE";
  requiresManagerApproval: boolean;
  customerReference: string | null;
  vehicleReference: string | null;
  linkType: string;
  linkCode: string;
  linkTitle: string;
  linkExplanation: string;
  blocksAppointment: boolean;
  blocksTask: boolean;
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
  customerReference?: string | null;
  vehicleReference?: string | null;
  reasonCode?: string | null;
  reasonNotes?: string | null;
  outcomeCode?: string | null;
  outcomeNotes?: string | null;
  followUpDispositionCode?: string | null;
  followUpNotes?: string | null;
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
  taskCreateEffects?: AppointmentLifecycleTaskCreateEffect[];
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

function addBusinessDays(date: Date, businessDays: number) {
  const result = new Date(date);
  let remaining = businessDays;

  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);

    const day = result.getUTCDay();

    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }

  return result;
}

function inferTaskWorkflowArea(title: string, followUpDispositionCode: string) {
  const normalizedTitle = title.toLowerCase();

  if (followUpDispositionCode === "MANAGER_REVIEW_REQUIRED") {
    return "GENERAL_MANAGER" as const;
  }

  if (
    normalizedTitle.includes("service") ||
    normalizedTitle.includes("repair") ||
    normalizedTitle.includes("oil")
  ) {
    return "SHOP" as const;
  }

  if (
    normalizedTitle.includes("dmv") ||
    normalizedTitle.includes("title") ||
    normalizedTitle.includes("registration") ||
    normalizedTitle.includes("document")
  ) {
    return "ADMIN" as const;
  }

  if (normalizedTitle.includes("collection") || normalizedTitle.includes("payment")) {
    return "COLLECTIONS" as const;
  }

  if (normalizedTitle.includes("inventory") || normalizedTitle.includes("vendor")) {
    return "INVENTORY" as const;
  }

  if (normalizedTitle.includes("marketing") || normalizedTitle.includes("listing")) {
    return "MARKETING" as const;
  }

  if (normalizedTitle.includes("test drive") || normalizedTitle.includes("sales")) {
    return "SALES" as const;
  }

  return "ADMIN" as const;
}

function getFollowUpTaskTitle(input: {
  appointmentNumber: string;
  followUpDispositionCode: string;
}) {
  if (input.followUpDispositionCode === "CALLBACK_REQUIRED") {
    return `Callback required for appointment ${input.appointmentNumber}`;
  }

  if (input.followUpDispositionCode === "FOLLOW_UP_APPOINTMENT_REQUIRED") {
    return `Schedule follow-up appointment for ${input.appointmentNumber}`;
  }

  if (input.followUpDispositionCode === "MANAGER_REVIEW_REQUIRED") {
    return `Manager review required for appointment ${input.appointmentNumber}`;
  }

  return `Follow up on appointment ${input.appointmentNumber}`;
}

function buildOutcomeFollowUpTaskEffects(input: {
  appointment: AppointmentLifecycleCommandAppointment;
  actor: AuthenticatedUser | null;
  payload: AppointmentLifecycleCommandPayload | undefined;
  followUpDispositionCode: string;
  followUpNotes: string | null;
  now: Date;
}): AppointmentLifecycleTaskCreateEffect[] {
  if (
    input.followUpDispositionCode === "NO_FOLLOW_UP_REQUIRED" ||
    input.followUpDispositionCode === "TASK_CREATED"
  ) {
    return [];
  }

  const assignedUserId = input.appointment.ownerUserId ?? input.actor?.id;
  const createdByUserId = input.actor?.id;

  if (!assignedUserId || !createdByUserId) {
    return [];
  }

  const dueAt = addBusinessDays(input.now, 1);
  const title = getFollowUpTaskTitle({
    appointmentNumber: input.appointment.appointmentNumber,
    followUpDispositionCode: input.followUpDispositionCode
  });
  const followUpNotes = input.followUpNotes ?? "Follow-up required from appointment outcome.";

  return [
    {
      action: "CREATE_TASK",
      automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_TASK",
      templateVersion: 1,
      title,
      description: [
        `Auto-created from completed appointment ${input.appointment.appointmentNumber}: ${input.appointment.title}.`,
        `Follow-up disposition: ${input.followUpDispositionCode}.`,
        `Next step: ${followUpNotes}`
      ].join("\n"),
      assignedUserId,
      createdByUserId,
      boardDate: dueAt.toISOString().slice(0, 10),
      dueAt,
      status: "NOT_STARTED",
      workflowArea: inferTaskWorkflowArea(input.appointment.title, input.followUpDispositionCode),
      sourceType: "MANAGER",
      requiresManagerApproval: input.followUpDispositionCode === "MANAGER_REVIEW_REQUIRED",
      customerReference: optionalText(input.payload?.customerReference),
      vehicleReference: optionalText(input.payload?.vehicleReference),
      linkType: "FOLLOW_UP",
      linkCode: `OUTCOME_${input.followUpDispositionCode}`,
      linkTitle: "Outcome follow-up task",
      linkExplanation: "Created automatically from final appointment outcome disposition.",
      blocksAppointment: false,
      blocksTask: true
    }
  ];
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

function assertMutableAppointment(input: AppointmentLifecycleCommandInput) {
  const appointment = assertExistingAppointment(input);
  const stalePlan = assertExpectedVersion(input);

  if (stalePlan) {
    return {
      appointment,
      rejection: stalePlan
    };
  }

  if (
    !canMutateAppointment({
      actor: input.actor,
      ownerUserId: appointment.ownerUserId,
      locationAccess: input.locationAccess
    })
  ) {
    return {
      appointment,
      rejection: rejectPlan({
        commandId: input.commandId,
        commandType: input.commandType,
        rejectionCode: "UNAUTHORIZED",
        rejectionReasons: ["Actor is not authorized to update this appointment."]
      })
    };
  }

  return {
    appointment,
    rejection: null
  };
}

function assertOpenScheduledAppointment(input: AppointmentLifecycleCommandInput) {
  const { appointment, rejection } = assertMutableAppointment(input);

  if (rejection) {
    return {
      appointment,
      rejection
    };
  }

  if (appointment.bookingStatus !== "SCHEDULED") {
    return {
      appointment,
      rejection: rejectPlan({
        commandId: input.commandId,
        commandType: input.commandType,
        rejectionCode: "INVALID_BOOKING_STATUS",
        rejectionReasons: [
          `${input.commandType} requires a scheduled appointment; current status is ${appointment.bookingStatus}.`
        ],
        commandResultSnapshot: {
          appointmentId: appointment.id,
          bookingStatus: appointment.bookingStatus
        }
      })
    };
  }

  return {
    appointment,
    rejection: null
  };
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

function buildApprovePlan(
  input: AppointmentLifecycleCommandInput
): AppointmentLifecycleCommandExecutionPlan {
  const appointment = assertExistingAppointment(input);
  const stalePlan = assertExpectedVersion(input);

  if (stalePlan) {
    return stalePlan;
  }

  if (
    !canApproveAppointment({
      actor: input.actor,
      locationAccess: input.locationAccess
    })
  ) {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "UNAUTHORIZED",
      rejectionReasons: ["Only an authorized manager can approve this appointment."]
    });
  }

  const blockedPlan = assertNoSchedulingBlocks(input);

  if (blockedPlan) {
    return blockedPlan;
  }

  const startsAt =
    parseOptionalDate(input.payload?.startsAt, "Appointment start") ?? appointment.startsAt;
  const endsAt = parseOptionalDate(input.payload?.endsAt, "Appointment end") ?? appointment.endsAt;

  if (!appointment.ownerUserId) {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "OWNER_REQUIRED",
      rejectionReasons: ["An approved appointment requires an accountable owner."]
    });
  }

  if (!startsAt || !endsAt || endsAt <= startsAt) {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "INVALID_TIME",
      rejectionReasons: ["Approval requires a valid scheduled start and end time."]
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
        eventType: "APPROVED",
        message: `Appointment ${appointment.appointmentNumber} approved.`,
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
      approved: true,
      bookingStatus: "SCHEDULED",
      reservationCandidateCount: input.payload?.reservationCandidates?.length ?? 0
    }
  };
}

function buildEditSet(input: AppointmentLifecycleCommandInput) {
  const set: Record<string, unknown> = {};

  if (input.payload?.startsAt !== undefined || input.payload?.endsAt !== undefined) {
    return {
      error: "EDIT cannot change appointment time. Use RESCHEDULE for time changes.",
      set
    };
  }

  if (input.payload?.title !== undefined) {
    set.title = requiredText(input.payload.title, "Appointment title");
  }

  if (input.payload?.schedulingTimezone !== undefined) {
    set.schedulingTimezone = requiredText(
      input.payload.schedulingTimezone,
      "Appointment scheduling timezone"
    );
  }

  if (input.payload?.purposeSnapshot !== undefined) {
    set.purposeSnapshot = input.payload.purposeSnapshot;
  }

  if (input.payload?.customerSnapshot !== undefined) {
    set.customerSnapshot = input.payload.customerSnapshot;
  }

  if (input.payload?.vehicleSnapshot !== undefined) {
    set.vehicleSnapshot = input.payload.vehicleSnapshot;
  }

  if (input.payload?.sourceSnapshot !== undefined) {
    set.sourceSnapshot = input.payload.sourceSnapshot;
  }

  return {
    error: null,
    set
  };
}

function buildEditPlan(
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
      rejectionReasons: ["Actor is not authorized to edit this appointment."]
    });
  }

  const { error, set } = buildEditSet(input);

  if (error) {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "USE_RESCHEDULE",
      rejectionReasons: [error]
    });
  }

  if (Object.keys(set).length === 0 && !input.payload?.taskLinks?.length) {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "NO_EDIT_FIELDS",
      rejectionReasons: ["EDIT requires at least one editable appointment field or task-link effect."]
    });
  }

  return {
    commandId: input.commandId,
    commandType: input.commandType,
    executable: true,
    rejectionCode: null,
    rejectionReasons: [],
    appointmentEffect:
      Object.keys(set).length > 0
        ? {
            operation: "UPDATE",
            appointmentId: appointment.id,
            expectedVersion: appointment.version,
            set,
            incrementVersion: 1
          }
        : null,
    reservationEffects: [],
    taskLinkEffects: input.payload?.taskLinks ?? [],
    historyEffects: [
      buildHistoryEffect({
        command: input,
        eventType: "FIELD_UPDATED",
        message: `Appointment ${appointment.appointmentNumber} details edited.`,
        priorValue: {
          title: appointment.title,
          schedulingTimezone: appointment.schedulingTimezone
        },
        newValue: set
      })
    ],
    commandResultSnapshot: {
      appointmentId: appointment.id,
      editedFields: Object.keys(set),
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

function buildConfirmPlan(
  input: AppointmentLifecycleCommandInput
): AppointmentLifecycleCommandExecutionPlan {
  const { appointment, rejection } = assertOpenScheduledAppointment(input);

  if (rejection) {
    return rejection;
  }

  const now = input.now ?? new Date();
  const set = {
    confirmationStatus: "CONFIRMED",
    confirmedAt: now
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
        command: { ...input, now },
        eventType: "CONFIRMED",
        message: `Appointment ${appointment.appointmentNumber} confirmed.`,
        priorValue: {
          confirmationStatus: appointment.confirmationStatus
        },
        newValue: set
      })
    ],
    commandResultSnapshot: {
      appointmentId: appointment.id,
      confirmationStatus: "CONFIRMED"
    }
  };
}

function buildDeclinePlan(
  input: AppointmentLifecycleCommandInput
): AppointmentLifecycleCommandExecutionPlan {
  const { appointment, rejection } = assertOpenScheduledAppointment(input);

  if (rejection) {
    return rejection;
  }

  const { reasonCode, reasonNotes } = getRequiredReason(input.payload);
  const now = input.now ?? new Date();
  const followUpDispositionCode = requiredText(
    input.payload?.followUpDispositionCode,
    "Decline follow-up disposition"
  );
  const set = {
    confirmationStatus: "DECLINED",
    declinedAt: now,
    confirmationDeclineReasonCode: reasonCode,
    confirmationDeclineReasonNotes: reasonNotes,
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
    reservationEffects: [],
    taskLinkEffects: input.payload?.taskLinks ?? [],
    historyEffects: [
      buildHistoryEffect({
        command: { ...input, now },
        eventType: "DECLINED",
        message: `Appointment ${appointment.appointmentNumber} declined.`,
        reasonCode,
        reasonNotes,
        priorValue: {
          confirmationStatus: appointment.confirmationStatus
        },
        newValue: set
      })
    ],
    commandResultSnapshot: {
      appointmentId: appointment.id,
      confirmationStatus: "DECLINED",
      followUpDispositionCode
    }
  };
}

function buildCheckInPlan(
  input: AppointmentLifecycleCommandInput
): AppointmentLifecycleCommandExecutionPlan {
  const { appointment, rejection } = assertOpenScheduledAppointment(input);

  if (rejection) {
    return rejection;
  }

  if (appointment.attendanceStatus === "NO_SHOW") {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "NO_SHOW_RECORDED",
      rejectionReasons: ["A no-show appointment cannot be checked in without a corrective edit."]
    });
  }

  const now = input.now ?? new Date();
  const set = {
    attendanceStatus: "CHECKED_IN",
    checkedInAt: now
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
        command: { ...input, now },
        eventType: "CHECKED_IN",
        message: `Appointment ${appointment.appointmentNumber} checked in.`,
        priorValue: {
          attendanceStatus: appointment.attendanceStatus
        },
        newValue: set
      })
    ],
    commandResultSnapshot: {
      appointmentId: appointment.id,
      attendanceStatus: "CHECKED_IN"
    }
  };
}

function buildNoShowPlan(
  input: AppointmentLifecycleCommandInput
): AppointmentLifecycleCommandExecutionPlan {
  const { appointment, rejection } = assertOpenScheduledAppointment(input);

  if (rejection) {
    return rejection;
  }

  const { reasonCode, reasonNotes } = getRequiredReason(input.payload);
  const now = input.now ?? new Date();
  const followUpDispositionCode = requiredText(
    input.payload?.followUpDispositionCode,
    "No-show follow-up disposition"
  );
  const set = {
    attendanceStatus: "NO_SHOW",
    executionStatus: "NOT_STARTED",
    noShowAt: now,
    noShowReasonCode: reasonCode,
    noShowReasonNotes: reasonNotes,
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
        eventType: "NO_SHOW_RECORDED",
        message: `Appointment ${appointment.appointmentNumber} marked as no-show.`,
        reasonCode,
        reasonNotes,
        priorValue: {
          attendanceStatus: appointment.attendanceStatus,
          executionStatus: appointment.executionStatus
        },
        newValue: set
      })
    ],
    commandResultSnapshot: {
      appointmentId: appointment.id,
      attendanceStatus: "NO_SHOW",
      followUpDispositionCode,
      releaseReservationCount: input.payload?.releaseReservations?.length ?? 0
    }
  };
}

function buildStartPlan(
  input: AppointmentLifecycleCommandInput
): AppointmentLifecycleCommandExecutionPlan {
  const { appointment, rejection } = assertOpenScheduledAppointment(input);

  if (rejection) {
    return rejection;
  }

  if (appointment.attendanceStatus === "NO_SHOW") {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "NO_SHOW_RECORDED",
      rejectionReasons: ["A no-show appointment cannot be started without a corrective edit."]
    });
  }

  const now = input.now ?? new Date();
  const set = {
    executionStatus: "IN_PROGRESS",
    startedAt: now
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
        command: { ...input, now },
        eventType: "STARTED",
        message: `Appointment ${appointment.appointmentNumber} started.`,
        priorValue: {
          executionStatus: appointment.executionStatus
        },
        newValue: set
      })
    ],
    commandResultSnapshot: {
      appointmentId: appointment.id,
      executionStatus: "IN_PROGRESS"
    }
  };
}

function buildWaitPlan(
  input: AppointmentLifecycleCommandInput
): AppointmentLifecycleCommandExecutionPlan {
  const { appointment, rejection } = assertOpenScheduledAppointment(input);

  if (rejection) {
    return rejection;
  }

  if (appointment.executionStatus !== "IN_PROGRESS" && appointment.executionStatus !== "WAITING") {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "EXECUTION_NOT_STARTED",
      rejectionReasons: ["WAIT requires an appointment that is already in progress."]
    });
  }

  const { reasonCode, reasonNotes } = getRequiredReason(input.payload);
  const now = input.now ?? new Date();
  const set = {
    executionStatus: "WAITING",
    waitingAt: now,
    waitingReasonCode: reasonCode,
    waitingReasonNotes: reasonNotes
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
        command: { ...input, now },
        eventType: "WAITING",
        message: `Appointment ${appointment.appointmentNumber} waiting.`,
        reasonCode,
        reasonNotes,
        priorValue: {
          executionStatus: appointment.executionStatus
        },
        newValue: set
      })
    ],
    commandResultSnapshot: {
      appointmentId: appointment.id,
      executionStatus: "WAITING"
    }
  };
}

function buildFinishPlan(
  input: AppointmentLifecycleCommandInput
): AppointmentLifecycleCommandExecutionPlan {
  const { appointment, rejection } = assertOpenScheduledAppointment(input);

  if (rejection) {
    return rejection;
  }

  if (appointment.executionStatus !== "IN_PROGRESS" && appointment.executionStatus !== "WAITING") {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "EXECUTION_NOT_STARTED",
      rejectionReasons: ["FINISH requires an appointment that is in progress or waiting."]
    });
  }

  const now = input.now ?? new Date();
  const set = {
    executionStatus: "FINISHED",
    finishedAt: now
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
        command: { ...input, now },
        eventType: "FINISHED",
        message: `Appointment ${appointment.appointmentNumber} finished.`,
        priorValue: {
          executionStatus: appointment.executionStatus
        },
        newValue: set
      })
    ],
    commandResultSnapshot: {
      appointmentId: appointment.id,
      executionStatus: "FINISHED"
    }
  };
}

function buildCompletePlan(
  input: AppointmentLifecycleCommandInput
): AppointmentLifecycleCommandExecutionPlan {
  const { appointment, rejection } = assertOpenScheduledAppointment(input);

  if (rejection) {
    return rejection;
  }

  if (appointment.attendanceStatus === "NO_SHOW") {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "NO_SHOW_RECORDED",
      rejectionReasons: ["A no-show appointment must use the no-show follow-up workflow."]
    });
  }

  if (appointment.executionStatus !== "FINISHED") {
    return rejectPlan({
      commandId: input.commandId,
      commandType: input.commandType,
      rejectionCode: "EXECUTION_NOT_FINISHED",
      rejectionReasons: ["COMPLETE requires a finished appointment execution."]
    });
  }

  const { reasonCode, reasonNotes } = getRequiredReason(input.payload);
  const now = input.now ?? new Date();
  const outcomeCode = requiredText(input.payload?.outcomeCode, "Appointment outcome");
  const followUpDispositionCode = requiredText(
    input.payload?.followUpDispositionCode,
    "Completion follow-up disposition"
  );
  const outcomeNotes = optionalText(input.payload?.outcomeNotes);
  const followUpNotes = optionalText(input.payload?.followUpNotes);
  const taskCreateEffects = buildOutcomeFollowUpTaskEffects({
    appointment,
    actor: input.actor,
    payload: input.payload,
    followUpDispositionCode,
    followUpNotes,
    now
  });
  const set = {
    bookingStatus: "COMPLETED",
    completedAt: now,
    outcomeCode,
    outcomeNotes,
    followUpDispositionCode,
    followUpNotes
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
    taskCreateEffects,
    taskLinkEffects: input.payload?.taskLinks ?? [],
    historyEffects: [
      buildHistoryEffect({
        command: { ...input, now },
        eventType: "COMPLETED",
        message: `Appointment ${appointment.appointmentNumber} completed.`,
        reasonCode,
        reasonNotes,
        priorValue: {
          bookingStatus: appointment.bookingStatus,
          executionStatus: appointment.executionStatus
        },
        newValue: set
      }),
      buildHistoryEffect({
        command: { ...input, now },
        eventType: "OUTCOME_RECORDED",
        message: `Appointment ${appointment.appointmentNumber} outcome recorded.`,
        reasonCode,
        reasonNotes,
        priorValue: null,
        newValue: {
          outcomeCode,
          outcomeNotes,
          followUpDispositionCode,
          followUpNotes
        }
      }),
      ...(taskCreateEffects.length > 0
        ? [
            buildHistoryEffect({
              command: { ...input, now },
              eventType: "TASK_LINKED",
              message: `Appointment ${appointment.appointmentNumber} follow-up task automation created a linked task request.`,
              reasonCode,
              reasonNotes,
              priorValue: null,
              newValue: {
                automationRuleCode: taskCreateEffects[0].automationRuleCode,
                taskTitle: taskCreateEffects[0].title,
                followUpDispositionCode
              }
            })
          ]
        : [])
    ],
    commandResultSnapshot: {
      appointmentId: appointment.id,
      bookingStatus: "COMPLETED",
      outcomeCode,
      followUpDispositionCode,
      releaseReservationCount: input.payload?.releaseReservations?.length ?? 0,
      automatedTaskCount: taskCreateEffects.length
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
    case "APPROVE":
      return buildApprovePlan(input);
    case "EDIT":
      return buildEditPlan(input);
    case "SCHEDULE":
      return buildSchedulePlan(input);
    case "RESCHEDULE":
      return buildReschedulePlan(input);
    case "CANCEL":
      return buildCancelPlan(input);
    case "COMPLETE":
      return buildCompletePlan(input);
    case "CONFIRM":
      return buildConfirmPlan(input);
    case "DECLINE":
      return buildDeclinePlan(input);
    case "CHECK_IN":
      return buildCheckInPlan(input);
    case "NO_SHOW":
      return buildNoShowPlan(input);
    case "START":
      return buildStartPlan(input);
    case "WAIT":
      return buildWaitPlan(input);
    case "FINISH":
      return buildFinishPlan(input);
    case "TRANSFER_OWNER":
      return buildTransferOwnerPlan(input);
  }
}
