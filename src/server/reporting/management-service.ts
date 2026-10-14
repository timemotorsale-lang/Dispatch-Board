import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser, isGeneralManager } from "@/server/policies/access";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { resolveReportPeriod, type ReportCadence } from "@/lib/reporting/calendar";
import { summarizeReportingCoverage, type ReportingCoverageRow } from "@/lib/reporting/coverage";
import { loadReportingCalendar } from "./calendar-service";
import { projectReportingExpectations, type ExpectationAssignment } from "@/lib/reporting/expectations";

export async function reportingManagementCoverage(actor: AuthenticatedUser | null, date: string, cadence: ReportCadence, subjectUserId?: string) {
  const user = assertAuthenticatedUser(actor);
  if (!user.isActive || !isGeneralManager(user)) throw new Error("General Manager access is required for reporting coverage.");
  const calendar = await loadReportingCalendar();
  const period = resolveReportPeriod(date, cadence, calendar);
  const scope = { organizationId: INITIAL_ORGANIZATION.id, cadence, periodStart: period.startDate, ...(subjectUserId ? { subjectUserId } : {}) };
  const [expectations, series, assignments] = await prisma.$transaction([
    prisma.reportingExpectation.findMany({ where: scope, orderBy: { subjectUserId: "asc" }, take: 501 }),
    prisma.reportingSeries.findMany({ where: scope, orderBy: { subjectUserId: "asc" }, select: { subjectUserId: true, subjectName: true, acceptedRevisionId: true, revisions: { orderBy: { version: "desc" }, take: 1, select: { id: true, reviews: { orderBy: { createdAt: "desc" }, take: 1, select: { action: true } } } } }, take: 501 }),
    prisma.reportingAssignment.findMany({ where: { organizationId: INITIAL_ORGANIZATION.id, cadence, validFrom: { lte: period.lastDate }, OR: [{ validTo: null }, { validTo: { gte: period.startDate } }], ...(subjectUserId ? { subjectUserId } : {}) }, orderBy: { id: "asc" }, take: 501 }),
  ], { isolationLevel: "RepeatableRead" });
  if (expectations.length > 500 || series.length > 500 || assignments.length > 500) throw new Error("Reporting coverage requires a narrower person scope.");
  const assignmentInputs = assignments.map(item => ({ ...item, cadence: item.cadence as ReportCadence })) satisfies ExpectationAssignment[];
  const personIds = [...new Set([...expectations.map(item => item.subjectUserId), ...series.map(item => item.subjectUserId), ...assignmentInputs.flatMap(item => [item.subjectUserId, item.reviewerUserId])])];
  const people = await prisma.user.findMany({ where: { id: { in: personIds } }, select: { id: true, name: true, isActive: true }, take: 1000 });
  const timeOff = await prisma.timeOffRequest.findMany({ where: { organizationId: INITIAL_ORGANIZATION.id, status: "APPROVED", requesterUserId: { in: people.map(person => person.id) }, startsAt: { lt: period.endsAt }, endsAt: { gt: period.startsAt } }, select: { requesterUserId: true, startsAt: true, endsAt: true }, take: 10001 });
  if (people.length > 999 || timeOff.length > 10000) throw new Error("Reporting coverage requires a narrower person scope.");
  const projected = projectReportingExpectations(calendar, assignmentInputs, people, period.startDate, period.lastDate, timeOff).filter(item => item.cadence === cadence && item.periodStart === period.startDate);
  const expected = new Map(expectations.map(item => [item.subjectUserId, item]));
  const projectedRequired = new Map(projected.map(item => [item.subjectUserId, item]));
  const submitted = new Map(series.map(item => [item.subjectUserId, item]));
  const peopleById = new Map(people.map(person => [person.id, person]));
  const identities = [...new Set([...expected.keys(), ...projectedRequired.keys(), ...submitted.keys()])].sort();
  const rows: ReportingCoverageRow[] = identities.map(subjectUserId => {
    const obligation = expected.get(subjectUserId), report = submitted.get(subjectUserId), latest = report?.revisions[0];
    return { subjectUserId, subject: report?.subjectName ?? projectedRequired.get(subjectUserId)?.subject ?? peopleById.get(subjectUserId)?.name ?? "Former staff", disposition: obligation?.disposition ?? (projectedRequired.has(subjectUserId) ? "REQUIRED" : "OPTIONAL"), submitted: Boolean(latest), approved: Boolean(report?.acceptedRevisionId), correctionPending: Boolean(report?.acceptedRevisionId && latest && latest.id !== report.acceptedRevisionId), needsRevision: latest?.reviews[0]?.action === "RETURN" };
  });
  return { periodStart: period.startDate, periodEnd: period.endDate, cadence, calendarVersion: period.calendarVersion, quality: "PARTIAL" as const, limitation: "Reporting assignment coverage with saved expectation overrides. Optional reports do not enter required rates. An accepted report remains approved while its correction is pending. Legacy-only submissions without a canonical series are excluded; departmental performance and historical ownership are not inferred.", rows, summary: summarizeReportingCoverage(rows) };
}
