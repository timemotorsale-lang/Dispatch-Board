import { Prisma } from "@prisma/client";

import { INITIAL_MINNEAPOLIS_LOCATION, INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import {
  EnterpriseCommandConflictError,
  hashEnterpriseCommand
} from "@/server/enterprise-command/domain";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { requireTimeAttendanceCapability } from "./capabilities";
import { notifyTimeAttendanceReviewers } from "./notification-service";

export type TimeCardCorrectionChangeType =
  | "MISSING_CLOCK_IN"
  | "MISSING_CLOCK_OUT"
  | "MEAL_TIME"
  | "WRONG_TIME"
  | "OTHER";

export type TimeCardCorrectionRequestResult = {
  duplicate: boolean;
  request: {
    id: string;
    employeeExplanation: string;
    idempotencyKey: string;
    requestedChangeType: TimeCardCorrectionChangeType;
    requestedDate: string;
    requestedEndAt: string | null;
    requestedStartAt: string | null;
    status: string;
  };
};

type NormalizedCorrectionRequest = {
  employeeExplanation: string;
  idempotencyKey: string;
  locationId: string;
  organizationId: string;
  relatedEventId: string | null;
  requestedChangeType: TimeCardCorrectionChangeType;
  requestedDate: Date;
  requestedEndAt: Date | null;
  requestedStartAt: Date | null;
  requestHash: string;
  staffUserId: string;
  timeCardId: string | null;
};

type CorrectionRequestRecord = {
  id: string;
  employeeExplanation: string;
  evidence: unknown;
  idempotencyKey: string;
  requestedChangeType: string;
  requestedDate: Date;
  requestedEndAt: Date | null;
  requestedStartAt: Date | null;
  status: string;
};

type TimeCardCorrectionRequestDatabase = {
  location: {
    findFirst(input: { where: Record<string, unknown>; select: { id: true } }): Promise<{ id: string } | null>;
  };
  timeCardCorrectionRequest: {
    create(input: { data: Record<string, unknown> }): Promise<CorrectionRequestRecord>;
    findUnique(input: { where: Record<string, unknown> }): Promise<CorrectionRequestRecord | null>;
  };
};

export type TimeCardCorrectionRequestRepository = {
  submit(input: NormalizedCorrectionRequest): Promise<TimeCardCorrectionRequestResult>;
};

const changeTypes = new Set<TimeCardCorrectionChangeType>([
  "MISSING_CLOCK_IN",
  "MISSING_CLOCK_OUT",
  "MEAL_TIME",
  "WRONG_TIME",
  "OTHER"
]);

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: unknown) {
  const text = stringValue(value);
  return text ? text : null;
}

function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Requested date must be in YYYY-MM-DD format.");
  }
  return new Date(`${value}T00:00:00.000Z`);
}

