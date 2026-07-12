import { Prisma, TaskSourceType, TaskStatus, TaskTemplatePriority, WorkflowArea } from "@prisma/client";

import { getStaffExecutionFlags } from "@/lib/staff-execution-flags";
import { prisma } from "@/server/db/client";
import { normalizeBoardDate } from "@/server/validation/board-date";

type CarryoverItem = { id: string; title: string; status: string; priority: string; workflowArea: string; ownerUserId: string; blockerReason: string | null; nextStep: string | null; customerReference: string | null; vehicleReference: string | null };

function readCarryover(snapshot: Prisma.JsonValue): CarryoverItem[] {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return [];
  const items = (snapshot as Record<string, unknown>).carryover;
  if (!Array.isArray(items)) return [];
  return items.filter((item): item is CarryoverItem => Boolean(item) && typeof item === "object" && typeof (item as CarryoverItem).id === "string" && typeof (item as CarryoverItem).ownerUserId === "string");
}

export async function generateDailyCarryoverForBoardDate(boardDate: string, boardDayId: string) {
  const date = normalizeBoardDate(boardDate);
  const flags = getStaffExecutionFlags();
  if (!flags.enabled || !flags.endOfDayReportEnabled) return { enabled: false, createdCount: 0, skippedCount: 0 };
  const reports = await prisma.staffDailyReport.findMany({
    where: { staffDay: { boardDay: { date: { lt: new Date(`${date}T00:00:00.000Z`) } } } },
    include: { staffDay: true },
    orderBy: [{ submittedAt: "desc" }, { version: "desc" }]
  });
  const latestByUser = new Map<string, typeof reports[number]>();
  for (const report of reports) if (!latestByUser.has(report.staffDay.userId)) latestByUser.set(report.staffDay.userId, report);
  let createdCount = 0;
  let skippedCount = 0;
  for (const report of latestByUser.values()) {
    for (const item of readCarryover(report.sourceSnapshot)) {
      const existing = await prisma.task.findUnique({ where: { boardDayId_carryoverSourceTaskId: { boardDayId, carryoverSourceTaskId: item.id } }, select: { id: true } });
      if (existing) { skippedCount += 1; continue; }
      const blocked = item.status === TaskStatus.BLOCKED || item.status === TaskStatus.WAITING_ON_APPROVAL || item.status === TaskStatus.WAITING_ON_PARTS;
      await prisma.task.create({ data: { boardDayId, title: item.title, description: ["Carried forward from the submitted end-of-day handoff.", item.nextStep ? `Next step: ${item.nextStep}` : null].filter(Boolean).join(" "), assignedUserId: item.ownerUserId, status: blocked ? item.status as TaskStatus : TaskStatus.NOT_STARTED, priority: item.priority as TaskTemplatePriority, dueAt: new Date(`${date}T10:00:00.000Z`), sourceType: TaskSourceType.STAFF, workflowArea: item.workflowArea as WorkflowArea, blockerReason: blocked ? item.blockerReason : null, customerReference: item.customerReference, vehicleReference: item.vehicleReference, carryoverSourceTaskId: item.id, carryoverReportId: report.id } });
      createdCount += 1;
    }
  }
  return { enabled: true, createdCount, skippedCount };
}
