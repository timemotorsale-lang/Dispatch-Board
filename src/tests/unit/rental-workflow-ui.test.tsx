import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { VehicleUseTool } from "@/features/crm-next/vehicle-use-tool";
import { DealWorkspaceOverview } from "@/features/crm-next/deal-workspace-overview";

describe("staff daily rental workflow", () => {
  it("puts the activation action and each preparation step in the visible workflow", () => {
    const html = renderToStaticMarkup(<VehicleUseTool pathway="daily-rental" onNavigate={() => {}} />);
    expect(html).toContain("Prepare / Checkout");
    expect(html).toContain("Customer &amp; vehicle");
    expect(html).toContain("Terms &amp; dates");
    expect(html).toContain("Signed agreement &amp; coverage");
    expect(html).toContain("Rental Draft");
    expect(html).not.toContain("Vehicle-use action");
  });
  it("uses rental-specific navigation even when the saved summary replaces overview cards", () => {
    const html = renderToStaticMarkup(<DealWorkspaceOverview savedSummary={<p>Saved rental</p>} customer="Customer" vehicle="Ford" pathway="daily-rental" pathwayLabel="Daily Rental" owner="Staff" status="IN_PROGRESS" finalized={false} saved saveStatus="Saved" section="overview" onNavigate={() => {}} />);
    expect(html).toContain("Checkout &amp; Return");
    expect(html).not.toContain("Working Deals");
    expect(html).toContain("Saved rental");
  });
  it("offers the same explicit checkout action with loaner terminology", () => {
    const html = renderToStaticMarkup(<VehicleUseTool pathway="vehicle-loaner" />);
    expect(html).toContain("Loaner Draft");
    expect(html).toContain("Prepare / Checkout");
  });
});
