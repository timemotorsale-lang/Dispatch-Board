import { Prisma } from "@prisma/client";
import { draftReportCalendar, reportBusinessDate, resolveReportPeriod, type ReportCadence } from "@/lib/reporting/calendar";
import { type PeriodContent } from "@/lib/reporting/contracts";
import { reconcileReportTasks, type TaskObservation } from "@/lib/reporting/reconciliation";
import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { assertAuthenticatedUser, isGeneralManager } from "@/server/policies/access";
import { prisma } from "@/server/db/client";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";
import { submitDailyHandoff } from "@/server/services/daily-handoff";
import { recordReportingCommand } from "./command";
import { loadReportingCalendar } from "./calendar-service";
import { decodeReportingHistoryCursor, encodeReportingHistoryCursor } from "./history-cursor";

const organizationId = INITIAL_ORGANIZATION.id;
export function reportingSubject(actor: AuthenticatedUser | null, subjectUserId?: string) {
  const user = assertAuthenticatedUser(actor);
  if (!user.isActive) throw new Error("Reporting access is unavailable.");
  const subject = subjectUserId || user.id;
  if (subject !== user.id && !isGeneralManager(user)) throw new Error("You do not have permission to view this report.");
  return { user, subject };
}
export function assertReportingReview(actor: AuthenticatedUser | null, subjectId: string, submittedBy: string) {
  const user = assertAuthenticatedUser(actor);
  if (!user.isActive || !isGeneralManager(user)) throw new Error("General Manager access is required to review reports.");
  if (user.id === subjectId || user.id === submittedBy) throw new Error("You cannot review your own submission.");
  return user;
}
function writesEnabled() {
  if (process.env.REPORTING_WRITES_ENABLED !== "true") throw new Error("Report submission is not enabled for this rollout.");
}
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const array = (value: unknown) => Array.isArray(value) ? value.map(object) : [];
const pathwayLabel = (value: string) => value.split("-").filter(Boolean).map(word => word[0]?.toUpperCase() + word.slice(1)).join(" ");
function snapshotRows(value: unknown, owner: string, key: "completedTasks" | "carryover", boardDate: string): TaskObservation[] {
  return array(object(value)[key]).filter(row => typeof row.id === "string" && typeof row.title === "string").map(row => ({
    taskId: String(row.id), boardDate,
    parentTaskId: row.carryoverSourceTaskId === null || typeof row.carryoverSourceTaskId === "string" ? row.carryoverSourceTaskId : undefined,
    row: { id: `task:${row.id}`, title: String(row.title), state: key === "completedTasks" ? "COMPLETED" : String(row.status ?? "OPEN"),
    owner, href: `/tasks/${encodeURIComponent(String(row.id))}`, detail: typeof row.blockerReason === "string" ? row.blockerReason : undefined }
  }));
}
function json(value: unknown) { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }
async function identity(subjectUserId: string, cadence: ReportCadence, date: string) {
  const period = resolveReportPeriod(date, cadence, await loadReportingCalendar());
  return { period, key: { organizationId, subjectUserId, cadence, periodStart: period.startDate } };
}
function reviewState(reviews: { action: string }[], accepted: boolean) {
  return accepted ? "APPROVED" : reviews[0]?.action === "RETURN" ? "NEEDS_REVISION" : "SUBMITTED";
}

