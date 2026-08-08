import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { prisma } from "@/server/db/client";
import { assertAuthenticatedUser } from "@/server/policies/access";
import { requireTimeAttendanceCapability } from "./capabilities";
import { notifyTimeAttendanceReviewers, recordSafeInternalTimeAttendanceNotification } from "./notification-service";

export async function getTimeAttendanceOperationalHealth(actor: AuthenticatedUser | null) {
  const user = assertAuthenticatedUser(actor);
  try {
    await requireTimeAttendanceCapability({ actor: user, capability: "TIME_ATTENDANCE_MANAGER", organizationId: INITIAL_ORGANIZATION.id });
  } catch {
    await requireTimeAttendanceCapability({ actor: user, capability: "TIME_PAYROLL_ADMIN", organizationId: INITIAL_ORGANIZATION.id });
  }
  const now = new Date();
  const longSessionCutoff = new Date(now.getTime() - 16 * 60 * 60 * 1000);
  const staleCardCutoff = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const policyExpirationWindow = new Date(now.getTime() + 30 * 86_400_000);
  const [openSessions, longSessions, projectionFailures, staleCards, blockingExceptions, failedCommands, deadLetters, expiringPolicies, exportRejections, restrictedAccess] = await Promise.all([
    prisma.timeAttendanceSession.count({ where: { organizationId: INITIAL_ORGANIZATION.id, state: { in: ["OPEN", "ON_MEAL"] } } }),
    prisma.timeAttendanceSession.count({ where: { organizationId: INITIAL_ORGANIZATION.id, state: { in: ["OPEN", "ON_MEAL"] }, openedAt: { lt: longSessionCutoff } } }),
    prisma.timeAttendanceNotification.count({ where: { organizationId: INITIAL_ORGANIZATION.id, notificationType: "PROJECTION_FAILURE", createdAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } } }),
    prisma.timeCard.count({ where: { organizationId: INITIAL_ORGANIZATION.id, status: { in: ["OPEN", "EMPLOYEE_REVIEW", "ATTESTED", "MANAGER_REVIEW", "REOPENED"] }, updatedAt: { lt: staleCardCutoff } } }),
    prisma.timeCardException.count({ where: { organizationId: INITIAL_ORGANIZATION.id, blocking: true, status: { in: ["OPEN", "ACKNOWLEDGED"] } } }),
    prisma.enterpriseCommandLedger.count({ where: { organizationId: INITIAL_ORGANIZATION.id, domain: "TIME_ATTENDANCE", status: "FAILED", createdAt: { gte: new Date(now.getTime() - 7 * 86_400_000) } } }),
    prisma.enterpriseOutboxMessage.count({ where: { organizationId: INITIAL_ORGANIZATION.id, status: "DEAD_LETTER", domainEvent: { domain: "TIME_ATTENDANCE" } } }),
    prisma.timeAttendancePolicyProfile.count({ where: { organizationId: INITIAL_ORGANIZATION.id, status: "ACTIVE", effectiveTo: { not: null, lte: policyExpirationWindow } } }),
    prisma.timeAttendanceExportBatch.count({ where: { organizationId: INITIAL_ORGANIZATION.id, status: "REJECTED" } }),
    prisma.enterpriseAuditEvent.count({ where: { organizationId: INITIAL_ORGANIZATION.id, domain: "TIME_ATTENDANCE", eventType: { contains: "RESTRICTED_ACCESS" }, occurredAt: { gte: new Date(now.getTime() - 30 * 86_400_000) } } })
  ]);
  const metrics = [
    ["Open sessions", openSessions, openSessions ? "warning" : "good"],
    ["Sessions over 16h", longSessions, longSessions ? "danger" : "good"],
    ["Projection failures · 7d", projectionFailures, projectionFailures ? "danger" : "good"],
    ["Stale open cards", staleCards, staleCards ? "warning" : "good"],
    ["Blocking exceptions", blockingExceptions, blockingExceptions ? "danger" : "good"],
    ["Failed commands · 7d", failedCommands, failedCommands ? "warning" : "good"],
    ["Outbox dead letters", deadLetters, deadLetters ? "danger" : "good"],
    ["Policies expiring · 30d", expiringPolicies, expiringPolicies ? "warning" : "good"],
    ["Rejected exports", exportRejections, exportRejections ? "danger" : "good"],
    ["Restricted-access events · 30d", restrictedAccess, restrictedAccess ? "warning" : "good"]
  ].map(([label, count, tone]) => ({ label: String(label), count: Number(count), tone: tone as "good" | "warning" | "danger" }));
  return {
    generatedAt: now.toISOString(),
    source: "Live Time & Attendance and enterprise control tables",
    state: metrics.some((metric) => metric.tone === "danger") ? "ACTION_REQUIRED" : metrics.some((metric) => metric.tone === "warning") ? "REVIEW" : "HEALTHY",
    metrics
  };
}

