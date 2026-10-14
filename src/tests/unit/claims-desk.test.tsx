import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ClaimsDesk } from "@/features/inventory/claims-desk";

describe("claims desk", () => {
  it("renders the v1 claim desk landing flow before opening the workspace", () => {
    const html = renderToStaticMarkup(<ClaimsDesk />);

    expect(html).toContain("Claim Desk Workbench");
    expect(html).toContain("Command search");
    expect(html).toContain("Next-action engine");
    expect(html).toContain("Status intelligence");
    expect(html).toContain("Workflow guardrails");
    expect(html).toContain("Unified timeline");
    expect(html).toContain("Document shortcuts");
    expect(html).toContain("Money exceptions");
    expect(html).toContain("Execution templates");
    expect(html).toContain("Role-simple queue");
    expect(html).toContain("Find existing");
    expect(html).toContain("Start claim intake");
    expect(html).toContain("Start claim");
    expect(html).toContain("Claim documents");
    expect(html).toContain("Start claim intake");
    expect(html).not.toContain("Existing claim or RO");
    expect(html).not.toContain("Known customer / vehicle");
    expect(html).not.toContain("Unknown or walk-in claim");
    expect(html).toContain("Start claim workspace");
    expect(html).toContain("Customer name");
    expect(html).toContain("Address line 1");
    expect(html).toContain("Vehicle");
    expect(html).toContain("Mileage");
    expect(html).toContain("Policy #");
    expect(html).not.toContain("Workbench guide");
    expect(html).not.toContain("Desk signals");
    expect(html).not.toContain("Handoff lanes");
    expect(html).toContain("opens the workspace");
  });

  it("renders a working existing-claim search control", () => {
    const html = renderToStaticMarkup(<ClaimsDesk initialTool="find" />);

    expect(html).toContain('role="search"');
    expect(html).toContain('aria-label="Search existing claims"');
    expect(html).toContain('type="search"');
    expect(html).toContain('placeholder="Customer, VIN, plate, phone, claim #, RO #"');
    expect(html).toContain('type="submit"');
    expect(html).toContain(">Search</button>");
  });
});
