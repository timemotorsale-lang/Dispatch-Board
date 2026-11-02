import { activePipelineRow, inPipelinePeriod, pipelineMidnight, type PipelineRow, type resolvePipelinePeriod } from "./crm-pipeline";
type Period = ReturnType<typeof resolvePipelinePeriod>;
export function previousPipelineRange(range: Period): Period {
  const start = new Date(`${range.startDate}T12:00:00Z`), end = new Date(`${range.endDate}T12:00:00Z`);
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  if (["this_month", "last_month"].includes(range.key)) { start.setUTCDate(1); start.setUTCMonth(start.getUTCMonth() - 1); }
  else start.setUTCDate(start.getUTCDate() - days);
  end.setTime(Date.parse(`${range.startDate}T12:00:00Z`) - 86400000);
  return { ...range, key: "custom", label: "Custom dates", startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10), start: pipelineMidnight(start.toISOString().slice(0, 10), range.timezone).toISOString(), endExclusive: range.start };
}
export function summarizePipeline(rows: PipelineRow[], range: Period) {
  const cohort = rows.filter(r => inPipelinePeriod(r.receivedAt, range));
  const sold = new Set(rows.filter(r => inPipelinePeriod(r.soldAt, range)).map(r => r.dealId ?? r.id)).size;
  const responses = cohort.flatMap(r => r.firstResponseAt && Date.parse(r.firstResponseAt) >= Date.parse(r.receivedAt) ? [(Date.parse(r.firstResponseAt) - Date.parse(r.receivedAt)) / 60000] : []);
  const appointments = [...new Map(rows.flatMap(r => r.appointments ?? []).map(p => [p.id, p])).values()].filter(p => inPipelinePeriod(p.startsAt, range));
  const groups = [...new Set(cohort.map(r => r.sourceCode))].map(source => { const records = cohort.filter(r => r.sourceCode === source); return { source, received: records.length, responded: records.filter(r => !!r.firstResponseAt).length, won: records.filter(r => r.stage === "WON").length, open: records.filter(activePipelineRow).length }; });
  return { received: cohort.length, sold, responded: responses.length, meanResponseMinutes: responses.length ? responses.reduce((a, b) => a + b, 0) / responses.length : null, appointments: appointments.length, noShows: appointments.filter(p => p.attendance === "NO_SHOW").length, planned: rows.filter(r => inPipelinePeriod(r.expectedCloseAt, range)).length, sources: groups };
}
