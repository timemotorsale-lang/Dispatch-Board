import { Prisma } from "@prisma/client";

import { prisma } from "@/server/db/client";
import {
  EnterpriseCommandConflictError,
  normalizeEnterpriseCommand
} from "@/server/enterprise-command/domain";

import {
  evaluateAttendanceCaptureTransition,
  toEnterpriseTimeAttendanceCommand,
  type AttendanceSessionState,
  type TimeAttendanceCaptureCommand
} from "./commands";

type ActiveSessionRecord = {
  id: string;
  organizationId: string;
  locationId: string;
  staffUserId: string;
  state: "OPEN" | "ON_MEAL" | "CLOSED" | "EXCEPTION";
  version: number;
};

type CaptureCommandRecord = {
  id: string;
  correlationId: string;
  resultSnapshot: unknown;
  resultingVersion: number | null;
};

type CaptureEventRecord = {
  id: string;
  eventType: TimeAttendanceCaptureCommand["commandType"];
  occurredAt: Date;
  recordedAt: Date;
  sessionId: string | null;
};

type CaptureCommitResult = {
  command: CaptureCommandRecord;
  duplicate: boolean;
  event: CaptureEventRecord | null;
  session: ActiveSessionRecord | null;
  version: number;
};

type TimeAttendanceTransaction = {
  enterpriseAggregateVersion: {
    create(input: { data: Record<string, unknown> }): Promise<{ id: string; version: number }>;
    findUnique(input: { where: Record<string, unknown> }): Promise<{ id: string; version: number } | null>;
    update(input: { where: { id: string }; data: Record<string, unknown> }): Promise<{ id: string; version: number }>;
  };
  enterpriseAuditEvent: {
    create(input: { data: Record<string, unknown> }): Promise<unknown>;
  };
  enterpriseCommandLedger: {
    create(input: { data: Record<string, unknown> }): Promise<CaptureCommandRecord>;
    findUnique(input: { where: Record<string, unknown> }): Promise<(CaptureCommandRecord & { requestHash: string }) | null>;
  };
  enterpriseDomainEvent: {
    create(input: { data: Record<string, unknown> }): Promise<{ id: string }>;
  };
  enterpriseOutboxMessage: {
    create(input: { data: Record<string, unknown> }): Promise<unknown>;
  };
  location: {
    findFirst(input: { where: Record<string, unknown>; select: { id: true; timezone: true } }): Promise<{ id: string; timezone: string } | null>;
  };
  timeAttendanceBreakInterval: {
    create(input: { data: Record<string, unknown> }): Promise<unknown>;
    findFirst(input: { where: Record<string, unknown>; orderBy: Record<string, string> }): Promise<{ id: string } | null>;
    update(input: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
  };
  timeAttendanceEvent: {
    create(input: { data: Record<string, unknown> }): Promise<CaptureEventRecord>;
    findFirst(input: { where: Record<string, unknown>; orderBy: Record<string, string> }): Promise<CaptureEventRecord | null>;
  };
  timeAttendanceSession: {
    create(input: { data: Record<string, unknown> }): Promise<ActiveSessionRecord>;
    findFirst(input: { where: Record<string, unknown>; orderBy: Record<string, string> }): Promise<ActiveSessionRecord | null>;
    update(input: { where: { id: string }; data: Record<string, unknown> }): Promise<ActiveSessionRecord>;
  };
};

type TimeAttendanceDatabase = {
  $transaction<T>(callback: (tx: TimeAttendanceTransaction) => Promise<T>): Promise<T>;
};

export type TimeAttendanceCaptureRepository = {
  commitCapture(input: TimeAttendanceCaptureCommand): Promise<CaptureCommitResult>;
};

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function deriveWorkDate(occurredAt: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric"
  }).formatToParts(occurredAt);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "01";
  return new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00.000Z`);
}

function toSessionState(session: ActiveSessionRecord | null): AttendanceSessionState {
  if (!session) return "NONE";
  if (session.state === "OPEN" || session.state === "ON_MEAL") return session.state;
  return "CLOSED";
}

export function createTimeAttendanceCaptureRepository(
  database: TimeAttendanceDatabase = prisma as unknown as TimeAttendanceDatabase
): TimeAttendanceCaptureRepository {
  return {
    commitCapture(input) {
      const enterpriseInput = toEnterpriseTimeAttendanceCommand(input);
      const command = normalizeEnterpriseCommand(enterpriseInput);
      const occurredAt = new Date(input.occurredAt);

      return database.$transaction(async (tx) => {
        const commandKey = {
          organizationId_domain_commandType_idempotencyKey: {
            organizationId: command.organizationId,
            domain: command.domain,
            commandType: command.commandType,
            idempotencyKey: command.idempotencyKey
          }
        };
        const existing = await tx.enterpriseCommandLedger.findUnique({ where: commandKey });
        if (existing) {
          if (existing.requestHash !== command.requestHash) {
            throw new EnterpriseCommandConflictError(
              "Idempotency key was already used with a different time attendance request.",
              "IDEMPOTENCY_KEY_REUSED"
            );
          }
          const event = await tx.timeAttendanceEvent.findFirst({
            where: { commandId: existing.id },
            orderBy: { createdAt: "asc" }
          });
          const session = event?.sessionId
            ? await tx.timeAttendanceSession.findFirst({
                where: { id: event.sessionId },
                orderBy: { createdAt: "desc" }
              })
            : null;
          return {
            command: existing,
            duplicate: true,
            event,
            session,
            version: existing.resultingVersion ?? input.expectedVersion
          };
        }

        const location = await tx.location.findFirst({
          where: { id: command.locationId, organizationId: command.organizationId },
          select: { id: true, timezone: true }
        });
        if (!location) {
          throw new Error("Location does not belong to the time attendance organization.");
        }

        const currentSession = await tx.timeAttendanceSession.findFirst({
          where: {
            organizationId: command.organizationId,
            staffUserId: input.staffUserId,
            state: { in: ["OPEN", "ON_MEAL"] }
          },
          orderBy: { openedAt: "desc" }
        });
        const transition = evaluateAttendanceCaptureTransition({
          commandType: input.commandType,
          currentState: toSessionState(currentSession)
        });
        const aggregateKey = {
          organizationId_domain_subjectType_subjectId: {
            organizationId: command.organizationId,
            domain: command.domain,
            subjectType: command.subjectType,
            subjectId: command.subjectId
          }
        };
        const aggregate = await tx.enterpriseAggregateVersion.findUnique({ where: aggregateKey });
        const currentVersion = aggregate?.version ?? 0;
        if (currentVersion !== input.expectedVersion) {
          throw new EnterpriseCommandConflictError(
            `Expected attendance session version ${input.expectedVersion}, but current version is ${currentVersion}.`,
            "VERSION_CONFLICT"
          );
        }
        const version = currentVersion + 1;
        if (aggregate) {
          await tx.enterpriseAggregateVersion.update({
            where: { id: aggregate.id },
            data: { locationId: command.locationId, version }
          });
        } else {
          await tx.enterpriseAggregateVersion.create({
            data: {
              organizationId: command.organizationId,
              locationId: command.locationId,
              domain: command.domain,
              subjectType: command.subjectType,
              subjectId: command.subjectId,
              version
            }
          });
        }

        const resultSnapshot = {
          eventType: transition.eventType,
          nextState: transition.nextState,
          staffUserId: input.staffUserId,
          version
        };
        const commandRecord = await tx.enterpriseCommandLedger.create({
          data: {
            organizationId: command.organizationId,
            locationId: command.locationId,
            actorUserId: command.actorUserId,
            domain: command.domain,
            subjectType: command.subjectType,
            subjectId: command.subjectId,
            commandType: command.commandType,
            status: "SUCCEEDED",
            idempotencyKey: command.idempotencyKey,
            requestHash: command.requestHash,
            correlationId: command.correlationId,
            expectedVersion: command.expectedVersion,
            resultingVersion: version,
            resultSnapshot: json(resultSnapshot),
            completedAt: new Date()
          }
        });

        let session = currentSession;
        if (input.commandType === "CLOCK_IN") {
          session = await tx.timeAttendanceSession.create({
            data: {
              organizationId: command.organizationId,
              locationId: command.locationId,
              staffUserId: input.staffUserId,
              workDate: deriveWorkDate(occurredAt, input.timezone),
              timezone: input.timezone,
              state: transition.nextState,
              openedAt: occurredAt,
              version
            }
          });
        }
        if (!session) {
          throw new Error("An active attendance session is required.");
        }
        if (input.commandType !== "CLOCK_IN") {
          session = await tx.timeAttendanceSession.update({
            where: { id: session.id },
            data: {
              state: transition.nextState,
              version,
              ...(transition.nextState === "CLOSED" ? { closedAt: occurredAt } : {})
            }
          });
        }

        const event = await tx.timeAttendanceEvent.create({
          data: {
            organizationId: command.organizationId,
            locationId: command.locationId,
            staffUserId: input.staffUserId,
            sessionId: session.id,
            commandId: commandRecord.id,
            actorUserId: input.actorUserId,
            eventType: input.commandType,
            source: input.actorUserId === input.staffUserId ? "WEB" : "MANAGER",
            occurredAt,
            timezone: input.timezone,
            reason: input.reason,
            evidence: json({
              completelyRelieved: input.completelyRelieved ?? null,
              paid: input.paid ?? null
            })
          }
        });

        if (input.commandType === "START_MEAL") {
          await tx.timeAttendanceBreakInterval.create({
            data: {
              organizationId: command.organizationId,
              locationId: command.locationId,
              sessionId: session.id,
              staffUserId: input.staffUserId,
              kind: "MEAL",
              startEventId: event.id,
              startAt: occurredAt,
              paid: input.paid === true,
              completelyRelieved: false,
              evidence: json({ source: "START_MEAL", paid: input.paid === true })
            }
          });
        }
        if (input.commandType === "START_PAID_REST") {
          const openRest = await tx.timeAttendanceBreakInterval.findFirst({
            where: { sessionId: session.id, kind: "PAID_REST", endAt: null },
            orderBy: { startAt: "desc" }
          });
          if (openRest) {
            throw new Error("A paid rest interval is already open for this attendance session.");
          }
          await tx.timeAttendanceBreakInterval.create({
            data: {
              organizationId: command.organizationId,
              locationId: command.locationId,
              sessionId: session.id,
              staffUserId: input.staffUserId,
              kind: "PAID_REST",
              startEventId: event.id,
              startAt: occurredAt,
              paid: true,
              completelyRelieved: false,
              evidence: json({ source: "START_PAID_REST", paid: true })
            }
          });
        }
        if (input.commandType === "END_MEAL") {
          const openMeal = await tx.timeAttendanceBreakInterval.findFirst({
            where: {
              sessionId: session.id,
              kind: "MEAL",
              endAt: null
            },
            orderBy: { startAt: "desc" }
          });
          if (!openMeal) {
            throw new Error("No open meal interval was found for this attendance session.");
          }
          await tx.timeAttendanceBreakInterval.update({
            where: { id: openMeal.id },
            data: {
              completelyRelieved: input.completelyRelieved === true,
              endAt: occurredAt,
              endEventId: event.id,
              evidence: json({
                source: "END_MEAL",
                completelyRelieved: input.completelyRelieved === true
              })
            }
          });
        }
        if (input.commandType === "END_PAID_REST") {
          const openRest = await tx.timeAttendanceBreakInterval.findFirst({
            where: { sessionId: session.id, kind: "PAID_REST", endAt: null },
            orderBy: { startAt: "desc" }
          });
          if (!openRest) {
            throw new Error("No open paid rest interval was found for this attendance session.");
          }
          await tx.timeAttendanceBreakInterval.update({
            where: { id: openRest.id },
            data: {
              completelyRelieved: input.completelyRelieved === true,
              endAt: occurredAt,
              endEventId: event.id,
              evidence: json({
                source: "END_PAID_REST",
                completelyRelieved: input.completelyRelieved === true,
                dutyPerformed: input.completelyRelieved !== true
              })
            }
          });
        }

        const eventType = `${command.commandType}_COMPLETED`;
        const domainEvent = await tx.enterpriseDomainEvent.create({
          data: {
            organizationId: command.organizationId,
            locationId: command.locationId,
            commandId: commandRecord.id,
            domain: command.domain,
            aggregateType: command.subjectType,
            aggregateId: command.subjectId,
            aggregateVersion: version,
            eventType,
            payload: json({ ...command.payload, eventId: event.id, reason: command.reason })
          }
        });
        await tx.enterpriseAuditEvent.create({
          data: {
            organizationId: command.organizationId,
            locationId: command.locationId,
            actorUserId: command.actorUserId,
            commandId: commandRecord.id,
            domain: command.domain,
            subjectType: command.subjectType,
            subjectId: command.subjectId,
            eventType,
            reason: command.reason,
            newValue: json(resultSnapshot),
            metadata: json({ requestHash: command.requestHash }),
            correlationId: command.correlationId
          }
        });
        await tx.enterpriseOutboxMessage.create({
          data: {
            organizationId: command.organizationId,
            locationId: command.locationId,
            domainEventId: domainEvent.id,
            topic: "time-attendance.capture",
            messageKey: command.subjectId,
            payload: json({
              aggregateId: command.subjectId,
              aggregateVersion: version,
              correlationId: command.correlationId,
              eventId: domainEvent.id,
              eventType
            })
          }
        });

        return {
          command: commandRecord,
          duplicate: false,
          event,
          session,
          version
        };
      });
    }
  };
}
