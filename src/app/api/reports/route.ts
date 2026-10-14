import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/server/auth/current-user";
import { reportBusinessDate, reportCadences, validReportDate, type ReportCadence } from "@/lib/reporting/calendar";
import { reportDefinitions, type ReportDefinitionId } from "@/lib/reporting/contracts";
import { reportingCalendarPreview, reportingHistory, reportingPeople, reportingRevision, preparePeriodReport, savePeriodDraft, submitPeriodReport, reviewPeriodReport } from "@/server/reporting/period-service";
import { readLiveReport, reportingLocations } from "@/server/reporting/live-service";
import { reportingLibrary, saveReportingView, saveReportingSchedule, createReportingSnapshot, savedReportingSnapshots, reportingSnapshot, favoriteReportingView } from "@/server/reporting/library-service";
import { reportingExpectations, saveReportingCalendar, saveReportingAssignment, generateReportingExpectations, excuseReportingExpectation, previewReportingCalendar, loadReportingCalendar } from "@/server/reporting/calendar-service";
import { changeReportingSchedule, processReportingSchedules, reportingDelivery, recoverReportingJob } from "@/server/reporting/schedule-service";
import { reportingManagementCoverage } from "@/server/reporting/management-service";

const response = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
function cadence(value: unknown): ReportCadence {
  if (typeof value !== "string" || !reportCadences.includes(value as ReportCadence)) throw new Error("Report frequency is invalid.");
  return value as ReportCadence;
}
function definition(value: unknown): ReportDefinitionId {
  if (!reportDefinitions.some(item => item.id === value)) throw new Error("Report definition is invalid.");
  return value as ReportDefinitionId;
}
function text(value: unknown, limit = 10000) {
  if (typeof value !== "string" || value.length > limit) throw new Error("Report fields are invalid.");
  return value;
}
function version(value: unknown) {
  if (!Number.isInteger(value) || Number(value) < 0) throw new Error("Expected report version is invalid.");
  return Number(value);
}
function failure(error: unknown) {
  if (error instanceof SyntaxError) return response({ error: "Report request is invalid." }, 400);
  if (error instanceof Prisma.PrismaClientKnownRequestError) return response({ error: error.code === "P2025" ? "Report not found." : "Reporting data is temporarily unavailable." }, error.code === "P2025" ? 404 : 503);
  const message = error instanceof Error ? error.message : "Reporting is temporarily unavailable.";
  if (message === "Authentication required.") return response({ error: message }, 401);
  if (/permission|access|required to review|rollout|not enabled|own submission/.test(message)) return response({ error: message }, 403);
  if (/changed|reused|already.*reviewed/.test(message)) return response({ error: message }, 409);
  if (/invalid|must |requires|overlaps|Confirm |cannot |Start Day|Unavailable/.test(message)) return response({ error: message }, 422);
  return response({ error: "Reporting is temporarily unavailable. Your saved work has been retained." }, 503);
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return response({ error: "Authentication required." }, 401);
    const p = new URL(request.url).searchParams, view = p.get("view") ?? "live";
    const date = validReportDate(p.get("date") ?? reportBusinessDate(new Date())), frequency = cadence(p.get("cadence") ?? "DAILY");
    if (view === "prepare") return response(await preparePeriodReport(user, date, frequency, p.get("subject") ?? undefined));
    if (view === "coverage") return response(await reportingManagementCoverage(user, date, frequency, p.get("subject") ?? undefined));
    if (view === "history") {
      const from = p.get("from") ? validReportDate(p.get("from")!) : undefined, to = p.get("to") ? validReportDate(p.get("to")!) : undefined;
      if (from && to && from > to) throw new Error("Report range is invalid.");
      return response(await reportingHistory(user, { subjectUserId: p.get("subject") ?? undefined, cadence: p.has("cadence") ? frequency : undefined, from, to, team: p.get("team") === "true", cursor: p.get("cursor") ?? undefined }));
    }
    if (view === "revision") return response(await reportingRevision(user, text(p.get("id"), 200)));
    if (view === "library") return response({ ...await reportingLibrary(user), snapshots: await savedReportingSnapshots(user) });
    if (view === "expectations") return response(await reportingExpectations(user, p.get("team") === "true"));
    if (view === "delivery") return response(await reportingDelivery(user, text(p.get("id"), 200)));
    if (view === "snapshot") return response(await reportingSnapshot(user, text(p.get("id"), 200)));
    if (view === "settings") return response({ people: await reportingPeople(user), locations: await reportingLocations(user), calendar: reportingCalendarPreview(), calendarConfig: await loadReportingCalendar() });
    if (view !== "live") throw new Error("Report view is invalid.");
    return response(await readLiveReport(user, definition(p.get("definition") ?? "operations"), { locationId: p.get("location") || undefined, date, cadence: frequency }));
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    const originUrl = origin ? new URL(origin) : null;
    // Next may normalize request.url to localhost; Host retains the browser-facing authority.
    if (!originUrl || !["http:", "https:"].includes(originUrl.protocol) || originUrl.host !== (request.headers.get("host") ?? new URL(request.url).host) || request.headers.get("sec-fetch-site") === "cross-site") return response({ error: "Same-origin request required." }, 403);
    if (Number(request.headers.get("content-length") ?? 0) > 64000) return response({ error: "Report request is too large." }, 413);
    const user = await getCurrentUser();
    if (!user) return response({ error: "Authentication required." }, 401);
    const body = await request.text();
    if (new TextEncoder().encode(body).length > 64000) return response({ error: "Report request is too large." }, 413);
    const value: unknown = JSON.parse(body);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Report request is invalid.");
    const raw = value as Record<string, unknown>, action = text(raw.action, 40);
    if (action === "preview-calendar") return response(await previewReportingCalendar(user, { config: raw.config, from: validReportDate(text(raw.from, 10)), to: validReportDate(text(raw.to, 10)) }));
    if (action === "save-calendar") return response(await saveReportingCalendar(user, raw.config));
    if (action === "generate-expectations") return response(await generateReportingExpectations(user, validReportDate(text(raw.from, 10)), validReportDate(text(raw.to, 10))));
    if (action === "excuse") return response(await excuseReportingExpectation(user, text(raw.id, 200), text(raw.reason, 500)));
    if (action === "assignment") return response(await saveReportingAssignment(user, { subjectUserId: text(raw.subjectUserId, 200), reviewerUserId: text(raw.reviewerUserId, 200), cadence: cadence(raw.cadence), validFrom: validReportDate(text(raw.validFrom, 10)), ...(typeof raw.validTo === "string" && raw.validTo ? { validTo: validReportDate(raw.validTo) } : {}), ...(raw.dailyDueMinute !== undefined ? { dailyDueMinute: version(raw.dailyDueMinute) } : {}) }));
    if (action === "toggle-schedule") return response(await changeReportingSchedule(user, { id: text(raw.id, 200), enabled: raw.enabled === true, expectedVersion: version(raw.expectedVersion) }));
    if (action === "run-jobs") return response(await processReportingSchedules(user));
    if (action === "favorite-view") {
      if (typeof raw.favorite !== "boolean") throw new Error("Favorite preference is invalid.");
      return response(await favoriteReportingView(user, { id: text(raw.id, 200), favorite: raw.favorite, expectedVersion: version(raw.expectedVersion) }));
    }
    if (action === "recover-job") return response(await recoverReportingJob(user, { id: text(raw.id, 200), expectedVersion: version(raw.expectedVersion), reason: text(raw.reason, 500) }));
    if (action === "review") {
      if (raw.reviewAction !== "APPROVE" && raw.reviewAction !== "RETURN") throw new Error("Review action is invalid.");
      return response(await reviewPeriodReport(user, { revisionId: text(raw.revisionId, 200), action: raw.reviewAction, comment: text(raw.comment, 5000), expectedSeriesVersion: version(raw.expectedVersion) }));
    }
    const date = validReportDate(text(raw.date ?? reportBusinessDate(new Date()), 10)), frequency = cadence(raw.cadence ?? "DAILY");
    if (action === "save" || action === "submit") {
      const input = { date, cadence: frequency, context: text(raw.context), priorities: text(raw.priorities, 5000), expectedVersion: version(raw.expectedVersion) };
      return response(action === "save" ? await savePeriodDraft(user, input) : await submitPeriodReport(user, { ...input, accuracyConfirmed: raw.accuracyConfirmed === true, idempotencyKey: text(raw.idempotencyKey, 128) }));
    }
    const definitionId = definition(raw.definitionId);
    const filters = { query: raw.query === undefined ? "" : text(raw.query, 200), metric: raw.metric === undefined || raw.metric === null ? null : text(raw.metric, 200) };
    if (action === "save-view") return response(await saveReportingView(user, { ...filters, definitionId, name: text(raw.name, 100), date, cadence: frequency, locationId: typeof raw.locationId === "string" ? raw.locationId : undefined }));
    if (action === "schedule") return response(await saveReportingSchedule(user, { definitionId, cadence: frequency }));
    if (action === "snapshot" || action === "export") return response(await createReportingSnapshot(user, { ...filters, definitionId, date, cadence: frequency, locationId: typeof raw.locationId === "string" ? raw.locationId : undefined, reason: text(raw.reason, 500), idempotencyKey: text(raw.idempotencyKey, 128), exportRows: action === "export" }));
    throw new Error("Report action is invalid.");
  } catch (error) { return failure(error); }
}
