const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
const VIN_TRANSLITERATION: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9 };
const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

export type CanonicalVin = { normalized: string | null; raw: string | null; state: "VALID" | "NON_VIN_EXCEPTION"; nonVinReason: string | null; validationSource: string };

function text(value: unknown, label: string, max = 120) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new Error(`${label} is required.`);
  if (normalized.length > max) throw new Error(`${label} must be ${max} characters or fewer.`);
  return normalized;
}

export function normalizeVinValue(value: unknown) {
  return typeof value === "string" ? value.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
}

export function isValidVin(value: string) {
  if (!VIN_PATTERN.test(value)) return false;
  const sum = [...value].reduce((total, character, index) => {
    const number = /\d/.test(character) ? Number(character) : VIN_TRANSLITERATION[character];
    return total + number * VIN_WEIGHTS[index];
  }, 0);
  const expected = sum % 11 === 10 ? "X" : String(sum % 11);
  return value[8] === expected;
}

export function normalizeCanonicalVin(input: { vin?: unknown; nonVinReason?: unknown }): CanonicalVin {
  const raw = typeof input.vin === "string" && input.vin.trim() ? input.vin.trim() : null;
  if (raw) {
    const normalized = normalizeVinValue(raw);
    if (!isValidVin(normalized)) throw new Error("VIN must be a valid 17-character VIN with a correct check digit, or use the documented non-VIN exception path.");
    return { normalized, raw, state: "VALID", nonVinReason: null, validationSource: "ISO_3779_CHECK_DIGIT_V1" };
  }
  const nonVinReason = text(input.nonVinReason, "Non-VIN exception reason", 500);
  if (nonVinReason.length < 10) throw new Error("Non-VIN exception reason must be at least 10 characters.");
  return { normalized: null, raw: null, state: "NON_VIN_EXCEPTION", nonVinReason, validationSource: "DOCUMENTED_NON_VIN_EXCEPTION" };
}

export function normalizeStockNumber(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  const normalized = raw ? raw.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
  return { raw: raw || null, normalized: normalized || null };
}

export function normalizeVehicleIdentity(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Vehicle identity must be an object.");
  const raw = value as Record<string, unknown>;
  const vin = normalizeCanonicalVin(raw);
  const stock = normalizeStockNumber(raw.stockNumber);
  const year = raw.year == null || raw.year === "" ? null : Number(raw.year);
  if (year !== null && (!Number.isInteger(year) || year < 1886 || year > new Date().getFullYear() + 2)) throw new Error("Vehicle year is outside the supported range.");
  return {
    vehicleNumber: text(raw.vehicleNumber, "Vehicle number", 100).toUpperCase(),
    vin: vin.normalized, vinRaw: vin.raw, vinState: vin.state, vinValidationSource: vin.validationSource, nonVinReason: vin.nonVinReason,
    stockNumber: stock.raw, stockNumberNormalized: stock.normalized, year,
    make: typeof raw.make === "string" && raw.make.trim() ? raw.make.trim() : null,
    model: typeof raw.model === "string" && raw.model.trim() ? raw.model.trim() : null,
    color: typeof raw.color === "string" && raw.color.trim() ? raw.color.trim() : null,
    licensePlate: typeof raw.licensePlate === "string" && raw.licensePlate.trim() ? raw.licensePlate.trim().toUpperCase() : null,
    reason: text(raw.reason, "Business reason", 500),
    idempotencyKey: text(raw.idempotencyKey, "Idempotency key", 200),
    locationId: typeof raw.locationId === "string" && raw.locationId.trim() ? raw.locationId.trim() : null
  };
}

export function odometerDisposition(input: { correctionOfId?: string | null; latest?: { reading: number; observedAt: Date } | null; observedAt: Date; reading: number }) {
  if (!Number.isInteger(input.reading) || input.reading < 0) throw new Error("Odometer reading must be a non-negative whole number.");
  if (input.correctionOfId) return { status: "CORRECTED" as const, exceptionReason: null };
  if (!input.latest) return { status: "ACCEPTED" as const, exceptionReason: null };
  if (input.reading < input.latest.reading) return { status: "EXCEPTION" as const, exceptionReason: "Reading is lower than the latest observation." };
  const elapsedDays = Math.max(1, (input.observedAt.getTime() - input.latest.observedAt.getTime()) / 86_400_000);
  if ((input.reading - input.latest.reading) / elapsedDays > 2_000) return { status: "EXCEPTION" as const, exceptionReason: "Reading increase exceeds the plausibility threshold." };
  return { status: "ACCEPTED" as const, exceptionReason: null };
}

export function previewVehicleImportRows(rows: unknown[]) {
  return rows.slice(0, 500).map((row, index) => {
    try { return { row: index + 1, status: "VALID" as const, normalized: normalizeVehicleIdentity({ ...(row as object), idempotencyKey: `preview-${index}`, reason: "Vehicle registry import preview validation." }) }; }
    catch (error) { return { row: index + 1, status: "INVALID" as const, error: error instanceof Error ? error.message : "Invalid vehicle row." }; }
  });
}
