import {
  ConcernClosureOutcome,
  ConcernSource,
  ConcernStatus,
  Prisma,
  PrismaClient,
  TaskSourceType,
  TaskStatus,
  type TaskTemplatePriority,
  type WorkflowArea
} from "@prisma/client";

import { prisma } from "@/server/db/client";
import type { ConcernClassification, ConcernSeverity, ConcernTaskBlueprint } from "@/server/concerns/concern-domain";
import type { CrmDecisionResult } from "@/server/customers/decisions/crm-decision-domain";

const concernPackageInclude = {
  assignedOwner: { select: { id: true, name: true, email: true } },
  reportedByUser: { select: { id: true, name: true, email: true } },
  taskLinks: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      task: {
        include: {
          assignedUser: { select: { id: true, name: true, email: true } },
          checklistItems: { orderBy: { sortOrder: "asc" as const } }
        }
      }
    }
  },
  customerPromises: { orderBy: { createdAt: "desc" as const }, include: { ownerUser: { select: { id: true, name: true, email: true } }, fulfilledByUser: { select: { id: true, name: true, email: true } } } }
} satisfies Prisma.ConcernCaseInclude;

export type ConcernPackageRecord = Prisma.ConcernCaseGetPayload<{ include: typeof concernPackageInclude }>;

export type ConcernAssignmentUserRecord = Prisma.UserGetPayload<{
  select: {
    id: true;
    name: true;
    email: true;
    userRoles: { select: { role: { select: { id: true; name: true } } } };
    userDuties: { select: { duty: { select: { id: true; name: true; workflowArea: true } } } };
  };
}>;

export type ConcernTaskCommitPlan = {
  blueprint: ConcernTaskBlueprint;
  assignedUserId: string;
  recommendedUserId: string | null;
  recommendationReasonCode: string;
  recommendationExplanation: string;
  dueAt: Date;
  boardDate: string;
};

export type CreateConcernPackageInput = {
  organizationId: string;
  customerId: string | null;
  concernNumber: string;
  idempotencyKey: string;
  requestHash: string;
  intakeBoardDate: string;
  title: string;
  description: string;
  category: string;
  secondaryCategory: string | null;
  workflowArea: WorkflowArea;
  riskType: string;
  priority: TaskTemplatePriority;
  source: ConcernSource;
  customerReference: string | null;
  vehicleReference: string | null;
  reportedByUserId: string;
  assignedOwnerId: string;
  dueAt: Date;
  escalationRequired: boolean;
  escalateAt: Date | null;
  classification: ConcernClassification;
  severity: ConcernSeverity;
  templateCode: string;
  templateVersion: number;
  tasks: ConcernTaskCommitPlan[];
  severityDecision: CrmDecisionResult;
  playbookDecision: CrmDecisionResult;
  firstResponseDueAt: Date;
  resolutionDueAt: Date;
  customerUpdateDueAt: Date;
};

export type ConcernResolutionRepository = {
  listAssignmentUsers(): Promise<ConcernAssignmentUserRecord[]>;
  findByIdempotency(reportedByUserId: string, idempotencyKey: string): Promise<ConcernPackageRecord | null>;
  findById(id: string): Promise<ConcernPackageRecord | null>;
  listRecent(limit: number): Promise<ConcernPackageRecord[]>;
  createPackage(input: CreateConcernPackageInput): Promise<ConcernPackageRecord>;
  closeConcern(input: { id: string; actorUserId: string; outcome: ConcernClosureOutcome; reason: string; proof: string; closedAt: Date }): Promise<ConcernPackageRecord>;
  listEscalationCandidates(now: Date): Promise<ConcernPackageRecord[]>;
  escalateConcern(input: { id: string; boardDayId: string; actorUserId: string | null; escalatedAt: Date; reasonCode: string }): Promise<ConcernPackageRecord>;
  findCustomerPromise(id: string): Promise<{ id: string; concernCaseId: string; ownerUserId: string; status: string; dueAt: Date } | null>;
  fulfillCustomerPromise(input: { id: string; actorUserId: string; notes: string; fulfilledAt: Date }): Promise<ConcernPackageRecord>;
};

function dateValue(boardDate: string) {
  return new Date(`${boardDate}T00:00:00.000Z`);
}

function taskSnapshot(blueprint: ConcernTaskBlueprint, templateCode: string, templateVersion: number) {
  return {
    concernTemplateCode: templateCode,
    concernTemplateVersion: templateVersion,
    stepCode: blueprint.stepCode,
    requiredUpdateFields: blueprint.requiredUpdateFields.map((item) => ({ ...item, required: true, helpText: null })),
    checklistItems: blueprint.checklist.map((item) => ({ ...item, description: null })),
    completionCriteria: {
      mode: "checklist_and_update_fields",
      requiredChecklistKeys: blueprint.checklist.filter((item) => item.required).map((item) => item.key),
      requiredFieldKeys: blueprint.requiredUpdateFields.map((item) => item.key)
    },
    approvalRules: { mode: blueprint.requiresManagerApproval ? "manager_review" : "none", readyForReviewRequired: blueprint.requiresManagerApproval }
  } satisfies Prisma.InputJsonObject;
}

