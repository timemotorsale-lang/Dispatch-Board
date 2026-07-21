import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";
import type { EnterpriseCommandCommitInput } from "@/server/enterprise-command/repository";
import { DiagnosticCaseDuplicateError, isTerminalDiagnosticStatus, nextDiagnosticCaseState, type DiagnosticCaseStatus, type DiagnosticRiskTier } from "./domain";

type Tx = Prisma.TransactionClient;

export type DiagnosticCaseIdentityRecord = {
  assignedUserId: string | null;
  id: string;
  locationId: string;
  resumeStatus: DiagnosticCaseStatus | null;
  status: DiagnosticCaseStatus;
  version: number;
};

export type DiagnosticRepairOrderContext = {
  closedAt: Date | null;
  id: string;
  locationId: string;
  organizationId: string;
  repairOrderNumber: string;
  serviceVisit: { concernSummary: string };
  vehicleId: string;
  version: number;
};

export type DiagnosticCaseRepository = {
  assign(command: EnterpriseCommandCommitInput, data: { assignedUserId: string; occurredAt: Date; reasonCode: string }): Promise<DiagnosticMutationResult>;
  create(command: EnterpriseCommandCommitInput, data: { assignedUserId: string | null; canonicalConcernStatement: string; concernFingerprint: string; concernKey: string; concernSource: string; concernStatement: string; openedAt: Date; operatingConditions: Record<string, unknown>; repairOrderVersion: number; riskTier: DiagnosticRiskTier; reasonCode: string }): Promise<DiagnosticMutationResult>;
  get(organizationId: string, caseId: string): Promise<DiagnosticCaseIdentityRecord | null>;
  getIdentity(organizationId: string, caseId: string): Promise<DiagnosticCaseIdentityRecord | null>;
  getRepairOrderContext(organizationId: string, repairOrderId: string): Promise<DiagnosticRepairOrderContext | null>;
  list(organizationId: string): Promise<DiagnosticCaseIdentityRecord[]>;
  transition(command: EnterpriseCommandCommitInput, data: { occurredAt: Date; reasonCode: string; targetStatus: DiagnosticCaseStatus }): Promise<DiagnosticMutationResult>;
};

type DiagnosticMutationResult = { duplicate: boolean; result: unknown; version: number };

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

const detailInclude = {
  assignedUser: { select: { id: true, name: true } },
  concernVersions: { orderBy: { version: "desc" as const } },
  createdByUser: { select: { id: true, name: true } },
  location: { select: { id: true, code: true, name: true } },
  repairOrder: { select: { id: true, repairOrderNumber: true, serviceVisit: { select: { concernSummary: true } } } },
  stateEvents: { orderBy: { version: "desc" as const }, take: 100 },
  vehicle: { select: { id: true, vehicleNumber: true, vin: true, year: true, make: true, model: true } }
};