export async function preparePeriodReport(actor: AuthenticatedUser | null, date: string, cadence: ReportCadence, subjectUserId?: string, now = new Date()) {
  const { user, subject } = reportingSubject(actor, subjectUserId), { period, key } = await identity(subject, cadence, date);
  const person = await prisma.user.findUniqueOrThrow({ where: { id: subject }, select: { id: true, name: true } });
  const [days, series, updates, workbookSignals, dealDrafts, expectation] = await Promise.all([
    prisma.staffDay.findMany({ where: { userId: subject, boardDay: { date: { gte: new Date(`${period.startDate}T00:00:00Z`), lt: new Date(`${period.endDate}T00:00:00Z`) } } }, include: { boardDay: { select: { date: true } }, dailyReports: { orderBy: { version: "desc" }, take: 1 } }, orderBy: { boardDay: { date: "asc" } } }),
    prisma.reportingSeries.findUnique({ where: { organizationId_subjectUserId_cadence_periodStart: key }, include: { revisions: { orderBy: { version: "desc" }, take: 1, include: { reviews: { orderBy: { createdAt: "desc" }, take: 1 } } } } }),
    prisma.workdayQuickUpdate.findMany({ where: { workbook: { userId: subject, boardDay: { date: { gte: new Date(`${period.startDate}T00:00:00Z`), lt: new Date(`${period.endDate}T00:00:00Z`) } } } }, orderBy: { createdAt: "asc" }, take: 500 }),
    prisma.workdayActivitySignal.findMany({ where: { actorUserId: subject, occurredAt: { gte: period.startsAt, lt: period.endsAt }, OR: [{ reportRelevant: true }, { actionType: "workbook.rhythm_start_confirmed" }] }, select: { id: true, actionType: true, businessImpact: true, metadata: true, occurredAt: true }, orderBy: [{ occurredAt: "asc" }, { id: "asc" }], take: 501 }),
    prisma.dealDeskDraft.findMany({ where: { organizationId, ownerUserId: subject, updatedAt: { gte: period.startsAt, lt: period.endsAt } }, select: { id: true, customerName: true, pathway: true, vehicleReference: true, status: true, updatedAt: true }, orderBy: [{ updatedAt: "asc" }, { id: "asc" }], take: 501 }),
    prisma.reportingExpectation.findUnique({ where: { organizationId_subjectUserId_cadence_periodStart: key } })
  ]);
  if (workbookSignals.length > 500 || dealDrafts.length > 500) throw new Error("Report preparation requires a narrower period scope.");
  const observations: TaskObservation[] = [];
  let coverage = 0;
  for (const day of days) {
    const report = day.dailyReports[0];
    if (!report) continue;
    coverage++;
    const boardDate = day.boardDay.date.toISOString().slice(0, 10);
    observations.push(...snapshotRows(report.sourceSnapshot, person.name, "completedTasks", boardDate), ...snapshotRows(report.sourceSnapshot, person.name, "carryover", boardDate));
  }
  const currentDate = reportBusinessDate(now, period.timezone);
  let currentTasksTruncated = false;
  if (period.startDate <= currentDate && period.endDate > currentDate) {
    const tasks = await prisma.task.findMany({ where: { assignedUserId: subject, boardDay: { date: new Date(`${currentDate}T00:00:00Z`) } }, select: { id: true, title: true, status: true, blockerReason: true, carryoverSourceTaskId: true }, orderBy: { id: "asc" }, take: 1001 });
    currentTasksTruncated = tasks.length > 1000;
    observations.push(...tasks.slice(0, 1000).map(task => ({ taskId: task.id, parentTaskId: task.carryoverSourceTaskId, boardDate: currentDate,
      row: { id: `task:${task.id}`, title: task.title, state: task.status, owner: person.name, href: `/tasks/${encodeURIComponent(task.id)}`, detail: task.blockerReason ?? undefined } })));
  }
  const draft = object(series?.draft);
  const reconciled = reconcileReportTasks(observations);
  const content: PeriodContent = {
    version: "period-content/v2", cadence, startDate: period.startDate, endDate: period.endDate, cutoffAt: now.toISOString(),
    completed: reconciled.completed, carryover: reconciled.carryover, reopened: reconciled.reopened,
    activity: [...updates.map(update => ({ id: `update:${update.id}`, title: update.text, state: update.followUpNeeded ? "FOLLOW_UP" : "UPDATE", owner: person.name, href: `/vehicles/coo-workbook?date=${period.startDate}`, occurredAt: update.createdAt.toISOString() })),
      ...workbookSignals.map(signal => {
        const metadata = object(signal.metadata);
        const href = typeof metadata.sourcePath === "string" && metadata.sourcePath.startsWith("/") && !metadata.sourcePath.startsWith("//") ? metadata.sourcePath : `/vehicles/coo-workbook?date=${period.startDate}`;
        return { id: `workbook-signal:${signal.id}`, title: signal.businessImpact || signal.actionType.replace(/[._]/g, " "), state: signal.actionType === "workbook.rhythm_start_confirmed" ? "STARTED_DAY" : "ACTIVITY", owner: person.name, href, occurredAt: signal.occurredAt.toISOString() };
      }),
      ...dealDrafts.map(draft => ({ id: `deal-draft:${draft.id}`, title: `${draft.customerName} - ${pathwayLabel(draft.pathway)}`, state: draft.status, owner: person.name, href: `/crm-next/deals/start?draft=${encodeURIComponent(draft.id)}`, occurredAt: draft.updatedAt.toISOString(), detail: draft.vehicleReference || undefined }))],
    sourceCoverage: `${coverage} of ${days.length} recorded staff days have submitted snapshots. Work is counted by its last observed state; outstanding items remain until a later observed completion. Reopened work is included in carryover, not an additional total. Current-day tasks are current state; earlier unsaved outcomes are not reconstructed. Start Day confirmations, report-relevant workbook signals, and saved deal drafts updated in the covered period are included as activity evidence. ${reconciled.unresolvedLineageCount} task identities have incomplete or conflicting carryover links and may not be fully consolidated. This is not a historical end-of-period certification.${currentTasksTruncated ? " Current-day evidence is limited to 1,000 tasks." : ""}`,
    context: typeof draft.context === "string" ? draft.context : "", priorities: typeof draft.priorities === "string" ? draft.priorities : ""
  };
  return { subject: person, content, seriesId: series?.id ?? null, draftVersion: series?.version ?? 0,
    dueAt: (expectation?.dueAt ?? period.dueAt).toISOString(), calendarVersion: period.calendarVersion,
    expectation: expectation?.disposition ?? "OPTIONAL", calendar: period.calendarVersion.includes("draft") ? "DRAFT" : "ACTIVE",
    writesEnabled: process.env.REPORTING_WRITES_ENABLED === "true" && subject === user.id,
    latest: series?.revisions[0] ? { id: series.revisions[0].id, version: series.revisions[0].version, status: reviewState(series.revisions[0].reviews, series.acceptedRevisionId === series.revisions[0].id) } : null };
}

