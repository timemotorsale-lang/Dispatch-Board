import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const DIAGNOSTIC_FACT_CLASSES = ["REPORTED", "OBSERVED", "CALCULATED"] as const;
export const DIAGNOSTIC_FACT_SOURCES = ["CUSTOMER", "TECHNICIAN", "VEHICLE_SYSTEM", "TEST_EQUIPMENT", "IMPORTED_RECORD"] as const;
export const DIAGNOSTIC_RELIABILITIES = ["UNASSESSED", "LOW", "MEDIUM", "HIGH", "VERIFIED"] as const;
export const DIAGNOSTIC_QUALITY_STATUSES = ["VALID", "SUSPECT", "INVALID"] as const;
export const DIAGNOSTIC_EVIDENCE_SUBJECT_TYPES = ["CASE", "CONCERN", "OBSERVATION", "MEASUREMENT", "TEST_EXECUTION", "HYPOTHESIS", "CONCLUSION", "VERIFICATION"] as const;

type UnitDefinition = { aliases: readonly string[]; factor: number; offset?: number; normalizedUnit: string; plausible: readonly [number, number]; quantity: string };

const units: readonly UnitDefinition[] = [
  { quantity: "VOLTAGE", aliases: ["V", "VOLT"], factor: 1, normalizedUnit: "V", plausible: [-1000, 1000] },
  { quantity: "VOLTAGE", aliases: ["MV", "MILLIVOLT"], factor: 0.001, normalizedUnit: "V", plausible: [-1000, 1000] },
  { quantity: "CURRENT", aliases: ["A", "AMP"], factor: 1, normalizedUnit: "A", plausible: [-5000, 5000] },
  { quantity: "CURRENT", aliases: ["MA", "MILLIAMP"], factor: 0.001, normalizedUnit: "A", plausible: [-5000, 5000] },
  { quantity: "RESISTANCE", aliases: ["OHM", "OHMS", "Ω"], factor: 1, normalizedUnit: "ohm", plausible: [0, 1e12] },
  { quantity: "RESISTANCE", aliases: ["KOHM", "KΩ"], factor: 1000, normalizedUnit: "ohm", plausible: [0, 1e12] },
  { quantity: "RESISTANCE", aliases: ["MOHM", "MΩ"], factor: 1e6, normalizedUnit: "ohm", plausible: [0, 1e12] },
  { quantity: "PRESSURE", aliases: ["KPA"], factor: 1, normalizedUnit: "kPa", plausible: [-101.325, 100000] },
  { quantity: "PRESSURE", aliases: ["PA"], factor: 0.001, normalizedUnit: "kPa", plausible: [-101.325, 100000] },
  { quantity: "PRESSURE", aliases: ["BAR"], factor: 100, normalizedUnit: "kPa", plausible: [-101.325, 100000] },
  { quantity: "PRESSURE", aliases: ["PSI"], factor: 6.8947572932, normalizedUnit: "kPa", plausible: [-101.325, 100000] },
  { quantity: "TEMPERATURE", aliases: ["C", "°C"], factor: 1, normalizedUnit: "°C", plausible: [-273.15, 3000] },
  { quantity: "TEMPERATURE", aliases: ["F", "°F"], factor: 5 / 9, offset: -32, normalizedUnit: "°C", plausible: [-273.15, 3000] },
  { quantity: "ROTATIONAL_SPEED", aliases: ["RPM"], factor: 1, normalizedUnit: "rpm", plausible: [0, 100000] },
  { quantity: "TIME", aliases: ["S", "SEC", "SECOND"], factor: 1, normalizedUnit: "s", plausible: [0, 1e9] },
  { quantity: "TIME", aliases: ["MS", "MILLISECOND"], factor: 0.001, normalizedUnit: "s", plausible: [0, 1e9] },
  { quantity: "FREQUENCY", aliases: ["HZ"], factor: 1, normalizedUnit: "Hz", plausible: [0, 1e9] },
  { quantity: "FREQUENCY", aliases: ["KHZ"], factor: 1000, normalizedUnit: "Hz", plausible: [0, 1e9] },
  { quantity: "PERCENT", aliases: ["%", "PERCENT"], factor: 1, normalizedUnit: "%", plausible: [0, 100] },
  { quantity: "DISTANCE", aliases: ["MM"], factor: 1, normalizedUnit: "mm", plausible: [-1e6, 1e6] },
  { quantity: "DISTANCE", aliases: ["IN", "INCH"], factor: 25.4, normalizedUnit: "mm", plausible: [-1e6, 1e6] },
  { quantity: "MASS_FLOW", aliases: ["G/S", "GPS"], factor: 1, normalizedUnit: "g/s", plausible: [-100000, 100000] }
];

