import { reportCadences, validReportDate, type ReportCadence } from "./calendar";
import { reportDefinitions, type ReportDefinitionId } from "./contracts";

export type ReportingTab = "Overview" | "My Reports" | "Team Reports" | "Library";
export type ReportingNavigation = { tab: ReportingTab; date: string; cadence: ReportCadence; definition: ReportDefinitionId; location: string; subject: string; query: string; metric: string | null; from: string; to: string };
const tabs: ReportingTab[] = ["Overview", "My Reports", "Team Reports", "Library"];
function date(value: string | null, fallback = "") { try { return value ? validReportDate(value) : fallback; } catch { return fallback; } }
function bounded(value: string | null) { return value && value.length <= 200 ? value : ""; }
export function parseReportingNavigation(params: URLSearchParams, today: string, canReview: boolean): ReportingNavigation {
  const requested = params.get("tab") as ReportingTab;
  const tab = tabs.includes(requested) && (requested !== "Team Reports" || canReview) ? requested : "Overview";
  const frequency = params.get("cadence") as ReportCadence;
  const definition = params.get("definition") as ReportDefinitionId;
  let from = date(params.get("from")), to = date(params.get("to"));
  if (from && to && from > to) { from = ""; to = ""; }
  return { tab, date: date(params.get("date"), today), cadence: reportCadences.includes(frequency) ? frequency : "DAILY", definition: reportDefinitions.some(item => item.id === definition) ? definition : "operations", location: bounded(params.get("location")), subject: canReview ? bounded(params.get("subject")) : "", query: bounded(params.get("query")), metric: bounded(params.get("metric")) || null, from, to };
}
export function reportingNavigationUrl(state: ReportingNavigation) {
  const params = new URLSearchParams({ tab: state.tab, date: state.date, cadence: state.cadence, definition: state.definition });
  for (const key of ["location", "subject", "query", "metric", "from", "to"] as const) if (state[key]) params.set(key, state[key]);
  return `/reports?${params}`;
}
