import { randomUUID } from "node:crypto";
import { reportDefinitions, spreadsheetSafeValue, filterReportingResult, type ReportDefinitionId } from "@/lib/reporting/contracts";
import { resolveReportPeriod, reportBusinessDate, type ReportCadence } from "@/lib/reporting/calendar";
import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser, isGeneralManager } from "@/server/policies/access";
import { prisma } from "@/server/db/client";
import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { createGovernanceOperationsRepository } from "@/server/governance-operations/repository";
import { readLiveReport } from "./live-service";
import { recordReportingCommand } from "./command";
import { Prisma } from "@prisma/client";

function viewPreferences(value: Prisma.JsonValue) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Saved report view is invalid.");
  return { filters: value, favorite: value.favorite === true, version: typeof value.favoriteVersion === "number" && Number.isSafeInteger(value.favoriteVersion) && value.favoriteVersion >= 0 ? value.favoriteVersion : 0 };
}

export async function reportingLibrary(actor: AuthenticatedUser | null) {
  const user = assertAuthenticatedUser(actor);
  const [views, schedules] = await Promise.all([
    prisma.reportingSavedView.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.reportingSchedule.findMany({ where: { userId: user.id }, include: { jobs: { orderBy: { createdAt: "desc" }, take: 5 } }, orderBy: { createdAt: "desc" }, take: 100 })
  ]);
  const orderedViews = views.map(view => ({ ...view, favorite: viewPreferences(view.filters).favorite, favoriteVersion: viewPreferences(view.filters).version })).sort((a, b) => Number(b.favorite) - Number(a.favorite));
  return { definitions: reportDefinitions.filter(item => isGeneralManager(user) || ["operations", "reviews"].includes(item.id)), views: orderedViews,
    schedules: schedules.map(schedule => ({ ...schedule, nextRunAt: schedule.nextRunAt.toISOString(), createdAt: schedule.createdAt.toISOString(), jobs: schedule.jobs.map(job => ({ id: job.id, status: job.status, lastError: job.lastError, createdAt: job.createdAt.toISOString() })) })) };
}

export async function saveReportingView(actor: AuthenticatedUser | null, input: { name: string; definitionId: ReportDefinitionId; locationId?: string; date: string; cadence: ReportCadence; query?: string; metric?: string | null }) {
  const user = assertAuthenticatedUser(actor);
  if (!input.name.trim() || input.name.length > 100) throw new Error("Report view name is invalid.");
  filterReportingResult(await readLiveReport(user, input.definitionId, input), input.query, input.metric);
  return prisma.reportingSavedView.create({ data: { userId: user.id, name: input.name.trim(), definitionId: input.definitionId, filters: { locationId: input.locationId ?? "", date: input.date, cadence: input.cadence, query: input.query ?? "", metric: input.metric ?? null } } });
}

export async function favoriteReportingView(actor: AuthenticatedUser | null, input: { id: string; favorite: boolean; expectedVersion: number }) {
  const user = assertAuthenticatedUser(actor);
  if (!user.isActive) throw new Error("Reporting access is unavailable.");
  if (!Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 0) throw new Error("Saved view version is invalid.");
  const view = await prisma.reportingSavedView.findFirstOrThrow({ where: { id: input.id, userId: user.id } });
  const preference = viewPreferences(view.filters);
  await readLiveReport(user, view.definitionId as ReportDefinitionId, { locationId: typeof preference.filters.locationId === "string" ? preference.filters.locationId || undefined : undefined });
  if (preference.version === input.expectedVersion + 1 && preference.favorite === input.favorite) return { id: view.id, version: preference.version, duplicate: true };
  if (preference.version !== input.expectedVersion) throw new Error("Saved view changed. Reload before saving.");
  return prisma.$transaction(async tx => {
    const filters = { ...preference.filters, favorite: input.favorite, favoriteVersion: preference.version + 1 };
    const changed = await tx.reportingSavedView.updateMany({ where: { id: view.id, userId: user.id, filters: { equals: view.filters as Prisma.InputJsonValue } }, data: { filters } });
    if (changed.count !== 1) throw new Error("Saved view changed. Reload before saving.");
    await recordReportingCommand(tx, { actorUserId: user.id, subjectId: view.id, action: "VIEW_FAVORITE_CHANGED", version: preference.version + 1, key: `${view.id}:favorite:${preference.version}`, hash: hashEnterpriseCommand(input), reason: "Personal report favorite preference updated.", result: { viewId: view.id, favorite: input.favorite } });
    return { id: view.id, version: preference.version + 1, duplicate: false };
  });
}

