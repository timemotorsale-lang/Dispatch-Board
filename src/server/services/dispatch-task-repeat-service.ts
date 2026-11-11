import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { parseTaskRepeat, taskOccurrences, validateDispatchTaskRepeat } from "@/lib/calendar-task-repeat";
import { flowDay, shiftFlowDate, validFlowDate } from "@/features/advisor/workbook-flow-dates";
import { locationLocalDateMinuteToInstant } from "@/server/appointments/location-time-service";
import { createPrismaAuthStore, type AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { createTaskCreateRepository } from "@/server/repositories/task-create-repository";
import { createManualTask } from "./task-create-service";

export function dispatchRepeatDates(anchor: string, value: unknown) {
  const result = validateDispatchTaskRepeat(anchor, value);
  if (!result.dates) throw new Error(`Task creation requires a valid repeat schedule. ${result.error}`);
  return result.dates;
}

const schedulingWindow = 30;

async function createOccurrence(user: AuthenticatedUser, input: Record<string, unknown>, date: string, minuteOfDay: number, repository: ReturnType<typeof createTaskCreateRepository>) {
  return createManualTask(user, {
    ...input,
    boardDate: date,
    dueAt: locationLocalDateMinuteToInstant({ localDate: date, minuteOfDay, timezone: "America/Chicago" })
  }, repository);
}

export async function createRepeatingDispatchTask(user: AuthenticatedUser | null, input: Record<string, unknown>, repeat: unknown, requestId: unknown, time: unknown, noEnd = false) {
  if (!user) throw new Error("Authentication required.");
  if (typeof requestId !== "string" || !/^[a-f0-9-]{36}$/i.test(requestId) || typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error("Task creation requires a valid repeat request and Central time.");
  }
  if (input.appointmentAutomationTriggerCode || (input.status && input.status !== "NOT_STARTED")) {
    throw new Error("Task creation requires repeating tasks to start as Not Started without appointment automation.");
  }
  const anchor = typeof input.boardDate === "string" ? input.boardDate : "";
  const rule = noEnd ? parseTaskRepeat(repeat) : null;
  if (noEnd && (!rule || rule.until || !validFlowDate(anchor))) {
    throw new Error("Task creation requires a valid repeat schedule without an end date.");
  }
  const nextDate = rule ? shiftFlowDate(anchor, schedulingWindow) : null;
  const dates = rule && nextDate ? taskOccurrences(anchor, rule, anchor, nextDate) : dispatchRepeatDates(anchor, repeat);
  const minuteOfDay = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const fingerprint = createHash("sha256").update(JSON.stringify([input, rule ?? dates, time])).digest("hex");
  const key = { userId: user.id, requestId };
  function existingResult(batch: { fingerprint: string; firstTaskId: string | null; taskCount: number }) {
    if (batch.fingerprint !== fingerprint || !batch.firstTaskId) throw new Error("Task creation requires a fresh repeat request for changed details.");
    return { task: { id: batch.firstTaskId, title: typeof input.title === "string" ? input.title.trim() : "" }, taskCount: batch.taskCount, ...(noEnd ? { ongoing: true } : {}) };
  }
  try {
    return await prisma.$transaction(async database => {
      const existing = await database.dispatchTaskRepeatBatch.findUnique({ where: { userId_requestId: key } });
      if (existing) return existingResult(existing);
      await database.dispatchTaskRepeatBatch.create({ data: {
        ...key, fingerprint, ...(rule ? { nextDate, ongoing: JSON.parse(JSON.stringify({ input, rule, minuteOfDay })) as Prisma.InputJsonValue } : {})
      } });
      const repository = createTaskCreateRepository(database);
      let firstTask: { id: string; title: string } | undefined;
      for (const date of dates) {
        const task = await createOccurrence(user, input, date, minuteOfDay, repository);
        firstTask ??= { id: task.id, title: task.title };
      }
      if (!firstTask) throw new Error("Task creation requires a repeat occurrence.");
      await database.dispatchTaskRepeatBatch.update({
        where: { userId_requestId: key }, data: { firstTaskId: firstTask.id, taskCount: dates.length }
      });
      return { task: firstTask, taskCount: dates.length, ...(noEnd ? { ongoing: true } : {}) };
    }, { timeout: 30000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.dispatchTaskRepeatBatch.findUnique({ where: { userId_requestId: key } });
      if (existing) return existingResult(existing);
    }
    throw error;
  }
}

export async function extendOngoingDispatchTasks(now = new Date()) {
  const horizon = shiftFlowDate(flowDay(now.toISOString()), schedulingWindow);
  const batches = await prisma.dispatchTaskRepeatBatch.findMany({
    where: { nextDate: { lt: horizon } },
    orderBy: [{ lastAttemptAt: { sort: "asc", nulls: "first" } }, { nextDate: "asc" }],
    take: 8,
    include: { user: { select: { email: true } } }
  });
  const auth = createPrismaAuthStore(prisma);
  const summary = { schedules: batches.length, created: 0, failed: 0 };
  for (const batch of batches) {
    const { userId, requestId, nextDate, ongoing } = batch;
    if (!nextDate) continue;
    const where = { userId, requestId, nextDate };
    try {
      await prisma.dispatchTaskRepeatBatch.updateMany({ where, data: { lastAttemptAt: now } });
      const user = await auth.findUserByEmail(batch.user.email);
      if (!user?.isActive || user.id !== userId) throw new Error("Schedule owner is unavailable.");
      const settings = ongoing as { input: Record<string, unknown>; rule: unknown; minuteOfDay: number } | null;
      const anchor = settings?.input?.boardDate;
      const rule = parseTaskRepeat(settings?.rule);
      if (!settings || !rule || rule.until || typeof anchor !== "string" || !validFlowDate(anchor)) throw new Error("Invalid schedule.");
      const chunkEnd = shiftFlowDate(nextDate, schedulingWindow);
      const end = chunkEnd < horizon ? chunkEnd : horizon;
      const dates = taskOccurrences(anchor, rule, nextDate, end);
      summary.created += await prisma.$transaction(async database => {
        const claimed = await database.dispatchTaskRepeatBatch.updateMany({ where, data: { nextDate: end, taskCount: { increment: dates.length } } });
        if (!claimed.count) return 0;
        const repository = createTaskCreateRepository(database);
        for (const date of dates) await createOccurrence(user, settings.input, date, settings.minuteOfDay, repository);
        return dates.length;
      }, { timeout: 6000 });
    } catch {
      summary.failed++;
    }
  }
  return summary;
}
