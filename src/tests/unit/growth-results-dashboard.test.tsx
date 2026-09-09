import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GrowthResultsDashboard } from "@/features/growth/growth-results-dashboard";
import type { GrowthResultsDashboardModel } from "@/server/growth/operational-service";

const model: GrowthResultsDashboardModel = {
  campaigns: [
    {
      assistedResults: 1,
      directResults: 2,
      id: "campaign-1",
      launchLocked: true,
      lockedWritebacks: 3,
      proofEvents: 3,
      resultEvents: 4,
      roiSignal: "Value proven",
      status: "LAUNCH_LOCKED",
      title: "Recover unsold estimates and quotes",
      totalValueCents: 235000,
      unattributedResults: 1
    }
  ],
  generatedAt: "2026-09-08T20:30:00.000Z",
  proofBySource: [
    {
      lastProofAt: "2026-09-08T20:00:00.000Z",
      proofEvents: 2,
      source: "CRM",
      status: "Proof found",
      valueCents: 200000
    }
  ],
  role: "GM/Admin",
  summary: {
    assistedResults: 1,
    directResults: 2,
    influencedResults: 1,
    launchLockedCampaigns: 1,
    lockedWritebacks: 3,
    proofCoveragePercent: 75,
    proofEvents: 3,
    resultEvents: 4,
    roiStatus: "Value proven",
    totalCampaigns: 1,
    totalValueCents: 235000,
    unattributedResults: 1
  },
  timeline: [
    {
      attributionTier: "Direct",
      campaignId: "campaign-1",
      campaignTitle: "Recover unsold estimates and quotes",
      eventType: "appointment",
      occurredAt: "2026-09-08T20:00:00.000Z",
      proofEvent: true,
      source: "Appointments",
      valueCents: 35000
    }
  ]
};

describe("Growth Results Dashboard", () => {
  it("renders read-only proof, attribution, ROI, and campaign links", () => {
    const markup = renderToStaticMarkup(<GrowthResultsDashboard model={model} />);

    expect(markup).toContain("Performance + Proof");
    expect(markup).toContain("Results proof mode");
    expect(markup).toContain("Manager Proof Panel");
    expect(markup).toContain("Value proven");
    expect(markup).toContain("Campaign ROI");
    expect(markup).toContain("Recover unsold estimates and quotes");
    expect(markup).toContain("Open proof");
    expect(markup).toContain("Source Proof");
    expect(markup).toContain("Attribution Timeline");
    expect(markup).not.toContain("Launch campaign");
    expect(markup).not.toContain("Enable spend");
  });
});