function object(value: unknown, label: string, maximum = 10_000) {
  if (value == null) return {};
  if (typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  if (JSON.stringify(value).length > maximum) throw new Error(`${label} exceeds the ${maximum}-character limit.`);
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, maximum: number, minimum = 1) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized.length < minimum || normalized.length > maximum) throw new Error(`${label} must be ${minimum} through ${maximum} characters.`);
  return normalized;
}

function optionalText(value: unknown, label: string, maximum: number) {
  return value == null || value === "" ? null : text(value, label, maximum);
}

function oneOf<T extends readonly string[]>(value: unknown, values: T, label: string): T[number] {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!(values as readonly string[]).includes(normalized)) throw new Error(`${label} is invalid.`);
  return normalized as T[number];
}

function date(value: unknown, label: string, fallback: Date) {
  if (value == null || value === "") return fallback;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) throw new Error(`${label} must be a valid timestamp.`);
  return parsed;
}

function number(value: unknown, label: string) {
  const normalized = typeof value === "number" ? value : Number(String(value));
  if (!Number.isFinite(normalized) || Math.abs(normalized) > 1e15) throw new Error(`${label} must be a finite engineering value.`);
  return normalized;
}

function optionalNumber(value: unknown, label: string) {
  return value == null || value === "" ? null : number(value, label);
}

function commandFields(raw: Record<string, unknown>) {
  const expectedVersion = Number(raw.expectedVersion);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error("Expected diagnostic-case version must be a positive integer.");
  return {
    expectedVersion,
    idempotencyKey: text(raw.idempotencyKey, "Idempotency key", 200),
    reason: text(raw.reason, "Evidence reason", 500, 10)
  };
}

function factFields(raw: Record<string, unknown>, at: Date) {
  const timeWindowStart = date(raw.timeWindowStart, "Time-window start", at);
  const timeWindowEnd = date(raw.timeWindowEnd, "Time-window end", at);
  if (timeWindowStart > at || at > timeWindowEnd) throw new Error("Fact timestamp must fall within its time window.");
  const rawSource = object(raw.rawSource ?? { kind: "MANUAL_ENTRY" }, "Raw source");
  if (!String(rawSource.kind ?? "").trim()) throw new Error("Raw source kind is required.");
  return {
    independenceGroup: text(raw.independenceGroup, "Independence group", 120),
    operatingConditions: object(raw.operatingConditions, "Operating conditions"),
    qualityReasonCode: text(raw.qualityReasonCode ?? "DATA_VALID", "Quality reason code", 100).toUpperCase(),
    qualityStatus: oneOf(raw.qualityStatus ?? "VALID", DIAGNOSTIC_QUALITY_STATUSES, "Quality status"),
    rawSource,
    reliability: oneOf(raw.reliability ?? "UNASSESSED", DIAGNOSTIC_RELIABILITIES, "Reliability"),
    source: oneOf(raw.source, DIAGNOSTIC_FACT_SOURCES, "Fact source"),
    timeWindowEnd,
    timeWindowStart
  };
}

function engineeringUnit(quantity: string, unit: string) {
  const normalizedQuantity = quantity.trim().toUpperCase();
  const normalizedSymbol = unit.trim().toUpperCase();
  const definition = units.find((item) => item.quantity === normalizedQuantity && item.aliases.some((alias) => alias.toUpperCase() === normalizedSymbol));
  if (!definition) throw new Error(`Unit ${unit} is not valid for quantity ${quantity}.`);
  return definition;
}

function convert(value: number, definition: UnitDefinition) {
  return ((value + (definition.offset ?? 0)) * definition.factor);
}

function decimal(value: number) {
  return value.toFixed(8);
}

export function normalizeDiagnosticObservation(value: unknown, now = new Date()) {
  const raw = object(value, "Diagnostic observation");
  const observedAt = date(raw.observedAt, "Observed at", now);
  const correctsId = optionalText(raw.correctsId, "Corrected observation ID", 100);
  const qualityReasonCode = correctsId ? "DATA_CORRECTED" : raw.qualityReasonCode;
  return {
    ...commandFields(raw),
    ...factFields({ ...raw, qualityReasonCode }, observedAt),
    correctsId,
    factClass: oneOf(raw.factClass ?? "OBSERVED", DIAGNOSTIC_FACT_CLASSES, "Fact class"),
    observedAt,
    statement: text(raw.statement, "Observation statement", 2000, 3),
    structuredValue: raw.structuredValue == null ? null : object(raw.structuredValue, "Structured value")
  };
}

