import { CustomerLeadStage, Prisma, TaskSourceType, TaskStatus, WorkflowArea, type PrismaClient, type TaskTemplatePriority } from "@prisma/client";

import { prisma } from "@/server/db/client";
import type { CrmDecisionResult } from "@/server/customers/decisions/crm-decision-domain";

const leadInclude = {
  customer: { select: { id: true, customerNumber: true, displayName: true, phoneNumber: true, email: true } },
  ownerUser: { select: { id: true, name: true, email: true } },
  taskLinks: { include: { task: { select: { id: true, title: true, status: true, dueAt: true } } } }
} satisfies Prisma.CustomerLeadInclude;

export type CustomerLeadRecord = Prisma.CustomerLeadGetPayload<{ include: typeof leadInclude }>;
export type LeadAssignmentCandidateRecord = Prisma.UserGetPayload<{
  select: { id: true; name: true; isActive: true; userRoles: { select: { role: { select: { name: true } } } }; userDuties: { select: { duty: { select: { name: true; workflowArea: true } } } }; _count: { select: { ownedCustomerLeads: true } } };
}>;

export type CreateLeadPackageInput = {
  organizationId: string; customerId: string; leadNumber: string; idempotencyKey: string;
  requestHash: string; sourceCode: string; vehicleInterest: string | null; createdByUserId: string;
  qualificationSnapshot: Prisma.InputJsonValue; priorityDecision: CrmDecisionResult;
  assignmentDecision: CrmDecisionResult; taskPriority: TaskTemplatePriority; decidedAt: Date;
};

export type CustomerLeadRepository = {
  findCustomer(organizationId: string, customerId: string): Promise<{ id: string; displayName: string } | null>;
  findByIdempotency(organizationId: string, idempotencyKey: string): Promise<CustomerLeadRecord | null>;
  findById(organizationId: string, id: string): Promise<CustomerLeadRecord | null>;
  listAssignmentCandidates(): Promise<LeadAssignmentCandidateRecord[]>;
  createPackage(input: CreateLeadPackageInput): Promise<CustomerLeadRecord>;
  transition(input: { organizationId: string; id: string; stage: CustomerLeadStage; reason: string | null; occurredAt: Date; actorUserId: string }): Promise<CustomerLeadRecord>;
  listRecent(organizationId: string, limit: number): Promise<CustomerLeadRecord[]>;
};

function decisionData(input: { organizationId: string; result: CrmDecisionResult; normalizedInput: Prisma.InputJsonValue; decidedAt: Date }) {
  const result = input.result;
  return {
    organizationId: input.organizationId, decisionType: result.decisionType,
    algorithmVersion: result.algorithmVersion, customerId: result.customerId,
    subjectType: result.subject.type, subjectId: result.subject.id,
    normalizedInput: input.normalizedInput, score: result.score, priority: result.priority,
    recommendedOwnerId: result.recommendedOwnerId, recommendedActionCode: result.recommendedActionCode,
    dueAt: result.dueAt ? new Date(result.dueAt) : null, reasonCodes: result.reasonCodes,
    explanation: result.explanation, confidence: result.confidence, missingInputs: result.missingInputs,
    managerReviewRequired: result.managerReviewRequired, decidedAt: input.decidedAt
  };
}

