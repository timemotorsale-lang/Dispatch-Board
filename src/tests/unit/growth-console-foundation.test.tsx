import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import GrowthPage from "@/app/(app)/growth/page";
import { GrowthConsoleFoundation } from "@/features/growth/growth-console-foundation";
import { buildGrowthConsoleReadModel } from "@/server/growth/read-model";

describe("Growth Console foundation", () => {
  it("renders the review-ready Growth Console route", () => {
    const markup = renderToStaticMarkup(<GrowthPage />);

    expect(markup).toContain("Growth Console");
    expect(markup).toContain("Marketing + Advertising Command Center");
    expect(markup).toContain("G1 read-only foundation");
    expect(markup).toContain("No live send is enabled");
  });

  it("keeps the first implementation focused on simple daily execution", () => {
    const markup = renderToStaticMarkup(<GrowthConsoleFoundation />);

    expect(markup).toContain("CRM is the record");
    expect(markup).toContain("Find opportunity");
    expect(markup).toContain("Review audience");
    expect(markup).toContain("Approve message or ad");
    expect(markup).toContain("Schedule launch");
    expect(markup).toContain("Track results");
  });

  it("combines marketing and advertising while preserving approval boundaries", () => {
    const markup = renderToStaticMarkup(<GrowthConsoleFoundation />);

    expect(markup).toContain("Marketing Workspace");
    expect(markup).toContain("Advertising Workspace");
    expect(markup).toContain("Audience Review");
    expect(markup).toContain("Automation Library");
    expect(markup).toContain("Review launch lock");
    expect(markup).toContain("G1 is read-only");
    expect(markup).toContain("Open campaign plan");
    expect(markup).toContain("Check launch readiness");
    expect(markup).toContain("Prepared plan waiting for approval");
    expect(markup).toContain("Prior versions are preserved");
    expect(markup).toContain("Blocked safely until policy clears");
    expect(markup).toContain("Send offer language to manager review");
    expect(markup).toContain("Safe first launch path");
    expect(markup).toContain("Internal task pilot");
    expect(markup).toContain("does not send customer messages or spend advertising budget");
    expect(markup).toContain("Paid Advertising");
    expect(markup).toContain("Ad launch stays locked");
    expect(markup).toContain("Live spend not approved");
    expect(markup).toContain("Automation Activation");
    expect(markup).toContain("Automations stay inactive");
    expect(markup).toContain("Prepared task only");
    expect(markup).toContain("Optimization");
    expect(markup).toContain("Best next move");
    expect(markup).toContain("does not change budget");
    expect(markup).toContain("Adoption Review");
    expect(markup).toContain("Ready for your review");
    expect(markup).toContain("Stored records preserved");
  });

  it("wires every workspace tab and review action to a visible section", () => {
    const markup = renderToStaticMarkup(<GrowthConsoleFoundation />);

    [
      "#growth-home",
      "#marketing-workspace",
      "#advertising-workspace",
      "#audiences",
      "#campaign-plan",
      "#approval",
      "#automations",
      "#provider-pilot",
      "#paid-advertising",
      "#optimization",
      "#adoption-review",
      "#crm-writeback"
    ].forEach((target) => {
      expect(markup).toContain(`href="${target}"`);
    });
  });

  it("builds a source-labeled read model without mutation commands", () => {
    const model = buildGrowthConsoleReadModel(new Date("2026-09-07T17:00:00.000Z"));

    expect(model.sourceMode).toBe("Read-only source snapshot");
    expect(model.opportunities[0].priorityScore).toBeGreaterThanOrEqual(model.opportunities[1].priorityScore);
    expect(model.opportunities.every((opportunity) => opportunity.sourceSystems.length > 0)).toBe(true);
    expect(model.audienceRows.some((row) => row.label === "Suppressed" && row.reason.includes("Opt-out"))).toBe(true);
    expect(model.crmWritebackEvents.some((event) => event.state === "Blocked until policy")).toBe(true);
  });
});