export function normalizeDiagnosticMeasurement(value: unknown, now = new Date()) {
  const raw = object(value, "Diagnostic measurement");
  const measuredAt = date(raw.measuredAt, "Measured at", now);
  const quantity = text(raw.quantity, "Quantity", 80).toUpperCase();
  const unit = text(raw.unit, "Unit", 40);
  const definition = engineeringUnit(quantity, unit);
  const enteredValue = number(raw.value, "Measurement value");
  const referenceMinimum = optionalNumber(raw.referenceMinimum, "Reference minimum");
  const referenceMaximum = optionalNumber(raw.referenceMaximum, "Reference maximum");
  if (referenceMinimum != null && referenceMaximum != null && referenceMinimum > referenceMaximum) throw new Error("Reference minimum cannot exceed reference maximum.");
  const normalizedValue = convert(enteredValue, definition);
  const plausible = normalizedValue >= definition.plausible[0] && normalizedValue <= definition.plausible[1];
  const common = factFields(raw, measuredAt);
  const instrument = object(raw.instrument, "Instrument");
  if (!String(instrument.name ?? "").trim()) throw new Error("Instrument name is required.");
  const calibrationStatus = String(instrument.calibrationStatus ?? "UNKNOWN").toUpperCase();
  if (!["UNKNOWN", "CURRENT", "EXPIRED", "NOT_APPLICABLE"].includes(calibrationStatus)) throw new Error("Instrument calibration status is invalid.");
  instrument.calibrationStatus = calibrationStatus;
  const supersedesId = optionalText(raw.supersedesId, "Superseded measurement ID", 100);
  const calibrationQuality = calibrationStatus === "EXPIRED" ? { status: "INVALID" as const, reason: "DATA_INSTRUMENT_CALIBRATION_EXPIRED" } : calibrationStatus === "UNKNOWN" ? { status: "SUSPECT" as const, reason: "DATA_INSTRUMENT_CALIBRATION_UNVERIFIED" } : null;
  return {
    ...commandFields(raw),
    ...common,
    instrument,
    measuredAt,
    normalizedReferenceMax: referenceMaximum == null ? null : decimal(convert(referenceMaximum, definition)),
    normalizedReferenceMin: referenceMinimum == null ? null : decimal(convert(referenceMinimum, definition)),
    normalizedUnit: definition.normalizedUnit,
    normalizedValue: decimal(normalizedValue),
    plausibilityReasonCode: plausible ? "DATA_WITHIN_ENGINEERING_BOUNDS" : "DATA_IMPLAUSIBLE_ENGINEERING_RANGE",
    plausibilityStatus: plausible ? "PLAUSIBLE" as const : "OUT_OF_RANGE" as const,
    qualityReasonCode: supersedesId ? "DATA_CORRECTED" : !plausible ? "DATA_IMPLAUSIBLE" : calibrationQuality?.reason ?? common.qualityReasonCode,
    qualityStatus: !plausible ? "INVALID" as const : calibrationQuality?.status ?? common.qualityStatus,
    quantity,
    referenceMaximum: referenceMaximum == null ? null : decimal(referenceMaximum),
    referenceMinimum: referenceMinimum == null ? null : decimal(referenceMinimum),
    setup: object(raw.setup, "Measurement setup"),
    supersedesId,
    tolerance: object(raw.tolerance, "Measurement tolerance"),
    unit,
    valueDecimal: decimal(enteredValue)
  };
}

export function normalizeDiagnosticEvidenceLink(value: unknown) {
  const raw = object(value, "Diagnostic evidence link");
  return {
    ...commandFields(raw),
    evidenceObjectId: text(raw.evidenceObjectId, "Evidence object ID", 100),
    purpose: text(raw.purpose, "Evidence purpose", 300, 3),
    relationship: text(raw.relationship ?? "SUPPORTS", "Evidence relationship", 100).toUpperCase(),
    subjectId: text(raw.subjectId, "Evidence subject ID", 100),
    subjectType: oneOf(raw.subjectType, DIAGNOSTIC_EVIDENCE_SUBJECT_TYPES, "Evidence subject type")
  };
}

export function diagnosticFactId(prefix: "obs" | "mea" | "del", organizationId: string, caseId: string, idempotencyKey: string) {
  return `${prefix}_${hashEnterpriseCommand({ caseId, idempotencyKey: idempotencyKey.trim(), organizationId }).slice(0, 24)}`;
}
