import { describe, expect, it } from "vitest";
import { blockerLabel, displayPageSize, fullTimestamp, matchesOperationalState, relativeTime, sourceDelayed, visibleTeamRows } from "@/lib/dispatch-display";
import { projectTeamRow, type DispatchTeam, type TeamTask } from "@/lib/dispatch-team";
import { DEFAULT_BOARD_FILTERS } from "@/features/board/board-grouping";
const now = "2026-10-29T15:00:00Z";
const tasks: TeamTask[] = [
  { id: "shop", title: "Receive brake parts", workflowArea: "SHOP", status: "WAITING_ON_PARTS", assignedUserId: "staff", ownerUserId: "staff", updatedAt: now, boardDate: "2026-10-28", blockerReason: "Supplier ETA Friday", isClaimable: false },
  { id: "sales", title: "Confirm customer pickup", workflowArea: "SALES", status: "IN_PROGRESS", assignedUserId: "staff", ownerUserId: "staff", updatedAt: now, boardDate: "2026-10-29", blockerReason: null, isClaimable: false }
];
const row = projectTeamRow({ person: { id: "staff", name: "Alex Morgan" }, date: "2026-10-29", now, tasks, focuses: [{ id: "focus", title: "Photograph arrivals", status: "PLANNED", taskId: null, businessDate: "2026-10-29" }] });
const data = { date: "2026-10-29", rows: [row] } as DispatchTeam;
describe("shared operations viewing", () => {
  it("requires the same job to satisfy work area and status together", () => {
    expect(visibleTeamRows(data, { ...DEFAULT_BOARD_FILTERS, workflowArea: "SHOP", status: "IN_PROGRESS" })).toHaveLength(0);
    expect(visibleTeamRows(data, { ...DEFAULT_BOARD_FILTERS, workflowArea: "SHOP", status: "WAITING_ON_PARTS" })).toHaveLength(1);
  });
  it("supports person and workbook focus discovery without creating work", () => {
    expect(visibleTeamRows(data, { ...DEFAULT_BOARD_FILTERS, assigneeId: "other" })).toHaveLength(0);
    expect(visibleTeamRows(data, { ...DEFAULT_BOARD_FILTERS, searchText: "photograph" })).toHaveLength(1);
    expect(visibleTeamRows(data, { ...DEFAULT_BOARD_FILTERS, searchText: "Alex" })).toHaveLength(1);
    expect(visibleTeamRows(data, { ...DEFAULT_BOARD_FILTERS, metricFilter: "stuck" })).toHaveLength(1);
  });
  it("keeps the same named order when source status changes", () => {
    const second = { ...row, id: "second", name: "Taylor Lane", state: "BLOCKED" as const };
    expect(visibleTeamRows({ ...data, rows: [row, second] }, DEFAULT_BOARD_FILTERS).map(item => item.name)).toEqual(["Alex Morgan", "Taylor Lane"]);
  });
  it("uses the same metric rules as work records", () => {
    expect(matchesOperationalState(tasks[0], { ...DEFAULT_BOARD_FILTERS, metricFilter: "stuck" })).toBe(true);
    expect(matchesOperationalState(tasks[1], { ...DEFAULT_BOARD_FILTERS, metricFilter: "stuck" })).toBe(false);
  });
  it("shows a plain blocker reason even when no custom explanation exists", () => {
    expect(blockerLabel({ status: "WAITING_ON_PARTS", blockerReason: null })).toBe("Waiting for parts");
    expect(blockerLabel(tasks[0])).toContain("Supplier ETA Friday");
    expect(blockerLabel(tasks[1])).toBe("");
  });
});
describe("freshness and shared-screen display", () => {
  it("separates record age from refresh age and detects delayed synchronization", () => {
    expect(relativeTime("2026-10-29T14:55:00Z", now)).toBe("5 minutes ago");
    expect(relativeTime("2026-10-27T14:55:00Z", now)).toBe("2 days ago");
    expect(sourceDelayed(now, now)).toBe(false);
    expect(sourceDelayed("2026-10-29T14:59:00Z", now)).toBe(true);
    expect(sourceDelayed(now, now, "Offline")).toBe(true);
    expect(sourceDelayed(null, now, "Failed")).toBe(true);
  });
  it("keeps full business dates available, including daylight-saving boundaries", () => {
    expect(fullTimestamp("2026-11-01T06:30:00Z", "America/Chicago")).toContain("Nov 1, 2026");
    expect(fullTimestamp("2026-10-29T02:00:00Z", "America/Chicago")).toContain("Oct 28, 2026");
  });
  it("fits fewer stable rows on a smaller display", () => {
    expect(displayPageSize(720)).toBe(3); expect(displayPageSize(1080)).toBe(5); expect(displayPageSize(200)).toBe(1);
  });
});
