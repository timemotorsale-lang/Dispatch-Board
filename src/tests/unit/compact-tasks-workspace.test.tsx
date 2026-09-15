import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CompactTasksList, compactTaskTitle, filterCompactTasks, type CompactTaskFilters } from "@/features/tasks/compact-tasks-workspace";
import type { BoardReadTask, BoardReadModel } from "@/server/services/board-read";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
const filters: CompactTaskFilters = { queue: "ALL", owner: "", department: "", query: "", sort: "priority" };
function task(index: number, extra: Partial<BoardReadTask> = {}): BoardReadTask {
  return { id: `task-${index}`, title: `Review assigned repair ${index}`, description: "Verify parts and record findings.", status: "NOT_STARTED", priority: "HIGH", dueAt: "2026-09-03T15:00:00Z", updatedAt: "2026-09-03T12:00:00Z", workflowArea: "SHOP", sourceType: "REPAIR_ORDER", requiresManagerApproval: true, requiredUpdateFields: [], updateFieldValues: {}, assignedUser: { id: "staff-1", name: "Ancilla Ops" }, recommendedUser: null, recommendation: null, vehicleReference: "2018 Ford Escape", customerReference: null, blockerReason: null, readyForReviewAt: null, completedAt: null, ...extra };
}
function render(tasks: BoardReadTask[], queue = "ALL", view: "list" | "board" = "list") {
  const board: BoardReadModel = { id: "board-1", date: "2026-09-03", generatedAt: null, generationStatus: "GENERATED", latestGeneration: null, taskCount: tasks.length, statusCounts: {}, sourceCounts: { template: 0, manager: 0, staff: 0 }, tasks };
  return renderToStaticMarkup(<CompactTasksList board={board} boardDate={board.date} currentUserId="staff-1" assignableUsers={[]} initialTask={null} initialSavedViews={[]} isManager={false} errorMessage={null} todayBoardDate={board.date} initialQueueFilter={queue} initialView={view} onAdvanced={vi.fn()} />);
}
describe("compact task workspace", () => {
  it("names tasks using only RO and vehicle context in both views", () => {
    const row = task(1, { title: "RO-FB4EC1D1 · Maintain the recon promise and next internal follow-up", vehicleReference: "2017 ACURA TLX · VEH-B3D73F59" });
    const name = "RO-FB4EC1D1 · 2017 ACURA TLX · VEH-B3D73F59";
    expect(compactTaskTitle(row.title, row.vehicleReference)).toBe(name);
    for (const view of ["list", "board"] as const) {
      expect(render([row], "ALL", view)).toContain(name);
      expect(render([row], "ALL", view)).not.toContain("Maintain the recon promise");
      expect(render([row], "MY_TASKS", view)).toContain(name);
    }
  });
  it("handles tasks without vehicle or RO information without empty separators", () => {
    expect(compactTaskTitle("Review daily directives", null)).toBe("Review daily directives");
    expect(compactTaskTitle("RO-123 · Review intake", null)).toBe("RO-123");
    expect(compactTaskTitle("Review intake", "2017 ACURA TLX")).toBe("2017 ACURA TLX");
  });
  it("renders the board as status-grouped cards with descriptions first and task links", () => {
    const markup = render([task(1), task(2, { status: "BLOCKED" })], "ALL", "board");
    expect(markup).toContain('aria-label="Task board"');
    expect((markup.match(/data-task-card=/g) ?? []).length).toBe(2);
    expect(markup).not.toContain("<table");
    expect(markup).toContain("Blocked");
    expect(markup.indexOf("2018 Ford Escape")).toBeLessThan(markup.indexOf("TMS-TASK1"));
    expect(markup).toContain("view%3Dboard");
    expect(markup).toContain("Open");
    expect(markup).toContain("Update");
    expect(markup).toContain("Assign");
  });
  it("applies My Tasks ownership to cards and retains empty and paginated states", () => {
    const rows = [task(1), task(2, { assignedUser: { id: "other", name: "Other" } })];
    expect((render(rows, "MY_TASKS", "board").match(/data-task-card=/g) ?? []).length).toBe(1);
    expect(render([], "MY_TASKS", "board")).toContain("No tasks match this view");
    expect((render(Array.from({ length: 30 }, (_, i) => task(i)), "ALL", "board").match(/data-task-card=/g) ?? []).length).toBe(25);
  });
  it("renders 25 tasks by default, description first and number last, without an always-open rail", () => {
    const markup = render(Array.from({ length: 30 }, (_, index) => task(index)));
    expect((markup.match(/data-task-row=/g) ?? []).length).toBe(25);
    expect(markup).toContain("of 30 tasks");
    const header = markup.match(/<thead>([\s\S]*?)<\/thead>/)?.[1] ?? "";
    expect(header.indexOf("Task description")).toBeLessThan(header.indexOf("Priority"));
    expect(header).toMatch(/Task #<\/th><\/tr>$/);
    expect(markup).toContain('aria-label="Rows per page"');
    expect(markup).toContain("Operations tools");
    expect(markup).toContain('aria-label="Task work health"');
    expect(markup).toContain('aria-label="Saved execution views"');
    expect(markup).toContain("Live board");
    expect(markup).toContain("Quick actions for");
    expect(markup).not.toContain("tasks-console-rail");
    expect(markup).not.toContain("Open task workbench");
  });
  it("keeps My Tasks scoped to unfinished assignments for the current user", () => {
    const rows = [task(1), task(2, { status: "COMPLETED" }), task(3, { assignedUser: { id: "other", name: "Other" } })];
    expect(filterCompactTasks(rows, { ...filters, queue: "MY_TASKS" }, "staff-1").map(row => row.id)).toEqual(["task-1"]);
    expect((render(rows, "MY_TASKS").match(/data-task-row=/g) ?? []).length).toBe(1);
  });
  it("searches RO and vehicle references while showing the instruction first", () => {
    const row = task(1, { title: "RO-0691C247 · Complete intake review" });
    expect(compactTaskTitle(row.title)).toBe("Complete intake review");
    expect(filterCompactTasks([row], { ...filters, query: "RO-0691C247" }, "staff-1")).toHaveLength(1);
    expect(filterCompactTasks([row], { ...filters, query: "Ford Escape" }, "staff-1")).toHaveLength(1);
    expect(filterCompactTasks([row], { ...filters, query: "TMS-TASK1" }, "staff-1")).toHaveLength(1);
  });
  it("combines department and owner filters and orders urgent tasks first", () => {
    const rows = [task(1), task(2, { priority: "CRITICAL" }), task(3, { workflowArea: "SALES" })];
    expect(filterCompactTasks(rows, { ...filters, department: "SHOP", owner: "staff-1" }, "staff-1").map(row => row.id)).toEqual(["task-2", "task-1"]);
  });
  it("sorts by the instruction rather than the leading RO number", () => {
    const rows = [task(1, { title: "RO-001 · Zebra inspection" }), task(2, { title: "RO-999 · Approve estimate" })];
    expect(filterCompactTasks(rows, { ...filters, sort: "description" }, "staff-1").map(row => row.id)).toEqual(["task-2", "task-1"]);
  });
  it("filters blocked, review, and overdue queues without including completed work as overdue", () => {
    const rows = [task(1, { status: "BLOCKED" }), task(2, { status: "READY_FOR_REVIEW" }), task(3, { status: "COMPLETED" })];
    expect(filterCompactTasks(rows, { ...filters, queue: "BLOCKED" }, "staff-1")).toHaveLength(1);
    expect(filterCompactTasks(rows, { ...filters, queue: "READY_FOR_REVIEW" }, "staff-1")).toHaveLength(1);
    expect(filterCompactTasks(rows, { ...filters, queue: "OVERDUE" }, "staff-1", Date.parse("2026-09-04"))).toHaveLength(2);
  });
});
