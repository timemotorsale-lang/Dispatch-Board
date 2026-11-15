export type EstimateDetails = {
  estimateDate: string | null;
  serviceDate: string | null;
  validThrough: string | null;
  memo?: string;
};

export function formatEstimateDate(date: string) {
  return new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
    timeZone: "UTC", month: "long", day: "numeric", year: "numeric"
  });
}

export function normalizeEstimateCorrection(raw: Record<string, unknown>) {
  function readDate(value: unknown) {
    if (value === "" || value === null) return null;
    if (typeof value !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) throw new Error("Enter a valid calendar date.");
    const date = new Date(value + "T00:00:00Z");
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Enter a valid calendar date.");
    return value;
  }
  if (raw.memo !== undefined && typeof raw.memo !== "string") throw new Error("Enter a valid estimate memo.");
  const memo = typeof raw.memo === "string" ? raw.memo.trim().replace(/\s+/g, " ") : "";
  if (memo.length > 120) throw new Error("Keep the estimate memo to 120 characters or fewer.");
  const details = { estimateDate: readDate(raw.estimateDate), serviceDate: readDate(raw.serviceDate), validThrough: readDate(raw.validThrough), ...(memo ? { memo } : {}) };
  if (details.estimateDate && details.validThrough && details.validThrough < details.estimateDate) throw new Error("Valid through must be on or after the estimate date.");
  const reading = raw.mileage;
  if (reading !== null && (typeof reading !== "number" || !Number.isSafeInteger(reading) || reading < 0 || reading > 2147483647)) throw new Error("Enter a nonnegative whole odometer reading.");
  const unit = raw.unit;
  if (unit !== "MILES" && unit !== "KILOMETERS") throw new Error("Select miles or kilometers.");
  const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  if (reason.length < 10 || reason.length > 500) throw new Error("Enter a correction reason of 10 to 500 characters.");
  return { details, reading, unit, reason } as const;
}
