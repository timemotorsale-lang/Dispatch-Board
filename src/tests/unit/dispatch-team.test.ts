import { describe, expect, it } from "vitest";
import { projectTeamRow, dispatchReportLink, type TeamTask } from "@/lib/dispatch-team";
import { assertDailyFocusMinimum, distinctDailyFocuses } from "@/lib/daily-focus-policy";
import { assertHandoffDecision, normalizeDispatchCommand } from "@/server/dispatch/command";
const person = { id: "staff", name: "Staff Member" };
const task: TeamTask = { id: "task", title: "Repair work", assignedUserId: person.id, ownerUserId: person.id, status: "IN_PROGRESS", updatedAt: "2026-10-29T14:00:00Z", boardDate: "2026-10-29", blockerReason: null, isClaimable: false };
const base = { person, tasks: [] as TeamTask[], focuses: [], date: "2026-10-29", now: "2026-10-29T16:00:00Z" };
const presence = { state: "WORKING", businessDate: base.date, primaryTaskId: task.id, primaryFocusId: null, updatedAt: "2026-10-29T14:00:00Z", startedAt: "2026-10-29T14:00:00Z", nextAction: "", version: 1 };
describe("Team now projection", () => {
  it("does not infer availability from having no work", () => expect(projectTeamRow(base).state).toBe("UNKNOWN"));
  it("does not present a planned focus as current work", () => {
    const row = projectTeamRow({ ...base, focuses: [{ id: "focus", title: "Photograph vehicles", status: "PLANNED", taskId: null, businessDate: base.date }] });
    expect(row.state).toBe("UNKNOWN"); expect(row.title).toBeNull();
  });
  it("retains multiple active jobs but displays the selected primary focus", () => {
    const row = projectTeamRow({ ...base, tasks: [task, { ...task, id: "other" }], presence });
    expect(row.taskId).toBe("task"); expect(row.tasks).toHaveLength(2);
  });
  it("shows a freshness indicator without inventing a status change", () => {
    const row = projectTeamRow({ ...base, tasks: [task], presence });
    expect(row.state).toBe("WORKING"); expect(row.updateNeeded).toBe(true);
  });
  it("keeps explicit availability separate from existing task state", () => {
    const row = projectTeamRow({ ...base, tasks: [task], presence: { ...presence, state: "AVAILABLE", primaryTaskId: null } });
    expect(row.state).toBe("AVAILABLE"); expect(row.taskId).toBeNull(); expect(row.tasks[0].status).toBe("IN_PROGRESS");
  });
  it("does not turn yesterday's manual focus into today's work", () => {
    expect(projectTeamRow({ ...base, presence: { ...presence, businessDate: "2026-10-28", primaryTaskId: null, primaryFocusId: "manual" } }).state).toBe("UNKNOWN");
  });
  it("preserves legitimate overnight work", () => {
    const row = projectTeamRow({ ...base, tasks: [{ ...task, boardDate: "2026-10-28" }], presence: { ...presence, businessDate: "2026-10-28" } });
    expect(row.state).toBe("WORKING"); expect(row.overnight).toBe(true);
  });
  it("does not assume a receiver started a handoff merely because the task is active", () => {
    expect(projectTeamRow({ ...base, tasks: [task], presence: { ...presence, state: "UNKNOWN", primaryTaskId: null } }).state).toBe("UNKNOWN");
  });
  it("links reviewers to the exact person/day and staff to their own report", () => {
    expect(dispatchReportLink(base.date, person.id, true)).toContain("subject=staff");
    expect(dispatchReportLink(base.date, person.id, false)).not.toContain("subject=");
    expect(dispatchReportLink(base.date, person.id, true)).toContain("rangeMode=day");
  });
});
describe("morning focus submission", () => {
  it("requires three distinct, nonblank outcomes", () => {
    expect(() => assertDailyFocusMinimum([{ outcome: "Call customers" }, { outcome: " call   CUSTOMERS " }, { outcome: "" }])).toThrow("at least 3 distinct");
    expect(distinctDailyFocuses([{ outcome: " A " }, { outcome: "a" }])).toHaveLength(1);
    expect(() => assertDailyFocusMinimum(["Calls", "Photography", "Receiving"].map(outcome => ({ outcome })))).not.toThrow();
  });
});
describe("handoff authority and validation", () => {
  const decision = { action: "ACCEPT_HANDOFF" as const, actorId: "receiver", manager: false, senderId: "sender", receiverId: "receiver", status: "PENDING", expectedVersion: 0, version: 0, reason: "" };
  it("allows only the receiver to accept, including for managers", () => {
    expect(() => assertHandoffDecision(decision)).not.toThrow();
    expect(() => assertHandoffDecision({ ...decision, actorId: "manager", manager: true })).toThrow("receiving person");
  });
  it("rejects stale or already decided handoffs", () => {
    expect(() => assertHandoffDecision({ ...decision, status: "ACCEPTED" })).toThrow("changed");
    expect(() => assertHandoffDecision({ ...decision, expectedVersion: 1 })).toThrow("changed");
  });
  it("requires a decline reason and permits the sender to cancel", () => {
    expect(() => assertHandoffDecision({ ...decision, action: "DECLINE_HANDOFF" })).toThrow("short reason");
    expect(() => assertHandoffDecision({ ...decision, action: "CANCEL_HANDOFF", actorId: "sender" })).not.toThrow();
  });
  it("requires a reason when a manager cancels someone else's handoff", () => {
    expect(() => assertHandoffDecision({ ...decision, action: "CANCEL_HANDOFF", actorId: "manager", manager: true })).toThrow("manager cancellation");
  });
  it.each(["SET_FOCUS", "PLAN_FOCUS", "SUBMIT_FOCUS", "AVAILABILITY"])("keeps %s in its source workspace rather than creating another board workflow", action => {
    expect(() => normalizeDispatchCommand({ action, date: base.date, expectedVersion: 0, idempotencyKey: "operation-key-123456" })).toThrow("Invalid dispatch action");
  });
  it("bounds input and requires an operation key and version", () => {
    expect(() => normalizeDispatchCommand({ action: "REQUEST_HANDOFF", date: base.date, expectedVersion: -1, idempotencyKey: "operation-key-123456" })).toThrow("version");
    expect(() => normalizeDispatchCommand({ action: "REQUEST_HANDOFF", date: base.date, expectedVersion: 0, idempotencyKey: "operation-key-123456", nextAction: "x".repeat(501) })).toThrow("nextAction");
  });
});
