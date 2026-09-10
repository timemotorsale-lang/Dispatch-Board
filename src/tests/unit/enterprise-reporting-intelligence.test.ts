import { describe, expect, it } from "vitest";
import { buildEnterpriseReportingBrief } from "@/lib/enterprise-reporting-intelligence";

describe("enterprise reporting intelligence", () => {
  it("builds manager-ready report sections from actual source records", () => {
    const brief = buildEnterpriseReportingBrief({
      generatedAt: new Date("2026-09-09T21:30:00.000Z"),
      sources: [
        { createdAt: "2026-09-09T14:00:00.000Z", detail: "Customer was called and appointment was confirmed.", href: "/crm/customers/customer-1", id: "crm-1", kind: "crm_action", ownerName: "Eli Manager", status: "DONE", title: "Confirmed appointment" },
        { createdAt: "2026-09-09T15:00:00.000Z", detail: "Vehicle is aging in recon because parts have not arrived.", href: "/vehicles/360/vehicle-1", id: "vehicle-1", kind: "vehicle_activity", ownerName: "Shop", status: "BLOCKED", title: "Recon aging risk" },
        { createdAt: "2026-09-09T16:00:00.000Z", detail: "Staff completed the sold vehicle delivery task.", href: "/tasks/task-1", id: "task-1", kind: "completed_task", ownerName: "Ancilla", status: "DONE", title: "Delivered sold vehicle" },
        { createdAt: "2026-09-09T17:00:00.000Z", detail: "Title packet is still missing.", href: "/vehicles/360/vehicle-2?section=documents", id: "seed-1", kind: "report_seed", ownerName: "Eli Manager", reportTypes: ["compliance", "manager_daily_close"], status: "CANDIDATE", title: "Missing title packet" },
      ],
    });

    expect(brief).toMatchObject({
      generatedAt: "2026-09-09T21:30:00.000Z",
      managerSummary: "4 source-backed item(s) prepared across 8 manager-ready report section(s).",
      reviewableSeedCount: 1,
      sourceCount: 4,
    });
    expect(brief.sections.map((section) => section.title)).toEqual([
      "Daily staff report",
      "Manager daily close",
      "Weekly productivity",
      "CRM pipeline",
      "Customer follow-up report",
      "Vehicle aging report",
      "Recon bottleneck report",
      "Compliance report",
    ]);
    expect(brief.sections.find((section) => section.reportType === "manager_daily_close")?.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceId: "seed-1", sourceKind: "report_seed", title: "Missing title packet" }),
    ]));
    expect(brief.sections.find((section) => section.reportType === "vehicle_aging")?.items[0]).toMatchObject({
      detail: "Status: BLOCKED. Vehicle is aging in recon because parts have not arrived.",
      href: "/vehicles/360/vehicle-1",
    });
  });

  it("keeps custom report mappings reviewable without losing defaults", () => {
    const brief = buildEnterpriseReportingBrief({
      sources: [
        { createdAt: "2026-09-09T18:00:00.000Z", detail: "Manager coached repeated carryover into a smaller task.", id: "note-1", kind: "manager_note", reportTypes: ["coaching"], title: "Carryover coaching" },
      ],
    });

    expect(brief.sections).toEqual([
      expect.objectContaining({
        reportType: "coaching",
        items: [expect.objectContaining({ ownerName: "Unassigned", sourceId: "note-1" })],
      }),
    ]);
    expect(brief.reviewableSeedCount).toBe(1);
  });
});