export async function createReportingSnapshot(actor: AuthenticatedUser | null, input: { definitionId: ReportDefinitionId; locationId?: string; date: string; cadence: ReportCadence; reason: string; idempotencyKey: string; exportRows?: boolean; query?: string; metric?: string | null }) {
  const user = assertAuthenticatedUser(actor);
  if (!isGeneralManager(user)) throw new Error("General Manager access is required for controlled report outputs.");
  if (input.reason.trim().length < 20 || input.reason.length > 500) throw new Error("Output reason must be at least 20 characters and no more than 500.");
  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(input.idempotencyKey)) throw new Error("Output idempotency key is invalid.");
  const result = filterReportingResult(await readLiveReport(user, input.definitionId, input), input.query, input.metric);
  if (result.quality === "UNAVAILABLE") throw new Error("Unavailable reports cannot be published.");
  const id = randomUUID(), fields = ["id", "title", "state", "owner", "ageDays", "detail"];
  const output = input.exportRows ? { resource: "REPORTING_CONSOLE", fields, rows: result.rows.map(row => Object.fromEntries(fields.map(field => [field, spreadsheetSafeValue(row[field as keyof typeof row] ?? null)]))) } : result;
  const created = await createGovernanceOperationsRepository().create({ id, organizationId: INITIAL_ORGANIZATION.id, locationId: input.locationId, recordType: input.exportRows ? "CONTROLLED_EXPORT" : "REPORT_SNAPSHOT", status: input.exportRows ? "READY" : "FINAL", subjectType: "REPORTING_CONSOLE", subjectId: input.definitionId, ownerUserId: user.id, requestedByUserId: user.id, idempotencyKey: input.idempotencyKey,
    requestHash: hashEnterpriseCommand({ ...input, requestedByUserId: user.id }), reason: input.reason.trim(),
    scopeSnapshot: { definitionId: input.definitionId, definitionVersion: result.definitionVersion, locationId: input.locationId ?? null, date: input.date, cadence: input.cadence, query: input.query ?? "", metric: input.metric ?? null, cutoffAt: result.generatedAt, quality: result.quality, limitation: result.limitation, fields, rowLimit: 500 },
    resultSnapshot: output,
    contentHash: hashEnterpriseCommand(output), watermark: `INTERNAL | ${user.id} | ${result.generatedAt} | ${id}`, rowCount: result.rows.length,
    ...(input.exportRows ? { expiresAt: new Date(Date.now() + 86_400_000) } : {}), correlationId: randomUUID() });
  return { id: created.record.id, duplicate: created.duplicate };
}

export async function savedReportingSnapshots(actor: AuthenticatedUser | null) {
  const user = assertAuthenticatedUser(actor);
  if (!isGeneralManager(user)) return [];
  const records = await prisma.inventoryGovernanceRecord.findMany({ where: { organizationId: INITIAL_ORGANIZATION.id, subjectType: "REPORTING_CONSOLE", requestedByUserId: user.id }, select: { id: true, recordType: true, subjectId: true, createdAt: true, scopeSnapshot: true, expiresAt: true }, orderBy: { createdAt: "desc" }, take: 50 });
  const permitted = [];
  for (const record of records) {
    const scope = record.scopeSnapshot as Record<string, unknown>;
    try { await readLiveReport(user, record.subjectId as ReportDefinitionId, { locationId: typeof scope.locationId === "string" ? scope.locationId : undefined }); permitted.push(record); }
    catch { /* Revoked sources are omitted from retrieval suggestions. */ }
  }
  return permitted;
}

export async function reportingSnapshot(actor: AuthenticatedUser | null, id: string) {
  const user = assertAuthenticatedUser(actor);
  if (!isGeneralManager(user)) throw new Error("General Manager access is required for report snapshots.");
  const record = await prisma.inventoryGovernanceRecord.findFirstOrThrow({ where: { id, organizationId: INITIAL_ORGANIZATION.id, requestedByUserId: user.id, subjectType: "REPORTING_CONSOLE", recordType: "REPORT_SNAPSHOT" } });
  const scope = record.scopeSnapshot as Record<string, unknown>;
  await readLiveReport(user, record.subjectId as ReportDefinitionId, { locationId: typeof scope.locationId === "string" ? scope.locationId : undefined });
  return record.resultSnapshot;
}

export async function saveReportingSchedule(actor: AuthenticatedUser | null, input: { definitionId: ReportDefinitionId; cadence: ReportCadence }) {
  const user = assertAuthenticatedUser(actor);
  await readLiveReport(user, input.definitionId);
  const period = resolveReportPeriod(reportBusinessDate(new Date()), input.cadence);
  return prisma.reportingSchedule.create({ data: { userId: user.id, definitionId: input.definitionId, cadence: input.cadence, timezone: period.timezone, nextRunAt: period.endsAt, enabled: false } });
}
