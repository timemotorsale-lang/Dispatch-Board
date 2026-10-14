import { describe, expect, it } from "vitest";

import { buildGrowthCrmWritebackPreview } from "@/server/growth/crm-writeback-preview";
import { classifyGrowthAttribution, normalizeGrowthResultEvents } from "@/server/growth/results-attribution";

describe("growth CRM writeback preview", () => {
  it("prepares CRM and task writebacks without mutating source records", () => {
    const [reply, open] = normalizeGrowthResultEvents([
      {
        campaignId: "G-1",
        customerId: "customer-1",
        eventType: "reply",
        occurredAt: "2026-09-08T09:00:00-05:00",
        source: "Provider",
        valueCents: 0
      },
      {
        campaignId: "G-1",
        customerId: "customer-2",
        eventType: "open",
        occurredAt: "2026-09-08T09:10:00-05:00",
        source: "Provider",
        valueCents: 0
      }
    ]);
    const preview = buildGrowthCrmWritebackPreview({
      approvalRequested: true,
      attribution: [
        { event: reply, tier: classifyGrowthAttribution(reply, "2026-09-07T12:00:00-05:00") },
        { event: open, tier: classifyGrowthAttribution(open, "2026-09-07T12:00:00-05:00") }
      ],
      campaignId: "G-1",
      includedAudienceCount: 48,
      messageApproved: true
    });

    expect(preview.canMutateCrm).toBe(false);
    expect(preview.events.every((event) => event.locked)).toBe(true);
    expect(preview.events.map((event) => event.eventType)).toEqual([
      "Campaign prepared",
      "Audience reviewed",
      "Message approved",
      "Follow-up task prepared",
      "Result attributed",
      "Result attributed"
    ]);
    expect(preview.preservation).toContain("estimates, quotes, invoices");
  });

  it("does not preview unattributed events as CRM proof", () => {
    const [lateService] = normalizeGrowthResultEvents([
      {
        campaignId: "G-1",
        customerId: "customer-1",
        eventType: "service",
        occurredAt: "2026-11-10T09:00:00-05:00",
        source: "Service",
        valueCents: 45000
      }
    ]);
    const preview = buildGrowthCrmWritebackPreview({
      approvalRequested: false,
      attribution: [{ event: lateService, tier: classifyGrowthAttribution(lateService, "2026-09-07T12:00:00-05:00") }],
      campaignId: "G-1",
      includedAudienceCount: 12,
      messageApproved: false
    });

    expect(preview.events).toHaveLength(2);
    expect(preview.events.map((event) => event.eventType)).not.toContain("Result attributed");
  });
});
