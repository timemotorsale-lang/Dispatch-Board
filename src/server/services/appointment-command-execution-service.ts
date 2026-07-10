import type { AuthenticatedUser } from "@/server/auth/store";
import {
  APPOINTMENT_LIFECYCLE_EXECUTION_COMMANDS,
  planAppointmentLifecycleCommandExecution,
  type AppointmentLifecycleCommandAppointment,
  type AppointmentLifecycleExecutionCommand
} from "@/server/appointments/appointment-lifecycle-command-service";
import {
  executeAppointmentLifecycleCommandPlan,
  type AppointmentLifecycleTransactionRepository,
  type AppointmentLifecycleTransactionResult
} from "@/server/appointments/appointment-lifecycle-transaction-service";
import type { AppointmentLocationAccessGrant } from "@/server/policies/access";
import {
  previewAppointmentStaffConflicts,
  type AppointmentStaffConflictPreviewOptions
} from "@/server/services/appointment-staff-conflict-preview-service";
import { recordAppointmentAutomationExecution } from "@/server/services/appointment-automation-operations-console";
import {
  createAppointmentCommandRepository,
  type AppointmentCommandAppointmentRecord,
  type AppointmentCommandRepository,
  type AppointmentCommandLocationAccessRecord
} from "@/server/repositories/appointment-command-repository";
import { createAppointmentLifecycleTransactionRepository } from "@/server/repositories/appointment-lifecycle-transaction-repository";
import {
  submitAppointmentCommand,
  type AppointmentCommandBoundaryResult
} from "@/server/services/appointment-command-service";
import { normalizeAppointmentCommandRequest } from "@/server/validation/appointment-command";

export type AppointmentCommandExecutionResult = AppointmentCommandBoundaryResult & {
  execution: AppointmentLifecycleTransactionResult | null;
};

export const appointmentScheduleCommitGate = {
  commandType: "SCHEDULE",
  requiredPayloadFields: ["startsAt", "endsAt"],
  successStatus: "SUCCEEDED",
  terminalFailureStatus: "FAILED_TERMINAL",
  enforcedRejectionCodes: ["HARD_CONFLICT", "UNRESOLVED_WARNING", "PAST_TIME"],
  writeEffects: [
    "appointment-status-and-window",
    "held-reservation-commit",
    "schedule-history-event",
    "command-completion",
    "schedule-time-automation"
  ],
  browserProof: "task-originated-unscheduled-draft-schedules-from-appointment-board"
} as const;

const APPOINTMENT_STALE_UPDATE_ERROR =
  "Appointment update failed because the expected version no longer matches.";

type StaffConflictPreviewForSchedule = (
  user: AuthenticatedUser | null,
  appointmentId: string,
  repository?: Parameters<typeof previewAppointmentStaffConflicts>[2],
  now?: Date,
  options?: AppointmentStaffConflictPreviewOptions
) => ReturnType<typeof previewAppointmentStaffConflicts>;

function parsePayloadDate(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(String(value));

  return Number.isNaN(date.getTime()) ? null : date;
}

function getProposedScheduleWindow(payload: Record<string, unknown>) {
  const proposedStartsAt = parsePayloadDate(payload.startsAt);
  const proposedEndsAt = parsePayloadDate(payload.endsAt);

  if (!proposedStartsAt || !proposedEndsAt) {
    return {};
  }

  return {
    proposedStartsAt,
    proposedEndsAt,
    proposedSchedulingTimezone:
      typeof payload.schedulingTimezone === "string" ? payload.schedulingTimezone : null
  } satisfies AppointmentStaffConflictPreviewOptions;
}

function purposeCodeFromSnapshot(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.purposeCode === "string" ? candidate.purposeCode : null;
}

function snapshotRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isLateStaleUpdateError(error: unknown) {
  return error instanceof Error && error.message.includes(APPOINTMENT_STALE_UPDATE_ERROR);
}

