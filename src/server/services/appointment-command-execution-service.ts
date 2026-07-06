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
import { previewAppointmentStaffConflicts } from "@/server/services/appointment-staff-conflict-preview-service";
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

type StaffConflictPreviewForSchedule = typeof previewAppointmentStaffConflicts;

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
    version: appointment.version
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
    input.now
  );

  if (staffConflicts.status === "BLOCKED") {
    return {
      ...payload,
      hardConflicts: [
        ...((payload.hardConflicts as unknown[]) ?? []),
        {
          code: staffConflicts.staff ? "STAFF_UNAVAILABLE_OR_UNAUTHORIZED" : "OWNER_UNAVAILABLE_OR_UNAUTHORIZED",
          source: "STAFF",
          message:
            staffConflicts.reasons[0] ??
            "Owner staff is not available or authorized for this appointment.",
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
        "Owner staff has a warning-level availability conflict.",
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
  const execution = await executeAppointmentLifecycleCommandPlan({
    plan,
    repository: lifecycleRepository,
    now
  });

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