export function createCustomerLeadRepository(database: PrismaClient = prisma): CustomerLeadRepository {
  return {
    findCustomer(organizationId, customerId) {
      return database.customer.findFirst({ where: { id: customerId, organizationId, mergedIntoCustomerId: null }, select: { id: true, displayName: true } });
    },
    findByIdempotency(organizationId, idempotencyKey) {
      return database.customerLead.findUnique({ where: { organizationId_idempotencyKey: { organizationId, idempotencyKey } }, include: leadInclude });
    },
    findById(organizationId, id) {
      return database.customerLead.findFirst({ where: { organizationId, id }, include: leadInclude });
    },
    listAssignmentCandidates() {
      return database.user.findMany({ where: { isActive: true }, orderBy: [{ name: "asc" }, { id: "asc" }], select: {
        id: true, name: true, isActive: true,
        userRoles: { select: { role: { select: { name: true } } } },
        userDuties: { select: { duty: { select: { name: true, workflowArea: true } } } },
        _count: { select: { ownedCustomerLeads: { where: { stage: { notIn: [CustomerLeadStage.WON, CustomerLeadStage.LOST] } } } } }
      } });
    },
    createPackage(input) {
      return database.$transaction(async (tx) => {
        const priorityRecord = await tx.crmDecisionRecord.create({ data: decisionData({ organizationId: input.organizationId, result: input.priorityDecision, normalizedInput: input.qualificationSnapshot, decidedAt: input.decidedAt }) });
        const assignmentFacts = { priorityDecisionId: priorityRecord.id, recommendedOwnerId: input.assignmentDecision.recommendedOwnerId };
        const assignmentRecord = await tx.crmDecisionRecord.create({ data: decisionData({ organizationId: input.organizationId, result: input.assignmentDecision, normalizedInput: assignmentFacts, decidedAt: input.decidedAt }) });
        const dueAt = input.priorityDecision.dueAt ? new Date(input.priorityDecision.dueAt) : new Date(input.decidedAt.getTime() + 24 * 60 * 60_000);
        const lead = await tx.customerLead.create({ data: {
          organizationId: input.organizationId, customerId: input.customerId, leadNumber: input.leadNumber,
          idempotencyKey: input.idempotencyKey, requestHash: input.requestHash, sourceCode: input.sourceCode,
          ownerUserId: input.assignmentDecision.recommendedOwnerId!, vehicleInterest: input.vehicleInterest,
          nextActionCode: input.priorityDecision.recommendedActionCode!, nextActionAt: dueAt,
          priority: input.priorityDecision.priority ?? "NURTURE", score: input.priorityDecision.score ?? 0,
          confidence: input.priorityDecision.confidence, lastDecisionId: priorityRecord.id,
          qualificationSnapshot: input.qualificationSnapshot, createdByUserId: input.createdByUserId
        } });
        const boardDate = dueAt.toISOString().slice(0, 10);
        const board = await tx.boardDay.upsert({ where: { date: new Date(`${boardDate}T00:00:00.000Z`) }, update: {}, create: { date: new Date(`${boardDate}T00:00:00.000Z`) } });
        const customer = await tx.customer.findUniqueOrThrow({ where: { id: input.customerId }, select: { displayName: true } });
        const task = await tx.task.create({ data: {
          boardDayId: board.id, title: `Lead follow-up: ${customer.displayName}`,
          description: input.priorityDecision.explanation, assignedUserId: input.assignmentDecision.recommendedOwnerId!,
          recommendedUserId: input.assignmentDecision.recommendedOwnerId, recommendationReasonCode: input.assignmentDecision.reasonCodes[0] ?? null,
          recommendationExplanation: input.assignmentDecision.explanation, status: TaskStatus.NOT_STARTED,
          priority: input.taskPriority, dueAt, createdByUserId: input.createdByUserId,
          requiresManagerApproval: input.priorityDecision.managerReviewRequired,
          customerId: input.customerId, customerReference: customer.displayName, vehicleReference: input.vehicleInterest,
          sourceType: TaskSourceType.LEAD, workflowArea: WorkflowArea.SALES,
          templateSnapshot: { leadId: lead.id, leadNumber: lead.leadNumber, decisionId: priorityRecord.id, actionCode: input.priorityDecision.recommendedActionCode }
        } });
        await tx.customerLeadTaskLink.create({ data: { leadId: lead.id, taskId: task.id, actionCode: input.priorityDecision.recommendedActionCode!, decisionId: priorityRecord.id } });
        await tx.activityEvent.create({ data: { boardDayId: board.id, actorUserId: input.createdByUserId, taskId: task.id, eventType: "customer_lead.created", message: `Lead created: ${lead.leadNumber}`, metadata: { leadId: lead.id, priorityDecisionId: priorityRecord.id, assignmentDecisionId: assignmentRecord.id } } });
        return tx.customerLead.findUniqueOrThrow({ where: { id: lead.id }, include: leadInclude });
      });
    },
    transition(input) {
      return database.$transaction(async (tx) => {
        const lead = await tx.customerLead.update({ where: { id: input.id, organizationId: input.organizationId }, data: {
          stage: input.stage,
          ...(input.stage === CustomerLeadStage.WON || input.stage === CustomerLeadStage.LOST ? { closedAt: input.occurredAt, closedReason: input.reason } : { closedAt: null, closedReason: null })
        } });
        const link = await tx.customerLeadTaskLink.findFirst({ where: { leadId: lead.id }, include: { task: { select: { boardDayId: true } } } });
        if (link) await tx.activityEvent.create({ data: { boardDayId: link.task.boardDayId, actorUserId: input.actorUserId, taskId: link.taskId, eventType: "customer_lead.stage_changed", message: `Lead ${lead.leadNumber} moved to ${input.stage}.`, metadata: { leadId: lead.id, stage: input.stage, reason: input.reason } } });
        return tx.customerLead.findUniqueOrThrow({ where: { id: lead.id }, include: leadInclude });
      });
    },
    listRecent(organizationId, limit) {
      return database.customerLead.findMany({ where: { organizationId }, take: limit, orderBy: [{ createdAt: "desc" }, { id: "desc" }], include: leadInclude });
    }
  };
}
