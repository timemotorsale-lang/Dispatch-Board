import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser, isGeneralManager } from "@/server/policies/access";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { resolveReportPeriod, type ReportCadence } from "@/lib/reporting/calendar";
import { summarizeReportingCoverage, type ReportingCoverageRow } from "@/lib/reporting/coverage";
import { loadReportingCalendar } from "./calendar-service";

export async function reportingManagementCoverage(actor: AuthenticatedUser | null, date: string, cadence: ReportCadence, subjectUserId?: string) {
  const user = assertAuthenticatedUser(actor);
  if (!user.isActive || !isGeneralManager(user)) throw new Error("General Manager access is required for reporting coverage.");
  const period = resolveReportPeriod(date, cadence, await loadReportingCalendar());
  const scope = { organizationId: INITIAL_ORGANIZATION.id, cadence, periodStart: period.startDate, ...(subjectUserId ? { subjectUserId } : {}) };
  const [expectations, series] = await prisma.$transaction([
    prisma.reportingExpectation.findMany({ where: scope, orderBy: { subjectUserId: "asc" }, take: 501 }),
    prisma.reportingSeries.findMany({ where: scope, orderBy: { subjectUserId: "asc" }, select: { subjectUserId: true, subjectName: true, acceptedRevisionId: true, revisions: { orderBy: { version: "desc" }, take: 1, select: { id: true, reviews: { orderBy: { createdAt: "desc" }, take: 1, select: { action: true } } } } }, take: 501 }),
  ], { isolationLevel: "RepeatableRead" });
  if (expectations.length > 500 || series.length > 500) throw new Error("Reporting coverage requires a narrower person scope.");
  const people = await prisma.user.findMany({ where: { id: { in: [...new Set(expectations.map(item => item.subjectUserId))] } }, select: { id: true, name: true }, take: 500 });
  const expected = new Map(expectations.map(item => [item.subjectUserId, item]));
  const submitted = new Map(series.map(item => [item.subjectUserId, item]));
  const identities = [...new Set([...expected.keys(), ...submitted.keys()])].sort();
  const rows: ReportingCoverageRow[] = identities.map(subjectUserId => {
    const obligation = expected.get(subjectUserId), report = submitted.get(subjectUserId), latest = report?.revisions[0];
    return { subjectUserId, subject: report?.subjectName ?? people.find(person => person.id === subjectUserId)?.name ?? "Former staff", disposition: obligation?.disposition ?? "OPTIONAL", submitted: Boolean(latest), approved: Boolean(report?.acceptedRevisionId), correctionPending: Boolean(report?.acceptedRevisionId && latest && latest.id !== report.acceptedRevisionId), needsRevision: latest?.reviews[0]?.action === "RETURN" };
  });
  return { periodStart: period.startDate, periodEnd: period.endDate, cadence, calendarVersion: period.calendarVersion, quality: "PARTIAL" as const, limitation: "Reporting submission coverage only. Optional reports do not enter required rates. An accepted report remains approved while its correction is pending. Legacy-only submissions without a canonical series are excluded; departmental performance and historical ownership are not inferred.", rows, summary: summarizeReportingCoverage(rows) };
}
