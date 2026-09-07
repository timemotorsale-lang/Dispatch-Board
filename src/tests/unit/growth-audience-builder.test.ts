import { describe, expect, it } from "vitest";

import { buildGrowthAudience } from "@/server/growth/audience-builder";

describe("growth audience builder", () => {
  it("includes eligible contacts and returns frontend-ready counts", () => {
    const audience = buildGrowthAudience([
      {
        consent: { Email: true },
        customerId: "C-1",
        hasEscalation: false,
        lastContactedAt: null,
        lifecycleFit: true,
        name: "Ready Customer",
        optOut: false
      }
    ], "Email");

    expect(audience.readOnly).toBe(true);
    expect(audience.counts.Included).toBe(1);
    expect(audience.decisions[0].reasonCodes).toContain("CONSENT_OK");
    expect(audience.decisions[0].reasonCodes).toContain("LIFECYCLE_FIT");
  });

  it("lets suppression win over otherwise eligible records", () => {
    const audience = buildGrowthAudience([
      {
        consent: { Email: true },
        customerId: "C-2",
        hasEscalation: true,
        lastContactedAt: null,
        lifecycleFit: true,
        name: "Opted Out With Escalation",
        optOut: true
      },
      {
        consent: { Email: true },
        customerId: "C-3",
        duplicateCampaign: true,
        hasEscalation: false,
        lastContactedAt: null,
        lifecycleFit: true,
        name: "Already Campaigned",
        optOut: false
      }
    ], "Email");

    expect(audience.decisions.map((decision) => decision.status)).toEqual(["Suppressed", "Suppressed"]);
    expect(audience.decisions[0].reasonCodes).toContain("OPT_OUT");
    expect(audience.decisions[1].reasonCodes).toContain("DUPLICATE_CAMPAIGN");
  });

  it("marks stale source and unavailable inventory for cleanup instead of launch", () => {
    const audience = buildGrowthAudience([
      {
        consent: { Email: true },
        customerId: "C-4",
        hasEscalation: false,
        lastContactedAt: null,
        lifecycleFit: true,
        name: "Stale Inventory Contact",
        optOut: false,
        sourceFresh: false,
        vehicleAvailable: false
      }
    ], "Email");

    expect(audience.decisions[0].status).toBe("Needs cleanup");
    expect(audience.decisions[0].reasonCodes).toEqual(expect.arrayContaining(["SOURCE_STALE", "UNAVAILABLE_INVENTORY"]));
    expect(audience.counts["Needs cleanup"]).toBe(1);
  });

  it("excludes records with no matching lifecycle trigger", () => {
    const audience = buildGrowthAudience([
      {
        consent: { Email: true },
        customerId: "C-5",
        hasEscalation: false,
        lastContactedAt: null,
        lifecycleFit: false,
        name: "No Current Fit",
        optOut: false
      }
    ], "Email");

    expect(audience.decisions[0].status).toBe("Excluded");
    expect(audience.decisions[0].reasons).toContain("No current lifecycle trigger matches this campaign.");
  });
});
