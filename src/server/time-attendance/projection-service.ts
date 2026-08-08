import { Prisma, type TimeCardStatus } from "@prisma/client";

import { prisma } from "@/server/db/client";

import type { TimeAttendanceSourceEvent } from "./normalization";
import { anchoredPeriodForInstant, dateKeyWithinPeriod, localDateKey, weeklyPeriodForInstant } from "./period";
import type { OvertimeCoverage } from "./policy-registry";
import { hashTimeCardReplay, replayTimeCardProjection } from "./replay";

type ProjectionTrigger =
  | "CAPTURE"
  | "CORRECTION"
  | "POLICY_CHANGE"
  | "TIME_OFF_DECISION"
  | "CONTROLLED_REPLAY";

type ProjectionRequest = {
  organizationId: string;
  staffUserId: string;
  locationId: string;
  occurredAt: Date;
  trigger: ProjectionTrigger;
};

export type TimeCardProjectionOutcome = {
  state: "CREATED" | "CURRENT" | "BLOCKED";
  cardId: string | null;
  cardVersion: number | null;
  checksum: string | null;
  payrollReady: boolean;
  reason: string | null;
};

type ProjectionDatabase = Pick<
  typeof prisma,
  "$transaction" | "timeAttendancePolicyAssignment" | "timeAttendanceEvent" | "timeOffRequest" | "timeCard"
> & Pick<typeof prisma, "timeAttendanceBreakInterval" | "timeAttendancePayPeriodDefinition">;

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function evidenceObject(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, Prisma.JsonValue>;
}

function booleanEvidence(value: Prisma.JsonValue, key: string) {
  const candidate = evidenceObject(value)[key];
  return typeof candidate === "boolean" ? candidate : null;
}

function sourceEvent(record: {
  id: string;
  eventType: string;
  occurredAt: Date;
  evidence: Prisma.JsonValue;
}): TimeAttendanceSourceEvent | null {
  const evidence = evidenceObject(record.evidence);
  const replacementEventType = record.eventType === "MANAGER_CORRECTION"
    ? evidence.replacementEventType
    : record.eventType;
  const replacementOccurredAt = record.eventType === "MANAGER_CORRECTION"
    ? evidence.replacementOccurredAt
    : null;
  if (typeof replacementEventType !== "string" || !["CLOCK_IN", "START_MEAL", "END_MEAL", "CLOCK_OUT"].includes(replacementEventType)) {
    return null;
  }
  return {
    id: record.id,
    eventType: replacementEventType as TimeAttendanceSourceEvent["eventType"],
    occurredAt: typeof replacementOccurredAt === "string" ? replacementOccurredAt : record.occurredAt.toISOString(),
    paid: booleanEvidence(record.evidence, "paid"),
    completelyRelieved: booleanEvidence(record.evidence, "completelyRelieved")
  };
}

function isProtectedCardStatus(status: TimeCardStatus) {
  return status === "LOCKED" || status === "EXPORTED";
}

function projectionStatus(payrollReady: boolean): TimeCardStatus {
  return payrollReady ? "EMPLOYEE_REVIEW" : "OPEN";
}

