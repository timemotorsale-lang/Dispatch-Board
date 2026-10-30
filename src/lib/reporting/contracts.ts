import type { ReportCadence } from "./calendar";
export type ReportRow = { id: string; title: string; state: string; owner: string; href: string; occurredAt?: string; ageDays?: number; detail?: string };
export type ReportMetric = { code: string; label: string; value: number | null; unit: "COUNT" | "DAYS" | "PERCENT"; rowIds: string[]; numerator?: number; denominator?: number };
export type ReportResult = { definitionId: string; definitionVersion: string; generatedAt: string; quality: "COMPLETE" | "PARTIAL" | "UNAVAILABLE"; limitation: string | null; rows: ReportRow[]; metrics: ReportMetric[] };
export type PeriodContent = { version: string; cadence: ReportCadence; startDate: string; endDate: string; cutoffAt: string; completed: ReportRow[]; carryover: ReportRow[]; reopened?: ReportRow[]; plannedFocus?: ReportRow[]; handoffs?: ReportRow[]; sourceQuality?: "COMPLETE" | "PARTIAL" | "UNAVAILABLE"; activity: ReportRow[]; sourceCoverage: string; context: string; priorities: string };
export function uniqueReportRows(rows: ReportRow[]) { return [...new Map(rows.map(row => [row.id, row])).values()].sort((a, b) => a.id.localeCompare(b.id)); }
export function weightedReportRate(observations: { numerator: number; denominator: number }[]) {
  if (observations.some(row => !Number.isFinite(row.numerator) || !Number.isFinite(row.denominator) || row.numerator < 0 || row.denominator < row.numerator)) throw new Error("Invalid report numerator or denominator.");
  const numerator = observations.reduce((sum, row) => sum + row.numerator, 0), denominator = observations.reduce((sum, row) => sum + row.denominator, 0);
  return { numerator, denominator, value: denominator ? numerator / denominator * 100 : null };
}
export const reportDefinitions = [
  { id: "operations", title: "Daily operations", area: "Operations", question: "What needs attention?" },
  { id: "inventory", title: "Inventory aging", area: "Inventory", question: "Which vehicles need attention?" },
  { id: "recon", title: "Recon production", area: "Shop", question: "Where is work waiting?" },
  { id: "sales", title: "Sales pipeline", area: "Sales", question: "What is in the pipeline?" },
  { id: "customers", title: "Customer commitments", area: "Customers", question: "Which promises are outstanding?" },
  { id: "appointments", title: "Appointment outcomes", area: "Appointments", question: "What happened to scheduled visits?" },
  { id: "parts", title: "Parts delivery", area: "Parts", question: "Which orders are outstanding?" },
  { id: "claims", title: "Claims aging", area: "Claims", question: "Which claims need follow-up?" },
  { id: "documents", title: "Document readiness", area: "Documents", question: "Which packets need documents?" },
  { id: "attendance", title: "Attendance exceptions", area: "Attendance", question: "Which time entries need review?" },
  { id: "growth", title: "Growth outcomes", area: "Growth", question: "Which campaigns are producing outcomes?" },
  { id: "quality", title: "Diagnostics and quality", area: "Diagnostics", question: "Which cases need review?" },
  { id: "acquisition", title: "Acquisition and disposition", area: "Inventory", question: "Which acquisition cases need action?" },
  { id: "reviews", title: "Review backlog", area: "Management", question: "Which decisions are waiting?" }
] as const;
export type ReportDefinitionId = typeof reportDefinitions[number]["id"];
export function spreadsheetSafeValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  return /^[\s\u0000-\u001f]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
}
export function filterReportingResult(result: ReportResult, query = "", metric: string | null = null): ReportResult {
  if (query.length > 200 || (metric && metric.length > 200)) throw new Error("Report filters are invalid.");
  const measure = metric ? result.metrics.find(item => item.code === metric) : null;
  if (metric && !measure) throw new Error("Report measure is invalid.");
  const rows = result.rows.filter(row => (!measure || measure.rowIds.includes(row.id)) && `${row.title} ${row.owner} ${row.state}`.toLowerCase().includes(query.toLowerCase()));
  const ids = new Set(rows.map(row => row.id));
  return { ...result, rows, metrics: result.metrics.map(item => item.unit === "COUNT" ? { ...item, rowIds: item.rowIds.filter(id => ids.has(id)), value: item.rowIds.filter(id => ids.has(id)).length } : { ...item, value: null, rowIds: [], numerator: undefined, denominator: undefined }) };
}
