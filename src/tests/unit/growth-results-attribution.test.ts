import { describe, expect, it } from "vitest";

import {
  buildGrowthResultsAttributionReviewModel,
  classifyGrowthAttribution,
  normalizeGrowthResultEvents,
  summarizeGrowthAttribution
} from "@/server/growth/results-attribution";

describe("growth results attribution", () => {
  it("normalizes proof events and keeps opens as context only", () => {
    const [reply, open] = normalizeGrowthResultEvents([
      { campaignId: "G-1", customerId: "C-1", eventType: "reply", occurredAt: "2026-09-08T09:00:00-05:00", source: "Provider" },
      { campaignId: "G-1", customerId: "C-2", eventType: "open", occurredAt: "2026-09-08T09:05:00-05:00", source: "Provider" }
    ]);

    expect(reply.proofEvent).toBe(true);
    expect(open.proofEvent).toBe(false);
    expect(open.attributionWeight).toBe(0.1);
  });

  it("classifies tracked proof events as direct within the attribution window", () => {
    const [event] = normalizeGrowthResultEvents([
      { campaignId: "G-1", customerId: "C-1", eventType: "appointment", occurredAt: "2026-09-10T09:00:00-05:00", source: "Appointments" }
    ]);

    expect(classifyGrowthAttribution(event, "2026-09-07T12:00:00-05:00")).toBe("Direct");
  });

  it("classifies untracked proof events as influenced", () => {
    const [event] = normalizeGrowthResultEvents([
      { campaignId: "G-1", eventType: "sale", occurredAt: "2026-09-10T09:00:00-05:00", source: "Sales" }
    ]);

    expect(classifyGrowthAttribution(event, "2026-09-07T12:00:00-05:00")).toBe("Influenced");
  });

  it("does not attribute events outside the approved window", () => {
    const [event] = normalizeGrowthResultEvents([
      { campaignId: "G-1", customerId: "C-1", eventType: "service", occurredAt: "2026-11-10T09:00:00-05:00", source: "Service" }
    ]);

    expect(classifyGrowthAttribution(event, "2026-09-07T12:00:00-05:00")).toBe("Unattributed");
  });

  it("summarizes attribution without writing CRM records", () => {
    const summary = summarizeGrowthAttribution(
      [
        { campaignId: "G-1", customerId: "C-1", eventType: "reply", occurredAt: "2026-09-08T09:00:00-05:00", source: "Provider" },
        { campaignId: "G-1", customerId: "C-1", eventType: "appointment", occurredAt: "2026-09-09T09:00:00-05:00", source: "Appointments", valueCents: 35000 },
        { campaignId: "G-1", customerId: "C-2", eventType: "open", occurredAt: "2026-09-08T10:00:00-05:00", source: "Provider" },
        { campaignId: "G-1", eventType: "sale", occurredAt: "2026-09-10T09:00:00-05:00", source: "Sales", valueCents: 2200000 }
      ],
      "2026-09-07T12:00:00-05:00"
    );

    expect(summary.readOnly).toBe(true);
    expect(summary.direct).toBe(2);
    expect(summary.influenced).toBe(2);
    expect(summary.contextOnly).toBe(1);
    expect(summary.totalValueCents).toBe(2235000);
  });

  it("builds a review model for frontend reporting", () => {
    const model = buildGrowthResultsAttributionReviewModel();

    expect(model.readOnly).toBe(true);
    expect(model.contextOnly).toBe(1);
    expect(model.unattributed).toBe(1);
  });
});