async function loadProjectionInput(database: ProjectionDatabase, request: ProjectionRequest) {
  const assignments = await database.timeAttendancePolicyAssignment.findMany({
    where: {
      organizationId: request.organizationId,
      staffUserId: request.staffUserId,
      effectiveFrom: { lte: request.occurredAt },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: request.occurredAt } }],
      policyProfile: {
        status: "ACTIVE",
        effectiveFrom: { lte: request.occurredAt },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: request.occurredAt } }]
      }
    },
    include: { policyProfile: true },
    orderBy: [{ effectiveFrom: "desc" }, { createdAt: "desc" }]
  });
  const applicable = assignments.filter((assignment) =>
    assignment.locationId === null || assignment.locationId === request.locationId
  );
  if (applicable.length !== 1) {
    return {
      blockedReason: applicable.length === 0
        ? "No active approved time policy assignment covers this employee, location, and work date."
        : "Multiple active time policy assignments cover this employee, location, and work date.",
      input: null
    };
  }

  const assignment = applicable[0];
  const policy = assignment.policyProfile;
  const payPeriodDefinitions = await database.timeAttendancePayPeriodDefinition.findMany({
    where: {
      organizationId: request.organizationId,
      status: "ACTIVE",
      effectiveFrom: { lte: request.occurredAt },
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: request.occurredAt } }]
    },
    orderBy: [{ effectiveFrom: "desc" }, { version: "desc" }]
  });
  const applicablePayPeriods = payPeriodDefinitions.filter((definition) =>
    definition.locationId === null || definition.locationId === request.locationId
  );
  if (applicablePayPeriods.length > 1) {
    return { blockedReason: "Multiple active pay-period definitions cover this employee, location, and work date.", input: null };
  }
  const payPeriodDefinition = applicablePayPeriods[0] ?? null;
  const period = payPeriodDefinition
    ? anchoredPeriodForInstant({
        anchorDate: payPeriodDefinition.anchorDate,
        instant: request.occurredAt,
        periodLengthDays: payPeriodDefinition.periodLengthDays,
        timeZone: payPeriodDefinition.timezone
      })
    : weeklyPeriodForInstant({
        instant: request.occurredAt,
        timeZone: policy.timezone,
        workweekStartDay: policy.workweekStartDay
      });
  const broadStart = new Date(`${period.periodStartKey}T00:00:00.000Z`);
  broadStart.setUTCDate(broadStart.getUTCDate() - 1);
  const broadEnd = new Date(`${period.periodEndKey}T23:59:59.999Z`);
  broadEnd.setUTCDate(broadEnd.getUTCDate() + 1);
  const eventRecords = await database.timeAttendanceEvent.findMany({
    where: {
      organizationId: request.organizationId,
      staffUserId: request.staffUserId,
      occurredAt: { gte: broadStart, lte: broadEnd },
      correctedByEventId: null
    },
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }]
  });
  const events = eventRecords
    .filter((event) => dateKeyWithinPeriod(
      localDateKey(event.occurredAt, event.timezone || policy.timezone),
      period.periodStartKey,
      period.periodEndKey
    ))
    .map(sourceEvent)
    .filter((event): event is TimeAttendanceSourceEvent => event !== null);
  const [timeOff, paidRests] = await Promise.all([database.timeOffRequest.findMany({
    where: {
      organizationId: request.organizationId,
      requesterUserId: request.staffUserId,
      status: "APPROVED",
      startsAt: { lte: broadEnd },
      endsAt: { gte: broadStart }
    },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      requestType: true,
      requestedMinutes: true,
      startsAt: true,
      endsAt: true,
      balanceSnapshot: true
    }
  }), database.timeAttendanceBreakInterval.findMany({
    where: {
      organizationId: request.organizationId,
      staffUserId: request.staffUserId,
      kind: "PAID_REST",
      startAt: { gte: broadStart, lte: broadEnd }
    },
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    select: { id: true, startAt: true, endAt: true, paid: true, completelyRelieved: true, evidence: true }
  })]);

  return {
    blockedReason: null,
    input: { assignment, policy, period, payPeriodDefinition, events, eventRecords, timeOff, paidRests }
  };
}

