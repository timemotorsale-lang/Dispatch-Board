import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import GrowthPage from "@/app/(app)/growth/page";
import { GrowthConsoleFoundation } from "@/features/growth/growth-console-foundation";
import { buildGrowthConsoleReadModel } from "@/server/growth/read-model";

describe("Growth Console foundation", () => {
  it("renders the review-ready Growth Console route", () => {
    const markup = renderToStaticMarkup(<GrowthPage />);

    expect(markup).toContain("Growth Console");
    expect(markup).toContain("Marketing + Advertising");
    expect(markup).toContain("Review mode");
    expect(markup).toContain("Live sends, ad spend, and CRM changes stay locked");
  });

  it("keeps the landing page focused on simple daily execution", () => {
    const markup = renderToStaticMarkup(<GrowthConsoleFoundation />);

    expect(markup).toContain("Start here each day");
    expect(markup).toContain("Today&#x27;s Growth Work");
    expect(markup).toContain("Do this first");
    expect(markup).toContain("Campaigns");
    expect(markup).toContain("Needs Attention");
    expect(markup).toContain("Open blocker drawer");
    expect(markup).toContain("Open campaign drawer");
    expect(markup).toContain("Open results drawer");
    expect(markup).toContain("Open manager controls");
    expect(markup).toContain("Results Snapshot");
    expect(markup).toContain("Review Controls");
    expect(markup).toContain("Pick the best opportunity");
    expect(markup).toContain("Review audience");
    expect(markup).toContain("Approve message or ad");
    expect(markup).toContain("Launch stays locked");
    expect(markup).toContain("Track outcome");
  });

  it("preserves approval boundaries without exposing backend machinery on the home page", () => {
    const markup = renderToStaticMarkup(<GrowthConsoleFoundation />);

    expect(markup).toContain("Review, approve, then keep launch locked");
    expect(markup).toContain("Launch lock");
    expect(markup).toContain("Record protection");
    expect(markup).toContain("Automation lock");
    expect(markup).toContain("Best next move");
    expect(markup).toContain("Existing CRM, customer, inventory, quote, invoice, appointment, task, and repair records are not changed");
    expect(markup).not.toContain("Workflow Engine");
    expect(markup).not.toContain("Algorithms, workflow, automation, and attribution are connected");
  });

  it("wires every simplified tab and primary action to a visible section", () => {
    const markup = renderToStaticMarkup(<GrowthConsoleFoundation />);

    [
      "#today",
      "#campaigns",
      "#attention",
      "#results",
      "#controls"
    ].forEach((target) => {
      expect(markup).toContain(`href="${target}"`);
    });

    expect(markup).toContain("Start today");
    expect(markup).toContain("Review campaign");
    expect(markup).toContain("View controls");
    expect(markup).toContain("4 items need review");
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