export function createConcernResolutionRepository(database: PrismaClient = prisma): ConcernResolutionRepository {
  return {
    listAssignmentUsers() {
      return database.user.findMany({
        where: { isActive: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: {
          id: true, name: true, email: true,
          userRoles: { select: { role: { select: { id: true, name: true } } } },
          userDuties: { select: { duty: { select: { id: true, name: true, workflowArea: true } } } }
        }
      });
    },
    findByIdempotency(reportedByUserId, idempotencyKey) {
      return database.concernCase.findUnique({ where: { reportedByUserId_idempotencyKey: { reportedByUserId, idempotencyKey } }, include: concernPackageInclude });
    },
    findById(id) {
      return database.concernCase.findUnique({ where: { id }, include: concernPackageInclude });
    },
    listRecent(limit) {
      return database.concernCase.findMany({ take: limit, orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: concernPackageInclude });
    },
    createPackage(input) {
      return database.$transaction(async (tx) => {
        const intakeBoard = await tx.boardDay.upsert({ where: { date: dateValue(input.intakeBoardDate) }, update: {}, create: { date: dateValue(input.intakeBoardDate) } });
        const slaPolicy = await tx.customerSlaPolicy.findFirst({ where: { organizationId: input.organizationId, status: "ACTIVE", effectiveFrom: { lte: new Date() }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }] }, orderBy: [{ version: "desc" }] });
        const createDecision = (result: CrmDecisionResult, normalizedInput: Prisma.InputJsonValue) => tx.crmDecisionRecord.create({ data: {
          organizationId: input.organizationId, decisionType: result.decisionType, algorithmVersion: result.algorithmVersion,
          customerId: input.customerId, subjectType: result.subject.type, subjectId: result.subject.id,
          normalizedInput, score: result.score, priority: result.priority, recommendedOwnerId: result.recommendedOwnerId,
          recommendedActionCode: result.recommendedActionCode, dueAt: result.dueAt ? new Date(result.dueAt) : null,
          reasonCodes: result.reasonCodes, explanation: result.explanation, confidence: result.confidence,
          missingInputs: result.missingInputs, managerReviewRequired: result.managerReviewRequired
        } });
        const severityDecision = await createDecision(input.severityDecision, input.severity as unknown as Prisma.InputJsonValue);
        await createDecision(input.playbookDecision, { category: input.category });
        const concern = await tx.concernCase.create({
          data: {
            organizationId: input.organizationId, customerId: input.customerId,
            concernNumber: input.concernNumber, idempotencyKey: input.idempotencyKey, requestHash: input.requestHash,
            boardDayId: intakeBoard.id, title: input.title, description: input.description, category: input.category,
            secondaryCategory: input.secondaryCategory, workflowArea: input.workflowArea, riskType: input.riskType,
            priority: input.priority, source: input.source, customerReference: input.customerReference,
            vehicleReference: input.vehicleReference, reportedByUserId: input.reportedByUserId,
            assignedOwnerId: input.assignedOwnerId, dueAt: input.dueAt, escalationRequired: input.escalationRequired,
            escalateAt: input.escalateAt, classificationSnapshot: input.classification as unknown as Prisma.InputJsonValue,
            severitySnapshot: input.severity as unknown as Prisma.InputJsonValue, templateCode: input.templateCode,
            templateVersion: input.templateVersion, severityScore: input.severityDecision.score ?? 0,
            severityBand: input.severityDecision.priority ?? "P3", lastDecisionId: severityDecision.id,
            firstResponseDueAt: input.firstResponseDueAt, resolutionDueAt: input.resolutionDueAt,
            slaPolicyId: slaPolicy?.id ?? null
          }
        });
        await tx.customerPromise.create({ data: { concernCaseId: concern.id, ownerUserId: input.assignedOwnerId, promiseType: "CUSTOMER_UPDATE", promisedAt: input.severityDecision.dueAt ? new Date(input.severityDecision.dueAt) : input.firstResponseDueAt, dueAt: input.customerUpdateDueAt } });
        await tx.activityEvent.create({ data: { boardDayId: intakeBoard.id, actorUserId: input.reportedByUserId, concernCaseId: concern.id, eventType: "concern.created", message: `Concern created: ${concern.title}`, metadata: { concernNumber: concern.concernNumber, priority: concern.priority, templateCode: concern.templateCode } } });
        for (const [index, planned] of input.tasks.entries()) {
          const board = await tx.boardDay.upsert({ where: { date: dateValue(planned.boardDate) }, update: {}, create: { date: dateValue(planned.boardDate) } });
          const snapshot = taskSnapshot(planned.blueprint, input.templateCode, input.templateVersion);
          const task = await tx.task.create({ data: {
            boardDayId: board.id, title: planned.blueprint.title, description: planned.blueprint.description,
            assignedUserId: planned.assignedUserId, recommendedUserId: planned.recommendedUserId,
            recommendationReasonCode: planned.recommendationReasonCode, recommendationExplanation: planned.recommendationExplanation,
            status: TaskStatus.NOT_STARTED, priority: input.priority, dueAt: planned.dueAt,
            createdByUserId: input.reportedByUserId, requiresManagerApproval: planned.blueprint.requiresManagerApproval,
            customerReference: input.customerReference, vehicleReference: input.vehicleReference,
            customerId: input.customerId,
            sourceType: TaskSourceType.CONCERN, templateSnapshot: snapshot,
            workflowArea: planned.blueprint.workflowArea as WorkflowArea
          } });
          await tx.taskChecklistItem.createMany({ data: planned.blueprint.checklist.map((item, itemIndex) => ({ taskId: task.id, kind: "DEFINITION_OF_DONE", key: item.key, label: item.label, isRequired: item.required, sortOrder: itemIndex })) });
          await tx.concernTaskLink.create({ data: { concernCaseId: concern.id, taskId: task.id, stepCode: planned.blueprint.stepCode, sortOrder: index, required: planned.blueprint.required, dependsOnStepCodes: planned.blueprint.dependsOnStepCodes, completionCriteria: planned.blueprint.completionCriteria, escalationRuleCode: planned.blueprint.escalationRuleCode, blueprintSnapshot: planned.blueprint as unknown as Prisma.InputJsonValue } });
          await tx.activityEvent.create({ data: { boardDayId: board.id, actorUserId: input.reportedByUserId, taskId: task.id, concernCaseId: concern.id, eventType: "task.created_from_concern", message: `Task generated from ${concern.concernNumber}: ${task.title}`, metadata: { concernNumber: concern.concernNumber, stepCode: planned.blueprint.stepCode } } });
        }
        return tx.concernCase.findUniqueOrThrow({ where: { id: concern.id }, include: concernPackageInclude });
      });
    },
    closeConcern(input) {
      return database.$transaction(async (tx) => {
        const concern = await tx.concernCase.update({ where: { id: input.id }, data: { status: ConcernStatus.CLOSED, closureOutcome: input.outcome, closureReason: input.reason, resolutionProof: input.proof, closedAt: input.closedAt, closedByUserId: input.actorUserId, escalationRequired: false } });
        await tx.activityEvent.create({ data: { boardDayId: concern.boardDayId, actorUserId: input.actorUserId, concernCaseId: concern.id, eventType: "concern.closed", message: `Concern closed: ${concern.concernNumber}`, metadata: { outcome: input.outcome, reason: input.reason } } });
        return tx.concernCase.findUniqueOrThrow({ where: { id: concern.id }, include: concernPackageInclude });
      });
    },
    listEscalationCandidates(now) {
      return database.concernCase.findMany({ where: { status: { in: [ConcernStatus.OPEN, ConcernStatus.IN_PROGRESS] }, escalationRequired: true, escalateAt: { lte: now } }, include: concernPackageInclude, orderBy: [{ escalateAt: "asc" }, { id: "asc" }] });
    },
    escalateConcern(input) {
      return database.$transaction(async (tx) => {
        const concern = await tx.concernCase.update({ where: { id: input.id }, data: { status: ConcernStatus.ESCALATED } });
        await tx.activityEvent.create({ data: { boardDayId: input.boardDayId, actorUserId: input.actorUserId, concernCaseId: concern.id, eventType: "concern.escalated", message: `Concern escalated: ${concern.concernNumber}`, metadata: { reasonCode: input.reasonCode, escalatedAt: input.escalatedAt.toISOString() } } });
        return tx.concernCase.findUniqueOrThrow({ where: { id: concern.id }, include: concernPackageInclude });
      });
    },
    findCustomerPromise(id) {
      return database.customerPromise.findUnique({ where: { id }, select: { id: true, concernCaseId: true, ownerUserId: true, status: true, dueAt: true } });
    },
    fulfillCustomerPromise(input) {
      return database.$transaction(async (tx) => {
        const promise = await tx.customerPromise.update({ where: { id: input.id }, data: { status: "FULFILLED", fulfillmentNotes: input.notes, fulfilledAt: input.fulfilledAt, fulfilledByUserId: input.actorUserId } });
        const concern = await tx.concernCase.findUniqueOrThrow({ where: { id: promise.concernCaseId } });
        await tx.activityEvent.create({ data: { boardDayId: concern.boardDayId, actorUserId: input.actorUserId, concernCaseId: concern.id, eventType: "customer_promise.fulfilled", message: `Customer update promise fulfilled: ${concern.concernNumber}`, metadata: { promiseId: promise.id, fulfilledAt: input.fulfilledAt.toISOString() } } });
        return tx.concernCase.findUniqueOrThrow({ where: { id: concern.id }, include: concernPackageInclude });
      });
    }
  };
}
