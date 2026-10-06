import { Prisma } from "@prisma/client";
import { draftReportCalendar, addReportDays, isReportWorkingDay, resolveReportPeriod, validReportDate, type ReportCalendar, type ReportCadence } from "@/lib/reporting/calendar";
import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser, isGeneralManager } from "@/server/policies/access";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";
import { recordReportingCommand } from "./command";

const organizationId = INITIAL_ORGANIZATION.id;
function manager(actor: AuthenticatedUser | null) {
  const user = assertAuthenticatedUser(actor);
  if (!user.isActive || !isGeneralManager(user)) throw new Error("General Manager access is required for reporting policy.");
  return user;
}
export function parseReportingCalendar(value: unknown): ReportCalendar {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Reporting calendar is invalid.");
  const raw = value as Record<string, unknown>;
  if (typeof raw.timezone !== "string" || typeof raw.version !== "string" || !Array.isArray(raw.workingDays) || !Array.isArray(raw.holidays) || raw.holidays.length > 366 || raw.workingDays.some(day => !Number.isInteger(day)) || raw.holidays.some(day => typeof day !== "string")) throw new Error("Reporting calendar fields are invalid.");
  const config = { version: raw.version, timezone: raw.timezone, workingDays: raw.workingDays as number[], holidays: raw.holidays as string[], dailyDueMinute: Number(raw.dailyDueMinute), graceMinutes: Number(raw.graceMinutes) };
  if (!config.version || config.version.length > 100 || config.timezone.length > 100 || config.graceMinutes > 1440) throw new Error("Reporting calendar fields are invalid.");
  config.holidays.forEach(validReportDate);
  resolveReportPeriod("2026-01-01", "WEEKLY", config);
  return config;
}
export async function loadReportingCalendar() {
  const active = await prisma.reportingCalendarPolicy.findFirst({ where: { organizationId, status: "ACTIVE" }, orderBy: { version: "desc" } });
  return active ? parseReportingCalendar(active.config) : draftReportCalendar;
}
export async function saveReportingCalendar(actor: AuthenticatedUser | null, config: unknown) {
  const user = manager(actor), parsed = parseReportingCalendar(config);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`${organizationId}:REPORT_CALENDAR`}))`;
    const latest = await tx.reportingCalendarPolicy.aggregate({ where: { organizationId }, _max: { version: true } });
    const version = (latest._max.version ?? 0) + 1;
    const policy = await tx.reportingCalendarPolicy.create({ data: { organizationId, version, status: "DRAFT", config: { ...parsed, version: `report-calendar/v${version}` }, createdByUserId: user.id } });
    await recordReportingCommand(tx, { actorUserId: user.id, subjectId: policy.id, action: "CALENDAR_DRAFTED", version, key: policy.id, hash: hashEnterpriseCommand(parsed), reason: "Reporting calendar prepared without activating obligations.", result: { policyId: policy.id } });
    return policy;
  });
}
export async function saveReportingAssignment(actor: AuthenticatedUser | null, input: { subjectUserId: string; reviewerUserId: string; cadence: ReportCadence; validFrom: string; validTo?: string; dailyDueMinute?: number }) {
  const user = manager(actor);
  validReportDate(input.validFrom); if (input.validTo) validReportDate(input.validTo);
  if (input.validTo && input.validTo < input.validFrom) throw new Error("Reporting assignment range is invalid.");
  if (input.subjectUserId === input.reviewerUserId) throw new Error("Reporting assignments require a different reviewer.");
  if (input.dailyDueMinute !== undefined && (!Number.isInteger(input.dailyDueMinute) || input.dailyDueMinute < 0 || input.dailyDueMinute > 1440)) throw new Error("Reporting shift deadline is invalid.");
  const people = await prisma.user.findMany({ where: { id: { in: [input.subjectUserId, input.reviewerUserId] }, isActive: true }, include: { userRoles: { include: { role: true } } } });
  if (people.length !== 2 || !people.find(person => person.id === input.reviewerUserId)?.userRoles.some(role => role.role.name === "General Manager")) throw new Error("Reporting subject or authorized reviewer is invalid.");
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`${organizationId}:${input.subjectUserId}:${input.cadence}`}))`;
    if (await tx.reportingAssignment.findFirst({ where: { organizationId, subjectUserId: input.subjectUserId, cadence: input.cadence, validFrom: { lte: input.validTo ?? "9999-12-31" }, OR: [{ validTo: null }, { validTo: { gte: input.validFrom } }] } })) throw new Error("Reporting assignment overlaps an existing assignment.");
    const assignment = await tx.reportingAssignment.create({ data: { organizationId, ...input } });
    await recordReportingCommand(tx, { actorUserId: user.id, subjectId: assignment.id, action: "ASSIGNMENT_CREATED", version: 1, key: assignment.id, hash: hashEnterpriseCommand(input), reason: "Reporting assignment recorded; generation remains rollout gated.", result: { assignmentId: assignment.id } });
    return assignment;
  });
}
export async function generateReportingExpectations(actor: AuthenticatedUser | null, from: string, to: string) {
  manager(actor); validReportDate(from); validReportDate(to);
  if (from > to || Date.parse(to) - Date.parse(from) > 366 * 86_400_000) throw new Error("Expectation generation range is invalid.");
  const calendar = await loadReportingCalendar();
  if (process.env.REPORTING_EXPECTATIONS_ENABLED !== "true" || calendar.version.includes("draft")) throw new Error("Reporting obligations are not enabled.");
  const assignments = await prisma.reportingAssignment.findMany({ where: { organizationId, validFrom: { lte: to }, OR: [{ validTo: null }, { validTo: { gte: from } }] } });
  let created = 0;
  for (const assignment of assignments) {
    const applicable = { ...calendar, dailyDueMinute: assignment.dailyDueMinute ?? calendar.dailyDueMinute };
    for (let date = from; date <= to; date = addReportDays(date, 1)) {
      if (date < assignment.validFrom || (assignment.validTo && date > assignment.validTo) || !isReportWorkingDay(date, applicable)) continue;
      const person = await prisma.user.findUnique({ where: { id: assignment.subjectUserId }, select: { isActive: true } });
      if (!person?.isActive) continue;
      const period = resolveReportPeriod(date, assignment.cadence as ReportCadence, applicable);
      const key = { organizationId, subjectUserId: assignment.subjectUserId, cadence: assignment.cadence, periodStart: period.startDate };
      const result = await prisma.reportingExpectation.createMany({ data: [{ ...key, periodEnd: period.endDate, dueAt: period.dueAt, reviewBy: period.reviewBy, calendarVersion: period.calendarVersion, reviewerUserId: assignment.reviewerUserId }], skipDuplicates: true });
      created += result.count;
    }
  }
  return { created };
}
export async function reportingExpectations(actor: AuthenticatedUser | null, team = false) {
  const user = assertAuthenticatedUser(actor);
  if (team) manager(actor);
  const items = await prisma.reportingExpectation.findMany({ where: { organizationId, ...(team ? {} : { subjectUserId: user.id }) }, orderBy: [{ dueAt: "desc" }, { id: "asc" }], take: 100 });
  const people = await prisma.user.findMany({ where: { id: { in: [...new Set(items.map(item => item.subjectUserId))] } }, select: { id: true, name: true } });
  const policies = await prisma.reportingCalendarPolicy.findMany({ where: { organizationId }, select: { config: true }, take: 100 });
  const calendars = [draftReportCalendar, ...policies.map(policy => parseReportingCalendar(policy.config))];
  return Promise.all(items.map(async item => {
    const series = await prisma.reportingSeries.findUnique({ where: { organizationId_subjectUserId_cadence_periodStart: { organizationId, subjectUserId: item.subjectUserId, cadence: item.cadence, periodStart: item.periodStart } }, include: { revisions: { orderBy: { version: "desc" }, take: 1, include: { reviews: { orderBy: { createdAt: "desc" }, take: 1 } } } } });
    const calendar = calendars.find(calendar => calendar.version === item.calendarVersion);
    const overdueAt = calendar ? new Date(item.dueAt.getTime() + calendar.graceMinutes * 60000) : null;
    const latest = series?.revisions[0];
    const status = item.disposition !== "REQUIRED" ? item.disposition : latest ? series?.acceptedRevisionId === latest.id ? "APPROVED" : latest.reviews[0]?.action === "RETURN" ? "NEEDS_REVISION" : "SUBMITTED" : !overdueAt ? "DEADLINE_UNAVAILABLE" : new Date() > overdueAt ? "OVERDUE" : "DUE";
    return { id: item.id, subjectUserId: item.subjectUserId, subject: people.find(person => person.id === item.subjectUserId)?.name ?? "Former staff", cadence: item.cadence, periodStart: item.periodStart, dueAt: item.dueAt.toISOString(), status, reason: item.reason };
  }));
}
export async function excuseReportingExpectation(actor: AuthenticatedUser | null, id: string, reason: string) {
  const user = manager(actor);
  if (reason.trim().length < 10 || reason.length > 500) throw new Error("Excuse reason must be at least 10 characters.");
  return prisma.$transaction(async tx => {
    const item = await tx.reportingExpectation.findFirstOrThrow({ where: { id, organizationId } });
    await tx.reportingExpectation.update({ where: { id: item.id }, data: { disposition: "EXCUSED", reason: reason.trim() } });
    await recordReportingCommand(tx, { actorUserId: user.id, subjectId: id, action: "EXPECTATION_EXCUSED", version: 1, key: `${id}:excused`, hash: hashEnterpriseCommand(reason), reason, result: { expectationId: id } });
    return { id };
  });
}

export function reportingJson(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }
