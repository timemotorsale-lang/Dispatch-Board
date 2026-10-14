import { describe, expect, it } from "vitest";

import {
  attributeGrowthOutcome,
  decideGrowthAudience,
  decideGrowthAutomation,
  decideGrowthWorkflow,
  evaluateGrowthMessageReadiness,
  rankGrowthOpportunities
} from "@/server/growth/domain-engine";

describe("growth domain engine", () => {
  it("ranks growth opportunities with explainable scoring", () => {
    const ranked = rankGrowthOpportunities([
      {
        audienceReadiness: 12,
        fatiguePenalty: 15,
        ownerCapacity: 8,
        riskPenalty: 20,
        sourceConfidence: 10,
        title: "Low quality blast",
        urgency: 8,
        valuePotential: 30
      },
      {
        audienceReadiness: 20,
        fatiguePenalty: 2,
        ownerCapacity: 15,
        riskPenalty: 4,
        sourceConfidence: 18,
        title: "Unsold quote recovery",
        urgency: 16,
        valuePotential: 42
      }
    ]);

    expect(ranked[0].title).toBe("Unsold quote recovery");
    expect(ranked[0].explanation).toContain("value 42");
    expect(ranked[0].priorityScore).toBeGreaterThan(ranked[1].priorityScore);
  });

  it("suppresses contacts when opt-out, consent, or quiet-window rules fail", () => {
    const decisions = decideGrowthAudience(
      [
        {
          consent: { Email: true },
          customerId: "C-1",
          hasEscalation: false,
          lastContactedAt: null,
          lifecycleFit: true,
          name: "Ready Customer",
          optOut: false
        },
        {
          consent: { Email: true },
          customerId: "C-2",
          hasEscalation: false,
          lastContactedAt: null,
          lifecycleFit: true,
          name: "Opted Out",
          optOut: true
        },
        {
          consent: { Email: true },
          customerId: "C-3",
          hasEscalation: false,
          lastContactedAt: "2026-09-05T12:00:00-05:00",
          lifecycleFit: true,
          name: "Recently Contacted",
          optOut: false
        }
      ],
      "Email",
      new Date("2026-09-07T12:00:00-05:00")
    );

    expect(decisions.map((decision) => decision.status)).toEqual(["Included", "Suppressed", "Suppressed"]);
    expect(decisions[1].reasons).toContain("Customer is opted out.");
    expect(decisions[2].reasons).toContain("Inside quiet contact window.");
  });

  it("requires source-backed customer-facing messages", () => {
    const readiness = evaluateGrowthMessageReadiness({
      callToAction: "Call us",
      fallbackOwner: "Marketing Manager",
      hasDisclosure: false,
      offerSource: "",
      usesCustomerSensitiveData: true,
      verifiedClaims: false
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.nextAction).toBe("Offer source named");
    expect(readiness.checks.filter((check) => !check.passed)).toHaveLength(3);
  });

  it("moves workflow through the first blocked stage only", () => {
    const decision = decideGrowthWorkflow({
      audienceApproved: false,
      backendControlsReady: false,
      launchWindowApproved: false,
      messageApproved: false,
      plan: {
        approvalRequestedAt: null,
        audienceSnapshots: [],
        messageDrafts: [],
        status: "Draft"
      },
      policyCleared: false,
      providerReady: false
    });

    expect(decision.stage).toBe("Audience review");
    expect(decision.nextAction).toBe("Review audience");
  });

  it("keeps launch locked until backend, provider, and launch window are ready", () => {
    const decision = decideGrowthWorkflow({
      audienceApproved: true,
      backendControlsReady: false,
      launchWindowApproved: true,
      messageApproved: true,
      plan: {
        approvalRequestedAt: "2026-09-07T12:00:00.000Z",
        audienceSnapshots: [{ createdAt: "2026-09-07T12:00:00.000Z", id: "A-1", rows: [], version: 1 }],
        messageDrafts: [{ body: "A helpful approved customer message.", callToAction: "Call us", createdAt: "2026-09-07T12:00:00.000Z", id: "M-1", subject: "Service", version: 1 }],
        status: "Approval requested"
      },
      policyCleared: true,
      providerReady: true
    });

    expect(decision.stage).toBe("Scheduled");
    expect(decision.nextAction).toBe("Keep launch locked");
  });

  it("attributes outcomes by confidence tier", () => {
    expect(
      attributeGrowthOutcome({
        campaignId: "G-1",
        clicked: true,
        convertedAt: "2026-09-07T13:00:00.000Z",
        exposed: true,
        formSubmitted: false,
        hasTrackedIdentity: true,
        outcome: "Appointment",
        replied: false
      })
    ).toBe("Direct");

    expect(
      attributeGrowthOutcome({
        campaignId: "G-1",
        clicked: false,
        convertedAt: null,
        exposed: true,
        formSubmitted: false,
        hasTrackedIdentity: false,
        outcome: "Sale",
        replied: false
      })
    ).toBe("Influenced");
  });

  it("blocks automations until every governed requirement is satisfied", () => {
    const decision = decideGrowthAutomation({
      audienceApproved: true,
      frequencyCapActive: true,
      launchEvidenceRecorded: false,
      messageTemplateApproved: true,
      ownerQueueAvailable: true,
      rollbackAvailable: true,
      serverSideSuppression: false,
      triggerAuthoritative: true
    });

    expect(decision.canRun).toBe(false);
    expect(decision.state).toBe("Blocked");
    expect(decision.missing).toContain("Enforce consent and suppression server-side");
  });
});
