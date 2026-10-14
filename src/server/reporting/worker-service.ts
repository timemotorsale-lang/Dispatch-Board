import { prisma } from "@/server/db/client";
import { createPrismaAuthStore } from "@/server/auth/store";
import { isGeneralManager } from "@/server/policies/access";
import { processReportingSchedules } from "./schedule-service";

export async function runReportingWorker(input: { execute: boolean; actorEmail?: string }, now = new Date()) {
  if (process.env.REPORTING_WORKER_ENABLED !== "true") return { status: "DISABLED", succeeded: 0, failed: 0 };
  if (!input.actorEmail || input.actorEmail.length > 320) throw new Error("An approved reporting worker account is required.");
  const actor = await createPrismaAuthStore(prisma).findUserByEmail(input.actorEmail);
  if (!actor?.isActive || !isGeneralManager(actor)) throw new Error("Reporting worker account access is unavailable.");
  if (!input.execute) {
    const due = await prisma.reportingSchedule.count({ where: { enabled: true, nextRunAt: { lte: now } } });
    const stopped = await prisma.reportingJob.count({ where: { status: "DEAD_LETTER", schedule: { enabled: true } } });
    const expired = await prisma.reportingJob.count({ where: { status: "PROCESSING", lockedUntil: { lte: now }, schedule: { enabled: true } } });
    return { status: "DRY_RUN", dueSchedules: due, stoppedJobs: stopped, expiredLeases: expired, batchLimit: 25, succeeded: 0, failed: 0 };
  }
  return { status: "EXECUTED", ...await processReportingSchedules(actor, now) };
}
