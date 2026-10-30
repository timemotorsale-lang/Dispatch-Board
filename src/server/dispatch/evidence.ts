import type { Prisma } from "@prisma/client";
import type { ReportRow } from "@/lib/reporting/contracts";
import type { TaskObservation } from "@/lib/reporting/reconciliation";

const object = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
type EvidenceDatabase = Pick<Prisma.TransactionClient, "activityEvent" | "workdayDailyFocusItem">;
export async function readDispatchEvidence(database: EvidenceDatabase, input: {
  userId: string; personName: string; startDate: string; endDate: string; startsAt: Date; endsAt: Date; cutoffAt: Date;
}) {
  const cutoff = new Date(Math.min(input.endsAt.getTime(), input.cutoffAt.getTime()));
  const [events, focuses] = await Promise.all([
    database.activityEvent.findMany({
      where: { createdAt: { gte: input.startsAt, lt: cutoff }, OR: [{ actorUserId: input.userId }, { metadata: { path: ["personId"], equals: input.userId } }],
        AND: [{ OR: [{ eventType: { startsWith: "dispatch." } }, { eventType: { startsWith: "task." } }] }] },
      select: { id: true, taskId: true, actorUserId: true, eventType: true, message: true, metadata: true, createdAt: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 1001,
    }),
    database.workdayDailyFocusItem.findMany({
      where: { workbook: { userId: input.userId, boardDay: { date: { gte: new Date(`${input.startDate}T00:00:00Z`), lt: new Date(`${input.endDate}T00:00:00Z`) } } }, createdAt: { lt: cutoff } },
      select: { id: true, outcome: true, status: true, convertedTaskId: true, sourceId: true, sourceType: true }, orderBy: { id: "asc" }, take: 501,
    }),
  ]);
  const manualCompleted: ReportRow[] = [];
  const activity: ReportRow[] = [], handoffs: ReportRow[] = [], observations: TaskObservation[] = [];
  for (const event of events.slice(0, 1000)) {
    const meta = object(event.metadata);
    const attributed = meta.personId === input.userId;
    const taskId = event.taskId ?? (typeof meta.taskId === "string" ? meta.taskId : null);
    const title = typeof meta.title === "string" && meta.title ? meta.title : event.message;
    const state = typeof meta.nextStatus === "string" ? meta.nextStatus : typeof meta.state === "string" ? meta.state : event.eventType.replaceAll(".", " ");
    const row: ReportRow = { id: `event:${event.id}`, title, state, owner: input.personName,
      href: taskId ? `/tasks/${encodeURIComponent(taskId)}` : `/board?view=live&date=${input.startDate}`, occurredAt: event.createdAt.toISOString(),
      detail: typeof meta.nextAction === "string" && meta.nextAction ? meta.nextAction : typeof meta.blockerReason === "string" ? meta.blockerReason : undefined };
    if (meta.personId && !attributed && event.actorUserId === input.userId) {
      row.state = "COORDINATION";
      row.detail = ["Recorded an update for another team member.", row.detail].filter(Boolean).join(" ");
    }
    activity.push(row);
    if (event.eventType === "dispatch.complete_focus" && attributed && typeof meta.focusId === "string") manualCompleted.push({ ...row, id: `focus:${meta.focusId}`, state: "COMPLETED" });
    if (event.eventType.includes("handoff")) handoffs.push(row);
    if (taskId && attributed && typeof meta.nextStatus === "string") {
      observations.push({ taskId, boardDate: typeof meta.businessDate === "string" ? meta.businessDate : input.startDate,
        row: { ...row, id: `task:${taskId}` } });
    }
  }
  const plannedFocus: ReportRow[] = focuses.slice(0, 500).map(focus => ({ id: `focus:${focus.id}`, title: focus.outcome,
    state: focus.status === "DONE" ? "COMPLETED" : "PLANNED", owner: input.personName,
    href: focus.convertedTaskId ? `/tasks/${encodeURIComponent(focus.convertedTaskId)}` : `/board?view=live&date=${input.startDate}` }));
  const truncated = events.length > 1000 || focuses.length > 500;
  return { activity, handoffs, plannedFocus, observations, manualCompleted, sourceQuality: "PARTIAL" as const,
    sourceCoverage: `Recorded dispatch events and dated focus records are included. Events with owner-at-event metadata support task attribution; older events without that metadata remain activity evidence only. Focus records are current dated records until submission freezes them.${truncated ? " Evidence is truncated at the safe query limit." : ""}`,
    cutoffAt: cutoff.toISOString(),
  };
}
