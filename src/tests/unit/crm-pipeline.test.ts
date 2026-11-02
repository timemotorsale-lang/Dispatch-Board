import { describe, expect, it } from "vitest";
import { pipelineSignals, resolvePipelinePeriod, type PipelineRow } from "@/lib/crm-pipeline";
import { defaultPipelineFilters, filterPipelineRows, recordedPipelinePlan } from "@/lib/crm-pipeline-views";
import { previousPipelineRange, summarizePipeline } from "@/lib/crm-pipeline-reporting";
import { estimatedPipelineTotal, leadInboxRows, operationRows } from "@/lib/crm-pipeline-workspaces";

const now = new Date("2026-11-01T18:00:00Z");
function record(overrides: Partial<PipelineRow> = {}): PipelineRow {
  return { id: "one", opportunityNumber: "OPP-ONE", title: "Synthetic inquiry", summary: null, stage: "NEW_INQUIRY", version: 1, customerId: "customer", customerName: "Synthetic buyer", ownerUserId: "owner", ownerName: "Owner", ownerActive: true, sourceCode: "TEST", sourceLeadId: null, vehicle: "Test vehicle", pathway: "retail-sale", temperature: "WARM", disposition: "ACTIVE", nextActionLabel: "Call customer", nextActionDueAt: "2026-10-31T16:00:00.000Z", expectedCloseAt: null, estimatedValueCents: null, receivedAt: "2026-09-30T16:00:00.000Z", updatedAt: "2026-10-31T16:00:00.000Z", stageEnteredAt: null, soldAt: null, completedAt: null, reviewAt: null, pushCount: 0, pendingOwnerId: null, handoffDueAt: null, dealId: null, dealStatus: null, exceptions: [], tasks: [], history: [], sequence: null, ...overrides };
}
describe("pipeline calendar periods", () => {
  it.each([
    ["today", "2026-11-01", "2026-11-01"], ["yesterday", "2026-10-31", "2026-10-31"],
    ["this_week", "2026-10-26", "2026-11-01"], ["last_week", "2026-10-19", "2026-10-25"],
    ["two_weeks_ago", "2026-10-12", "2026-10-18"], ["last_two_weeks", "2026-10-12", "2026-10-25"],
    ["this_month", "2026-11-01", "2026-11-30"], ["last_month", "2026-10-01", "2026-10-31"],
    ["past_14_days", "2026-10-18", "2026-10-31"]
  ])("resolves %s on the store clock", (preset, startDate, endDate) => {
    expect(resolvePipelinePeriod(preset, now)).toMatchObject({ startDate, endDate, timezone: "America/Chicago" });
  });
  it("handles the fall 25-hour day and spring 23-hour day", () => {
    for (const [time, hours] of [["2026-11-01T18:00:00Z", 25], ["2026-03-08T18:00:00Z", 23]] as const) {
      const r = resolvePipelinePeriod("today", new Date(time)); expect(Date.parse(r.endExclusive) - Date.parse(r.start)).toBe(hours * 3600000);
    }
  });
  it("handles leap days and year rollover", () => {
    expect(resolvePipelinePeriod("last_month", new Date("2024-03-01T18:00:00Z"))).toMatchObject({ startDate: "2024-02-01", endDate: "2024-02-29" });
    expect(resolvePipelinePeriod("last_week", new Date("2027-01-04T18:00:00Z"))).toMatchObject({ startDate: "2026-12-28", endDate: "2027-01-03" });
  });
  it("uses local yesterday when the UTC day has already advanced", () => { expect(resolvePipelinePeriod("today", new Date("2026-11-02T02:00:00Z")).startDate).toBe("2026-11-01"); });
  it("rejects invalid or reversed custom ranges", () => {
    expect(() => resolvePipelinePeriod("custom", now, "2026-02-30", "2026-03-02")).toThrow();
    expect(() => resolvePipelinePeriod("custom", now, "2026-11-02", "2026-11-01")).toThrow();
  });
});
describe("pipeline continuity and historical queues", () => {
  it("retains qualified inquiries in their own inbox queue and tracks recorded review", () => {
    const reviewed = record({ id: "reviewed", stage: "QUALIFIED", inquiryReviewedAt: now.toISOString() }), fresh = record();
    expect(leadInboxRows([reviewed, fresh], "all")).toHaveLength(2);
    expect(leadInboxRows([reviewed, fresh], "unreviewed")).toEqual([fresh]);
    expect(leadInboxRows([reviewed, fresh], "qualified")).toEqual([reviewed]);
  });
  it("separates operational pathways and keeps sold fulfillment independently accessible", () => {
    const sale = record(), repair = record({ id: "repair", pathway: "repairs" }), rental = record({ id: "rental", pathway: "daily-rental" }), sold = record({ id: "sold", dealStatus: "SOLD", stage: "WON" });
    expect(operationRows([sale, repair, rental], "sales")).toEqual([sale]);
    expect(operationRows([sale, repair, rental], "vehicle_use")).toEqual([rental]);
    expect(operationRows([sale, sold], "fulfillment")).toEqual([sold]);
  });
  it("keeps zero-valued known estimates distinct from an entirely unknown lane", () => {
    expect(estimatedPipelineTotal([record()])).toEqual({ value: null, unknown: 1 });
    expect(estimatedPipelineTotal([record(), record({ estimatedValueCents: 0 })])).toEqual({ value: 0, unknown: 1 });
  });
  it("flags invalid contact and repeated snoozes without discarding the inquiry", () => {
    const signals = pipelineSignals(record({ customerId: null, contact: { phone: "not a phone", email: "missing-at" }, followUpPushCount: 3 }), now);
    expect(signals.filter(([code]) => code === "CONTACT_REVIEW")).toHaveLength(1);
    expect(signals.map(([code]) => code)).toContain("REPEATED_SNOOZE");
    expect(signals.map(([code]) => code)).toContain("FIRST_RESPONSE_OVERDUE");
  });
  it("compares calendar months across different lengths and DST boundaries", () => {
    const previous = previousPipelineRange(resolvePipelinePeriod("this_month", now));
    expect(previous).toMatchObject({ startDate: "2026-10-01", endDate: "2026-10-31", start: "2026-10-01T05:00:00.000Z", endExclusive: "2026-11-01T05:00:00.000Z" });
  });
  it("counts linked sales and appointments once and preserves unknown response evidence", () => {
    const range = resolvePipelinePeriod("today", now), a = record({ id: "a", dealId: "shared", soldAt: now.toISOString(), receivedAt: now.toISOString(), appointments: [{ id: "appointment", title: "Test", startsAt: now.toISOString(), attendance: "NO_SHOW", status: "SCHEDULED" }] });
    const result = summarizePipeline([a, { ...a, id: "b" }], range);
    expect(result).toMatchObject({ sold: 1, received: 2, meanResponseMinutes: null, responded: 0, appointments: 1, noShows: 1 });
  });
  it("retains unfinished October work in November without moving its date", () => {
    const r = record(); expect(filterPipelineRows([r], defaultPipelineFilters, "owner", now)).toEqual([r]); expect(r.nextActionDueAt).toBe("2026-10-31T16:00:00.000Z");
  });
  it("separates receipt history from due dates and includes unknown dates in recovery", () => {
    const r = record({ nextActionDueAt: null });
    expect(filterPipelineRows([r], defaultPipelineFilters, "owner", now)).toHaveLength(1);
    expect(filterPipelineRows([r], { ...defaultPipelineFilters, basis: "received" }, "owner", now)).toHaveLength(0);
    expect(filterPipelineRows([r], { ...defaultPipelineFilters, view: "no_activity" }, "owner", now)).toHaveLength(1);
  });
  it("does not count midnight at the end boundary twice", () => {
    const r = record({ soldAt: "2026-11-02T06:00:00.000Z", stage: "WON" });
    expect(filterPipelineRows([r], { ...defaultPipelineFilters, basis: "sold" }, "owner", now)).toHaveLength(0);
  });
  it("keeps an unaccepted handoff and inactive owner visible", () => {
    const r = record({ ownerActive: false, pendingOwnerId: "new-owner", handoffDueAt: "2026-10-31T12:00:00Z" });
    expect(pipelineSignals(r, now).map(([code]) => code)).toEqual(expect.arrayContaining(["INACTIVE_OWNER", "HANDOFF_OVERDUE", "OVERDUE"]));
  });
  it("retains waiting reviews and does not invent a closing-plan snapshot", () => {
    const r = record({ disposition: "WAITING", reviewAt: "2026-10-31T12:00:00Z", updatedAt: "2026-11-02T12:00:00Z" });
    expect(pipelineSignals(r, now).map(([code]) => code)).toContain("REVIEW_DUE");
    expect(recordedPipelinePlan(r, "2026-11-01T05:00:00Z")).toBeUndefined();
  });
  it("recovers the old closing plan from the first later audited change", () => {
    const r = record({ updatedAt: "2026-11-02T12:00:00Z", expectedCloseAt: "2026-11-15T06:00:00Z", history: [{ id: "change", eventType: "EDIT", reason: "Customer asked to move", actor: "Manager", occurredAt: "2026-11-02T12:00:00Z", priorValue: { expectedCloseAt: "2026-10-31T05:00:00Z" }, newValue: { expectedCloseAt: "2026-11-15T06:00:00Z" } }] });
    expect(recordedPipelinePlan(r, "2026-11-01T05:00:00Z")).toBe("2026-10-31T05:00:00Z");
  });
  it("shows archived work only in its explicit historical section", () => {
    const r = record({ disposition: "ARCHIVED" });
    expect(filterPipelineRows([r], defaultPipelineFilters, "owner", now)).toHaveLength(0);
    expect(filterPipelineRows([r], { ...defaultPipelineFilters, view: "archived" }, "owner", now)).toHaveLength(1);
  });
  it("keeps remaining tasks visible after the sales outcome is won", () => {
    const r = record({ stage: "WON", tasks: [{ id: "remaining", title: "Review signed paperwork", dueAt: "2026-10-31T16:00:00.000Z", status: "NOT_STARTED", completedAt: null, requiresManagerApproval: false, assignedUserId: "owner" }] });
    expect(filterPipelineRows([r], defaultPipelineFilters, "owner", now)).toHaveLength(1);
  });
});