async function completeLateStaleVersionConflict(input: {
  submitted: AppointmentCommandBoundaryResult;
  commandRequest: ReturnType<typeof normalizeAppointmentCommandRequest>;
  commandRepository: AppointmentCommandRepository;
  lifecycleRepository: AppointmentLifecycleTransactionRepository;
  now: Date;
}): Promise<AppointmentCommandExecutionResult> {
  const appointmentId =
    input.commandRequest.appointmentId ?? input.submitted.command.appointmentId ?? null;
  const latestAppointment = appointmentId
    ? await input.commandRepository.findAppointmentById(appointmentId)
    : null;
  const expectedAppointmentVersion = input.commandRequest.expectedAppointmentVersion;
  const currentAppointmentVersion = latestAppointment?.version ?? null;

  if (expectedAppointmentVersion === null || currentAppointmentVersion === null) {
    throw new Error(APPOINTMENT_STALE_UPDATE_ERROR);
  }

  const errorMessage = `Expected appointment version ${expectedAppointmentVersion}; current version is ${currentAppointmentVersion}.`;
  const resultSnapshot = {
    appointmentId,
    commandType: input.submitted.command.commandType,
    expectedAppointmentVersion,
    currentAppointmentVersion
  };

  await input.lifecycleRepository.withLifecycleTransaction((transaction) =>
    transaction.completeCommand({
      commandId: input.submitted.command.id,
      status: "CONFLICT",
      appointmentId,
      completedAt: null,
      failedAt: input.now,
      resultSnapshot,
      errorCode: "STALE_VERSION",
      errorMessage
    })
  );

  return {
    ...input.submitted,
    accepted: false,
    conflict: {
      expectedAppointmentVersion,
      currentAppointmentVersion
    },
    command: {
      ...input.submitted.command,
      status: "CONFLICT",
      currentAppointmentVersion,
      failedAt: input.now.toISOString(),
      resultSnapshot,
      errorCode: "STALE_VERSION",
      errorMessage
    },
    execution: null
  };
}

async function recordLifecycleAutomationExecutions(input: {
  actorUserId: string;
  appointment: AppointmentCommandAppointmentRecord | null;
  appointmentId: string | null;
  commandType: AppointmentLifecycleExecutionCommand;
  plan: ReturnType<typeof planAppointmentLifecycleCommandExecution>;
  execution: AppointmentLifecycleTransactionResult;
}) {
  const runtimeReason = "Record runtime automation execution after command completion.";
  const sourceReference = input.appointmentId ?? input.appointment?.id ?? null;
  const taskCreateEffects = input.plan.taskCreateEffects ?? [];
  const appointmentCreateEffects = input.plan.appointmentCreateEffects ?? [];

  const records = [
    ...taskCreateEffects.map((effect, index) => {
      const createdTask = input.execution.createdTasks[index] ?? null;

      return recordAppointmentAutomationExecution({
        ruleCode: effect.automationRuleCode,
        triggerCode: effect.triggerCode,
        sourceType: "APPOINTMENT",
        sourceReference,
        status: "SUCCEEDED",
        actorUserId: input.actorUserId,
        reason: runtimeReason,
        inputSnapshot: {
          automationRuleCode: effect.automationRuleCode,
          commandType: input.commandType,
          sourceAppointmentId: sourceReference,
          sourceAppointmentNumber: input.execution.appointment?.appointmentNumber ??
            input.appointment?.appointmentNumber ??
            null,
          followUpLinkCode: effect.linkCode
        },
        resultSnapshot: {
          automationRuleCode: effect.automationRuleCode,
          generatedTaskId: createdTask?.id ?? null,
          generatedTaskTitle: createdTask?.title ?? effect.title,
          generatedTaskBoardDate: effect.boardDate,
          generatedTaskBoardDayId: createdTask?.boardDayId ?? null,
          workflowArea: effect.workflowArea,
          templateBlueprintCode: effect.templateBlueprintCode,
          creationTiming: effect.creationTiming
        }
      });
    }),
    ...appointmentCreateEffects.map((effect, index) => {
      const createdAppointment = input.execution.createdAppointments[index] ?? null;

      return recordAppointmentAutomationExecution({
        ruleCode:
          purposeCodeFromSnapshot(effect.values.purposeSnapshot) === "FOLLOW_UP_APPOINTMENT"
            ? "APPOINTMENT_OUTCOME_FOLLOW_UP_APPOINTMENT"
            : null,
        triggerCode: "APPOINTMENT_OUTCOME_RECORDED",
        purposeCode: purposeCodeFromSnapshot(effect.values.purposeSnapshot),
        sourceType: "APPOINTMENT",
        sourceReference,
        status: "SUCCEEDED",
        actorUserId: input.actorUserId,
        reason: runtimeReason,
        inputSnapshot: {
          automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_APPOINTMENT",
          commandType: input.commandType,
          sourceAppointmentId: sourceReference,
          sourceAppointmentNumber:
            input.execution.appointment?.appointmentNumber ??
            input.appointment?.appointmentNumber ??
            null
        },
        resultSnapshot: {
          automationRuleCode: "APPOINTMENT_OUTCOME_FOLLOW_UP_APPOINTMENT",
          generatedAppointmentId: createdAppointment?.id ?? null,
          generatedAppointmentNumber:
            createdAppointment?.appointmentNumber ?? effect.values.appointmentNumber,
          generatedAppointmentTitle: effect.values.title
        }
      });
    })
  ];

  if (records.length === 0) {
    return;
  }

  await Promise.allSettled(records);
}

