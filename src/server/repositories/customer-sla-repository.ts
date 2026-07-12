import { ConcernStatus, Prisma, TaskSourceType, TaskStatus, WorkflowArea, type PrismaClient } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { CustomerSlaStage } from "@/server/customers/sla/customer-sla-clock";

const policySelect = { id: true, organizationId: true, code: true, version: true, timezone: true, businessWindows: true, severityTargets: true, pauseReasonCodes: true, effectiveFrom: true } satisfies Prisma.CustomerSlaPolicySelect;
const caseSelect = { id: true, concernNumber: true, organizationId: true, title: true, status: true, severityBand: true, slaStage: true, createdAt: true, firstRespondedAt: true, assignedOwnerId: true, customerReference: true, boardDayId: true, slaPolicy: { select: policySelect }, slaPauses: { select: { id: true, reasonCode: true, startedAt: true, endedAt: true, nextReviewAt: true } } } satisfies Prisma.ConcernCaseSelect;
export type CustomerSlaPolicyRecord = Prisma.CustomerSlaPolicyGetPayload<{ select: typeof policySelect }>;
export type CustomerSlaCaseRecord = Prisma.ConcernCaseGetPayload<{ select: typeof caseSelect }>;

export type CustomerSlaRepository = {
  getActivePolicy(organizationId: string, now: Date): Promise<CustomerSlaPolicyRecord | null>;
  listCasesForEvaluation(organizationId: string): Promise<CustomerSlaCaseRecord[]>;
  recordEvaluation(input: { caseRecord: CustomerSlaCaseRecord; stage: CustomerSlaStage; clockType: string; evaluatedAt: Date; percentConsumed: number }): Promise<{ alertCreated: boolean; taskCreated: boolean }>;
  startPause(input: { concernCaseId: string; reasonCode: string; notes: string; startedAt: Date; nextReviewAt: Date; actorUserId: string }): Promise<void>;
  findOpenPause(concernCaseId: string): Promise<{ id: string; concernCaseId: string } | null>;
  endPause(input: { id: string; endedAt: Date; actorUserId: string }): Promise<void>;
  listManagerQueue(organizationId: string): Promise<Array<{ id: string; concernNumber: string; title: string; severityBand: string; slaStage: string; customerReference: string | null; assignedOwnerId: string | null; firstResponseDueAt: Date | null; resolutionDueAt: Date | null; promises: Array<{ id: string; dueAt: Date; status: string }>; alerts: Array<{ id: string; stage: string; lastDetectedAt: Date; occurrenceCount: number; taskId: string | null }> }>>;
};

export function createCustomerSlaRepository(database: PrismaClient = prisma): CustomerSlaRepository {
  return {
    getActivePolicy(organizationId, now) { return database.customerSlaPolicy.findFirst({ where: { organizationId, status: "ACTIVE", effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] }, orderBy: [{ version: "desc" }], select: policySelect }); },
    listCasesForEvaluation(organizationId) { return database.concernCase.findMany({ where: { organizationId, status: { not: ConcernStatus.CLOSED } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: caseSelect }); },
    recordEvaluation(input) { return database.$transaction(async (tx) => {
      await tx.concernCase.update({ where: { id: input.caseRecord.id }, data: { slaStage: input.stage, slaEvaluatedAt: input.evaluatedAt } });
      if (input.stage === "HEALTHY") { await tx.customerSlaAlert.updateMany({ where: { concernCaseId: input.caseRecord.id, resolvedAt: null }, data: { resolvedAt: input.evaluatedAt } }); return { alertCreated: false, taskCreated: false }; }
      const existing = await tx.customerSlaAlert.findUnique({ where: { concernCaseId_clockType_stage: { concernCaseId: input.caseRecord.id, clockType: input.clockType, stage: input.stage } } });
      if (existing) { await tx.customerSlaAlert.update({ where: { id: existing.id }, data: { lastDetectedAt: input.evaluatedAt, occurrenceCount: { increment: 1 }, resolvedAt: null } }); return { alertCreated: false, taskCreated: false }; }
      const manager = await tx.user.findFirst({ where: { isActive: true, userRoles: { some: { role: { name: "General Manager" } } } }, orderBy: [{ id: "asc" }] });
      if (!manager) throw new Error("An active manager is required for SLA alerts.");
      const day = input.evaluatedAt.toISOString().slice(0, 10); const board = await tx.boardDay.upsert({ where: { date: new Date(`${day}T00:00:00.000Z`) }, update: {}, create: { date: new Date(`${day}T00:00:00.000Z`) } });
      const task = await tx.task.create({ data: { boardDayId: board.id, title: `${input.stage.replaceAll("_", " ")}: ${input.caseRecord.concernNumber}`, description: `${input.clockType} SLA is ${input.percentConsumed}% consumed for ${input.caseRecord.title}.`, assignedUserId: manager.id, status: TaskStatus.NOT_STARTED, priority: input.stage === "BREACHED" || input.stage === "REPEATED_BREACH" ? "CRITICAL" : "HIGH", dueAt: input.evaluatedAt, createdByUserId: null, requiresManagerApproval: true, customerReference: input.caseRecord.customerReference, sourceType: TaskSourceType.CONCERN, workflowArea: WorkflowArea.GENERAL_MANAGER, templateSnapshot: { concernCaseId: input.caseRecord.id, slaStage: input.stage, clockType: input.clockType } } });
      await tx.customerSlaAlert.create({ data: { concernCaseId: input.caseRecord.id, clockType: input.clockType, stage: input.stage, taskId: task.id, firstDetectedAt: input.evaluatedAt, lastDetectedAt: input.evaluatedAt } });
      await tx.activityEvent.create({ data: { boardDayId: board.id, taskId: task.id, concernCaseId: input.caseRecord.id, eventType: "customer_sla.stage_changed", message: `${input.caseRecord.concernNumber} entered ${input.stage}.`, metadata: { clockType: input.clockType, percentConsumed: input.percentConsumed } } });
      return { alertCreated: true, taskCreated: true };
    }); },
    async startPause(input) { await database.customerSlaPause.create({ data: { concernCaseId: input.concernCaseId, reasonCode: input.reasonCode, notes: input.notes, startedAt: input.startedAt, nextReviewAt: input.nextReviewAt, startedByUserId: input.actorUserId } }); },
    findOpenPause(concernCaseId) { return database.customerSlaPause.findFirst({ where: { concernCaseId, endedAt: null }, select: { id: true, concernCaseId: true } }); },
    async endPause(input) { await database.customerSlaPause.update({ where: { id: input.id }, data: { endedAt: input.endedAt, endedByUserId: input.actorUserId } }); },
    listManagerQueue(organizationId) { return database.concernCase.findMany({ where: { organizationId, status: { not: ConcernStatus.CLOSED }, OR: [{ slaStage: { not: "HEALTHY" } }, { customerPromises: { some: { status: "OPEN" } } }] }, orderBy: [{ resolutionDueAt: "asc" }, { id: "asc" }], select: { id: true, concernNumber: true, title: true, severityBand: true, slaStage: true, customerReference: true, assignedOwnerId: true, firstResponseDueAt: true, resolutionDueAt: true, customerPromises: { where: { status: "OPEN" }, select: { id: true, dueAt: true, status: true } }, slaAlerts: { where: { resolvedAt: null }, select: { id: true, stage: true, lastDetectedAt: true, occurrenceCount: true, taskId: true } } } }).then((rows) => rows.map(({ customerPromises, slaAlerts, ...row }) => ({ ...row, promises: customerPromises, alerts: slaAlerts }))); }
  };
}