async function execute(
  database: PrismaClient,
  input: EnterpriseCommandCommitInput,
  eventType: string,
  reasonCode: string,
  mutate: (tx: Tx, version: number) => Promise<{ previous?: unknown; result: unknown }>
): Promise<DiagnosticMutationResult> {
  return database.$transaction(async (tx) => {
    const existing = await tx.enterpriseCommandLedger.findUnique({
      where: {
        organizationId_domain_commandType_idempotencyKey: {
          organizationId: input.organizationId,
          domain: input.domain,
          commandType: input.commandType,
          idempotencyKey: input.idempotencyKey
        }
      }
    });
    if (existing) {
      if (existing.requestHash !== input.requestHash) throw new EnterpriseCommandConflictError("Idempotency key was already used with a different request.", "IDEMPOTENCY_KEY_REUSED");
      return { duplicate: true, result: existing.resultSnapshot, version: existing.resultingVersion ?? input.expectedVersion };
    }

    const key = {
      organizationId_domain_subjectType_subjectId: {
        organizationId: input.organizationId,
        domain: input.domain,
        subjectType: input.subjectType,
        subjectId: input.subjectId
      }
    };
    const aggregate = await tx.enterpriseAggregateVersion.findUnique({ where: key });
    const currentVersion = aggregate?.version ?? 0;
    if (currentVersion !== input.expectedVersion) throw new EnterpriseCommandConflictError(`Expected version ${input.expectedVersion}, but current version is ${currentVersion}.`, "VERSION_CONFLICT");

    const version = currentVersion + 1;
    const mutation = await mutate(tx, version);
    if (aggregate) await tx.enterpriseAggregateVersion.update({ where: { id: aggregate.id }, data: { version, locationId: input.locationId } });
    else await tx.enterpriseAggregateVersion.create({ data: { organizationId: input.organizationId, locationId: input.locationId, domain: input.domain, subjectType: input.subjectType, subjectId: input.subjectId, version } });

    const snapshot = json(mutation.result);
    const completedAt = new Date();
    const command = await tx.enterpriseCommandLedger.create({
      data: {
        organizationId: input.organizationId,
        locationId: input.locationId,
        actorUserId: input.actorUserId,
        domain: input.domain,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        commandType: input.commandType,
        status: "SUCCEEDED",
        idempotencyKey: input.idempotencyKey,
        requestHash: input.requestHash,
        correlationId: input.correlationId,
        expectedVersion: input.expectedVersion,
        resultingVersion: version,
        resultSnapshot: snapshot,
        completedAt
      }
    });
    const event = await tx.enterpriseDomainEvent.create({
      data: {
        organizationId: input.organizationId,
        locationId: input.locationId,
        commandId: command.id,
        domain: input.domain,
        aggregateType: input.subjectType,
        aggregateId: input.subjectId,
        aggregateVersion: version,
        eventType,
        payload: json({ aggregateId: input.subjectId, aggregateVersion: version, reasonCode })
      }
    });
    await tx.enterpriseAuditEvent.create({
      data: {
        organizationId: input.organizationId,
        locationId: input.locationId,
        actorUserId: input.actorUserId,
        commandId: command.id,
        domain: input.domain,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        eventType,
        reason: input.reason,
        priorValue: mutation.previous == null ? undefined : json(mutation.previous),
        newValue: snapshot,
        metadata: json({ reasonCode, requestHash: input.requestHash }),
        correlationId: input.correlationId
      }
    });
    await tx.enterpriseOutboxMessage.create({
      data: {
        organizationId: input.organizationId,
        locationId: input.locationId,
        domainEventId: event.id,
        topic: "diagnostics.case",
        messageKey: input.subjectId,
        payload: json({ aggregateId: input.subjectId, aggregateVersion: version, correlationId: input.correlationId, eventId: event.id, eventType, reasonCode })
      }
    });
    return { duplicate: false, result: mutation.result, version };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export function createDiagnosticCaseRepository(database: PrismaClient = prisma): DiagnosticCaseRepository {
  return {
    getRepairOrderContext(organizationId, repairOrderId) {
      return database.repairOrder.findFirst({
        where: { id: repairOrderId, organizationId },
        select: { closedAt: true, id: true, locationId: true, organizationId: true, repairOrderNumber: true, serviceVisit: { select: { concernSummary: true } }, vehicleId: true, version: true }
      });
    },

    getIdentity(organizationId, caseId) {
      return database.diagnosticCase.findFirst({
        where: { id: caseId, organizationId },
        select: { assignedUserId: true, id: true, locationId: true, resumeStatus: true, status: true, version: true }
      }) as Promise<DiagnosticCaseIdentityRecord | null>;
    },

    get(organizationId, caseId) {
      return database.diagnosticCase.findFirst({ where: { id: caseId, organizationId }, include: detailInclude }) as Promise<DiagnosticCaseIdentityRecord | null>;
    },

    list(organizationId) {
      return database.diagnosticCase.findMany({
        where: { organizationId },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        take: 200,
        include: detailInclude
      }) as Promise<DiagnosticCaseIdentityRecord[]>;
    },

    create(command, data) {
      return execute(database, command, "DiagnosticCaseCreated", data.reasonCode, async (tx, version) => {
        const repairOrder = await tx.repairOrder.findFirst({
          where: { id: command.payload.repairOrderId as string, organizationId: command.organizationId, closedAt: null },
          select: { id: true, locationId: true, vehicleId: true, version: true, serviceVisit: { select: { concernSummary: true } } }
        });
        if (!repairOrder) throw new Error("An open repair order was not found for this diagnostic case.");
        if (repairOrder.locationId !== command.locationId) throw new Error("Diagnostic case location does not match the repair order.");
        if (repairOrder.version !== data.repairOrderVersion) throw new EnterpriseCommandConflictError(`Expected repair-order version ${data.repairOrderVersion}, but current version is ${repairOrder.version}.`, "VERSION_CONFLICT");
        if (repairOrder.serviceVisit.concernSummary.trim() !== data.canonicalConcernStatement) throw new EnterpriseCommandConflictError("The canonical repair-order concern changed before case creation.", "VERSION_CONFLICT");
        const duplicate = await tx.diagnosticCase.findFirst({ where: { repairOrderId: repairOrder.id, OR: [{ concernKey: data.concernKey }, { concernFingerprint: data.concernFingerprint }] }, select: { id: true } });
        if (duplicate) throw new DiagnosticCaseDuplicateError(duplicate.id);
        if (data.assignedUserId) {
          const assignee = await tx.user.findFirst({ where: { id: data.assignedUserId, isActive: true }, select: { id: true } });
          if (!assignee) throw new Error("Diagnostic assignee must be an active user.");
        }
        const diagnosticCase = await tx.diagnosticCase.create({
          data: {
            id: command.subjectId,
            organizationId: command.organizationId,
            locationId: repairOrder.locationId,
            vehicleId: repairOrder.vehicleId,
            repairOrderId: repairOrder.id,
            concernKey: data.concernKey,
            concernFingerprint: data.concernFingerprint,
            status: "DRAFT",
            riskTier: data.riskTier,
            assignedUserId: data.assignedUserId,
            createdByUserId: command.actorUserId,
            currentConcernVersion: 1,
            version,
            openedAt: data.openedAt
          }
        });
        const concern = await tx.diagnosticConcernVersion.create({
          data: {
            organizationId: command.organizationId,
            diagnosticCaseId: diagnosticCase.id,
            version: 1,
            statement: data.concernStatement,
            operatingConditions: json(data.operatingConditions),
            source: data.concernSource,
            sourceSnapshot: json({ repairOrderId: repairOrder.id, repairOrderVersion: repairOrder.version, canonicalConcernStatement: data.canonicalConcernStatement }),
            authorUserId: command.actorUserId
          }
        });
        await tx.diagnosticCaseStateEvent.create({
          data: {
            organizationId: command.organizationId,
            diagnosticCaseId: diagnosticCase.id,
            version,
            eventType: "CREATED",
            fromStatus: null,
            toStatus: "DRAFT",
            fromAssignedUserId: null,
            toAssignedUserId: diagnosticCase.assignedUserId,
            reasonCode: data.reasonCode,
            reason: command.reason,
            actorUserId: command.actorUserId,
            correlationId: command.correlationId,
            occurredAt: data.openedAt
          }
        });
        return { result: { id: diagnosticCase.id, concernVersionId: concern.id, repairOrderId: repairOrder.id, status: diagnosticCase.status, assignedUserId: diagnosticCase.assignedUserId, riskTier: diagnosticCase.riskTier, version } };
      });
    },

    assign(command, data) {
      return execute(database, command, "DiagnosticCaseAssigned", data.reasonCode, async (tx, version) => {
        const diagnosticCase = await tx.diagnosticCase.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId } });
        if (!diagnosticCase) throw new Error("Diagnostic case was not found.");
        if (diagnosticCase.version !== version - 1) throw new EnterpriseCommandConflictError(`Expected case version ${version - 1}, but current version is ${diagnosticCase.version}.`, "VERSION_CONFLICT");
        if (isTerminalDiagnosticStatus(diagnosticCase.status as DiagnosticCaseStatus)) throw new Error("Terminal diagnostic cases must be reopened before assignment.");
        if (diagnosticCase.assignedUserId === data.assignedUserId) throw new Error("Diagnostic case is already assigned to that user.");
        const assignee = await tx.user.findFirst({ where: { id: data.assignedUserId, isActive: true }, select: { id: true } });
        if (!assignee) throw new Error("Diagnostic assignee must be an active user.");
        const previous = { assignedUserId: diagnosticCase.assignedUserId, status: diagnosticCase.status, version: diagnosticCase.version };
        const updated = await tx.diagnosticCase.update({ where: { id: diagnosticCase.id }, data: { assignedUserId: data.assignedUserId, version } });
        await tx.diagnosticCaseStateEvent.create({
          data: {
            organizationId: command.organizationId,
            diagnosticCaseId: diagnosticCase.id,
            version,
            eventType: "ASSIGNED",
            fromStatus: diagnosticCase.status,
            toStatus: diagnosticCase.status,
            fromAssignedUserId: diagnosticCase.assignedUserId,
            toAssignedUserId: data.assignedUserId,
            reasonCode: data.reasonCode,
            reason: command.reason,
            actorUserId: command.actorUserId,
            correlationId: command.correlationId,
            occurredAt: data.occurredAt
          }
        });
        return { previous, result: { id: updated.id, assignedUserId: updated.assignedUserId, status: updated.status, version } };
      });
    },

    transition(command, data) {
      const eventType = data.targetStatus === "ESCALATED" ? "DiagnosticCaseEscalated" : data.targetStatus === "REOPENED" ? "DiagnosticCaseReopened" : data.targetStatus === "ABANDONED" ? "DiagnosticCaseAbandoned" : "DiagnosticCaseStatusChanged";
      return execute(database, command, eventType, data.reasonCode, async (tx, version) => {
        const diagnosticCase = await tx.diagnosticCase.findFirst({ where: { id: command.subjectId, organizationId: command.organizationId } });
        if (!diagnosticCase) throw new Error("Diagnostic case was not found.");
        if (diagnosticCase.version !== version - 1) throw new EnterpriseCommandConflictError(`Expected case version ${version - 1}, but current version is ${diagnosticCase.version}.`, "VERSION_CONFLICT");
        const next = nextDiagnosticCaseState({ status: diagnosticCase.status as DiagnosticCaseStatus, resumeStatus: diagnosticCase.resumeStatus as DiagnosticCaseStatus | null }, data.targetStatus, data.occurredAt);
        const previous = { closedAt: diagnosticCase.closedAt, resumeStatus: diagnosticCase.resumeStatus, status: diagnosticCase.status, version: diagnosticCase.version };
        const updated = await tx.diagnosticCase.update({
          where: { id: diagnosticCase.id },
          data: { closedAt: next.closedAt, resumeStatus: next.resumeStatus, status: data.targetStatus, version }
        });
        await tx.diagnosticCaseStateEvent.create({
          data: {
            organizationId: command.organizationId,
            diagnosticCaseId: diagnosticCase.id,
            version,
            eventType: next.eventType,
            fromStatus: diagnosticCase.status,
            toStatus: data.targetStatus,
            fromAssignedUserId: diagnosticCase.assignedUserId,
            toAssignedUserId: diagnosticCase.assignedUserId,
            reasonCode: data.reasonCode,
            reason: command.reason,
            actorUserId: command.actorUserId,
            correlationId: command.correlationId,
            occurredAt: data.occurredAt
          }
        });
        return { previous, result: { id: updated.id, assignedUserId: updated.assignedUserId, closedAt: updated.closedAt, resumeStatus: updated.resumeStatus, status: updated.status, version } };
      });
    }
  };
}