export async function markTimeAttendanceNotificationRead(actor: AuthenticatedUser | null, notificationId: string) {
  const user = assertAuthenticatedUser(actor);
  const changed = await prisma.timeAttendanceNotification.updateMany({
    where: { id: notificationId, recipientUserId: user.id, organizationId: INITIAL_ORGANIZATION.id },
    data: { status: "READ", readAt: new Date() }
  });
  if (changed.count !== 1) throw new Error("Notification was not found for this user.");
  return { id: notificationId, status: "READ" };
}

export async function runTimeAttendanceOperationalNotificationScan(actor: AuthenticatedUser | null) {
  const user = assertAuthenticatedUser(actor);
  await requireTimeAttendanceCapability({ actor: user, capability: "TIME_ATTENDANCE_MANAGER", organizationId: INITIAL_ORGANIZATION.id });
  const now = new Date();
  const sessions = await prisma.timeAttendanceSession.findMany({
    where: { organizationId: INITIAL_ORGANIZATION.id, state: { in: ["OPEN", "ON_MEAL"] }, openedAt: { lt: new Date(now.getTime() - 16 * 60 * 60 * 1000) } },
    select: { id: true, staffUserId: true, locationId: true, openedAt: true }
  });
  let created = 0;
  for (const session of sessions) {
    const notificationType = session.openedAt < new Date(now.getTime() - 24 * 60 * 60 * 1000) ? "MISSED_CLOCK_OUT" as const : "LONG_ACTIVE_SESSION" as const;
    const existing = await prisma.timeAttendanceNotification.findFirst({
      where: { recipientUserId: session.staffUserId, notificationType, sourceType: "TimeAttendanceSession", sourceId: session.id, createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }
    });
    if (existing) continue;
    await recordSafeInternalTimeAttendanceNotification({
      locationId: session.locationId,
      recipientUserId: session.staffUserId,
      notificationType,
      severity: notificationType === "MISSED_CLOCK_OUT" ? "CRITICAL" : "WARNING",
      title: notificationType === "MISSED_CLOCK_OUT" ? "Possible missed clock-out" : "Long active session",
      body: "Review your current state before recording another action. Contact an Attendance Manager if a correction is needed.",
      sourceType: "TimeAttendanceSession",
      sourceId: session.id,
      payload: { openedAt: session.openedAt.toISOString(), scanGeneratedAt: now.toISOString() }
    });
    await notifyTimeAttendanceReviewers({
      locationId: session.locationId,
      notificationType,
      severity: notificationType === "MISSED_CLOCK_OUT" ? "CRITICAL" : "WARNING",
      title: notificationType === "MISSED_CLOCK_OUT" ? "Possible missed clock-out requires review" : "Long active session requires review",
      body: "Review the session and preserve immutable punch evidence when resolving it.",
      sourceType: "TimeAttendanceSession",
      sourceId: session.id,
      payload: { staffUserId: session.staffUserId, openedAt: session.openedAt.toISOString() }
    });
    created += 1;
  }
  return { created, generatedAt: now.toISOString(), scanned: sessions.length };
}