export async function savePeriodDraft(actor: AuthenticatedUser | null, input: { date: string; cadence: ReportCadence; context: string; priorities: string; expectedVersion: number }) {
  writesEnabled();
  const { user, subject } = reportingSubject(actor), { key, period } = await identity(subject, input.cadence, input.date);
  if (input.context.length > 10000 || input.priorities.length > 5000 || !Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) throw new Error("Report draft fields are invalid.");
  return prisma.$transaction(async tx => {
    const series = await tx.reportingSeries.upsert({ where: { organizationId_subjectUserId_cadence_periodStart: key }, update: {}, create: { ...key, subjectName: user.name, periodEnd: period.endDate, timezone: period.timezone, calendarVersion: period.calendarVersion } });
    const changed = await tx.reportingSeries.updateMany({ where: { id: series.id, version: input.expectedVersion }, data: { draft: { context: input.context, priorities: input.priorities }, version: { increment: 1 } } });
    if (changed.count !== 1) throw new Error("Report draft changed. Reload before saving.");
    return { seriesId: series.id, version: input.expectedVersion + 1 };
  });
}

export async function submitPeriodReport(actor: AuthenticatedUser | null, input: { date: string; cadence: ReportCadence; context: string; priorities: string; expectedVersion: number; idempotencyKey: string; accuracyConfirmed: boolean }) {
  writesEnabled();
  const { user, subject } = reportingSubject(actor);
  if (!input.accuracyConfirmed) throw new Error("Confirm this report is accurate before submitting.");
  if (input.context.length > 10000 || input.priorities.length > 5000 || !/^[a-zA-Z0-9_-]{16,128}$/.test(input.idempotencyKey)) throw new Error("Report submission fields are invalid.");
  const { key, period } = await identity(subject, input.cadence, input.date);
  if (period.startDate > reportBusinessDate(new Date())) throw new Error("Future reports cannot be submitted.");
  if (input.cadence === "DAILY") {
    // Preserve the existing Start Day, rollout, accuracy and carryover policy.
    const report = await submitDailyHandoff(user, input.date, { accuracyConfirmed: true, additionalContext: input.context, tomorrowFollowUp: input.priorities, idempotencyKey: input.idempotencyKey, expectedDraftVersion: input.expectedVersion });
    const linked = await prisma.reportingRevision.findUniqueOrThrow({ where: { legacyDailyId: report.id } });
    return { id: linked.id, version: linked.version };
  }
  const prepared = await preparePeriodReport(user, input.date, input.cadence);
  const content = { ...prepared.content, context: input.context, priorities: input.priorities };
  const requestHash = hashEnterpriseCommand({ subject, cadence: input.cadence, startDate: period.startDate, context: input.context, priorities: input.priorities, accuracyConfirmed: input.accuracyConfirmed });
  return prisma.$transaction(async tx => {
    const series = await tx.reportingSeries.upsert({ where: { organizationId_subjectUserId_cadence_periodStart: key }, update: {}, create: { ...key, subjectName: user.name, periodEnd: period.endDate, timezone: period.timezone, calendarVersion: period.calendarVersion } });
    await tx.$queryRaw`SELECT id FROM "ReportingSeries" WHERE id = ${series.id} FOR UPDATE`;
    const duplicate = await tx.reportingRevision.findUnique({ where: { seriesId_idempotencyKey: { seriesId: series.id, idempotencyKey: input.idempotencyKey } } });
    if (duplicate) {
      if (duplicate.requestHash !== requestHash) throw new Error("Submission key was reused with different content.");
      return { id: duplicate.id, version: duplicate.version };
    }
    const current = await tx.reportingSeries.findUniqueOrThrow({ where: { id: series.id } });
    if (current.version !== input.expectedVersion) throw new Error("Report draft changed. Reload before submitting.");
    const latest = await tx.reportingRevision.aggregate({ where: { seriesId: series.id }, _max: { version: true } });
    const revision = await tx.reportingRevision.create({ data: { seriesId: series.id, version: (latest._max.version ?? 0) + 1, submittedByUserId: user.id, idempotencyKey: input.idempotencyKey, requestHash, content: json(content) } });
    await tx.reportingSeries.update({ where: { id: series.id }, data: { version: { increment: 1 }, draft: Prisma.DbNull } });
    await recordReportingCommand(tx, { actorUserId: user.id, subjectId: revision.id, action: "PERIOD_SUBMITTED", version: revision.version, key: `${series.id}:${input.idempotencyKey}`, hash: requestHash, reason: "Staff confirmed the covered period report.", result: { reportId: revision.id } });
    return { id: revision.id, version: revision.version };
  }, { timeout: 15000 });
}

