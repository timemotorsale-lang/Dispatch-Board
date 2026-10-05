import { describe, expect, it } from "vitest";
import { decodeReportingHistoryCursor, encodeReportingHistoryCursor, type ReportingHistoryCursor } from "@/server/reporting/history-cursor";
const cursor: ReportingHistoryCursor = { version: 1, scope: "actor-and-filter-hash", series: "series1", legacy: "daily1", seriesDone: false, legacyDone: true };
describe("report archive cursor", () => {
  it("round-trips independent archive positions and completion markers", () => {
    expect(decodeReportingHistoryCursor(encodeReportingHistoryCursor(cursor), cursor.scope)).toEqual(cursor);
    expect(decodeReportingHistoryCursor(undefined, cursor.scope)).toBeNull();
  });
  it("rejects reused cursors after actor or filter changes", () => {
    expect(() => decodeReportingHistoryCursor(encodeReportingHistoryCursor(cursor), "other-scope")).toThrow("filters");
  });
  it.each(["!", "a".repeat(1201), Buffer.from("null").toString("base64url"), Buffer.from("{}").toString("base64url")])("rejects malformed cursor %s", value => {
    expect(() => decodeReportingHistoryCursor(value, cursor.scope)).toThrow("invalid");
  });
  it("rejects invalid identifiers and nonboolean completion flags", () => {
    expect(() => decodeReportingHistoryCursor(encodeReportingHistoryCursor({ ...cursor, series: "../other" }), cursor.scope)).toThrow("invalid");
    expect(() => decodeReportingHistoryCursor(Buffer.from(JSON.stringify({ ...cursor, legacyDone: "true" })).toString("base64url"), cursor.scope)).toThrow("invalid");
  });
});
