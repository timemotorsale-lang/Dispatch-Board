import { normalizeEnterpriseCommand } from "@/server/enterprise-command/domain";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import {
  createUnifiedCrmOpportunityAppointmentBridgeRepository,
  type UnifiedCrmOpportunityAppointmentBridgeRepository
} from "@/server/repositories/unified-crm-opportunity-appointment-bridge-repository";
import { submitAndExecuteAppointmentCommand } from "@/server/services/appointment-command-execution-service";
import { getUnifiedCrmOpportunityAccessContext } from "@/server/unified-crm/opportunity-access";
import {
  UNIFIED_CRM_OPPORTUNITY_APPOINTMENT_BRIDGE_COMMAND,
  UNIFIED_CRM_OPPORTUNITY_APPOINTMENT_BRIDGE_CONTRACT_VERSION,
  UnifiedCrmOpportunityAppointmentBridgeError,
  type UnifiedCrmOpportunityAppointmentBridgeCommandInput,
  type UnifiedCrmOpportunityAppointmentBridgeCommandResult
} from "@/server/unified-crm/opportunity-appointment-bridge-command";
import { normalizeUnifiedCrmOpportunityId } from "@/server/validation/unified-crm-opportunity";

type AppointmentDraftExecutor = typeof submitAndExecuteAppointmentCommand;

type Dependencies = {
  appointmentDraftExecutor?: AppointmentDraftExecutor;
  mode?: unknown;
  nodeEnv?: string;
  now?: () => Date;
  repository?: UnifiedCrmOpportunityAppointmentBridgeRepository;
  scopeRepository?: {
    listActiveOrganizationIds(userId: string, now: Date): Promise<string[]>;
  };
};

type AppointmentRecord = {
  appointmentNumber: string;
  endsAt: Date | null;
  id: string;
  startsAt: Date | null;
  title: string;
  version: number;
};

function text(value: unknown, field: string, max: number, minimum = 1) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result) {
    throw new UnifiedCrmOpportunityAppointmentBridgeError("INVALID_APPOINTMENT_BRIDGE_COMMAND", `${field} is required.`);
  }
  if (result.length < minimum) {
    throw new UnifiedCrmOpportunityAppointmentBridgeError("INVALID_APPOINTMENT_BRIDGE_COMMAND", `${field} must be at least ${minimum} characters.`);
  }
  if (result.length > max) {
    throw new UnifiedCrmOpportunityAppointmentBridgeError("INVALID_APPOINTMENT_BRIDGE_COMMAND", `${field} must be ${max} characters or fewer.`);
  }
  return result;
}

function optionalTimestamp(value: unknown, field: string) {
  if (value == null || value === "") return null;
  const raw = typeof value === "string" ? value.trim() : "";
  const parsed = new Date(raw);
  if (!raw || Number.isNaN(parsed.getTime())) {
    throw new UnifiedCrmOpportunityAppointmentBridgeError("INVALID_APPOINTMENT_BRIDGE_COMMAND", `${field} is invalid.`);
  }
  return parsed;
}

function expectedVersion(value: unknown) {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new UnifiedCrmOpportunityAppointmentBridgeError("INVALID_APPOINTMENT_BRIDGE_COMMAND", "Expected version is required.");
  }
  return Number(value);
}

function normalizeOpportunityId(value: unknown) {
  try {
    return normalizeUnifiedCrmOpportunityId(value);
  } catch {
    throw new UnifiedCrmOpportunityAppointmentBridgeError("OPPORTUNITY_NOT_AVAILABLE", "Opportunity is not available.");
  }
}

function normalizeCommand(value: UnifiedCrmOpportunityAppointmentBridgeCommandInput) {
  const startsAt = optionalTimestamp(value.startsAt, "Appointment start");
  const endsAt = optionalTimestamp(value.endsAt, "Appointment end");
  if (Boolean(startsAt) !== Boolean(endsAt)) {
    throw new UnifiedCrmOpportunityAppointmentBridgeError("INVALID_APPOINTMENT_BRIDGE_COMMAND", "Appointment start and end must be provided together.");
  }
  if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) {
    throw new UnifiedCrmOpportunityAppointmentBridgeError("INVALID_APPOINTMENT_BRIDGE_COMMAND", "Appointment end must be after start.");
  }

  return {
    appointmentNumber: text(value.appointmentNumber, "Appointment number", 120, 6),
    endsAt,
    expectedVersion: expectedVersion(value.expectedVersion),
    idempotencyKey: text(value.idempotencyKey, "Idempotency key", 200),
    locationId: text(value.locationId, "Location", 120, 3),
    schedulingTimezone: text(value.schedulingTimezone, "Scheduling timezone", 80, 3),
    startsAt,
    title: text(value.title, "Title", 240, 8)
  };
}

async function findAppointment(appointmentId: string): Promise<AppointmentRecord> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      appointmentNumber: true,
      endsAt: true,
      id: true,
      startsAt: true,
      title: true,
      version: true
    }
  });
  if (!appointment) {
    throw new Error("Appointment not found.");
  }
  return appointment;
}

function appointmentHref(appointmentNumber: string) {
  return `/appointments?appointment=${encodeURIComponent(appointmentNumber)}`;
}

