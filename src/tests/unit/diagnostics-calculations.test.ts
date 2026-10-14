import { describe, expect, it } from "vitest";

import { convertEngineeringQuantity, currentFromVoltageResistance, elapsedTime, energyFromPowerTime, engineeringQuantity, isWithinTolerance, kirchhoffCurrentBalance, kirchhoffVoltageBalance, loadedVoltageDrop, outputSpeed, parallelResistance, powerFromCurrentResistance, powerFromVoltageCurrent, resistanceFromVoltageCurrent, rotationalSpeed, seriesResistance, toleranceRange, torqueFromPowerSpeed, voltageFromCurrentResistance } from "@/server/diagnostics/calculations";

const quantity = engineeringQuantity;
const close = (actual: number, expected: number, digits = 10) => expect(actual).toBeCloseTo(expected, digits);

describe("DGN-021 unit-safe engineering calculations", () => {
  it("solves Ohm, power, and energy reference cases across compatible units", () => {
    close(voltageFromCurrentResistance(quantity("CURRENT", 2, "A"), quantity("RESISTANCE", 6, "ohm")).value, 12);
    close(currentFromVoltageResistance(quantity("VOLTAGE", 12000, "mV"), quantity("RESISTANCE", 6, "ohm")).value, 2);
    close(resistanceFromVoltageCurrent(quantity("VOLTAGE", 12, "V"), quantity("CURRENT", 2000, "mA")).value, 6);
    close(powerFromVoltageCurrent(quantity("VOLTAGE", 12, "V"), quantity("CURRENT", 2, "A")).value, 24);
    close(powerFromCurrentResistance(quantity("CURRENT", 2, "A"), quantity("RESISTANCE", 6, "ohm")).value, 24);
    close(convertEngineeringQuantity(energyFromPowerTime(quantity("POWER", 1, "kW"), quantity("TIME", 1, "h")), "kWh").value, 1);
  });

  it("solves series and parallel circuits and preserves boundary behavior", () => {
    close(seriesResistance([quantity("RESISTANCE", 1, "ohm"), quantity("RESISTANCE", 2, "kohm")]).value, 2001);
    close(parallelResistance([quantity("RESISTANCE", 6, "ohm"), quantity("RESISTANCE", 3, "ohm")]).value, 2);
    expect(parallelResistance([quantity("RESISTANCE", 0, "ohm"), quantity("RESISTANCE", 3, "ohm")]).value).toBe(0);
    expect(() => seriesResistance([])).toThrow("at least one");
  });

  it("checks Kirchhoff balances using signed contributions and explicit tolerances", () => {
    expect(kirchhoffVoltageBalance([quantity("VOLTAGE", 12, "V"), quantity("VOLTAGE", -7, "V"), quantity("VOLTAGE", -5.0005, "V")])).toMatchObject({ balanced: true });
    expect(kirchhoffVoltageBalance([quantity("VOLTAGE", 12, "V"), quantity("VOLTAGE", -11.9, "V")])).toMatchObject({ balanced: false });
    expect(kirchhoffCurrentBalance([quantity("CURRENT", 10, "A"), quantity("CURRENT", -6000, "mA"), quantity("CURRENT", -4, "A")])).toMatchObject({ balanced: true });
  });

  it("calculates loaded voltage drop, loss percent, and path resistance", () => {
    const result = loadedVoltageDrop(quantity("VOLTAGE", 12.6, "V"), quantity("VOLTAGE", 11.8, "V"), quantity("CURRENT", 200, "A"));
    close(result.drop.value, 0.8); close(result.percent.value, 0.8 / 12.6 * 100); close(result.pathResistance!.value, 0.004);
    expect(() => loadedVoltageDrop(quantity("VOLTAGE", 12, "V"), quantity("VOLTAGE", 13, "V"))).toThrow("additional source");
  });

  it("handles tolerance, timing, speed, ratio, and torque relationships", () => {
    const nominal = quantity("VOLTAGE", 12, "V"); const range = toleranceRange(nominal, 5);
    expect(isWithinTolerance(quantity("VOLTAGE", 11.4, "V"), range)).toBe(true);
    expect(isWithinTolerance(quantity("VOLTAGE", 11.39, "V"), range)).toBe(false);
    close(elapsedTime(new Date("2026-01-01T00:00:00Z"), new Date("2026-01-01T00:01:00Z")).value, 60);
    close(convertEngineeringQuantity(rotationalSpeed(10, quantity("TIME", 2, "s")), "rpm").value, 300);
    close(convertEngineeringQuantity(outputSpeed(quantity("SPEED", 1200, "rpm"), quantity("RATIO", 4, "ratio")), "rpm").value, 300);
    close(torqueFromPowerSpeed(quantity("POWER", 10, "kW"), quantity("SPEED", 100, "rad/s")).value, 100);
  });

  it("rejects wrong dimensions, zero divisors, negative physical values, and non-finite inputs", () => {
    expect(() => currentFromVoltageResistance(quantity("VOLTAGE", 12, "V"), quantity("RESISTANCE", 0, "ohm"))).toThrow("greater than zero");
    expect(() => voltageFromCurrentResistance(quantity("CURRENT", 2, "A"), quantity("RESISTANCE", -1, "ohm"))).toThrow("cannot be negative");
    expect(() => energyFromPowerTime(quantity("POWER", 1, "W"), quantity("TIME", -1, "s"))).toThrow("cannot be negative");
    expect(() => engineeringQuantity("VOLTAGE", Number.NaN, "V")).toThrow("finite");
    expect(() => voltageFromCurrentResistance(quantity("VOLTAGE", 12, "V") as never, quantity("RESISTANCE", 1, "ohm"))).toThrow("Expected CURRENT");
  });

  it("satisfies reversible Ohm-law properties over a deterministic range", () => {
    for (let amps = 0.25; amps <= 20; amps += 0.25) for (let ohms = 0.1; ohms <= 5; ohms += 0.1) {
      const volts = voltageFromCurrentResistance(quantity("CURRENT", amps, "A"), quantity("RESISTANCE", ohms, "ohm"));
      close(currentFromVoltageResistance(volts, quantity("RESISTANCE", ohms, "ohm")).value, amps, 9);
    }
  });
});
