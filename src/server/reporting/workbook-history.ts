import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import type { ReportCadence } from "@/lib/reporting/calendar";

export type WorkbookHistoryRow = { id: string; workbookId: string; userId: string; subject: string; title: string; cadence: string; periodStart: Date; periodEnd: Date; version: number; generatedAt: Date; businessStart: string; businessEnd: string };
export async function workbookReportHistory(input: { subjectUserId?: string; cadence?: ReportCadence; from?: string; to?: string; query?: string; cursor?: string | null; done?: boolean; submittedOnly?: boolean }, database: Pick<Prisma.TransactionClient, "workdayReportDraft" | "$queryRaw"> = prisma) {
  if (input.done || input.submittedOnly) return [];
  const position = input.cursor ? await database.workdayReportDraft.findFirstOrThrow({ where: { id: input.cursor, ...(input.subjectUserId ? { workbook: { userId: input.subjectUserId } } : {}) },
    select: { workbookId: true, cadence: true, periodStart: true } }) : null;
  const terms = [
    ...(input.subjectUserId ? [Prisma.sql`w."userId" = ${input.subjectUserId}`] : []),
    ...(input.cadence ? [Prisma.sql`d."cadence"::text = ${input.cadence}`] : []),
    ...(input.from ? [Prisma.sql`d."periodStart"::date >= ${input.from}::date`] : []),
    ...(input.to ? [Prisma.sql`d."periodStart"::date <= ${input.to}::date`] : []),
    Prisma.sql`NOT EXISTS (SELECT 1 FROM "ReportingSeries" s WHERE s."organizationId" = ${INITIAL_ORGANIZATION.id} AND s."subjectUserId" = w."userId"
      AND s."cadence" = d."cadence"::text AND s."periodStart" = to_char(d."periodStart", 'YYYY-MM-DD')
      AND EXISTS (SELECT 1 FROM "ReportingRevision" r WHERE r."seriesId" = s.id))`,
  ];
  const outer = [];
  if (position) outer.push(Prisma.sql`(latest."periodStart"::date < ${position.periodStart.toISOString().slice(0, 10)}::date OR
    (latest."periodStart"::date = ${position.periodStart.toISOString().slice(0, 10)}::date AND latest."workbookId" > ${position.workbookId}) OR
    (latest."periodStart"::date = ${position.periodStart.toISOString().slice(0, 10)}::date AND latest."workbookId" = ${position.workbookId} AND latest."cadence"::text > ${position.cadence}))`);
  if (input.query) {
    const pattern = `%${input.query.replace(/[\\%_]/g, char => "\\" + char)}%`;
    outer.push(Prisma.sql`(latest."subject" ILIKE ${pattern} OR latest."title" ILIKE ${pattern} OR latest."summary" ILIKE ${pattern} OR latest."sections"::text ILIKE ${pattern})`);
  }
  // Group before paging. A regenerated draft cannot reappear as another day/report.
  const found = await database.$queryRaw<Omit<WorkbookHistoryRow, "businessStart" | "businessEnd">[]>(Prisma.sql`
    SELECT latest.id, latest."workbookId", latest."userId", latest."subject", latest.title, latest.cadence,
      latest."periodStart", latest."periodEnd", latest.version, latest."generatedAt"
    FROM (
      SELECT DISTINCT ON (d."workbookId", d."cadence", d."periodStart") d.*, w."userId", u.name AS subject
      FROM "WorkdayReportDraft" d JOIN "WorkdayWorkbook" w ON w.id = d."workbookId" JOIN "User" u ON u.id = w."userId"
      WHERE ${Prisma.join(terms, " AND ")}
      ORDER BY d."workbookId", d."cadence", d."periodStart", d.version DESC, d.id ASC
    ) latest
    ${outer.length ? Prisma.sql`WHERE ${Prisma.join(outer, " AND ")}` : Prisma.empty}
    ORDER BY latest."periodStart" DESC, latest."workbookId" ASC, latest."cadence"::text ASC LIMIT 51
  `);
  return found.map(item => ({ ...item, businessStart: item.periodStart.toISOString().slice(0, 10), businessEnd: item.periodEnd.toISOString().slice(0, 10) }));
}
