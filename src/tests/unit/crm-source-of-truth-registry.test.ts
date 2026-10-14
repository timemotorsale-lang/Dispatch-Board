import { describe, expect, it } from "vitest";

import {
  CRM_DASHBOARD_SOURCE_TRUTH,
  CRM_LIFECYCLE_DICTIONARY,
  crmLifecycleStageForCustomerLeadStage,
  isCustomerLeadStageInLifecycle
} from "@/lib/crm-source-of-truth-registry";

describe("CRM source-of-truth lifecycle registry", () => {
  it("defines the formal CRM lifecycle in business order", () => {
    expect(CRM_LIFECYCLE_DICTIONARY.map((entry) => entry.label)).toEqual([
      "Customer",
      "Prospect",
      "Lead",
      "Qualified Opportunity / Deal",
      "Sold",
      "Lost"
    ]);
  });

  it("requires every dashboard source to declare the lifecycle stages it counts", () => {
    expect(CRM_DASHBOARD_SOURCE_TRUTH.every((entry) => entry.lifecycleScope?.counts.length)).toBe(true);
    expect(CRM_DASHBOARD_SOURCE_TRUTH.find((entry) => entry.id === "new-leads")?.lifecycleScope).toMatchObject({
      counts: ["LEAD"],
      excludes: ["QUALIFIED_OPPORTUNITY", "SOLD", "LOST"]
    });
    expect(CRM_DASHBOARD_SOURCE_TRUTH.find((entry) => entry.id === "open-deals")?.lifecycleScope).toMatchObject({
      counts: ["QUALIFIED_OPPORTUNITY"],
      excludes: ["LEAD", "SOLD", "LOST"]
    });
    expect(CRM_DASHBOARD_SOURCE_TRUTH.find((entry) => entry.id === "sales-this-month")?.lifecycleScope).toMatchObject({
      counts: ["SOLD"],
      excludes: ["LEAD", "QUALIFIED_OPPORTUNITY", "LOST"]
    });
  });

  it("maps durable customer lead stages into lifecycle buckets", () => {
    expect(crmLifecycleStageForCustomerLeadStage("NEW")).toBe("LEAD");
    expect(crmLifecycleStageForCustomerLeadStage("ENGAGED")).toBe("LEAD");
    expect(crmLifecycleStageForCustomerLeadStage("QUALIFIED")).toBe("QUALIFIED_OPPORTUNITY");
    expect(crmLifecycleStageForCustomerLeadStage("NEGOTIATION")).toBe("QUALIFIED_OPPORTUNITY");
    expect(crmLifecycleStageForCustomerLeadStage("WON")).toBe("SOLD");
    expect(crmLifecycleStageForCustomerLeadStage("LOST")).toBe("LOST");
  });

  it("keeps leads, deals, and sold records from inflating each other", () => {
    expect(isCustomerLeadStageInLifecycle("NEW", ["LEAD"])).toBe(true);
    expect(isCustomerLeadStageInLifecycle("NEW", ["QUALIFIED_OPPORTUNITY"])).toBe(false);
    expect(isCustomerLeadStageInLifecycle("NEGOTIATION", ["QUALIFIED_OPPORTUNITY"])).toBe(true);
    expect(isCustomerLeadStageInLifecycle("NEGOTIATION", ["LEAD"])).toBe(false);
    expect(isCustomerLeadStageInLifecycle("WON", ["SOLD"])).toBe(true);
    expect(isCustomerLeadStageInLifecycle("WON", ["QUALIFIED_OPPORTUNITY"])).toBe(false);
  });
});