function isLifecycleExecutionCommand(
  commandType: string
): commandType is AppointmentLifecycleExecutionCommand {
  return APPOINTMENT_LIFECYCLE_EXECUTION_COMMANDS.includes(
    commandType as AppointmentLifecycleExecutionCommand
  );
}

function toLocationAccessGrant(
  access: AppointmentCommandLocationAccessRecord | null
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

function toLifecycleAppointment(
  appointment: AppointmentCommandAppointmentRecord | null
): AppointmentLifecycleCommandAppointment | null {
  if (!appointment) {
    return null;
  }

  return {
    id: appointment.id,
    appointmentNumber: appointment.appointmentNumber,
    organizationId: appointment.organizationId,
    locationId: appointment.locationId,
    ownerUserId: appointment.ownerUserId,
    title: appointment.title,
    schedulingTimezone: appointment.schedulingTimezone,
    startsAt: appointment.startsAt,
    endsAt: appointment.endsAt,
    bookingStatus: appointment.bookingStatus,
    confirmationStatus: appointment.confirmationStatus,
    attendanceStatus: appointment.attendanceStatus,
    executionStatus: appointment.executionStatus,
    version: appointment.version,
    purposeSnapshot: snapshotRecord(appointment.purposeSnapshot),
    customerSnapshot: snapshotRecord(appointment.customerSnapshot),
    vehicleSnapshot: snapshotRecord(appointment.vehicleSnapshot),
    sourceSnapshot: snapshotRecord(appointment.sourceSnapshot)
  };
}

async function getLifecyclePayload(input: {
  commandType: AppointmentLifecycleExecutionCommand;
  appointment: AppointmentCommandAppointmentRecord | null;
  commandRepository: AppointmentCommandRepository;
  payload: Record<string, unknown>;
  user: AuthenticatedUser | null;
  now: Date;
  staffConflictPreview: StaffConflictPreviewForSchedule;
}) {
  if (input.commandType !== "SCHEDULE" || !input.appointment) {
    return input.payload;
  }

  let payload = input.payload;

  if (
    !Array.isArray(payload.reservationCandidates) &&
    input.commandRepository.findHeldReservationCommitCandidates
  ) {
    const heldReservationCandidates =
      await input.commandRepository.findHeldReservationCommitCandidates(input.appointment.id);

    if (heldReservationCandidates.length > 0) {
      payload = {
        ...payload,
        reservationCandidates: heldReservationCandidates,
        heldReservationCandidateCount: heldReservationCandidates.length
      };
    }
  }

  const staffConflicts = await input.staffConflictPreview(
    input.user,
    input.appointment.id,
    undefined,
    input.now,
    getProposedScheduleWindow(payload)
  );

  if (staffConflicts.status === "BLOCKED") {
    return {
      ...payload,
      hardConflicts: [
        ...((payload.hardConflicts as unknown[]) ?? []),
        {
          code: staffConflicts.staff
            ? "STAFF_UNAVAILABLE_OR_UNAUTHORIZED"
            : "OWNER_UNAVAILABLE_OR_UNAUTHORIZED",
          source: "STAFF",
          message:
            staffConflicts.reasons[0] ??
            "Required staff is not available or authorized for this appointment.",
          staffUserId: staffConflicts.staff?.userId
        }
      ]
    };
  }

  if (
    staffConflicts.status === "WARNING" &&
    staffConflicts.warningOverrideRequired &&
    !staffConflicts.warningOverrideSatisfied
  ) {
    const warning = {
      warningKey: staffConflicts.warningKey ?? "STAFF|STAFF_OVERLAP|unknown",
      code: "STAFF_OVERLAP",
      source: "STAFF",
      message:
        staffConflicts.reasons[0] ??
        "Required staff has a warning-level availability conflict.",
      managerOverrideRequired: true,
      staffUserId: staffConflicts.staff?.userId
    };

    return {
      ...payload,
      warnings: [...((payload.warnings as unknown[]) ?? []), warning],
      unresolvedWarnings: [...((payload.unresolvedWarnings as unknown[]) ?? []), warning]
    };
  }

  return payload;
}

export async function submitAndExecuteAppointmentCommand(
  user: AuthenticatedUser | null,
  input: unknown,
  dependencies?: {
    commandRepository?: AppointmentCommandRepository;
    lifecycleRepository?: AppointmentLifecycleTransactionRepository;
    staffConflictPreview?: StaffConflictPreviewForSchedule;
    automationRecorder?: typeof recordLifecycleAutomationExecutions;
    now?: Date;
  }
): Promise<AppointmentCommandExecutionResult> {
  const now = dependencies?.now ?? new Date();
  const commandRepository = dependencies?.commandRepository ?? createAppointmentCommandRepository();
  const lifecycleRepository =
    dependencies?.lifecycleRepository ?? createAppointmentLifecycleTransactionRepository();
  const submitted = await submitAppointmentCommand(user, input, commandRepository, now);

  if (
    !user ||
    !submitted.accepted ||
    submitted.duplicate ||
    submitted.conflict ||
    !isLifecycleExecutionCommand(submitted.command.commandType)
  ) {
    return {
      ...submitted,
      execution: null
    };
  }

  const commandRequest = normalizeAppointmentCommandRequest(input);
  const appointment = commandRequest.appointmentId
    ? await commandRepository.findAppointmentById(commandRequest.appointmentId)
    : null;
  const organizationId = appointment?.organizationId ?? commandRequest.organizationId;
  const locationId = appointment?.locationId ?? commandRequest.locationId;

  if (!organizationId || !locationId) {
    throw new Error("Appointment command requires an organization and location.");
  }

  const locationAccess = toLocationAccessGrant(
    await commandRepository.findActiveLocationAccess(user.id, locationId, now)
  );
  const staffConflictPreview =
    dependencies?.staffConflictPreview ??
    (dependencies
      ? (async () => ({
          appointmentId: appointment?.id ?? "",
          appointmentNumber: appointment?.appointmentNumber ?? "",
          bookingStatus: appointment?.bookingStatus ?? "DRAFT",
          status: "READY" as const,
          canProceedWithStaff: true,
          warningOverrideRequired: false,
          warningOverrideSatisfied: false,
          warningKey: null,
          staff: null,
          staffMembers: [],
          checks: [],
          reasons: [],
          availability: null
        }))
      : previewAppointmentStaffConflicts);
  const payload = await getLifecyclePayload({
    commandType: submitted.command.commandType,
    appointment,
    commandRepository,
    payload: commandRequest.payload,
    user,
    now,
    staffConflictPreview
  });
  const plan = planAppointmentLifecycleCommandExecution({
    commandId: submitted.command.id,
    commandType: submitted.command.commandType,
    actor: user,
    locationAccess,
    appointment: toLifecycleAppointment(appointment),
    organizationId,
    locationId,
    expectedAppointmentVersion: commandRequest.expectedAppointmentVersion,
    correlationId: submitted.command.correlationId,
    causationId: submitted.command.causationId,
    payload,
    now
  });
  let execution: AppointmentLifecycleTransactionResult;

  try {
    execution = await executeAppointmentLifecycleCommandPlan({
      plan,
      repository: lifecycleRepository,
      now
    });
  } catch (error) {
    if (isLateStaleUpdateError(error)) {
      return completeLateStaleVersionConflict({
        submitted,
        commandRequest,
        commandRepository,
        lifecycleRepository,
        now
      });
    }

    throw error;
  }

  if (user && execution.commandStatus === "SUCCEEDED") {
    const automationRecorder =
      dependencies?.automationRecorder ?? recordLifecycleAutomationExecutions;
    await automationRecorder({
      actorUserId: user.id,
      appointment,
      appointmentId: execution.appointment?.id ?? appointment?.id ?? null,
      commandType: submitted.command.commandType,
      plan,
      execution
    });
  }

  return {
    ...submitted,
    accepted: execution.commandStatus === "SUCCEEDED",
    command: {
      ...submitted.command,
      status: execution.commandStatus
    },
    execution
  };
}