export function createTimeCardProjectionService(database: ProjectionDatabase = prisma) {
  return {
    async project(request: ProjectionRequest): Promise<TimeCardProjectionOutcome> {
      const loaded = await loadProjectionInput(database, request);
      if (!loaded.input) {
        return {
          state: "BLOCKED",
          cardId: null,
          cardVersion: null,
          checksum: null,
          payrollReady: false,
          reason: loaded.blockedReason
        };
      }
      const { assignment, policy, period, payPeriodDefinition, events, eventRecords, timeOff, paidRests } = loaded.input;
      const replayInput = {
        assignments: [{
          id: assignment.id,
          staffUserId: assignment.staffUserId,
          locationId: assignment.locationId,
          profileTemplateId: policy.code,
          effectiveFrom: assignment.effectiveFrom.toISOString(),
          effectiveTo: assignment.effectiveTo?.toISOString() ?? null,
          overtimeCoverage: policy.overtimeCoverage as OvertimeCoverage
        }],
        events,
        locationId: request.locationId,
        staffUserId: request.staffUserId,
        timeZone: policy.timezone,
        workInstant: request.occurredAt.toISOString(),
        workweekStartDay: policy.workweekStartDay,
        paidRests: paidRests.map((rest) => ({
          id: rest.id,
          startAt: rest.startAt.toISOString(),
          endAt: rest.endAt?.toISOString() ?? null,
          paid: rest.paid,
          completelyRelieved: rest.completelyRelieved
        }))
      };
      const replay = replayTimeCardProjection(replayInput, request.occurredAt);
      const sourceEvidence = {
        trigger: request.trigger,
        policy: {
          assignmentId: assignment.id,
          profileId: policy.id,
          code: policy.code,
          version: policy.version,
          sourceSnapshot: policy.sourceSnapshot
        },
        events: eventRecords.map((event) => ({
          id: event.id,
          eventType: event.eventType,
          occurredAt: event.occurredAt.toISOString(),
          recordedAt: event.recordedAt.toISOString(),
          evidence: event.evidence,
          correctionOfEventId: event.correctionOfEventId,
          correctedByEventId: event.correctedByEventId
        })),
        timeOff: timeOff.map((requestRecord) => ({
          id: requestRecord.id,
          requestType: requestRecord.requestType,
          requestedMinutes: requestRecord.requestedMinutes,
          startsAt: requestRecord.startsAt.toISOString(),
          endsAt: requestRecord.endsAt.toISOString(),
          balanceSnapshot: requestRecord.balanceSnapshot
        })),
        paidRests: paidRests.map((rest) => ({
          id: rest.id,
          startAt: rest.startAt.toISOString(),
          endAt: rest.endAt?.toISOString() ?? null,
          paid: rest.paid,
          completelyRelieved: rest.completelyRelieved,
          evidence: rest.evidence
        }))
      };
      const checksum = hashTimeCardReplay({
        inputChecksum: replay.inputChecksum,
        projectionChecksum: replay.projectionChecksum,
        sourceEvidence
      });

      return database.$transaction(async (tx) => {
        const latest = await tx.timeCard.findFirst({
          where: {
            organizationId: request.organizationId,
            staffUserId: request.staffUserId,
            periodStart: period.periodStart,
            periodEnd: period.periodEnd
          },
          orderBy: { version: "desc" }
        });
        if (latest?.sourceEventChecksum === checksum) {
          return {
            state: "CURRENT" as const,
            cardId: latest.id,
            cardVersion: latest.version,
            checksum,
            payrollReady: latest.payrollReady,
            reason: null
          };
        }
        if (latest && isProtectedCardStatus(latest.status)) {
          return {
            state: "BLOCKED" as const,
            cardId: latest.id,
            cardVersion: latest.version,
            checksum: latest.sourceEventChecksum,
            payrollReady: false,
            reason: "The pay-period card is locked or exported and must be reopened by authorized payroll staff before reprojection."
          };
        }

        const version = (latest?.version ?? -1) + 1;
        const calculationSnapshot = {
          replay,
          sourceEvidence,
          payPeriod: {
            kind: payPeriodDefinition ? "CONFIGURED" : "POLICY_WORKWEEK_FALLBACK",
            definitionId: payPeriodDefinition?.id ?? null,
            definitionVersion: payPeriodDefinition?.version ?? null,
            payrollMappingVersion: payPeriodDefinition?.payrollMappingVersion ?? null,
            periodStart: period.periodStartKey,
            periodEnd: period.periodEndKey
          },
          timeOffTotals: timeOff.reduce<Record<string, number>>((totals, record) => {
            totals[record.requestType] = (totals[record.requestType] ?? 0) + record.requestedMinutes;
            return totals;
          }, {})
        };
        const card = await tx.timeCard.create({
          data: {
            organizationId: request.organizationId,
            locationId: request.locationId,
            staffUserId: request.staffUserId,
            policyProfileId: policy.id,
            periodStart: period.periodStart,
            periodEnd: period.periodEnd,
            status: projectionStatus(replay.projection.payrollReady),
            version,
            sourceEventChecksum: checksum,
            calculationSnapshot: json(calculationSnapshot),
            exceptionSnapshot: json(replay.projection.exceptions),
            payrollReady: false,
            exceptions: {
              create: replay.projection.exceptions.map((exception) => ({
                organizationId: request.organizationId,
                code: exception.code,
                blocking: exception.blocking,
                message: exception.message,
                evidence: json({ sourceIds: exception.sourceIds, checksum })
              }))
            }
          }
        });

        return {
          state: "CREATED" as const,
          cardId: card.id,
          cardVersion: card.version,
          checksum,
          payrollReady: card.payrollReady,
          reason: null
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
  };
}

export type TimeCardProjectionService = ReturnType<typeof createTimeCardProjectionService>;

export async function projectTimeCardAfterAttendanceChange(request: ProjectionRequest) {
  return createTimeCardProjectionService().project(request);
}
