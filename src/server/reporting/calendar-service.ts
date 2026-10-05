import { Prisma } from "@prisma/client";
import { draftReportCalendar, addReportDays, resolveReportPeriod, validReportDate, type ReportCalendar, type ReportCadence } from "@/lib/reporting/calendar";
import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser, isGeneralManager } from "@/server/policies/access";
import { prisma } from "@/server/db/client";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";
import { recordReportingCommand } from "./command";
import { projectReportingExpectations, type ExpectationAssignment } from "@/lib/reporting/expectations";

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
  if (typeof raw.dailyDueMinute !== "number" || typeof raw.graceMinutes !== "number" || new Set(config.workingDays).size !== config.workingDays.length || new Set(config.holidays).size !== config.holidays.length) throw new Error("Reporting calendar fields are invalid.");
  if (!config.version || config.version.length > 100 || config.timezone.length > 100 || config.graceMinutes > 1440) throw new Error("Reporting calendar fields are invalid.");
  try { new Intl.DateTimeFormat("en-US", { timeZone: config.timezone }).format(new Date(0)); }
  catch { throw new Error("Reporting calendar timezone is invalid."); }
  config.holidays.forEach(validReportDate);
  resolveReportPeriod("2026-01-01", "WEEKLY", config);
  return config;
}
export async function loadReportingCalendar(client: Prisma.TransactionClient = prisma) {
  const active = await client.reportingCalendarPolicy.findFirst({ where: { organizationId, status: "ACTIVE" }, orderBy: { version: "desc" } });
  return active ? parseReportingCalendar(active.config) : draftReportCalendar;
}
export async function saveReportingCalendar(actor: AuthenticatedUser | null, config: unknown) {
  const user = manager(actor), parsed = parseReportingCalendar(config);
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${organizationId}:REPORT_CALENDAR`}))`;
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
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${organizationId}:${input.subjectUserId}:${input.cadence}`}))`;
    if (await tx.reportingAssignment.findFirst({ where: { organizationId, subjectUserId: input.subjectUserId, cadence: input.cadence, validFrom: { lte: input.validTo ?? "9999-12-31" }, OR: [{ validTo: null }, { validTo: { gte: input.validFrom } }] } })) throw new Error("Reporting assignment overlaps an existing assignment.");
    const assignment = await tx.reportingAssignment.create({ data: { organizationId, ...input } });
    await recordReportingCommand(tx, { actorUserId: user.id, subjectId: assignment.id, action: "ASSIGNMENT_CREATED", version: 1, key: assignment.id, hash: hashEnterpriseCommand(input), reason: "Reporting assignment recorded; generation remains rollout gated.", result: { assignmentId: assignment.id } });
    return assignment;
  });
}
export async function previewReportingCalendar(actor: AuthenticatedUser | null, input: { config: unknown; from: string; to: string }) {
  manager(actor);
  return previewCalendar(input, prisma);
}
async function previewCalendar(input: { config: unknown; from: string; to: string }, client: Prisma.TransactionClient) {
  const config = parseReportingCalendar(input.config);
  validReportDate(input.from); validReportDate(input.to);
  if (input.from > input.to || Date.parse(input.to) - Date.parse(input.from) > 366 * 86400000) throw new Error("Expectation preview range is invalid.");
  const assignments = await client.reportingAssignment.findMany({ where: { organizationId, validFrom: { lte: input.to }, OR: [{ validTo: null }, { validTo: { gte: input.from } }] }, orderBy: { id: "asc" }, take: 1001 });
  const people = await client.user.findMany({ where: { id: { in: [...new Set(assignments.flatMap(item => [item.subjectUserId, item.reviewerUserId]))] } }, select: { id: true, name: true, isActive: true, userRoles: { select: { role: { select: { name: true } } } } } });
  const baseline = await loadReportingCalendar(client);
  const bounds = [config, baseline].flatMap(calendar => [resolveReportPeriod(input.from, "MONTHLY", calendar), resolveReportPeriod(input.to, "MONTHLY", calendar)]);
  const startsAt = new Date(Math.min(...bounds.map(period => period.startsAt.getTime())));
  const endsAt = new Date(Math.max(...bounds.map(period => period.reviewBy.getTime())));
  const timeOff = await client.timeOffRequest.findMany({ where: { organizationId, status: "APPROVED", requesterUserId: { in: people.map(person => person.id) }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } }, select: { requesterUserId: true, startsAt: true, endsAt: true }, take: 10001 });
  if (timeOff.length > 10000) throw new Error("Expectation preview requires a smaller time-off scope.");
  const inputs = assignments.map(item => ({ ...item, cadence: item.cadence as ReportCadence })) satisfies ExpectationAssignment[];
  const proposed = projectReportingExpectations(config, inputs, people, input.from, input.to, timeOff);
  const previous = projectReportingExpectations(baseline, inputs, people, input.from, input.to, timeOff);
  const existing = await client.reportingExpectation.findMany({ where: { organizationId, periodStart: { gte: addReportDays(input.from, -31), lte: input.to } }, take: 10001 });
  if (existing.length > 10000) throw new Error("Expectation preview requires a smaller existing scope.");
  const key = (row: { subjectUserId: string; cadence: string; periodStart: string }) => `${row.subjectUserId}:${row.cadence}:${row.periodStart}`;
  const before = new Map(previous.map(row => [key(row), row]));
  const persisted = new Map(existing.map(row => [key(row), row]));
  const rows = proposed.map(row => {
    const old = before.get(key(row)), saved = persisted.get(key(row));
    const authorizedReviewer = people.find(person => person.id === row.reviewerUserId)?.userRoles.some(role => role.role.name === "General Manager") === true;
    return { ...row, canGenerate: row.canGenerate && authorizedReviewer, warnings: [...row.warnings, ...(!authorizedReviewer ? ["The assigned reviewer no longer has review authority."] : [])], previousDueAt: old?.dueAt ?? null, existingDueAt: saved?.dueAt.toISOString() ?? null, change: !old ? "ADDED" : old.dueAt !== row.dueAt || old.reviewBy !== row.reviewBy || old.reviewerUserId !== row.reviewerUserId || old.coveredDates.join() !== row.coveredDates.join() ? "CHANGED" : "UNCHANGED", existing: Boolean(saved) };
  });
  const identities = new Set(proposed.map(key));
  return { baselineVersion: baseline.version, proposedVersion: config.version, from: input.from, to: input.to, rows, removed: previous.filter(row => !identities.has(key(row))), existingPreserved: true, activationEnabled: false };
}
export async function generateReportingExpectations(actor: AuthenticatedUser | null, from: string, to: string) {
  const user = manager(actor); validReportDate(from); validReportDate(to);
  if (from > to || Date.parse(to) - Date.parse(from) > 366 * 86_400_000) throw new Error("Expectation generation range is invalid.");
  if (process.env.REPORTING_EXPECTATIONS_ENABLED !== "true") throw new Error("Reporting obligations are not enabled.");
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${organizationId}:REPORT_CALENDAR`}))`;
    const currentActor = await tx.user.findUnique({ where: { id: user.id }, select: { isActive: true, userRoles: { select: { role: { select: { name: true } } } } } });
    if (!currentActor?.isActive || !currentActor.userRoles.some(role => role.role.name === "General Manager")) throw new Error("General Manager access is required for reporting policy.");
    const calendar = await loadReportingCalendar(tx);
    if (calendar.version.includes("draft")) throw new Error("Reporting obligations are not enabled.");
    const preview = await previewCalendar({ config: calendar, from, to }, tx);
    if (preview.rows.some(row => !row.canGenerate || row.partial)) throw new Error("Expectation generation requires resolved leave, reviewer, and partial-period policy conflicts.");
    let created = 0;
    for (const row of preview.rows) {
      const key = { organizationId, subjectUserId: row.subjectUserId, cadence: row.cadence, periodStart: row.periodStart };
      const result = await tx.reportingExpectation.createMany({ data: [{ ...key, periodEnd: row.periodEnd, dueAt: new Date(row.dueAt), reviewBy: new Date(row.reviewBy), calendarVersion: row.calendarVersion, reviewerUserId: row.reviewerUserId }], skipDuplicates: true });
      if (result.count) await recordReportingCommand(tx, { actorUserId: user.id, subjectId: `${row.subjectUserId}:${row.cadence}:${row.periodStart}`, action: "EXPECTATION_GENERATED", version: 1, key: `${organizationId}:${row.subjectUserId}:${row.cadence}:${row.periodStart}`, hash: hashEnterpriseCommand(row), reason: "Reporting obligation generated from the approved calendar and assignment.", result: { coveredDates: row.coveredDates, assignmentIds: row.assignmentIds, calendarVersion: row.calendarVersion } });
      created += result.count;
    }
    return { created };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 });
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
