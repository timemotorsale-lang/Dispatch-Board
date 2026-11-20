import { randomUUID } from "node:crypto";
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
import { getLocationLocalDate } from "@/server/appointments/location-time-service";
import { dayWindows, pendingTimeOffStatuses, storedTimeOffWindows, timeOffEvidence, timeOffMinutes, type TimeOffWindow } from "./time-off-windows";

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
  windows?: TimeOffWindow[];
  balanceYear?: number;
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
  $transaction?<T>(work: (tx: StaffTimeOffRequestDatabase) => Promise<T>, options: { isolationLevel: "Serializable" }): Promise<T>;
  location: {
    findFirst(input: { where: Record<string, unknown>; select: { id: true } }): Promise<{ id: string } | null>;
  };
  timeOffBalance: {
    findUnique(input: { where: Record<string, unknown>; select: Record<string, boolean> }): Promise<TimeOffBalanceRecord | null>;
  };
  timeOffRequest: {
    create(input: { data: Record<string, unknown> }): Promise<TimeOffRequestRecord>;
    findUnique(input: { where: Record<string, unknown> }): Promise<TimeOffRequestRecord | null>;
    findMany?(input: Record<string, unknown>): Promise<(TimeOffWindow & { evidence: unknown })[]>;
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
    timezone?: string;
  }
): Omit<NormalizedStaffTimeOffRequest, "balanceSnapshot"> {
  const raw = requireObject(value);
  const idempotencyKey = stringValue(raw.idempotencyKey);
  const requestType = stringValue(raw.requestType).toUpperCase() as StaffTimeOffRequestType;
  const windows = raw.days === undefined ? undefined : dayWindows(raw.days, defaults.timezone ?? "America/Chicago");
  const startsAt = windows?.[0].startsAt ?? parseInstant(stringValue(raw.startsAt), "Start time");
  const endsAt = windows?.at(-1)?.endsAt ?? parseInstant(stringValue(raw.endsAt), "End time");
  const operationalNote = stringValue(raw.operationalNote) || null;
  const restrictedReason = stringValue(raw.restrictedReason);
  const requestedMinutes = windows ? windows.reduce((total, window) => total + timeOffMinutes(window), 0) : timeOffMinutes({ startsAt, endsAt });
  const timezone = defaults.timezone ?? "America/Chicago";
  const balanceYear = windows ? Number(getLocationLocalDate(startsAt, timezone).slice(0, 4)) : undefined;

  if (!idempotencyKey) throw new Error("Idempotency key is required.");
  if (!requestTypes.has(requestType)) throw new Error("Time-off request type is invalid.");
  if (requestedMinutes <= 0) throw new Error("Time-off request end must be after the start.");
  if (endsAt.getTime() - startsAt.getTime() > 31 * 86_400_000) throw new Error("Time-off request cannot exceed 31 days.");
  if (windows && requestType !== "UNPAID" && getLocationLocalDate(endsAt, timezone).slice(0, 4) !== String(balanceYear)) {
    throw new Error("Submit a separate paid time-off request for each balance year.");
  }
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
    requestHash: hashEnterpriseCommand(windows ? { ...payload, windows: serializeWindows(windows) } : payload),
    startsAt,
    windows,
    balanceYear
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

function serializeWindows(windows: TimeOffWindow[]) {
  return windows.map(window => ({ startsAt: window.startsAt.toISOString(), endsAt: window.endsAt.toISOString() }));
}

async function checkRequestOverlap(
  database: StaffTimeOffRequestDatabase,
  input: Pick<NormalizedStaffTimeOffRequest, "organizationId" | "requesterUserId" | "startsAt" | "endsAt" | "windows">,
  excludeId?: string
) {
  const records = await database.timeOffRequest.findMany?.({
    where: {
      organizationId: input.organizationId, requesterUserId: input.requesterUserId,
      id: excludeId ? { not: excludeId } : undefined,
      status: { in: [...pendingTimeOffStatuses, "APPROVED"] },
      startsAt: { lt: input.endsAt }, endsAt: { gt: input.startsAt }
    },
    select: { startsAt: true, endsAt: true, evidence: true }
  });
  const wanted = input.windows ?? [input];
  if (records?.some(record => storedTimeOffWindows(record).some(saved => wanted.some(window =>
    window.startsAt < saved.endsAt && saved.startsAt < window.endsAt
  )))) throw new EnterpriseCommandConflictError("These hours overlap one of your existing requests.", "VERSION_CONFLICT");
}

export function createStaffTimeOffRequestRepository(
  database: StaffTimeOffRequestDatabase = prisma as unknown as StaffTimeOffRequestDatabase
): StaffTimeOffRequestRepository {
  return {
    async submit(input) {
      if (database.$transaction) {
        return database.$transaction(tx => createStaffTimeOffRequestRepository(tx).submit(input), { isolationLevel: "Serializable" });
      }
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

      await checkRequestOverlap(database, input);
      const balanceYear = input.balanceYear ?? input.startsAt.getUTCFullYear();
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
            requestedByUserId: input.requesterUserId,
            ...(input.windows ? { timeOffWindows: serializeWindows(input.windows), balanceYear } : {})
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
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const raw = requireObject(value);
  const locationId = stringValue(raw.locationId) || input.locationId || INITIAL_MINNEAPOLIS_LOCATION.id;
  await requireTimeAttendanceCapability({
    actor: user,
    capability: "TIME_SELF_SERVICE",
    organizationId,
    locationId
  });
  const location = raw.days === undefined ? null : await prisma.location.findFirst({ where: { id: locationId, organizationId }, select: { timezone: true } });
  if (raw.days !== undefined && !location) throw new Error("Work location was not found.");
  const normalized = normalizeStaffTimeOffRequest(user, value, {
    locationId,
    organizationId,
    timezone: location?.timezone
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

export async function changeOwnTimeOffRequest(actor: AuthenticatedUser | null, value: unknown) {
  const user = assertAuthenticatedUser(actor);
  const raw = requireObject(value);
  const id = stringValue(raw.requestId);
  const action = stringValue(raw.action);
  const commandId = stringValue(raw.idempotencyKey);
  if (!id || !commandId || !["REVISE", "WITHDRAW"].includes(action)) throw new Error("Choose a request and an action.");
  const expectedUpdatedAt = parseInstant(stringValue(raw.expectedUpdatedAt), "Request version");
  const scope = { id, organizationId: INITIAL_ORGANIZATION.id, requesterUserId: user.id };
  const request = await prisma.timeOffRequest.findFirst({ where: scope, include: { location: { select: { timezone: true } } } });
  if (!request) throw new Error("Time-off request was not found.");
  await requireTimeAttendanceCapability({ actor: user, capability: "TIME_SELF_SERVICE", organizationId: request.organizationId, locationId: request.locationId });
  const revision = action === "REVISE" ? normalizeStaffTimeOffRequest(user, { ...raw, locationId: request.locationId, requestType: request.requestType }, {
    locationId: request.locationId, organizationId: request.organizationId, timezone: request.location.timezone
  }) : null;
  const commandHash = hashEnterpriseCommand({ id, action, revision: revision?.requestHash, updatedAt: expectedUpdatedAt.toISOString() });
  const updated = await prisma.$transaction(async tx => {
    const latest = await tx.timeOffRequest.findFirstOrThrow({ where: scope });
    const evidence = timeOffEvidence(latest.evidence);
    const lastCommand = timeOffEvidence(evidence.lastOwnerCommand);
    if (lastCommand.id === commandId) {
      if (lastCommand.hash !== commandHash) throw new EnterpriseCommandConflictError("This retry does not match the earlier request.", "IDEMPOTENCY_KEY_REUSED");
      return { record: latest, duplicate: true };
    }
    if (latest.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      throw new EnterpriseCommandConflictError("This request changed. Refresh before trying again.", "VERSION_CONFLICT");
    }
    if (!["DRAFT", "SUBMITTED", "LEAVE_ADMIN_REVIEW"].includes(latest.status)) throw new Error("This request is already in review or finalized. Contact your reviewer about changes.");
    if (revision) await checkRequestOverlap(tx as unknown as StaffTimeOffRequestDatabase, revision, id);
    const year = revision?.balanceYear ?? revision?.startsAt.getUTCFullYear();
    const balance = revision && year !== undefined ? await tx.timeOffBalance.findUnique({
      where: { organizationId_userId_balanceType_balanceYear: { organizationId: request.organizationId, userId: user.id, balanceType: revision.requestType, balanceYear: year } }
    }) : null;
    const status = revision?.status ?? "WITHDRAWN";
    const nextEvidence = {
      ...evidence,
      lastOwnerCommand: { id: commandId, hash: commandHash },
      ...(revision ? { timeOffWindows: revision.windows ? serializeWindows(revision.windows) : null, balanceYear: year, returnedForRevision: false } : {})
    };
    const changed = await tx.timeOffRequest.updateMany({
      where: { ...scope, updatedAt: expectedUpdatedAt },
      data: {
        status,
        evidence: json(nextEvidence),
        ...(revision && year !== undefined ? {
          startsAt: revision.startsAt, endsAt: revision.endsAt, requestedMinutes: revision.requestedMinutes,
          operationalNote: revision.operationalNote, restrictedReasonHash: revision.restrictedReasonHash,
          balanceSnapshot: json(balanceSnapshot(balance, { balanceType: revision.requestType, balanceYear: year })),
          decisionActorUserId: null, decidedAt: null, decisionReason: null
        } : {})
      }
    });
    if (changed.count !== 1) throw new EnterpriseCommandConflictError("This request changed. Refresh before trying again.", "VERSION_CONFLICT");
    await tx.enterpriseAuditEvent.create({ data: {
      organizationId: request.organizationId, locationId: request.locationId, actorUserId: user.id,
      domain: "TIME_ATTENDANCE", subjectType: "TimeOffRequest", subjectId: id,
      eventType: action === "REVISE" ? "TIME_OFF_REVISED" : "TIME_OFF_WITHDRAWN",
      reason: action === "REVISE" ? "Employee revised their time-off request." : "Employee withdrew their time-off request.",
      priorValue: json({ status: latest.status, startsAt: latest.startsAt.toISOString(), endsAt: latest.endsAt.toISOString(), requestedMinutes: latest.requestedMinutes }),
      newValue: json({ status, startsAt: (revision?.startsAt ?? latest.startsAt).toISOString(), endsAt: (revision?.endsAt ?? latest.endsAt).toISOString(), requestedMinutes: revision?.requestedMinutes ?? latest.requestedMinutes }),
      metadata: json({ protectedRouting: request.protectedRouting }), correlationId: randomUUID()
    } });
    return { record: await tx.timeOffRequest.findFirstOrThrow({ where: scope }), duplicate: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  if (revision && !updated.duplicate) {
    await notifyTimeAttendanceReviewers({
      organizationId: request.organizationId, locationId: request.locationId,
      capability: request.protectedRouting ? "TIME_LEAVE_ADMIN" : "TIME_ATTENDANCE_MANAGER",
      notificationType: "TIME_OFF_DECISION", severity: "INFO", title: "Revised time-off request",
      body: "An employee revised their request. Review the updated time windows.",
      sourceType: "TimeOffRequest", sourceId: request.id, payload: { protectedDetailsIncluded: false }
    });
  }
  return toResult(updated.record, updated.duplicate);
}
