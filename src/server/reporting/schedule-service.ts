import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import type { AuthenticatedUser } from "@/server/auth/store";
import { createPrismaAuthStore } from "@/server/auth/store";
import { assertAuthenticatedUser, isGeneralManager } from "@/server/policies/access";
import { addReportDays, resolveReportPeriod, reportBusinessDate, type ReportCadence } from "@/lib/reporting/calendar";
import type { ReportDefinitionId } from "@/lib/reporting/contracts";
import { readLiveReport } from "./live-service";
import { loadReportingCalendar } from "./calendar-service";
import { recordReportingCommand } from "./command";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

function enabled() { if (process.env.REPORTING_SCHEDULES_ENABLED !== "true") throw new Error("Scheduled reporting is not enabled."); }
export async function changeReportingSchedule(actor: AuthenticatedUser | null, input: { id: string; enabled: boolean; expectedVersion: number }) {
  const user = assertAuthenticatedUser(actor);
  const schedule = await prisma.reportingSchedule.findFirstOrThrow({ where: { id: input.id, userId: user.id } });
  if (input.enabled) {
    enabled();
    const calendar = await loadReportingCalendar();
    if (calendar.version.includes("draft")) throw new Error("Scheduling requires an active reporting calendar.");
    await readLiveReport(user, schedule.definitionId as ReportDefinitionId);
  }
  return prisma.$transaction(async tx => {
    const changed = await tx.reportingSchedule.updateMany({ where: { id: schedule.id, userId: user.id, version: input.expectedVersion }, data: { enabled: input.enabled, version: { increment: 1 } } });
    if (changed.count !== 1) throw new Error("Schedule changed. Reload before saving.");
    await recordReportingCommand(tx, { actorUserId: user.id, subjectId: schedule.id, action: "SCHEDULE_CHANGED", version: input.expectedVersion + 1, key: `${schedule.id}:${input.expectedVersion}`, hash: hashEnterpriseCommand(input), reason: input.enabled ? "Secure in-app reporting delivery enabled." : "Reporting delivery disabled.", result: { scheduleId: schedule.id } });
    return { id: schedule.id };
  });
}
export async function processReportingSchedules(actor: AuthenticatedUser | null, now = new Date()) {
  const user = assertAuthenticatedUser(actor);
  if (!isGeneralManager(user)) throw new Error("General Manager access is required to run reporting jobs.");
  enabled();
  const calendar = await loadReportingCalendar();
  if (calendar.version.includes("draft")) throw new Error("Scheduling requires an active reporting calendar.");
  const schedules = await prisma.reportingSchedule.findMany({ where: { enabled: true, nextRunAt: { lte: now } }, orderBy: { nextRunAt: "asc" }, include: { user: { select: { email: true } } }, take: 25 });
  let succeeded = 0, failed = 0;
  for (const schedule of schedules) {
    const runKey = `${schedule.id}:${schedule.nextRunAt.toISOString()}`;
    await prisma.reportingJob.createMany({ data: [{ scheduleId: schedule.id, runKey }], skipDuplicates: true });
    const job = await prisma.reportingJob.findUniqueOrThrow({ where: { runKey } });
    if (job.status === "SUCCEEDED") continue;
    const lease = new Date(now.getTime() + 120_000);
    const claimed = await prisma.reportingJob.updateMany({ where: { id: job.id, status: { in: ["PENDING", "FAILED", "PROCESSING"] }, attempts: { lt: 5 }, OR: [{ lockedUntil: null }, { lockedUntil: { lte: now } }] }, data: { status: "PROCESSING", lockedUntil: lease, attempts: { increment: 1 } } });
    if (!claimed.count) continue;
    try {
      const recipient = await createPrismaAuthStore(prisma).findUserByEmail(schedule.user.email);
      if (!recipient?.isActive) throw new Error("Recipient access is unavailable.");
      // Catch up one intended run at a time. Current-only definitions cannot certify a previous cutoff.
      const coveredDate = addReportDays(reportBusinessDate(schedule.nextRunAt, schedule.timezone), -1);
      const result = await readLiveReport(recipient, schedule.definitionId as ReportDefinitionId, { date: coveredDate, cadence: schedule.cadence as ReportCadence }, now);
      if (result.quality === "UNAVAILABLE") throw new Error("The scheduled period cannot be reconstructed.");
      const next = resolveReportPeriod(reportBusinessDate(schedule.nextRunAt, schedule.timezone), schedule.cadence as ReportCadence, calendar).endsAt;
      await prisma.$transaction(async tx => {
        const changed = await tx.reportingSchedule.updateMany({ where: { id: schedule.id, enabled: true, version: schedule.version, nextRunAt: schedule.nextRunAt }, data: { nextRunAt: next } });
        if (changed.count !== 1) throw new Error("Schedule changed before delivery.");
        const delivered = await tx.reportingJob.updateMany({ where: { id: job.id, status: "PROCESSING", lockedUntil: lease }, data: { status: "SUCCEEDED", result: JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue, lockedUntil: null, lastError: null } });
        if (delivered.count !== 1) throw new Error("Reporting job lease expired.");
        await recordReportingCommand(tx, { actorUserId: user.id, subjectId: job.id, action: "SCHEDULE_DELIVERED", version: 1, key: job.id, hash: hashEnterpriseCommand({ runKey }), reason: "Authorized secure report result prepared for its owner.", result: { jobId: job.id } });
      });
      succeeded++;
    } catch {
      const current = await prisma.reportingJob.findUnique({ where: { id: job.id } });
      await prisma.reportingJob.updateMany({ where: { id: job.id, status: "PROCESSING", lockedUntil: lease }, data: { status: (current?.attempts ?? 5) >= 5 ? "DEAD_LETTER" : "FAILED", lockedUntil: new Date(now.getTime() + 300_000), lastError: "Delivery could not complete. Check schedule and recipient access before retrying." } });
      failed++;
    }
  }
  return { succeeded, failed };
}
export async function recoverReportingJob(actor: AuthenticatedUser | null, input: { id: string; expectedVersion: number; reason: string }) {
  const user = assertAuthenticatedUser(actor);
  if (!user.isActive || !isGeneralManager(user)) throw new Error("General Manager access is required to recover reporting jobs.");
  enabled();
  if (input.reason.trim().length < 20 || input.reason.length > 500 || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) throw new Error("Recovery reason or schedule version is invalid.");
  const calendar = await loadReportingCalendar();
  if (calendar.version.includes("draft")) throw new Error("Recovery requires an active reporting calendar.");
  const job = await prisma.reportingJob.findFirstOrThrow({ where: { id: input.id, schedule: { userId: user.id } }, include: { schedule: true } });
  if (job.status !== "DEAD_LETTER") throw new Error("Reporting job changed. Reload before recovery.");
  if (!job.schedule.enabled) throw new Error("Recovery requires an enabled schedule.");
  await readLiveReport(user, job.schedule.definitionId as ReportDefinitionId);
  return prisma.$transaction(async tx => {
    const schedule = await tx.reportingSchedule.updateMany({ where: { id: job.scheduleId, userId: user.id, enabled: true, version: input.expectedVersion }, data: { version: { increment: 1 } } });
    if (schedule.count !== 1) throw new Error("Schedule changed. Reload before recovery.");
    const recovered = await tx.reportingJob.updateMany({ where: { id: job.id, status: "DEAD_LETTER", attempts: job.attempts, lockedUntil: job.lockedUntil }, data: { status: "PENDING", attempts: 0, lockedUntil: null, lastError: null } });
    if (recovered.count !== 1) throw new Error("Reporting job changed. Reload before recovery.");
    await recordReportingCommand(tx, { actorUserId: user.id, subjectId: job.id, action: "SCHEDULE_RECOVERY_APPROVED", version: input.expectedVersion + 1, key: `${job.id}:recovery:${input.expectedVersion}`, hash: hashEnterpriseCommand(input), reason: input.reason.trim(), result: { jobId: job.id, runKey: job.runKey, priorStatus: job.status, priorAttempts: job.attempts, priorError: job.lastError, priorLockedUntil: job.lockedUntil?.toISOString() ?? null } });
    return { id: job.id };
  });
}
export async function reportingDelivery(actor: AuthenticatedUser | null, id: string) {
  const user = assertAuthenticatedUser(actor);
  const job = await prisma.reportingJob.findFirstOrThrow({ where: { id, status: "SUCCEEDED", schedule: { userId: user.id } }, include: { schedule: true } });
  await readLiveReport(user, job.schedule.definitionId as ReportDefinitionId);
  return job.result;
}
