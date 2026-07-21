export const DIAGNOSTIC_CALCULATION_LIBRARY_VERSION = "DGN-021/1.0.0";

type Dimension = "VOLTAGE" | "CURRENT" | "RESISTANCE" | "POWER" | "ENERGY" | "TIME" | "SPEED" | "TORQUE" | "RATIO";
export type EngineeringQuantity<D extends Dimension = Dimension> = Readonly<{ dimension: D; value: number; unit: string }>;

const units = {
  VOLTAGE: { V: 1, mV: 1e-3, kV: 1e3 }, CURRENT: { A: 1, mA: 1e-3, uA: 1e-6 }, RESISTANCE: { ohm: 1, mohm: 1e-3, kohm: 1e3, Mohm: 1e6 },
  POWER: { W: 1, kW: 1e3 }, ENERGY: { J: 1, Wh: 3600, kWh: 3_600_000 }, TIME: { s: 1, ms: 1e-3, min: 60, h: 3600 },
  SPEED: { "rad/s": 1, rpm: 2 * Math.PI / 60 }, TORQUE: { Nm: 1 }, RATIO: { ratio: 1, percent: 0.01 }
} as const satisfies Record<Dimension, Record<string, number>>;

function finite(value: number, label: string) { if (!Number.isFinite(value)) throw new Error(`${label} must be finite.`); return value; }
function nonNegative(value: number, label: string) { finite(value, label); if (value < 0) throw new Error(`${label} cannot be negative.`); return value; }
function positive(value: number, label: string) { finite(value, label); if (value <= 0) throw new Error(`${label} must be greater than zero.`); return value; }

export function engineeringQuantity<D extends Dimension>(dimension: D, value: number, unit: keyof (typeof units)[D] & string): EngineeringQuantity<D> {
  finite(value, dimension.toLowerCase());
  if (!(unit in units[dimension])) throw new Error(`Unit ${unit} is not valid for ${dimension}.`);
  return Object.freeze({ dimension, value, unit });
}

export function convertEngineeringQuantity<D extends Dimension>(quantity: EngineeringQuantity<D>, unit: keyof (typeof units)[D] & string): EngineeringQuantity<D> {
  const fromFactor = (units[quantity.dimension] as Record<string, number>)[quantity.unit];
  const toFactor = (units[quantity.dimension] as Record<string, number>)[unit];
  if (fromFactor == null || toFactor == null) throw new Error(`Cannot convert ${quantity.dimension} from ${quantity.unit} to ${unit}.`);
  return engineeringQuantity(quantity.dimension, quantity.value * fromFactor / toFactor, unit);
}

function base<D extends Dimension>(quantity: EngineeringQuantity<D>, dimension: D) {
  if (quantity.dimension !== dimension) throw new Error(`Expected ${dimension}; received ${quantity.dimension}.`);
  const factor = (units[dimension] as Record<string, number>)[quantity.unit];
  if (factor == null) throw new Error(`Unit ${quantity.unit} is not valid for ${dimension}.`);
  return finite(quantity.value * factor, dimension.toLowerCase());
}

const q = {
  voltage: (value: number) => engineeringQuantity("VOLTAGE", value, "V"), current: (value: number) => engineeringQuantity("CURRENT", value, "A"),
  resistance: (value: number) => engineeringQuantity("RESISTANCE", value, "ohm"), power: (value: number) => engineeringQuantity("POWER", value, "W"),
  energy: (value: number) => engineeringQuantity("ENERGY", value, "J"), time: (value: number) => engineeringQuantity("TIME", value, "s"),
  speed: (value: number) => engineeringQuantity("SPEED", value, "rad/s"), torque: (value: number) => engineeringQuantity("TORQUE", value, "Nm"),
  ratio: (value: number) => engineeringQuantity("RATIO", value, "ratio")
};

export function voltageFromCurrentResistance(current: EngineeringQuantity<"CURRENT">, resistance: EngineeringQuantity<"RESISTANCE">) { return q.voltage(base(current, "CURRENT") * nonNegative(base(resistance, "RESISTANCE"), "Resistance")); }
export function currentFromVoltageResistance(voltage: EngineeringQuantity<"VOLTAGE">, resistance: EngineeringQuantity<"RESISTANCE">) { return q.current(base(voltage, "VOLTAGE") / positive(base(resistance, "RESISTANCE"), "Resistance")); }
export function resistanceFromVoltageCurrent(voltage: EngineeringQuantity<"VOLTAGE">, current: EngineeringQuantity<"CURRENT">) { return q.resistance(Math.abs(base(voltage, "VOLTAGE") / positive(Math.abs(base(current, "CURRENT")), "Current magnitude"))); }
export function powerFromVoltageCurrent(voltage: EngineeringQuantity<"VOLTAGE">, current: EngineeringQuantity<"CURRENT">) { return q.power(base(voltage, "VOLTAGE") * base(current, "CURRENT")); }
export function powerFromCurrentResistance(current: EngineeringQuantity<"CURRENT">, resistance: EngineeringQuantity<"RESISTANCE">) { const amps = base(current, "CURRENT"); return q.power(amps * amps * nonNegative(base(resistance, "RESISTANCE"), "Resistance")); }
export function energyFromPowerTime(power: EngineeringQuantity<"POWER">, time: EngineeringQuantity<"TIME">) { return q.energy(base(power, "POWER") * nonNegative(base(time, "TIME"), "Time")); }