export async function reviewPeriodReport(actor: AuthenticatedUser | null, input: { revisionId: string; action: "APPROVE" | "RETURN"; comment: string; expectedSeriesVersion: number }) {
  writesEnabled();
  const user = assertAuthenticatedUser(actor);
  if (!isGeneralManager(user)) throw new Error("General Manager access is required to review reports.");
  if (!['APPROVE', 'RETURN'].includes(input.action) || input.comment.length > 5000 || (input.action === "RETURN" && input.comment.trim().length < 10)) throw new Error("Return requires a comment of at least 10 characters.");
  return prisma.$transaction(async tx => {
    const revision = await tx.reportingRevision.findFirstOrThrow({ where: { id: input.revisionId, series: { organizationId } }, include: { series: true, reviews: { orderBy: { createdAt: "desc" }, take: 1 } } });
    assertReportingReview(user, revision.series.subjectUserId, revision.submittedByUserId);
    const expectation = await tx.reportingExpectation.findUnique({ where: { organizationId_subjectUserId_cadence_periodStart: { organizationId, subjectUserId: revision.series.subjectUserId, cadence: revision.series.cadence, periodStart: revision.series.periodStart } } });
    if (expectation && expectation.reviewerUserId !== user.id) throw new Error("Assigned reviewer access is required to review this report.");
    const latest = await tx.reportingRevision.findFirstOrThrow({ where: { seriesId: revision.seriesId }, orderBy: { version: "desc" } });
    if (latest.id !== revision.id || revision.reviews.length) throw new Error("This revision has already changed or been reviewed.");
    const changed = await tx.reportingSeries.updateMany({ where: { id: revision.seriesId, version: input.expectedSeriesVersion }, data: { version: { increment: 1 } } });
    if (changed.count !== 1) throw new Error("Report changed. Reload before reviewing.");
    const review = await tx.reportingReview.create({ data: { revisionId: revision.id, actorUserId: user.id, action: input.action, comment: input.comment.trim() } });
    if (input.action === "APPROVE") await tx.reportingSeries.update({ where: { id: revision.seriesId }, data: { acceptedRevisionId: revision.id } });
    await recordReportingCommand(tx, { actorUserId: user.id, subjectId: revision.id, action: `REPORT_${input.action}`, version: input.expectedSeriesVersion + 1, key: review.id, hash: hashEnterpriseCommand(input), reason: input.comment || "Manager reviewed the submitted evidence.", result: { reviewId: review.id } });
    return { id: review.id };
  });
}

