import type { Prisma, PrismaClient } from "@prisma/client";
import { activitySourceHref, workdayBounds } from "@/lib/workday-activity";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";

export type ReportActivity = { id: string; eventType: string; message: string; metadata: Prisma.JsonValue; taskId: string | null; createdAt: Date; task: { id: string; title: string; status: string; workflowArea: string } | null };
export async function allActivityPages<T extends { id: string }>(fetchPage: (cursor?: string) => Promise<T[]>): Promise<T[]> {
  const rows: T[] = []; let cursor: string | undefined;
  while (true) {
    const page = await fetchPage(cursor);
    rows.push(...page);
    if (page.length < 250) return rows;
    cursor = page[page.length - 1].id;
  }
}

export async function readExternalReportActivity(database: Pick<PrismaClient, "activityEvent" | "enterpriseAuditEvent" | "diagnosticWorkspaceDraft">, actorUserId: string, boardDate: string): Promise<ReportActivity[]> {
  const range = workdayBounds(boardDate);
  const paging = (cursor?: string) => ({ take: 250, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) });
  const [activity, audit, drafts] = await Promise.all([
    allActivityPages(cursor => database.activityEvent.findMany({ ...paging(cursor), where: { actorUserId, createdAt: range }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], select: { id: true, eventType: true, message: true, metadata: true, taskId: true, createdAt: true, task: { select: { id: true, title: true, status: true, workflowArea: true } } } })),
    allActivityPages(cursor => database.enterpriseAuditEvent.findMany({ ...paging(cursor), where: { actorUserId, organizationId: INITIAL_ORGANIZATION.id, occurredAt: range }, orderBy: [{ occurredAt: "asc" }, { id: "asc" }], select: { id: true, eventType: true, subjectType: true, subjectId: true, domain: true, reason: true, occurredAt: true, command: { select: { commandType: true, status: true } } } })),
    // Backfill the most recent saved state of older drafts; future saves also emit transactional activity.
    allActivityPages(cursor => database.diagnosticWorkspaceDraft.findMany({ ...paging(cursor), where: { userId: actorUserId, updatedAt: range }, orderBy: [{ updatedAt: "asc" }, { id: "asc" }], select: { id: true, title: true, version: true, updatedAt: true } }))
  ]);
  const events: ReportActivity[] = [...activity];
  for (const event of audit) {
    if (event.command && event.command.status !== "SUCCEEDED") continue;
    events.push({ id: `audit:${event.id}`, eventType: event.eventType, message: `${(event.command?.commandType ?? event.eventType).replaceAll("_", " ")}: ${event.reason} (${event.subjectType} ${event.subjectId})`, metadata: { sourceType: "ENTERPRISE_AUDIT", sourceModule: event.domain, commandType: event.command?.commandType ?? event.eventType, sourceHref: activitySourceHref(event.subjectType, event.subjectId) }, taskId: null, task: null, createdAt: event.occurredAt });
  }
  const recordedDrafts = new Set(activity.flatMap(event => {
    const metadata = event.metadata as Record<string, unknown> | null;
    return metadata?.sourceType === "DIAGNOSTIC_DRAFT" && typeof metadata.reportSourceId === "string" ? [metadata.reportSourceId] : [];
  }));
  for (const draft of drafts) {
    if (recordedDrafts.has(`draft:${draft.id}`)) continue;
    events.push({ id: `draft:${draft.id}`, eventType: "diagnostic.quote_saved", message: `Saved preliminary quote: ${draft.title} (version ${draft.version}). Not an authorization or completed repair.`, metadata: { sourceType: "DIAGNOSTIC_DRAFT", reportSourceId: `draft:${draft.id}`, sourceModule: "DIAGNOSTICS", sourceHref: "/diagnostics/labor-guide" }, taskId: null, task: null, createdAt: draft.updatedAt });
  }
  return events.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
}