export async function createUnifiedCrmOpportunityAppointmentBridge(
  actor: AuthenticatedUser | null,
  opportunityIdValue: unknown,
  value: UnifiedCrmOpportunityAppointmentBridgeCommandInput,
  dependencies: Dependencies = {}
): Promise<UnifiedCrmOpportunityAppointmentBridgeCommandResult> {
  const now = dependencies.now?.() ?? new Date();
  const opportunityId = normalizeOpportunityId(opportunityIdValue);
  const normalized = normalizeCommand(value);
  const repository = dependencies.repository ?? createUnifiedCrmOpportunityAppointmentBridgeRepository(prisma);
  const appointmentDraftExecutor = dependencies.appointmentDraftExecutor ?? submitAndExecuteAppointmentCommand;

  try {
    const access = await getUnifiedCrmOpportunityAccessContext(actor, "link-appointment", {
      mode: dependencies.mode,
      nodeEnv: dependencies.nodeEnv,
      now: () => now,
      scopeRepository: dependencies.scopeRepository
    });
    const command = normalizeEnterpriseCommand({
      actorUserId: actor!.id,
      commandType: UNIFIED_CRM_OPPORTUNITY_APPOINTMENT_BRIDGE_COMMAND,
      domain: "UNIFIED_CRM",
      expectedVersion: normalized.expectedVersion,
      idempotencyKey: normalized.idempotencyKey,
      locationId: normalized.locationId,
      organizationId: access.organizationId,
      payload: {
        appointmentNumber: normalized.appointmentNumber,
        endsAt: normalized.endsAt?.toISOString() ?? null,
        schedulingTimezone: normalized.schedulingTimezone,
        startsAt: normalized.startsAt?.toISOString() ?? null,
        title: normalized.title
      },
      reason: "Create governed CRM opportunity appointment draft.",
      subjectId: opportunityId,
      subjectType: "OPPORTUNITY"
    });

    const appointmentCommand = await appointmentDraftExecutor(actor, {
      commandType: "CREATE_DRAFT",
      correlationId: command.correlationId,
      idempotencyKey: `ucrm-appointment:${command.idempotencyKey}`,
      locationId: normalized.locationId,
      organizationId: access.organizationId,
      ownerUserId: actor!.id,
      payload: {
        appointmentNumber: normalized.appointmentNumber,
        endsAt: normalized.endsAt?.toISOString() ?? null,
        purposeSnapshot: {
          source: "Unified CRM opportunity",
          opportunityId
        },
        schedulingTimezone: normalized.schedulingTimezone,
        sourceReference: opportunityId,
        sourceSnapshot: {
          opportunityId,
          reason: command.reason
        },
        sourceType: "MANUAL",
        startsAt: normalized.startsAt?.toISOString() ?? null,
        title: normalized.title
      }
    }, { now });
    const appointmentId = appointmentCommand.execution?.appointment?.id ?? appointmentCommand.command.appointmentId;
    if ((!appointmentCommand.accepted && !appointmentCommand.duplicate) || !appointmentId) {
      throw new Error("Appointment command rejected.");
    }

    const appointment = await findAppointment(appointmentId);
    const result = await repository.commitAppointmentBridge({
      command: {
        actorUserId: actor!.id,
        appointment,
        commandType: command.commandType,
        correlationId: command.correlationId,
        domain: command.domain,
        expectedVersion: normalized.expectedVersion,
        idempotencyKey: command.idempotencyKey,
        opportunityId,
        organizationId: access.organizationId,
        reason: command.reason,
        requestHash: command.requestHash
      },
      recordScope: access.recordScope
    });

    return {
      appointment: {
        appointmentNumber: result.appointment.appointmentNumber,
        href: appointmentHref(result.appointment.appointmentNumber),
        id: result.appointment.id,
        version: result.appointment.version
      },
      contractVersion: UNIFIED_CRM_OPPORTUNITY_APPOINTMENT_BRIDGE_CONTRACT_VERSION,
      duplicate: result.duplicate || appointmentCommand.duplicate,
      opportunityId: result.opportunityId
    };
  } catch (error) {
    if (error instanceof UnifiedCrmOpportunityAppointmentBridgeError) throw error;
    if (error instanceof Error && "code" in error) {
      const code = String((error as { code?: string }).code);
      if (code === "AUTHENTICATION_REQUIRED") {
        throw new UnifiedCrmOpportunityAppointmentBridgeError("AUTHENTICATION_REQUIRED", "CRM opportunity appointment bridge is temporarily unavailable.");
      }
      if (code === "OPPORTUNITY_OFF" || code === "OPPORTUNITY_MUTATION_HELD") {
        throw new UnifiedCrmOpportunityAppointmentBridgeError("APPOINTMENT_BRIDGE_OFF", "CRM opportunity appointment bridge is temporarily unavailable.");
      }
      if (code === "OPPORTUNITY_NOT_AUTHORIZED") {
        throw new UnifiedCrmOpportunityAppointmentBridgeError("APPOINTMENT_BRIDGE_NOT_AUTHORIZED", "CRM opportunity appointment bridge is temporarily unavailable.");
      }
      if (code === "ORGANIZATION_SCOPE_UNAVAILABLE" || code === "ORGANIZATION_SCOPE_AMBIGUOUS") {
        throw new UnifiedCrmOpportunityAppointmentBridgeError(code, error.message);
      }
      if (code === "IDEMPOTENCY_KEY_REUSED") {
        throw new UnifiedCrmOpportunityAppointmentBridgeError("IDEMPOTENCY_KEY_REUSED", "Idempotency key was already used with a different CRM opportunity appointment bridge.");
      }
    }
    if (error instanceof Error && error.message === "Opportunity not available.") {
      throw new UnifiedCrmOpportunityAppointmentBridgeError("OPPORTUNITY_NOT_AVAILABLE", "Opportunity is not available.");
    }
    if (error instanceof Error && error.message === "Opportunity version conflict.") {
      throw new UnifiedCrmOpportunityAppointmentBridgeError("OPPORTUNITY_VERSION_CONFLICT", "Opportunity changed before the appointment could be linked.");
    }
    throw new UnifiedCrmOpportunityAppointmentBridgeError("APPOINTMENT_SOURCE_UNAVAILABLE", "CRM opportunity appointment bridge could not be completed safely.", { cause: error });
  }
}