export async function reportingHistory(actor: AuthenticatedUser | null, input: { subjectUserId?: string; cadence?: ReportCadence; from?: string; to?: string; team?: boolean; cursor?: string } = {}) {
  const { user, subject } = reportingSubject(actor, input.subjectUserId);
  if (input.team && !isGeneralManager(user)) throw new Error("General Manager access is required for team reports.");
  const subjectWhere = input.team && !input.subjectUserId ? {} : { subjectUserId: subject };
  const scope = hashEnterpriseCommand({ actor: user.id, subject: input.team && !input.subjectUserId ? null : subject, team: input.team === true, cadence: input.cadence ?? null, from: input.from ?? null, to: input.to ?? null });
  const cursor = decodeReportingHistoryCursor(input.cursor, scope);
  const series = cursor?.seriesDone ? [] : await prisma.reportingSeries.findMany({ where: { organizationId, ...subjectWhere, ...(input.cadence ? { cadence: input.cadence } : {}), ...(input.from || input.to ? { periodStart: { ...(input.from ? { gte: input.from } : {}), ...(input.to ? { lte: input.to } : {}) } } : {}) },
    orderBy: [{ periodStart: "desc" }, { id: "asc" }], take: 51, ...(cursor?.series ? { cursor: { id: cursor.series }, skip: 1 } : {}),
    include: { revisions: { orderBy: { version: "desc" }, take: 1, include: { reviews: { orderBy: { createdAt: "desc" }, take: 1 } } } } });
  const rows = series.slice(0, 50).map(item => ({ id: item.id, subject: item.subjectName, subjectUserId: item.subjectUserId, cadence: item.cadence, periodStart: item.periodStart, periodEnd: item.periodEnd, version: item.version,
    revisionId: item.acceptedRevisionId ?? item.revisions[0]?.id ?? null,
    latestRevisionId: item.revisions[0]?.id ?? null,
    status: item.revisions[0] ? reviewState(item.revisions[0].reviews, item.acceptedRevisionId === item.revisions[0].id) : "DRAFT", submittedAt: item.revisions[0]?.submittedAt.toISOString() ?? null }));
  const legacy = !cursor?.legacyDone && (!input.cadence || input.cadence === "DAILY") ? await prisma.staffDailyReport.findMany({ where: { reportingRevision: null, staffDay: { ...(input.team && !input.subjectUserId ? {} : { userId: subject }), ...(input.from || input.to ? { boardDay: { date: { ...(input.from ? { gte: new Date(`${input.from}T00:00:00Z`) } : {}), ...(input.to ? { lte: new Date(`${input.to}T00:00:00Z`) } : {}) } } } : {}) } }, orderBy: [{ submittedAt: "desc" }, { id: "asc" }], take: 51, ...(cursor?.legacy ? { cursor: { id: cursor.legacy }, skip: 1 } : {}), include: { staffDay: { include: { user: { select: { name: true } }, boardDay: { select: { date: true } } } } } }) : [];
  const nextCursor = series.length > 50 || legacy.length > 50 ? encodeReportingHistoryCursor({ version: 1, scope, series: series[49]?.id ?? cursor?.series ?? null, legacy: legacy[49]?.id ?? cursor?.legacy ?? null, seriesDone: series.length <= 50, legacyDone: legacy.length <= 50 }) : null;
  return { rows, legacy: legacy.slice(0, 50).map(item => ({ id: `legacy:${item.id}`, subject: item.staffDay.user.name, subjectUserId: item.staffDay.userId, cadence: "DAILY", periodStart: item.staffDay.boardDay.date.toISOString().slice(0, 10), periodEnd: "", version: item.version, revisionId: `legacy:${item.id}`, latestRevisionId: `legacy:${item.id}`, status: "SUBMITTED", submittedAt: item.submittedAt.toISOString() })), nextCursor, canReview: isGeneralManager(user) };
}

