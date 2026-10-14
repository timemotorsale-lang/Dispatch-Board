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

export type StaffTimeOffRequestType = "PTO" | "ESST" | "UNPAID";

export type StaffTimeOffRequestResult = {
  duplicate: boolean;
  request: {
    endsAt: string;
    id: string;
    protectedRouting: boolean;
    requestType: StaffTimeOffRequestType;
    requestedMinutes: number;
    startsAt: string;
    status: string;
  };
};

type NormalizedStaffTimeOffRequest = {
  balanceSnapshot: Record<string, unknown>;
  idempotencyKey: string;
  locationId: string;
  operationalNote: string | null;
  organizationId: string;
  protectedRouting: boolean;
  requestHash: string;
  requestType: StaffTimeOffRequestType;
  requestedMinutes: number;
  requesterUserId: string;
  restrictedReasonHash: string | null;
  startsAt: Date;
  status: "SUBMITTED" | "LEAVE_ADMIN_REVIEW";
  endsAt: Date;
};

type TimeOffBalanceRecord = {
  accruedMinutes: number;
  annualAccrualCapMinutes: number | null;
  availableMinutes: number;
  balanceType: string;
  balanceYear: number;
  bankCapMinutes: number | null;
  usedMinutes: number;
};

type TimeOffRequestRecord = {
  endsAt: Date;
  id: string;
  protectedRouting: boolean;
  requestHash: string;
  requestType: string;
  requestedMinutes: number;
  startsAt: Date;
  status: string;
};

type StaffTimeOffRequestDatabase = {
  location: {
    findFirst(input: { where: Record<string, unknown>; select: { id: true } }): Promise<{ id: string } | null>;
  };
  timeOffBalance: {
    findUnique(input: { where: Record<string, unknown>; select: Record<string, boolean> }): Promise<TimeOffBalanceRecord | null>;
  };
  timeOffRequest: {
    create(input: { data: Record<string, unknown> }): Promise<TimeOffRequestRecord>;
    findUnique(input: { where: Record<string, unknown> }): Promise<TimeOffRequestRecord | null>;
  };
};

export type StaffTimeOffRequestRepository = {
  submit(input: NormalizedStaffTimeOffRequest): Promise<StaffTimeOffRequestResult>;
};

const requestTypes = new Set<StaffTimeOffRequestType>(["PTO", "ESST", "UNPAID"]);

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function requireObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Time-off request payload must be an object.");
  }
  return value as Record<string, unknown>;
}

