import { describe, expect, it, vi } from "vitest";
import { externalActivityPurpose, workdayBounds, workdayDate } from "@/lib/workday-activity";
import { allActivityPages, readExternalReportActivity } from "@/server/repositories/workday-external-activity";

describe("cross-application daily activity", () => {
  it("uses the actual local workday, including daylight saving boundaries", () => {
    expect(workdayDate(new Date("2026-09-04T04:59:59Z"))).toBe("2026-09-03");
    expect(workdayDate(new Date("2026-09-04T05:00:00Z"))).toBe("2026-09-04");
    for (const [day, hours] of [["2026-03-08", 23], ["2026-11-01", 25]] as const) {
      const bounds = workdayBounds(day);
      expect((bounds.lt.getTime() - bounds.gte.getTime()) / 3600000).toBe(hours);
      expect(workdayDate(bounds.gte)).toBe(day);
    }
  });
  it("does not interpret a successful estimate or color save as completed repair work", () => {
    for (const action of ["PRESENT_ESTIMATE_COMPLETED", "CORRECT_VEHICLE_COLOR_COMPLETED", "RECORD_OBSERVATION_COMPLETED", "DECIDE_AUTHORIZATION_COMPLETED"]) expect(externalActivityPurpose(action, { sourceType: "ENTERPRISE_AUDIT" })).toBe("REPORT_WORTHY_EVENT");
    expect(externalActivityPurpose("task.completed")).toBe("COMPLETED_WORK");
    expect(externalActivityPurpose("task.work_started")).toBe("REPORT_WORTHY_EVENT");
    expect(externalActivityPurpose("task.completion_rejected")).toBe("BLOCKER_RISK");
    expect(externalActivityPurpose("page_view")).toBe("TIME_ATTENTION");
  });
  it("paginates beyond 80 and 250 events without losing IDs", async () => {
    const values = Array.from({ length: 601 }, (_, index) => ({ id: String(index) }));
    const page = vi.fn(async (cursor?: string) => { const start = cursor ? Number(cursor) + 1 : 0; return values.slice(start, start + 250); });
    expect(await allActivityPages(page)).toEqual(values);
    expect(page).toHaveBeenCalledTimes(3);
  });
  it("does not double-import a quote backfill when its recorded save already exists", async () => {
    const event = { id: "recorded-save", eventType: "diagnostic.quote_saved", createdAt: new Date("2026-09-04T14:00:00Z"), message: "Quote saved", metadata: { sourceType: "DIAGNOSTIC_DRAFT", reportSourceId: "draft:quote-1", sourceHref: "/diagnostics/labor-guide?repairOrderId=ro-1" }, taskId: null, task: null };
    const db = { activityEvent: { findMany: vi.fn().mockResolvedValue([event]) }, enterpriseAuditEvent: { findMany: vi.fn().mockResolvedValue([{ id: "failed", eventType: "SAVE_FAILED", command: { status: "FAILED" } }]) }, diagnosticWorkspaceDraft: { findMany: vi.fn().mockResolvedValue([{ id: "quote-1", title: "Sienna", version: 1, updatedAt: event.createdAt }]) } };
    expect(await readExternalReportActivity(db as never, "staff-1", "2026-09-04")).toEqual([event]);
  });
  it("reads actor-scoped activity by occurrence date, not the task's old board day", async () => {
    const activity = vi.fn().mockResolvedValue([{ id: "event-1", eventType: "task.work_started", createdAt: new Date("2026-09-04T14:00:00Z"), metadata: {}, message: "Started an older task", taskId: "old-task", task: null }]);
    const audit = vi.fn().mockResolvedValue([{ id: "audit-1", eventType: "PRESENT_ESTIMATE_COMPLETED", subjectType: "REPAIR_ORDER", subjectId: "ro-1", domain: "SHOP_PLANNING", reason: "Correct price to $900", occurredAt: new Date("2026-09-04T15:00:00Z"), command: { commandType: "PRESENT_ESTIMATE", status: "SUCCEEDED" } }]);
    const drafts = vi.fn().mockResolvedValue([{ id: "quote-1", title: "Sienna", version: 2, updatedAt: new Date("2026-09-04T16:00:00Z") }]);
    const result = await readExternalReportActivity({ activityEvent: { findMany: activity }, enterpriseAuditEvent: { findMany: audit }, diagnosticWorkspaceDraft: { findMany: drafts } } as never, "staff-1", "2026-09-04");
    expect(result).toHaveLength(3);
    expect(activity.mock.calls[0][0].where).toEqual({ actorUserId: "staff-1", createdAt: workdayBounds("2026-09-04") });
    expect(audit.mock.calls[0][0].where).toMatchObject({ actorUserId: "staff-1", organizationId: "org-time-motor-sales", occurredAt: workdayBounds("2026-09-04") });
    expect(drafts.mock.calls[0][0].where.userId).toBe("staff-1");
    expect(result[1].metadata).toMatchObject({ sourceHref: "/vehicles/repair-workbench?repairOrderId=ro-1" });
    expect(result[2].message).toContain("Not an authorization or completed repair");
  });
});
