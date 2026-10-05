import { describe, expect, it } from "vitest";
import { spreadsheetSafeValue, filterReportingResult, type ReportResult } from "@/lib/reporting/contracts";
import { reportingSubject, assertReportingReview } from "@/server/reporting/period-service";
import type { AuthenticatedUser } from "@/server/auth/store";

const staff: AuthenticatedUser = { id: "staff", name: "Staff", email: "staff@test", isActive: true, roles: [], duties: { all: [], direct: [], roleDefaults: [] } };
const manager: AuthenticatedUser = { ...staff, id: "manager", roles: ["General Manager"] };
describe("reporting boundaries", () => {
  it.each(["=SUM(A1)", "+1", "-1", "@function", "  =1", "\n=1", "\ttext", "\rtext"])("neutralizes spreadsheet text %j", value => {
    expect(spreadsheetSafeValue(value)).toBe(`'${value}`);
  });
  it("preserves ordinary text and numeric values", () => {
    expect(spreadsheetSafeValue("Vehicle - ready")).toBe("Vehicle - ready");
    expect(spreadsheetSafeValue(-12)).toBe(-12);
    expect(spreadsheetSafeValue(null)).toBeNull();
  });
  it("restricts staff to their own reporting", () => {
    expect(reportingSubject(staff).subject).toBe("staff");
    expect(() => reportingSubject(staff, "other")).toThrow("permission");
    expect(() => reportingSubject({ ...staff, isActive: false })).toThrow("unavailable");
    expect(reportingSubject(manager, "staff").subject).toBe("staff");
  });
  it("requires an independent general manager review", () => {
    expect(() => assertReportingReview(staff, "other", "other")).toThrow("General Manager");
    expect(() => assertReportingReview(manager, "manager", "staff")).toThrow("own submission");
    expect(() => assertReportingReview(manager, "staff", "manager")).toThrow("own submission");
    expect(assertReportingReview(manager, "staff", "staff").id).toBe("manager");
  });
  it("limits snapshots to the displayed search and measure scope", () => {
    const result: ReportResult = { definitionId: "operations", definitionVersion: "v1", generatedAt: "2026-10-04", quality: "COMPLETE", limitation: null, rows: [{ id: "a", title: "Customer call", state: "OPEN", owner: "Staff", href: "/tasks/a" }, { id: "b", title: "Vehicle prep", state: "OPEN", owner: "Staff", href: "/tasks/b" }], metrics: [{ code: "open", label: "Open", value: 2, rowIds: ["a", "b"], unit: "COUNT" }] };
    const filtered = filterReportingResult(result, "customer", "open");
    expect(filtered.rows.map(row => row.id)).toEqual(["a"]);
    expect(filtered.metrics[0].value).toBe(1);
    expect(result.rows).toHaveLength(2);
    expect(() => filterReportingResult(result, "", "unknown")).toThrow("invalid");
  });
});
