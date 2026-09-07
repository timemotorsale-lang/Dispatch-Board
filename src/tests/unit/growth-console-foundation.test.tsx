import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import GrowthPage from "@/app/(app)/growth/page";
import { GrowthConsoleFoundation } from "@/features/growth/growth-console-foundation";

describe("Growth Console foundation", () => {
  it("renders the review-ready Growth Console route", () => {
    const markup = renderToStaticMarkup(<GrowthPage />);

    expect(markup).toContain("Growth Console");
    expect(markup).toContain("Marketing + Advertising Command Center");
    expect(markup).toContain("Review foundation");
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
    expect(markup).toContain("Launch disabled");
    expect(markup).toContain("Backend expansion is intentionally deferred");
  });
});