export async function reportingRevision(actor: AuthenticatedUser | null, id: string) {
  const user = assertAuthenticatedUser(actor);
  if (id.startsWith("legacy:")) {
    const legacy = await prisma.staffDailyReport.findUniqueOrThrow({ where: { id: id.slice(7) }, include: { staffDay: { include: { user: { select: { name: true } }, boardDay: { select: { date: true } } } } } });
    reportingSubject(user, legacy.staffDay.userId);
    return { id, subject: legacy.staffDay.user.name, subjectUserId: legacy.staffDay.userId, cadence: "DAILY", periodStart: legacy.staffDay.boardDay.date.toISOString().slice(0, 10), version: legacy.version, seriesVersion: 0, status: "SUBMITTED", content: { snapshot: legacy.sourceSnapshot, context: legacy.additionalContext, priorities: legacy.tomorrowFollowUp }, reviews: [], revisions: [], canReview: false };
  }
  const revision = await prisma.reportingRevision.findFirstOrThrow({ where: { id, series: { organizationId, ...(isGeneralManager(user) ? {} : { subjectUserId: user.id }) } }, include: { series: { include: { revisions: { orderBy: { version: "desc" }, select: { id: true, version: true, submittedAt: true }, take: 100 } } }, legacyDaily: true, reviews: { orderBy: { createdAt: "desc" } } } });
  reportingSubject(user, revision.series.subjectUserId);
  const expectation = await prisma.reportingExpectation.findUnique({ where: { organizationId_subjectUserId_cadence_periodStart: { organizationId, subjectUserId: revision.series.subjectUserId, cadence: revision.series.cadence, periodStart: revision.series.periodStart } } });
  return { id, subject: revision.series.subjectName, subjectUserId: revision.series.subjectUserId, cadence: revision.series.cadence, periodStart: revision.series.periodStart, version: revision.version, seriesVersion: revision.series.version,
    status: reviewState(revision.reviews, revision.series.acceptedRevisionId === id),
    content: revision.legacyDaily ? { snapshot: revision.legacyDaily.sourceSnapshot, context: revision.legacyDaily.additionalContext, priorities: revision.legacyDaily.tomorrowFollowUp } : revision.content,
    reviews: revision.reviews.map(review => ({ action: review.action, comment: review.comment, createdAt: review.createdAt.toISOString() })), revisions: revision.series.revisions.map(item => ({ id: item.id, version: item.version, submittedAt: item.submittedAt.toISOString() })),
    canReview: process.env.REPORTING_WRITES_ENABLED === "true" && isGeneralManager(user) && (!expectation || expectation.reviewerUserId === user.id) && user.id !== revision.series.subjectUserId && user.id !== revision.submittedByUserId && !revision.reviews.length && revision.series.revisions[0]?.id === id };
}

export async function reportingPeople(actor: AuthenticatedUser | null) {
  const user = assertAuthenticatedUser(actor);
  if (!isGeneralManager(user)) return [{ id: user.id, name: user.name }];
  return prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true }, take: 500 });
}

export const reportingCalendarPreview = () => ({ ...draftReportCalendar, status: "DRAFT", obligationsEnabled: false });
