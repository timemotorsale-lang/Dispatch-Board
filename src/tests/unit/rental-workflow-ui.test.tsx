import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { VehicleUseTool } from "@/features/crm-next/vehicle-use-tool";
import { DealWorkspaceOverview } from "@/features/crm-next/deal-workspace-overview";

describe("staff daily rental workflow", () => {
  it("puts the activation action and each preparation step in the visible workflow", () => {
    const html = renderToStaticMarkup(<VehicleUseTool pathway="daily-rental" onNavigate={() => {}} />);
    const visibleHeader = html.slice(0, html.indexOf('<div hidden=""'));
    expect(visibleHeader).toContain("4. Activate Rental");
    expect(visibleHeader).toContain("1. Customer &amp; vehicle");
    expect(visibleHeader).toContain("2. Rental terms &amp; dates");
    expect(visibleHeader).toContain("3. Signed agreement &amp; insurance");
    expect(visibleHeader).toContain("Rental status needs review");
    expect(html).not.toContain("Vehicle-use action");
    expect(html).toContain("Confirm dates &amp; continue to checkout");
  });
  it("uses rental-specific navigation even when the saved summary replaces overview cards", () => {
    const html = renderToStaticMarkup(<DealWorkspaceOverview savedSummary={<p>Saved rental</p>} customer="Customer" vehicle="Ford" pathway="daily-rental" pathwayLabel="Daily Rental" owner="Staff" status="IN_PROGRESS" finalized={false} saved saveStatus="Saved" section="overview" onNavigate={() => {}} />);
    expect(html).toContain("Checkout &amp; Return");
    expect(html).not.toContain("Working Deals");
    expect(html).toContain("Saved rental");
  });
  it("preserves the existing loaner controls", () => {
    const html = renderToStaticMarkup(<VehicleUseTool pathway="vehicle-loaner" />);
    expect(html).toContain("Vehicle-use action");
    expect(html).toContain("Record actual handoff");
  });
});
