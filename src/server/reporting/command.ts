import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";

export async function recordReportingCommand(transaction: Prisma.TransactionClient, input: { actorUserId: string; subjectId: string; action: string; version: number; key: string; hash: string; reason: string; result: Prisma.InputJsonValue }) {
  const correlationId = randomUUID(), organizationId = INITIAL_ORGANIZATION.id;
  const command = await transaction.enterpriseCommandLedger.create({ data: {
    organizationId, actorUserId: input.actorUserId, domain: "REPORTING", subjectType: "REPORT", subjectId: input.subjectId,
    commandType: input.action, status: "SUCCEEDED", idempotencyKey: input.key, requestHash: input.hash, correlationId,
    expectedVersion: Math.max(0, input.version - 1), resultingVersion: input.version, resultSnapshot: input.result, completedAt: new Date()
  } });
  await transaction.enterpriseAuditEvent.create({ data: { organizationId, actorUserId: input.actorUserId, commandId: command.id, domain: "REPORTING", subjectType: "REPORT", subjectId: input.subjectId, eventType: input.action, reason: input.reason, metadata: { version: input.version }, correlationId } });
  const event = await transaction.enterpriseDomainEvent.create({ data: { organizationId, commandId: command.id, domain: "REPORTING", aggregateType: "REPORT_COMMAND", aggregateId: command.id, aggregateVersion: 1, eventType: input.action, payload: { reportId: input.subjectId, version: input.version }, occurredAt: new Date() } });
  await transaction.enterpriseOutboxMessage.create({ data: { organizationId, domainEventId: event.id, topic: "reporting.changed", messageKey: command.id, payload: { reportId: input.subjectId, eventType: input.action } } });
}
