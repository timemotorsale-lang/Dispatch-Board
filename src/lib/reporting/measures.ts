import { weightedReportRate, type ReportDefinitionId, type ReportMetric, type ReportRow } from "./contracts";

export function reportMeasures(definition: ReportDefinitionId, rows: ReportRow[], now: Date): ReportMetric[] {
  const count = (code: string, label: string, predicate: (row: ReportRow) => boolean): ReportMetric => {
    const rowIds = rows.filter(predicate).map(row => row.id);
    return { code, label, value: rowIds.length, unit: "COUNT", rowIds };
  };
  const metrics = [count("records", "Displayed records", () => true)];
  if (definition === "inventory") {
    metrics.push(count("receipt-age-missing", "Receipt date missing", row => row.ageDays === undefined));
    for (const [lower, upper] of [[0, 30], [31, 60], [61, 90], [91, Infinity]]) {
      metrics.push(count(`receipt-age-${lower}`, upper === Infinity ? "Receipt age 91+ days" : `Receipt age ${lower}-${upper} days`, row => row.ageDays !== undefined && row.ageDays >= lower && row.ageDays <= upper));
    }
  } else if (definition === "operations" || definition === "reviews" || definition === "customers") {
    metrics.push(count("past-due", "Past due", row => row.state !== "COMPLETED" && !!row.occurredAt && new Date(row.occurredAt) < now));
  } else if (definition === "recon") {
    metrics.push(count("open-14-days", "Open 14+ calendar days", row => row.ageDays !== undefined && row.ageDays >= 14));
  } else if (definition === "claims") {
    metrics.push(count("created-30-days", "Created 30+ days ago", row => row.ageDays !== undefined && row.ageDays >= 30));
  } else if (definition === "appointments") {
    const outcomes = rows.filter(row => ["CHECKED_IN", "NO_SHOW"].includes(row.state));
    const checkedIn = outcomes.filter(row => row.state === "CHECKED_IN").length;
    const rate = weightedReportRate([{ numerator: checkedIn, denominator: outcomes.length }]);
    metrics.push({ code: "recorded-check-in-rate", label: "Check-in % of recorded outcomes", unit: "PERCENT", ...rate, value: rate.value === null ? null : Math.round(rate.value * 10) / 10, rowIds: outcomes.map(row => row.id) });
  } else if (definition === "attendance") {
    metrics.push(count("recorded-exceptions", "Recorded exception sessions", row => row.state === "EXCEPTION"));
    metrics.push(count("unclosed-sessions", "Unclosed sessions", row => ["OPEN", "ON_MEAL"].includes(row.state)));
  }
  const states = [...new Set(rows.map(row => row.state))].sort();
  metrics.push(...states.slice(0, 5).map(state => count(state, state.replaceAll("_", " "), row => row.state === state)));
  return metrics;
}