function parseInstant(value: string, label: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} must be an ISO timestamp.`);
  }
  return parsed;
}

function minutesBetween(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / 60000);
}

function toResult(record: TimeOffRequestRecord, duplicate: boolean): StaffTimeOffRequestResult {
  return {
    duplicate,
    request: {
      endsAt: record.endsAt.toISOString(),
      id: record.id,
      protectedRouting: record.protectedRouting,
      requestType: record.requestType as StaffTimeOffRequestType,
      requestedMinutes: record.requestedMinutes,
      startsAt: record.startsAt.toISOString(),
      status: record.status
    }
  };
}

export function normalizeStaffTimeOffRequest(
  actor: AuthenticatedUser,
  value: unknown,
  defaults: {
    locationId: string;
    organizationId: string;
  }
): Omit<NormalizedStaffTimeOffRequest, "balanceSnapshot"> {
  const raw = requireObject(value);
  const idempotencyKey = stringValue(raw.idempotencyKey);
  const requestType = stringValue(raw.requestType).toUpperCase() as StaffTimeOffRequestType;
  const startsAt = parseInstant(stringValue(raw.startsAt), "Start time");
  const endsAt = parseInstant(stringValue(raw.endsAt), "End time");
  const operationalNote = stringValue(raw.operationalNote) || null;
  const restrictedReason = stringValue(raw.restrictedReason);
  const requestedMinutes = minutesBetween(startsAt, endsAt);

  if (!idempotencyKey) throw new Error("Idempotency key is required.");
  if (!requestTypes.has(requestType)) throw new Error("Time-off request type is invalid.");
  if (requestedMinutes <= 0) throw new Error("Time-off request end must be after the start.");
  if (requestedMinutes > 60 * 24 * 31) throw new Error("Time-off request cannot exceed 31 days.");
  if (requestType === "ESST" && restrictedReason.length < 10) {
    throw new Error("ESST requests require a private reason for protected routing.");
  }
  if (requestType !== "ESST" && operationalNote && operationalNote.length < 8) {
    throw new Error("Operational note must be at least 8 characters when provided.");
  }

  const protectedRouting = requestType === "ESST";
  const payload = {
    endsAt: endsAt.toISOString(),
    locationId: stringValue(raw.locationId) || defaults.locationId,
    operationalNote: protectedRouting ? "Protected ESST request. Private reason is restricted." : operationalNote,
    organizationId: defaults.organizationId,
    protectedRouting,
    requestType,
    requestedMinutes,
    requesterUserId: actor.id,
    restrictedReasonHash: protectedRouting
      ? hashEnterpriseCommand({ requesterUserId: actor.id, restrictedReason, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() })
      : null,
    startsAt: startsAt.toISOString(),
    status: protectedRouting ? "LEAVE_ADMIN_REVIEW" as const : "SUBMITTED" as const
  };

  return {
    ...payload,
    endsAt,
    idempotencyKey,
    requestHash: hashEnterpriseCommand(payload),
    startsAt
  };
}

function balanceSnapshot(balance: TimeOffBalanceRecord | null, fallback: {
  balanceType: StaffTimeOffRequestType;
  balanceYear: number;
}) {
  if (!balance) {
    return {
      balanceType: fallback.balanceType,
      balanceYear: fallback.balanceYear,
      source: "NO_BALANCE_RECORD",
      availableMinutes: null
    };
  }
  return {
    accruedMinutes: balance.accruedMinutes,
    annualAccrualCapMinutes: balance.annualAccrualCapMinutes,
    availableMinutes: balance.availableMinutes,
    balanceType: balance.balanceType,
    balanceYear: balance.balanceYear,
    bankCapMinutes: balance.bankCapMinutes,
    usedMinutes: balance.usedMinutes
  };
}

export function createStaffTimeOffRequestRepository(
  database: StaffTimeOffRequestDatabase = prisma as unknown as StaffTimeOffRequestDatabase
): StaffTimeOffRequestRepository {
  return {
    async submit(input) {
      const existing = await database.timeOffRequest.findUnique({
        where: {
          organizationId_requesterUserId_idempotencyKey: {
            organizationId: input.organizationId,
            requesterUserId: input.requesterUserId,
            idempotencyKey: input.idempotencyKey
          }
        }
      });
      if (existing) {
        if (existing.requestHash !== input.requestHash) {
          throw new EnterpriseCommandConflictError(
            "Idempotency key was already used with a different time-off request.",
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

      const balanceYear = input.startsAt.getUTCFullYear();
      const balance = await database.timeOffBalance.findUnique({
        where: {
          organizationId_userId_balanceType_balanceYear: {
            organizationId: input.organizationId,
            userId: input.requesterUserId,
            balanceType: input.requestType,
            balanceYear
          }
        },
        select: {
          accruedMinutes: true,
          annualAccrualCapMinutes: true,
          availableMinutes: true,
          balanceType: true,
          balanceYear: true,
          bankCapMinutes: true,
          usedMinutes: true
        }
      });

      const request = await database.timeOffRequest.create({
        data: {
          organizationId: input.organizationId,
          locationId: input.locationId,
          requesterUserId: input.requesterUserId,
          requestType: input.requestType,
          status: input.status,
          idempotencyKey: input.idempotencyKey,
          requestHash: input.requestHash,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
          requestedMinutes: input.requestedMinutes,
          protectedRouting: input.protectedRouting,
          operationalNote: input.operationalNote,
          restrictedReasonHash: input.restrictedReasonHash,
          balanceSnapshot: json(balanceSnapshot(balance, {
            balanceType: input.requestType,
            balanceYear
          })),
          evidence: json({
            requestHash: input.requestHash,
            source: "STAFF_TIME_OFF_SELF_SERVICE",
            privacy: input.protectedRouting
              ? "PRIVATE_REASON_HASHED_MANAGER_VIEW_REDACTED"
              : "ORDINARY_OPERATIONAL_NOTE",
            requestedByUserId: input.requesterUserId
          })
        }
      });

      return toResult(request, false);
    }
  };
}

export async function submitStaffTimeOffRequest(
  actor: AuthenticatedUser | null,
  value: unknown,
  input: {
    locationId?: string;
    organizationId?: string;
    repository?: StaffTimeOffRequestRepository;
  } = {}
) {
  const user = assertAuthenticatedUser(actor);
  await requireTimeAttendanceCapability({
    actor: user,
    capability: "TIME_SELF_SERVICE",
    organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id,
    locationId: input.locationId ?? INITIAL_MINNEAPOLIS_LOCATION.id
  });
  const normalized = normalizeStaffTimeOffRequest(user, value, {
    locationId: input.locationId ?? INITIAL_MINNEAPOLIS_LOCATION.id,
    organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id
  });
  const repository = input.repository ?? createStaffTimeOffRequestRepository();

  const result = await repository.submit({
    ...normalized,
    balanceSnapshot: {}
  });
  if (!input.repository && !result.duplicate) {
    await notifyTimeAttendanceReviewers({
      organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id,
      locationId: normalized.locationId,
      capability: normalized.protectedRouting ? "TIME_LEAVE_ADMIN" : "TIME_ATTENDANCE_MANAGER",
      notificationType: "TIME_OFF_DECISION",
      severity: normalized.protectedRouting ? "WARNING" : "INFO",
      title: normalized.protectedRouting ? "Protected leave review required" : "Time-off coverage review required",
      body: normalized.protectedRouting
        ? "A protected request requires restricted Leave Administration review. Private reason is not included."
        : `${normalized.requestType} request needs a coverage decision.`,
      sourceType: "TimeOffRequest",
      sourceId: result.request.id,
      payload: { protectedDetailsIncluded: false, requestType: normalized.requestType }
    });
  }
  return result;
}
