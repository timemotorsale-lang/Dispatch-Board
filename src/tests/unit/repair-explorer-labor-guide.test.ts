import { describe, expect, it } from "vitest";

import { CATALOG_ENTRIES } from "@/features/prototype/repair-explorer/catalog";
import { parsePreviewDraft } from "@/features/prototype/repair-explorer/estimate";
import { LABOR_REFERENCE_EXAMPLES } from "@/features/prototype/repair-explorer/labor-guide";
import { observationSummary, parseObservations, validObservation, type LaborObservation } from "@/features/prototype/repair-explorer/labor-observations";

const report = (jobReference: string, hours: number, configuration = "2019 Ford F-150 3.5L 4WD crew cab"): LaborObservation => ({ operationId: "engine-replacement", jobReference, configuration, completedOn: "2026-10-14", hours, source: "TECHNICIAN_REPORTED", scopeConfirmed: true });

describe("provisional labor guide", () => {
  it("assigns a traceable, explicitly unvalidated planning allowance to every operation", () => {
    expect(CATALOG_ENTRIES.length).toBeGreaterThan(879);
    for (const { repair } of CATALOG_ENTRIES) {
      const plan = repair.laborPlan!;
      expect(plan, repair.id).toBeDefined();
      expect(plan.confidence).toBe("UNVALIDATED");
      expect(plan.version).toBe("planning-v1");
      expect(plan.hours).toBe(repair.hours);
      expect(plan.hours).toBeGreaterThan(0);
      expect(plan.low).toBeLessThanOrEqual(plan.hours);
      expect(plan.high).toBeGreaterThanOrEqual(plan.hours);
      expect(plan.stages.reduce((total, stage) => total + stage.hours, 0)).toBeCloseTo(plan.hours, 8);
      expect(plan.stages.every((stage) => stage.hours >= 0)).toBe(true);
    }
  });

  it("distinguishes major replacements from accessible parts without claiming measured evidence", () => {
    const hours = (label: string) => CATALOG_ENTRIES.find(({ repair }) => repair.label === label)!.repair.hours!;
    expect(hours("Overhaul engine assembly")).toBeGreaterThan(hours("Replace engine assembly"));
    expect(hours("Replace engine assembly")).toBeGreaterThan(hours("Replace engine mount"));
    expect(hours("Replace timing chain set")).toBeGreaterThan(hours("Replace variable valve timing solenoid"));
    expect(hours("Replace heater core")).toBeGreaterThan(hours("Replace blower motor resistor"));
    expect(CATALOG_ENTRIES.find(({ repair }) => repair.label === "Replace engine assembly")!.repair.laborPlan!.basis).toBe("WORK_BREAKDOWN");
  });

  it("keeps historical warranty references separate from single-operation planning hours", () => {
    expect(LABOR_REFERENCE_EXAMPLES).toHaveLength(2);
    expect(LABOR_REFERENCE_EXAMPLES[0].hours).toContain("warranty");
    expect(LABOR_REFERENCE_EXAMPLES[0].scope).toContain("not the time for replacing one phaser");
    expect(CATALOG_ENTRIES.find(({ repair }) => repair.label === "Replace camshaft phaser")!.repair.hours).not.toBe(9.7);
  });

  it("accepts real completed-job reports but rejects invalid dates, missing scope and nonpositive time", () => {
    expect(validObservation(report("RO-1", 17.5))).toBe(true);
    for (const invalid of [{ ...report("RO-1", 0) }, { ...report("RO-1", -1) }, { ...report("RO-1", 2), completedOn: "2026-02-30" }, { ...report("RO-1", 2), scopeConfirmed: false }, { ...report("RO-1", 2), configuration: "" }]) expect(validObservation(invalid)).toBe(false);
    const records = [report("RO-1", 17.5)];
    expect(parseObservations(JSON.stringify({ version: 1, records }))).toEqual(records);
    expect(parseObservations(JSON.stringify({ version: 1, records: [...records, ...records] }))).toBeNull();
    expect(parseObservations("null")).toBeNull();
  });

  it("does not combine unlike configurations, operations or duplicate jobs and exposes outliers", () => {
    const records = [report("RO-1", 17), report("RO-2", 18), report("RO-3", 40), report("ro-1", 17), report("RO-4", 2, "2020 Ford F-150 5.0L 2WD regular cab"), { ...report("RO-5", 2), operationId: "other" }];
    expect(observationSummary(records, "engine-replacement", " 2019 ford f-150 3.5l 4wd crew cab ")).toEqual({ count: 3, median: 18, minimum: 17, maximum: 40 });
    expect(observationSummary([], "engine-replacement", "unknown").median).toBeNull();
    expect(observationSummary([report("1", 17), report("2", 18)], "engine-replacement", records[0].configuration).median).toBe(17.5);
  });

  it("preserves labor basis in saved estimates and rejects malformed reported-median provenance", () => {
    const line = { id: "engine", label: "Engine", hours: 18, parts: null, laborBasis: "REPORTED_MEDIAN", laborConfiguration: "2019 Ford F-150 3.5L 4WD", reportedJobCount: 3 };
    const draft = { version: 1, rate: 150, lines: [line] };
    expect(parsePreviewDraft(JSON.stringify(draft))).toEqual(draft);
    expect(parsePreviewDraft(JSON.stringify({ ...draft, lines: [{ ...line, laborConfiguration: undefined }] }))).toBeNull();
    expect(parsePreviewDraft(JSON.stringify({ ...draft, lines: [{ ...line, reportedJobCount: 0 }] }))).toBeNull();
    expect(parsePreviewDraft(JSON.stringify({ ...draft, lines: [{ ...line, laborBasis: "VERIFIED_OEM" }] }))).toBeNull();
  });
});
