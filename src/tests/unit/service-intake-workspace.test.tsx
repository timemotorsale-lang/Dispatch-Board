import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ServiceIntakeWorkspace } from "@/features/inventory/service-intake-workspace";

const options = {
  customers: [{ customerNumber: "CUS-100", displayName: "Jordan Customer", id: "customer-1" }],
  locations: [{ code: "MPLS", id: "location-1", name: "Minneapolis" }],
  users: [{ email: "advisor@example.test", id: "advisor-1", name: "Alex Advisor" }],
  vehicles: [{ id: "vehicle-1", make: "Ford", model: "F-150", vehicleNumber: "VEH-100", year: 2024 }],
};

describe("enterprise service intake workspace", () => {
  it("renders a guided advisor check-in with spacious concern capture and governance cues", () => {
    const html = renderToStaticMarkup(<ServiceIntakeWorkspace options={options} />);

    expect(html).toContain("Check In Vehicle");
    expect(html).toContain("Customer &amp; vehicle");
    expect(html).toContain("Customer concern");
    expect(html).toContain("rows=\"9\"");
    expect(html).toContain("maxLength=\"2000\"");
    expect(html).toContain("Helpful prompts");
    expect(html).toContain("Visit, custody &amp; promise");
    expect(html).toContain("Check-in readiness");
    expect(html).toContain("Complete Check-In &amp; Create Repair Order");
    expect(html).toContain("No repair authorization or estimate approval is implied");
  });

  it("preselects canonical customer, vehicle, location, and accountable owner options", () => {
    const html = renderToStaticMarkup(<ServiceIntakeWorkspace options={options} />);

    expect(html).toContain("Jordan Customer");
    expect(html).toContain("2024 Ford F-150 · VEH-100");
    expect(html).toContain("Minneapolis");
    expect(html).toContain("Alex Advisor");
  });
});