export function seriesResistance(values: EngineeringQuantity<"RESISTANCE">[]) {
  if (!values.length) throw new Error("Series resistance requires at least one value.");
  return q.resistance(values.reduce((sum, value) => sum + nonNegative(base(value, "RESISTANCE"), "Resistance"), 0));
}
export function parallelResistance(values: EngineeringQuantity<"RESISTANCE">[]) {
  if (!values.length) throw new Error("Parallel resistance requires at least one value.");
  if (values.some((value) => base(value, "RESISTANCE") === 0)) return q.resistance(0);
  return q.resistance(1 / values.reduce((sum, value) => sum + 1 / positive(base(value, "RESISTANCE"), "Resistance"), 0));
}
export function kirchhoffVoltageBalance(values: EngineeringQuantity<"VOLTAGE">[], tolerance = engineeringQuantity("VOLTAGE", 1, "mV")) {
  const imbalance = values.reduce((sum, value) => sum + base(value, "VOLTAGE"), 0); const allowed = nonNegative(Math.abs(base(tolerance, "VOLTAGE")), "Voltage tolerance");
  return { balanced: Math.abs(imbalance) <= allowed, imbalance: q.voltage(imbalance), tolerance: q.voltage(allowed) };
}
export function kirchhoffCurrentBalance(values: EngineeringQuantity<"CURRENT">[], tolerance = engineeringQuantity("CURRENT", 1, "mA")) {
  const imbalance = values.reduce((sum, value) => sum + base(value, "CURRENT"), 0); const allowed = nonNegative(Math.abs(base(tolerance, "CURRENT")), "Current tolerance");
  return { balanced: Math.abs(imbalance) <= allowed, imbalance: q.current(imbalance), tolerance: q.current(allowed) };
}
export function loadedVoltageDrop(source: EngineeringQuantity<"VOLTAGE">, load: EngineeringQuantity<"VOLTAGE">, current?: EngineeringQuantity<"CURRENT">) {
  const sourceVolts = positive(Math.abs(base(source, "VOLTAGE")), "Source voltage magnitude"); const drop = sourceVolts - Math.abs(base(load, "VOLTAGE"));
  if (drop < 0) throw new Error("Loaded voltage cannot exceed source voltage without an identified additional source or invalid setup.");
  return { drop: q.voltage(drop), percent: engineeringQuantity("RATIO", drop / sourceVolts * 100, "percent"), pathResistance: current ? q.resistance(drop / positive(Math.abs(base(current, "CURRENT")), "Current magnitude")) : null };
}

export function toleranceRange(nominal: EngineeringQuantity, percent: number, absoluteMinimum = 0) {
  nonNegative(percent, "Tolerance percent"); const spread = Math.abs(nominal.value) * percent / 100;
  return { minimum: Math.max(absoluteMinimum, nominal.value - spread), maximum: nominal.value + spread, dimension: nominal.dimension, unit: nominal.unit };
}
export function isWithinTolerance(value: EngineeringQuantity, range: ReturnType<typeof toleranceRange>) {
  if (value.dimension !== range.dimension || value.unit !== range.unit) throw new Error("Tolerance comparison requires matching dimensions and units.");
  return value.value >= range.minimum && value.value <= range.maximum;
}
export function elapsedTime(start: Date, end: Date) { const milliseconds = end.getTime() - start.getTime(); if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new Error("Elapsed-time end must not precede start."); return q.time(milliseconds / 1000); }
export function rotationalSpeed(revolutions: number, time: EngineeringQuantity<"TIME">) { nonNegative(revolutions, "Revolutions"); return q.speed(revolutions * 2 * Math.PI / positive(base(time, "TIME"), "Time")); }
export function outputSpeed(inputSpeed: EngineeringQuantity<"SPEED">, ratio: EngineeringQuantity<"RATIO">) { return q.speed(base(inputSpeed, "SPEED") / positive(base(ratio, "RATIO"), "Speed ratio")); }
export function torqueFromPowerSpeed(power: EngineeringQuantity<"POWER">, speed: EngineeringQuantity<"SPEED">) { return q.torque(base(power, "POWER") / positive(Math.abs(base(speed, "SPEED")), "Angular speed magnitude")); }
