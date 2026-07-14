export function clamp(value: number, minimum = 0, maximum = 100) {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}

export function score100(value: number) {
  return Math.round(clamp(value));
}

export function normalize(value: number, minimum: number, maximum: number) {
  if (maximum <= minimum) return value >= maximum ? 1 : 0;
  return clamp((value - minimum) / (maximum - minimum), 0, 1);
}

export function weightedScore(factors: ReadonlyArray<{ value: number; weight: number }>) {
  return score100(factors.reduce((total, factor) => total + clamp(factor.value, 0, 1) * factor.weight, 0));
}

export function hoursBetween(start: Date, end: Date) {
  return Math.max(0, (end.getTime() - start.getTime()) / 3_600_000);
}

export function daysBetween(start: Date, end: Date) {
  return hoursBetween(start, end) / 24;
}

export function average(values: readonly number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function standardDeviation(values: readonly number[]) {
  if (values.length < 2) return 0;
  const mean = average(values);
  return Math.sqrt(average(values.map((value) => (value - mean) ** 2)));
}

export function coefficientOfVariation(values: readonly number[]) {
  const mean = average(values);
  return mean <= 0 ? Number.POSITIVE_INFINITY : standardDeviation(values) / mean;
}

export function stableFingerprint(value: unknown) {
  const normalizeValue = (entry: unknown): unknown => {
    if (entry instanceof Date) return entry.toISOString();
    if (Array.isArray(entry)) return entry.map(normalizeValue);
    if (entry && typeof entry === "object") {
      return Object.fromEntries(
        Object.entries(entry as Record<string, unknown>)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, child]) => [key, normalizeValue(child)])
      );
    }
    return entry;
  };

  const serialized = JSON.stringify(normalizeValue(value));
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `inv-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

