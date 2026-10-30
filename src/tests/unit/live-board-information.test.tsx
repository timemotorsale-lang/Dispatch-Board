import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TeamOperationsRows, TeamPersonDetails } from "@/features/board/team/team-now";
import { BoardToolbar } from "@/features/board/board-toolbar";
import type { DispatchTeam, TeamRow } from "@/lib/dispatch-team";
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
const date = "2026-10-29";
const person: TeamRow = { id: "staff", name: "Alex Morgan", state: "WORKING", title: "Receive delivery", taskId: "task-1", focusId: null, updatedAt: "2026-10-29T14:00:00Z", startedAt: null, overnight: false, updateNeeded: false, nextAction: "Confirm quantities", version: 1,
  tasks: [{ id: "task-1", title: "Receive delivery", status: "IN_PROGRESS", assignedUserId: "staff", ownerUserId: "staff", updatedAt: "2026-10-29T14:00:00Z", boardDate: date, blockerReason: null, isClaimable: false }],
  focuses: ["Confirm appointments", "Photograph arrivals", "Receive parts"].map((title, index) => ({ id: "focus-" + index, title, status: "PLANNED", taskId: null, businessDate: date })) };
const data: DispatchTeam = { date, today: date, historical: false, syncedAt: "2026-10-29T14:00:00Z", actorUserId: "staff", canReviewReports: false, canManage: false, people: [{ id: person.id, name: person.name }], rows: [person], handoffs: [], unassigned: [], limitation: null };
describe("Live Board is an information display of existing tools", () => {
  it("shows current work separately from the workbook focuses without a second submission", () => {
    const markup = renderToStaticMarkup(<TeamOperationsRows data={data} onSelect={() => {}} />);
    for (const title of ["Alex Morgan", "Receive delivery", ...person.focuses.map(item => item.title)]) expect(markup).toContain(title);
    expect(markup).toContain("Workbook focuses"); expect(markup).not.toContain("Morning plan pending");
    expect(markup).not.toMatch(/<form|<input|<select|Submit today|Plan for today/);
  });
  it.each([false, true])("keeps a person's detail read-only, including for a manager (%s)", canManage => {
    const markup = renderToStaticMarkup(<TeamPersonDetails person={person} data={{ ...data, canManage }} />);
    expect(markup).toContain('href="/tasks/task-1"'); expect(markup).toContain("View daily report");
    expect(markup).not.toMatch(/<form|<input|<select|<textarea|Start focus|Make current|Hand off|Approve|Submit today|Availability/);
  });
  it("retains an honest empty workbook state rather than prompting planning on the board", () => {
    const markup = renderToStaticMarkup(<TeamPersonDetails person={{ ...person, focuses: [] }} data={data} />);
    expect(markup).toContain("No workbook focuses recorded for this day.");
    expect(markup).not.toMatch(/required focuses|Open workbook|Submit|Add focus/);
  });
  it.each(["live", "overview"] as const)("keeps operating tools on Overview and viewing controls on Live Board (%s)", boardView => {
    const markup = renderToStaticMarkup(<BoardToolbar assignableUsers={[]} boardDate={date} boardView={boardView} generationFeedback={null} generationStatus="NOT_STARTED" isGeneratePending={false} isManager latestGeneration={null} onBoardDateChange={() => {}} onGenerateBoard={() => {}} onBoardRefreshRequested={() => {}} />);
    expect(markup).toContain("Board date"); expect(markup).toContain("Refresh");
    if (boardView === "live") { expect(markup).not.toContain("Task Intake"); expect(markup).not.toContain("Review Today"); expect(markup).not.toContain("No generation"); }
    else { expect(markup).toContain("Task Intake"); expect(markup).toContain("Review Today"); }
  });
});