function parseOptionalInstant(value: string | null, label: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} must be an ISO timestamp.`);
  }
  return parsed;
}

function toDateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function requireCorrectionRequest(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Time card correction request payload must be an object.");
  }
  return value as Record<string, unknown>;
}

function toResult(record: CorrectionRequestRecord, duplicate: boolean): TimeCardCorrectionRequestResult {
  return {
    duplicate,
    request: {
      id: record.id,
      employeeExplanation: record.employeeExplanation,
      idempotencyKey: record.idempotencyKey,
      requestedChangeType: record.requestedChangeType as TimeCardCorrectionChangeType,
      requestedDate: toDateOnly(record.requestedDate),
      requestedEndAt: record.requestedEndAt?.toISOString() ?? null,
      requestedStartAt: record.requestedStartAt?.toISOString() ?? null,
      status: record.status
    }
  };
}

export function normalizeTimeCardCorrectionRequest(
  actor: AuthenticatedUser,
  value: unknown,
  defaults: {
    locationId: string;
    organizationId: string;
  }
): NormalizedCorrectionRequest {
  const raw = requireCorrectionRequest(value);
  const idempotencyKey = stringValue(raw.idempotencyKey);
  const requestedChangeType = stringValue(raw.requestedChangeType).toUpperCase() as TimeCardCorrectionChangeType;
  const employeeExplanation = stringValue(raw.employeeExplanation);
  const requestedDate = parseDateOnly(stringValue(raw.requestedDate));
  const requestedStartAt = parseOptionalInstant(optionalString(raw.requestedStartAt), "Requested start time");
  const requestedEndAt = parseOptionalInstant(optionalString(raw.requestedEndAt), "Requested end time");
  const normalized = {
    employeeExplanation,
    idempotencyKey,
    locationId: stringValue(raw.locationId) || defaults.locationId,
    organizationId: defaults.organizationId,
    relatedEventId: optionalString(raw.relatedEventId),
    requestedChangeType,
    requestedDate,
    requestedEndAt,
    requestedStartAt,
    staffUserId: actor.id,
    timeCardId: optionalString(raw.timeCardId)
  };

  if (!normalized.idempotencyKey) {
    throw new Error("Idempotency key is required.");
  }
  if (!changeTypes.has(normalized.requestedChangeType)) {
    throw new Error("Correction request type is invalid.");
  }
  if (normalized.employeeExplanation.length < 15) {
    throw new Error("Correction explanation must be at least 15 characters.");
  }
  if (normalized.requestedStartAt && normalized.requestedEndAt && normalized.requestedEndAt <= normalized.requestedStartAt) {
    throw new Error("Requested end time must be after requested start time.");
  }

  return {
    ...normalized,
    requestHash: hashEnterpriseCommand({
      employeeExplanation: normalized.employeeExplanation,
      locationId: normalized.locationId,
      organizationId: normalized.organizationId,
      relatedEventId: normalized.relatedEventId,
      requestedChangeType: normalized.requestedChangeType,
      requestedDate: toDateOnly(normalized.requestedDate),
      requestedEndAt: normalized.requestedEndAt?.toISOString() ?? null,
      requestedStartAt: normalized.requestedStartAt?.toISOString() ?? null,
      staffUserId: normalized.staffUserId,
      timeCardId: normalized.timeCardId
    })
  };
}

export function createTimeCardCorrectionRequestRepository(
  database: TimeCardCorrectionRequestDatabase = prisma as unknown as TimeCardCorrectionRequestDatabase
): TimeCardCorrectionRequestRepository {
  return {
    async submit(input) {
      const existing = await database.timeCardCorrectionRequest.findUnique({
        where: {
          organizationId_staffUserId_idempotencyKey: {
            organizationId: input.organizationId,
            staffUserId: input.staffUserId,
            idempotencyKey: input.idempotencyKey
          }
        }
      });
      if (existing) {
        const existingEvidence = existing.evidence as { requestHash?: string } | null;
        if (existingEvidence?.requestHash !== input.requestHash) {
          throw new EnterpriseCommandConflictError(
            "Idempotency key was already used with a different correction request.",
            "IDEMPOTENCY_KEY_REUSED"
          );
        }
        return toResult(existing, true);
      }

      const location = await database.location.findFirst({
        where: { id: input.locationId, organizationId: input.organizationId },
        select: { id: true }
      });
      if (!location) {
        throw new Error("Location does not belong to the time attendance organization.");
      }

      const request = await database.timeCardCorrectionRequest.create({
        data: {
          organizationId: input.organizationId,
          locationId: input.locationId,
          staffUserId: input.staffUserId,
          timeCardId: input.timeCardId,
          relatedEventId: input.relatedEventId,
          idempotencyKey: input.idempotencyKey,
          requestedChangeType: input.requestedChangeType,
          requestedDate: input.requestedDate,
          requestedStartAt: input.requestedStartAt,
          requestedEndAt: input.requestedEndAt,
          employeeExplanation: input.employeeExplanation,
          evidence: json({
            requestHash: input.requestHash,
            source: "EMPLOYEE_TIME_CARD_REVIEW",
            originalPunchTrailUnchanged: true
          })
        }
      });

      return toResult(request, false);
    }
  };
}

export async function submitTimeCardCorrectionRequest(
  actor: AuthenticatedUser | null,
  value: unknown,
  input: {
    locationId?: string;
    organizationId?: string;
    repository?: TimeCardCorrectionRequestRepository;
  } = {}
) {
  const user = assertAuthenticatedUser(actor);
  await requireTimeAttendanceCapability({
    actor: user,
    capability: "TIME_SELF_SERVICE",
    organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id
  });
  const normalized = normalizeTimeCardCorrectionRequest(user, value, {
    locationId: input.locationId ?? INITIAL_MINNEAPOLIS_LOCATION.id,
    organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id
  });
  const repository = input.repository ?? createTimeCardCorrectionRequestRepository();

  const result = await repository.submit(normalized);
  if (!input.repository && !result.duplicate) {
    await notifyTimeAttendanceReviewers({
      organizationId: normalized.organizationId,
      locationId: normalized.locationId,
      notificationType: "MISSING_PUNCH",
      severity: "WARNING",
      title: "Time correction review required",
      body: `${normalized.requestedChangeType.replaceAll("_", " ").toLowerCase()} request requires an individual decision.`,
      sourceType: "TimeCardCorrectionRequest",
      sourceId: result.request.id,
      payload: { staffUserId: normalized.staffUserId, bulkResolutionAllowed: false }
    });
  }
  return result;
}
