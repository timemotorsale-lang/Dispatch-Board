/** Governed reporting facts and analytics for M10 (VEH-130–132).
 * Pure functions keep the read model deterministic and suitable for a daily job,
 * API projection, or warehouse adapter. Inputs are tenant-scoped by callers.
 */

export type MetricFact = {
  tenantId: string;
  metric: string;
  day: string; // ISO date, UTC
  value: number;
  dimensions?: Record<string, string>;
  source: string;
  definitionVersion: string;
};

export type MetricObservation = Omit<MetricFact, "value"> & { numerator?: number; denominator?: number; value?: number };

const finite = (n: number) => Number.isFinite(n) ? n : 0;

/** Materialize observations into immutable, auditable daily facts. */
export function materializeDailyFacts(observations: MetricObservation[], now = new Date()): MetricFact[] {
  const today = now.toISOString().slice(0, 10);
  return observations.map((o) => {
    const value = o.value ?? (o.denominator && o.denominator !== 0 ? (o.numerator ?? 0) / o.denominator : 0);
    if (!o.tenantId || !o.metric || !o.source || !o.definitionVersion) throw new Error("metric fact requires tenant, metric, source, and definition version");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(o.day) || o.day > today) throw new Error("metric fact day must be a valid non-future ISO date");
    return Object.freeze({ tenantId: o.tenantId, metric: o.metric, day: o.day, value: finite(value), dimensions: o.dimensions ? { ...o.dimensions } : undefined, source: o.source, definitionVersion: o.definitionVersion });
  });
}

export type Scorecard = { tenantId: string; period: { from: string; to: string }; metrics: Record<string, { value: number; count: number; sourceVersions: string[] }>; generatedAt: string };

export function buildScorecard(facts: MetricFact[], tenantId: string, from: string, to: string): Scorecard {
  if (from > to) throw new Error("scorecard period is inverted");
  const scoped = facts.filter((f) => f.tenantId === tenantId && f.day >= from && f.day <= to);
  const grouped = new Map<string, MetricFact[]>();
  for (const fact of scoped) grouped.set(fact.metric, [...(grouped.get(fact.metric) ?? []), fact]);
  const metrics: Scorecard["metrics"] = {};
  for (const [metric, rows] of grouped) metrics[metric] = { value: rows.reduce((s, r) => s + r.value, 0) / rows.length, count: rows.length, sourceVersions: [...new Set(rows.map((r) => r.definitionVersion))] };
  return { tenantId, period: { from, to }, metrics, generatedAt: new Date().toISOString() };
}

export type Bottleneck = { key: string; count: number; averageAgeHours: number; share: number };
export function findBottlenecks(rows: Array<{ stage: string; ageHours: number; blocked?: boolean }>, limit = 10): Bottleneck[] {
  const groups = new Map<string, number[]>();
  rows.filter((r) => r.blocked !== false).forEach((r) => groups.set(r.stage, [...(groups.get(r.stage) ?? []), Math.max(0, r.ageHours)]));
  return [...groups.entries()].map(([key, ages]) => ({ key, count: ages.length, averageAgeHours: ages.reduce((a, b) => a + b, 0) / ages.length, share: rows.length ? ages.length / rows.length : 0 })).sort((a, b) => b.count - a.count || b.averageAgeHours - a.averageAgeHours).slice(0, limit);
}

export function cohortAverages<T extends { cohort: string }>(rows: Array<T & Record<string, unknown>>, field: string) {
  const groups = new Map<string, number[]>();
  for (const row of rows) { const value = row[field]; if (typeof value === "number" && Number.isFinite(value)) groups.set(row.cohort, [...(groups.get(row.cohort) ?? []), value]); }
  return [...groups.entries()].map(([cohort, values]) => ({ cohort, average: values.reduce((a, b) => a + b, 0) / values.length, count: values.length }));
}

