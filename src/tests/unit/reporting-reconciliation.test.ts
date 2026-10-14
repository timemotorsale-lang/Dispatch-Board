import { describe, expect, it } from "vitest";
import { reconcileReportTasks, type TaskObservation } from "@/lib/reporting/reconciliation";

function observation(taskId: string, boardDate: string, state = "OPEN", parentTaskId: string | null | undefined = null): TaskObservation {
  return { taskId, boardDate, parentTaskId, row: { id: `task:${taskId}`, title: `Work ${taskId}`, state, owner: "Staff", href: `/tasks/${taskId}` } };
}
describe("period work reconciliation", () => {
  it("counts carried work once and removes it from outstanding after completion", () => {
    const result = reconcileReportTasks([observation("a", "2026-09-01"), observation("b", "2026-09-02", "OPEN", "a"), observation("c", "2026-09-03", "COMPLETED", "b")]);
    expect(result.completed.map(row => row.id)).toEqual(["task:c"]);
    expect(result.carryover).toEqual([]);
    expect(result.unresolvedLineageCount).toBe(0);
  });
  it("does not discard outstanding work absent from the latest snapshot", () => {
    const result = reconcileReportTasks([observation("a", "2026-09-01"), observation("b", "2026-09-02", "COMPLETED")]);
    expect(result.carryover.map(row => row.id)).toEqual(["task:a"]);
    expect(result.carryover[0].occurredAt).toBe("2026-09-01");
  });
  it("marks reopened work as a subset of outstanding, not completed", () => {
    const result = reconcileReportTasks([observation("a", "2026-09-01", "COMPLETED"), observation("b", "2026-09-02", "BLOCKED", "a")]);
    expect(result.completed).toEqual([]);
    expect(result.reopened.map(row => row.id)).toEqual(result.carryover.map(row => row.id));
  });
  it("clears reopened status after observed recompletion", () => {
    const result = reconcileReportTasks([observation("a", "2026-09-01", "COMPLETED"), observation("a", "2026-09-02"), observation("a", "2026-09-03", "COMPLETED")]);
    expect(result.reopened).toEqual([]);
    expect(result.completed).toHaveLength(1);
  });
  it("orders historical evidence independently of caller order", () => {
    const rows = [observation("a", "2026-09-01"), observation("b", "2026-09-02", "COMPLETED", "a")];
    expect(reconcileReportTasks(rows)).toEqual(reconcileReportTasks([...rows].reverse()));
  });
  it("uses later same-day current-state overlays", () => {
    expect(reconcileReportTasks([observation("a", "2026-09-01", "COMPLETED"), observation("a", "2026-09-01", "OPEN")]).reopened).toHaveLength(1);
  });
  it("keeps legacy evidence separate without guessing by title", () => {
    const rows = [observation("a", "2026-09-01"), observation("b", "2026-09-02")];
    rows.forEach(item => { item.parentTaskId = undefined; item.row.title = "Same title"; });
    expect(reconcileReportTasks(rows).carryover).toHaveLength(2);
    expect(reconcileReportTasks(rows).unresolvedLineageCount).toBe(2);
  });
  it("does not link through missing or out-of-scope parents", () => {
    const result = reconcileReportTasks([observation("a", "2026-09-01", "OPEN", "not-visible"), observation("b", "2026-09-02", "OPEN", "not-visible")]);
    expect(result.carryover).toHaveLength(2);
    expect(result.unresolvedLineageCount).toBe(2);
  });
  it("rejects cycles and conflicting parent identities without collapsing work", () => {
    expect(reconcileReportTasks([observation("a", "2026-09-01", "OPEN", "b"), observation("b", "2026-09-02", "OPEN", "a")]).carryover).toHaveLength(2);
    const conflict = reconcileReportTasks([observation("a", "2026-09-01"), observation("b", "2026-09-02", "OPEN", "a"), observation("b", "2026-09-03", "OPEN", "c"), observation("c", "2026-09-01")]);
    expect(conflict.carryover).toHaveLength(3);
    expect(conflict.unresolvedLineageCount).toBe(1);
  });
  it("bounds corrupt or unusually deep lineage traversal", () => {
    const rows = Array.from({ length: 130 }, (_, index) => observation(String(index), "2026-09-01", "OPEN", index ? String(index - 1) : null));
    expect(reconcileReportTasks(rows).unresolvedLineageCount).toBeGreaterThan(0);
  });
});
