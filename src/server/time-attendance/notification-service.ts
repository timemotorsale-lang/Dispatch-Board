import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "@/server/auth/store";

import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";

export type TimeAttendanceNotificationType =
  | "MISSED_CLOCK_OUT"
  | "LONG_ACTIVE_SESSION"
  | "MISSING_PUNCH"
  | "CORRECTION_DECISION"
  | "ATTESTATION_REQUIRED"
  | "TIME_OFF_DECISION"
  | "MANAGER_APPROVAL_REQUIRED"
  | "PAYROLL_STATUS"
  | "PROJECTION_FAILURE"
  | "STALE_POLICY_ASSIGNMENT"
  | "RESTRICTED_ACCESS_ALERT";

function json(value: unknown) {
  return value as Prisma.InputJsonValue;
}

export async function recordInternalTimeAttendanceNotification(input: {
  organizationId?: string;
  locationId?: string | null;
  recipientUserId: string;
  notificationType: TimeAttendanceNotificationType;
  severity?: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  body: string;
  sourceType: string;
  sourceId?: string | null;
  payload?: Record<string, unknown>;
}) {
  return prisma.timeAttendanceNotification.create({
    data: {
      organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id,
      locationId: input.locationId ?? null,
      recipientUserId: input.recipientUserId,
      notificationType: input.notificationType,
      severity: input.severity ?? "INFO",
      title: input.title,
      body: input.body,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      deliveryChannel: "INTERNAL_ONLY",
      payload: json({ externalDeliveryClaimed: false, ...(input.payload ?? {}) })
    }
  });
}

export async function recordSafeInternalTimeAttendanceNotification(
  input: Parameters<typeof recordInternalTimeAttendanceNotification>[0]
) {
  try {
    return await recordInternalTimeAttendanceNotification(input);
  } catch {
    return null;
  }
}

export async function notifyTimeAttendanceReviewers(input: {
  organizationId?: string;
  locationId?: string | null;
  notificationType: TimeAttendanceNotificationType;
  severity?: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  body: string;
  sourceType: string;
  sourceId?: string | null;
  payload?: Record<string, unknown>;
  capability?: "TIME_ATTENDANCE_MANAGER" | "TIME_LEAVE_ADMIN" | "TIME_PAYROLL_ADMIN";
}) {
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const capability = input.capability ?? "TIME_ATTENDANCE_MANAGER";
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { userRoles: { some: { role: { name: capability === "TIME_ATTENDANCE_MANAGER" ? { in: ["General Manager", "Service Department Manager"] } : "General Manager" } } } },
        { vehicleCapabilityGrants: { some: { organizationId, capability, effect: "ALLOW" } } }
      ]
    },
    select: { id: true }
  });
  await Promise.all(users.map((user) => recordSafeInternalTimeAttendanceNotification({ ...input, organizationId, recipientUserId: user.id })));
  return users.length;
}

export async function listMyTimeAttendanceNotifications(input: {
  userId: string;
  organizationId?: string;
  take?: number;
}) {
  return prisma.timeAttendanceNotification.findMany({
    where: {
      organizationId: input.organizationId ?? INITIAL_ORGANIZATION.id,
      recipientUserId: input.userId,
      status: { in: ["UNREAD", "READ"] }
    },
    orderBy: { createdAt: "desc" },
    take: input.take ?? 20
  });
}

export async function recordRestrictedTimeAttendanceAccess(input: {
  actor: AuthenticatedUser;
  organizationId?: string;
  locationId?: string | null;
  subjectType: string;
  subjectId: string;
  reason: string;
}) {
  const organizationId = input.organizationId ?? INITIAL_ORGANIZATION.id;
  const correlationId = randomUUID();
  await prisma.enterpriseAuditEvent.create({
    data: {
      organizationId,
      locationId: input.locationId ?? null,
      actorUserId: input.actor.id,
      domain: "TIME_ATTENDANCE",
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      eventType: "RESTRICTED_ACCESS_DENIED",
      reason: input.reason,
      priorValue: Prisma.JsonNull,
      newValue: Prisma.JsonNull,
      metadata: json({ allowed: false, protectedDetailsReturned: false }),
      correlationId
    }
  });
  await notifyTimeAttendanceReviewers({
    organizationId,
    locationId: input.locationId,
    capability: "TIME_LEAVE_ADMIN",
    notificationType: "RESTRICTED_ACCESS_ALERT",
    severity: "CRITICAL",
    title: "Restricted Time & Attendance access denied",
    body: "A protected action was denied and recorded for review. No protected details are included.",
    sourceType: input.subjectType,
    sourceId: input.subjectId,
    payload: { actorUserId: input.actor.id, correlationId, protectedDetailsIncluded: false }
  });
}
