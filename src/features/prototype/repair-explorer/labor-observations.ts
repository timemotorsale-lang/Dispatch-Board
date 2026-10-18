export type LaborObservation = {
  operationId: string;
  jobReference: string;
  configuration: string;
  completedOn: string;
  hours: number;
  source: "TECHNICIAN_REPORTED";
  scopeConfirmed: true;
};

export const configurationKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

export function validObservation(value: unknown): value is LaborObservation {
  if (!value || typeof value !== "object") return false;
  const record = value as LaborObservation;
  const date = typeof record.completedOn === "string" && /^\d{4}-\d{2}-\d{2}$/.test(record.completedOn) ? new Date(`${record.completedOn}T00:00:00Z`) : null;
  return typeof record.operationId === "string" && record.operationId.length > 0 && record.operationId.length <= 200
    && typeof record.jobReference === "string" && record.jobReference.trim().length > 0 && record.jobReference.length <= 100
    && typeof record.configuration === "string" && record.configuration.trim().length > 0 && record.configuration.length <= 200
    && date !== null && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === record.completedOn
    && typeof record.hours === "number" && Number.isFinite(record.hours) && record.hours > 0 && record.hours <= 100
    && record.source === "TECHNICIAN_REPORTED" && record.scopeConfirmed === true;
}

export function observationKey(record: LaborObservation) {
  return `${record.operationId}\n${configurationKey(record.configuration)}\n${configurationKey(record.jobReference)}`;
}

export function parseObservations(raw: string): LaborObservation[] | null {
  try {
    const parsed = JSON.parse(raw) as { version: number; records: unknown[] };
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.records) || parsed.records.length > 1000 || !parsed.records.every(validObservation)) return null;
    const records = parsed.records as LaborObservation[];
    if (new Set(records.map(observationKey)).size !== records.length) return null;
    return records;
  } catch {
    return null;
  }
}

export function observationSummary(records: LaborObservation[], operationId: string, configuration: string) {
  const matching = records.filter((record) => record.operationId === operationId && configurationKey(record.configuration) === configurationKey(configuration));
  const unique = [...new Map(matching.map((record) => [observationKey(record), record])).values()];
  const hours = unique.map((record) => record.hours).sort((left, right) => left - right);
  const midpoint = Math.floor(hours.length / 2);
  return {
    count: hours.length,
    median: hours.length ? Math.round((hours.length % 2 ? hours[midpoint] : (hours[midpoint - 1] + hours[midpoint]) / 2) * 100) / 100 : null,
    minimum: hours.length ? hours[0] : null,
    maximum: hours.length ? hours[hours.length - 1] : null
  };
}
