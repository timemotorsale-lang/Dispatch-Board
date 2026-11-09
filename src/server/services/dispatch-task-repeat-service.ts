import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { parseTaskRepeat, taskOccurrences } from "@/lib/calendar-task-repeat";
import { shiftFlowDate, validFlowDate } from "@/features/advisor/workbook-flow-dates";
import { locationLocalDateMinuteToInstant } from "@/server/appointments/location-time-service";
import type { AuthenticatedUser } from "@/server/auth/store";
import { prisma } from "@/server/db/client";
import { createTaskCreateRepository } from "@/server/repositories/task-create-repository";
import { createManualTask } from "./task-create-service";

const maxOccurrences = 60;

export function dispatchRepeatDates(anchor: string, value: unknown) {
  const rule = parseTaskRepeat(value);
  if (!validFlowDate(anchor) || !rule?.until || rule.until <= anchor || Date.parse(rule.until) - Date.parse(anchor) > 12 * 366 * 86400000) {
    throw new Error("Task creation requires a repeat end date after the first date and within 12 years.");
  }
  const dates = taskOccurrences(anchor, rule, anchor, shiftFlowDate(rule.until, 1));
  if (dates.length < 2 || dates.length > maxOccurrences) {
    throw new Error("Task creation requires between 2 and 60 occurrences. Adjust the repeat interval or end date.");
  }
  return dates;
}

export async function createRepeatingDispatchTask(user: AuthenticatedUser | null, input: Record<string, unknown>, repeat: unknown, requestId: unknown, time: unknown) {
  if (!user) throw new Error("Authentication required.");
  if (typeof requestId !== "string" || !/^[a-f0-9-]{36}$/i.test(requestId) || typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error("Task creation requires a valid repeat request and Central time.");
  }
  if (input.appointmentAutomationTriggerCode || (input.status && input.status !== "NOT_STARTED")) {
    throw new Error("Task creation requires repeating tasks to start as Not Started without appointment automation.");
  }
  const dates = dispatchRepeatDates(typeof input.boardDate === "string" ? input.boardDate : "", repeat);
  const minuteOfDay = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const fingerprint = createHash("sha256").update(JSON.stringify([input, dates, time])).digest("hex");
  const key = { userId: user.id, requestId };
  function existingResult(batch: { fingerprint: string; firstTaskId: string | null; taskCount: number }) {
    if (batch.fingerprint !== fingerprint || !batch.firstTaskId) throw new Error("Task creation requires a fresh repeat request for changed details.");
    return { task: { id: batch.firstTaskId, title: typeof input.title === "string" ? input.title.trim() : "" }, taskCount: batch.taskCount };
  }
  try {
    return await prisma.$transaction(async database => {
      const existing = await database.dispatchTaskRepeatBatch.findUnique({ where: { userId_requestId: key } });
      if (existing) return existingResult(existing);
      await database.dispatchTaskRepeatBatch.create({ data: { ...key, fingerprint } });
      const repository = createTaskCreateRepository(database);
      let firstTask: { id: string; title: string } | undefined;
      for (const date of dates) {
        const task = await createManualTask(user, {
          ...input,
          boardDate: date,
          dueAt: locationLocalDateMinuteToInstant({ localDate: date, minuteOfDay, timezone: "America/Chicago" })
        }, repository);
        firstTask ??= { id: task.id, title: task.title };
      }
      if (!firstTask) throw new Error("Task creation requires a repeat occurrence.");
      await database.dispatchTaskRepeatBatch.update({
        where: { userId_requestId: key }, data: { firstTaskId: firstTask.id, taskCount: dates.length }
      });
      return { task: firstTask, taskCount: dates.length };
    }, { timeout: 30000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.dispatchTaskRepeatBatch.findUnique({ where: { userId_requestId: key } });
      if (existing) return existingResult(existing);
    }
    throw error;
  }
}
