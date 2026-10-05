import { describe, expect, it } from "vitest";
import { draftReportCalendar } from "@/lib/reporting/calendar";
import { projectReportingExpectations, type ExpectationAssignment } from "@/lib/reporting/expectations";

const calendar = { ...draftReportCalendar, version: "test/v1" };
const people = [{ id: "staff", name: "Staff", isActive: true }, { id: "gm", name: "Manager", isActive: true }, { id: "deputy", name: "Deputy", isActive: true }];
const assignment: ExpectationAssignment = { id: "a", subjectUserId: "staff", reviewerUserId: "gm", cadence: "WEEKLY", validFrom: "2026-01-01", validTo: null, dailyDueMinute: null };
const project = (assignments = [assignment], from = "2026-10-05", to = "2026-10-09", persons = people) => projectReportingExpectations(calendar, assignments, persons, from, to);
describe("reporting obligation projection", () => {
  it("deduplicates a week and retains its complete identity", () => {
    const rows = project(); expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ periodStart: "2026-10-05", periodEnd: "2026-10-12", partial: false, canGenerate: true, eligibleDays: 5 });
    expect(rows[0].coveredDates).toHaveLength(5);
  });
  it("marks mid-period joins and departures as partial", () => {
    expect(project([{ ...assignment, validFrom: "2026-10-07", validTo: "2026-10-08" }])[0]).toMatchObject({ partial: true, coveredDates: ["2026-10-07", "2026-10-08"] });
  });
  it("blocks conflicting reviewers during a weekly transfer regardless of ordering", () => {
    const assignments = [{ ...assignment, validTo: "2026-10-06" }, { ...assignment, id: "b", validFrom: "2026-10-07", reviewerUserId: "deputy" }];
    expect(project(assignments)[0].canGenerate).toBe(false);
    expect(project(assignments)).toEqual(project([...assignments].reverse()));
  });
  it("blocks an unavailable reviewer and self review", () => {
    expect(project(undefined, undefined, undefined, people.map(person => ({ ...person, isActive: person.id !== "gm" })))[0].canGenerate).toBe(false);
    expect(project([{ ...assignment, reviewerUserId: "staff" }])[0].canGenerate).toBe(false);
  });
  it("does not create obligations for inactive subjects", () => {
    expect(project(undefined, undefined, undefined, people.map(person => ({ ...person, isActive: person.id !== "staff" })))).toEqual([]);
  });
  it("keeps months distinct and honors holidays", () => {
    const rows = projectReportingExpectations({ ...calendar, holidays: ["2026-10-30"] }, [{ ...assignment, cadence: "MONTHLY" }], people, "2026-10-01", "2026-11-30");
    expect(rows).toHaveLength(2); expect(rows[0].partial).toBe(false); expect(rows[0].coveredDates).not.toContain("2026-10-30");
  });
  it("rejects reversed and unbounded preview windows", () => {
    expect(() => project(undefined, "2026-10-09", "2026-10-05")).toThrow("range");
    expect(() => project(undefined, "2025-01-01", "2026-10-05")).toThrow("range");
  });
  it("flags approved subject leave without inferring an exemption or exposing private details", () => {
    const result = projectReportingExpectations(calendar, [assignment], people, "2026-10-05", "2026-10-09", [{ requesterUserId: "staff", startsAt: new Date("2026-10-06T14:00:00Z"), endsAt: new Date("2026-10-06T22:00:00Z") }]);
    expect(result[0]).toMatchObject({ canGenerate: false, leaveDates: ["2026-10-06"] });
    expect(result[0].coveredDates).toHaveLength(5);
  });
  it("flags a reviewer absence only when it overlaps the review window", () => {
    const result = projectReportingExpectations(calendar, [assignment], people, "2026-10-05", "2026-10-09", [{ requesterUserId: "gm", startsAt: new Date("2026-10-13T14:00:00Z"), endsAt: new Date("2026-10-13T23:00:00Z") }]);
    expect(result[0]).toMatchObject({ canGenerate: false, reviewerAbsent: true });
  });
  it("preserves daily shift deadlines and DST-local instants", () => {
    const rows = project([{ ...assignment, cadence: "DAILY", dailyDueMinute: 1440 }], "2026-10-30", "2026-11-02");
    expect(rows.map(row => row.dueAt)).toEqual(["2026-10-31T05:00:00.000Z", "2026-11-03T06:00:00.000Z"]);
  });
});
