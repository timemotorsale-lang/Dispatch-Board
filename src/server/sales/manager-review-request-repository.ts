import { Prisma, type PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";
import { EnterpriseCommandConflictError } from "@/server/enterprise-command/domain";

import type { NormalizedSalesManagerReviewRequest } from "./manager-review-request-validation";

type SalesManagerReviewDatabase = Pick<
  PrismaClient,
  | "$transaction"
  | "activityEvent"
  | "boardDay"
  | "enterpriseAuditEvent"
  | "enterpriseCommandLedger"
  | "enterpriseDomainEvent"
  | "task"
  | "user"
>;

const managerReviewTaskSelect = {
  assignedUser: {
    select: {
      email: true,
      id: true,
      name: true
    }
  },
  id: true,
  priority: true,
  status: true,
  title: true
} satisfies Prisma.TaskSelect;

export type SalesManagerReviewPersistInput = {
  actorUserId: string;
  boardDate: string;
  commandType: "CREATE_MANAGER_REVIEW_REQUEST";
  correlationId: string;
  idempotencyKey: string;
  organizationId: string;
  request: NormalizedSalesManagerReviewRequest;
  requestHash: string;
};

export type SalesManagerReviewPersistResult = {
  auditEventId: string | null;
  commandId: string;
  correlationId: string;
  duplicate: boolean;
  idempotencyKey: string;
  task: Prisma.TaskGetPayload<{ select: typeof managerReviewTaskSelect }>;
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function boardDateValue(boardDate: string) {
  return new Date(`${boardDate}T00:00:00.000Z`);
}

function dueAtFromBoardDate(boardDate: string) {
  return new Date(`${boardDate}T18:00:00.000Z`);
}

function priorityFromUrgency(urgency: NormalizedSalesManagerReviewRequest["urgency"]) {
  if (urgency === "urgent") return "CRITICAL";
  if (urgency === "high") return "HIGH";
  return "MEDIUM";
}

function taskTitle(request: NormalizedSalesManagerReviewRequest) {
  return `Manager review requested for deal ${request.dealId}`;
}

function taskDescription(request: NormalizedSalesManagerReviewRequest) {
  return [
    request.reason,
    "",
    `Customer source: ${request.customerId}`,
    `Deal source: ${request.dealId}`,
    `Vehicle source: ${request.vehicleId}`
  ].join("\n");
}

export function createSalesManagerReviewRequestRepository(
  database: SalesManagerReviewDatabase = prisma
) {
  return {
    async persist(input: SalesManagerReviewPersistInput): Promise<SalesManagerReviewPersistResult> {
      return database.$transaction(async (tx) => {
        const existing = await tx.enterpriseCommandLedger.findUnique({
          where: {
            organizationId_domain_commandType_idempotencyKey: {
              commandType: input.commandType,
              domain: "SALES_CONSOLE",
              idempotencyKey: input.idempotencyKey,
              organizationId: input.organizationId
            }
          }
        });

        if (existing) {
          if (existing.requestHash !== input.requestHash) {
            throw new EnterpriseCommandConflictError(
              "Idempotency key was already used with a different request.",
              "IDEMPOTENCY_KEY_REUSED"
            );
          }

          const snapshot = existing.resultSnapshot as { auditEventId?: string | null; taskId?: string } | null;
          const taskId = snapshot?.taskId;
          if (!taskId) {
            throw new Error("Existing manager review request is missing its task snapshot.");
          }

          const task = await tx.task.findUniqueOrThrow({
            where: { id: taskId },
            select: managerReviewTaskSelect
          });

          return {
            auditEventId: snapshot.auditEventId ?? null,
            commandId: existing.id,
            correlationId: existing.correlationId,
            duplicate: true,
            idempotencyKey: existing.idempotencyKey,
            task
          };
        }

        const assignedManager = await tx.user.findUnique({
          where: { id: input.request.assignedManagerUserId },
          select: { id: true, isActive: true, name: true }
        });

        if (!assignedManager) {
          throw new Error("Assigned manager was not found.");
        }

        if (!assignedManager.isActive) {
          throw new Error("Assigned manager must be active.");
        }

        const boardDay = await tx.boardDay.upsert({
          create: { date: boardDateValue(input.boardDate) },
          update: {},
          where: { date: boardDateValue(input.boardDate) }
        });

        const task = await tx.task.create({
          data: {
            assignedUserId: input.request.assignedManagerUserId,
            boardDayId: boardDay.id,
            createdByUserId: input.actorUserId,
            customerReference: input.request.customerId,
            description: taskDescription(input.request),
            dueAt: dueAtFromBoardDate(input.boardDate),
            priority: priorityFromUrgency(input.request.urgency),
            requiresManagerApproval: false,
            sourceType: "MANAGER",
            status: "NOT_STARTED",
            templateSnapshot: json({
              managerReviewRequest: {
                idempotencyKey: input.idempotencyKey,
                sourceSnapshot: input.request.sourceSnapshot
              },
              version: 1
            }),
            title: taskTitle(input.request),
            vehicleReference: input.request.vehicleId,
            workflowArea: "SALES"
          },
          select: managerReviewTaskSelect
        });

        const resultSnapshot = {
          auditEventId: null as string | null,
          idempotencyKey: input.idempotencyKey,
          taskId: task.id,
          taskTitle: task.title
        };

        const command = await tx.enterpriseCommandLedger.create({
          data: {
            actorUserId: input.actorUserId,
            commandType: input.commandType,
            completedAt: new Date(),
            correlationId: input.correlationId,
            domain: "SALES_CONSOLE",
            expectedVersion: 0,
            idempotencyKey: input.idempotencyKey,
            organizationId: input.organizationId,
            requestHash: input.requestHash,
            resultSnapshot: json(resultSnapshot),
            resultingVersion: 1,
            status: "SUCCEEDED",
            subjectId: input.idempotencyKey,
            subjectType: "MANAGER_REVIEW_REQUEST"
          }
        });

        const event = await tx.enterpriseDomainEvent.create({
          data: {
            aggregateId: input.idempotencyKey,
            aggregateType: "MANAGER_REVIEW_REQUEST",
            aggregateVersion: 1,
            commandId: command.id,
            domain: "SALES_CONSOLE",
            eventType: "CREATE_MANAGER_REVIEW_REQUEST_COMPLETED",
            organizationId: input.organizationId,
            payload: json({
              reason: input.request.reason,
              sourceSnapshot: input.request.sourceSnapshot,
              taskId: task.id,
              urgency: input.request.urgency
            })
          }
        });

        const auditEvent = await tx.enterpriseAuditEvent.create({
          data: {
            actorUserId: input.actorUserId,
            commandId: command.id,
            correlationId: input.correlationId,
            domain: "SALES_CONSOLE",
            eventType: "CREATE_MANAGER_REVIEW_REQUEST_COMPLETED",
            metadata: json({
              idempotencyKey: input.idempotencyKey,
              requestHash: input.requestHash,
              sourceSnapshot: input.request.sourceSnapshot
            }),
            newValue: json({ ...resultSnapshot, auditEventId: undefined }),
            organizationId: input.organizationId,
            reason: input.request.reason,
            subjectId: input.idempotencyKey,
            subjectType: "MANAGER_REVIEW_REQUEST"
          }
        });

        await tx.enterpriseCommandLedger.update({
          data: {
            resultSnapshot: json({ ...resultSnapshot, auditEventId: auditEvent.id })
          },
          where: { id: command.id }
        });

        await tx.activityEvent.create({
          data: {
            actorUserId: input.actorUserId,
            boardDayId: boardDay.id,
            eventType: "sales.manager_review_request.created",
            message: `Manager review request created for ${assignedManager.name}.`,
            metadata: json({
              auditEventId: auditEvent.id,
              commandId: command.id,
              correlationId: input.correlationId,
              domainEventId: event.id,
              idempotencyKey: input.idempotencyKey
            }),
            taskId: task.id
          }
        });

        return {
          auditEventId: auditEvent.id,
          commandId: command.id,
          correlationId: input.correlationId,
          duplicate: false,
          idempotencyKey: input.idempotencyKey,
          task
        };
      });
    }
  };
}
