import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ClaimsWorkspaceReview } from "@/features/inventory/claims-workspace-review";

describe("claims workspace review", () => {
  it("renders the adopted claims workspace sections and handoff guidance", () => {
    const html = renderToStaticMarkup(<ClaimsWorkspaceReview />);

    expect(html).toContain("Claims Workspace");
    expect(html).toContain("Save claim");
    expect(html).toContain("Execute Next Tasks");
    expect(html).toContain("Record / view activity progress");
    expect(html).toContain("Teardown / reinspection");
    expect(html).toContain("One place to record all progress");
    expect(html).toContain("Claim Snapshot");
    expect(html).toContain("What We Need");
    expect(html).toContain("Carrier Tracker");
    expect(html).toContain("Activity Timeline");
    expect(html).toContain("Next Action");
    expect(html).toContain("Handoff Readiness");
    expect(html).toContain("Contact adjuster");
    expect(html).toContain("Repair order handoff");
  });
});
