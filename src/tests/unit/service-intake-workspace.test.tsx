import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ServiceIntakeWorkspace } from "@/features/inventory/service-intake-workspace";

const options = {
  appointments: [],
  customers: [{ customerNumber: "CUS-100", displayName: "Jordan Customer", id: "customer-1" }],
  locations: [{ code: "MPLS", id: "location-1", name: "Minneapolis" }],
  repairOrders: [],
  users: [{ email: "advisor@example.test", id: "advisor-1", name: "Alex Advisor" }],
  vehicles: [{ id: "vehicle-1", make: "Ford", model: "F-150", vehicleNumber: "VEH-100", year: 2024 }],
};

describe("enterprise service intake workspace", () => {
  it("renders a guided advisor check-in with spacious concern capture and governance cues", () => {
    const html = renderToStaticMarkup(<ServiceIntakeWorkspace options={options} />);

    expect(html).toContain("Check In Vehicle");
    expect(html).toContain("Find Arrival");
    expect(html).toContain("Live service readiness");
    expect(html).toContain("Live appointment and capacity facts will appear here");
    expect(html).toContain("Customer concern");
    expect(html).toContain("rows=\"5\"");
    expect(html).toContain("maxLength=\"2000\"");
    expect(html).toContain("Helpful prompts");
    expect(html).toContain("Visit &amp; Custody");
    expect(html).toContain("Check-in requirements");
    expect(html).toContain("Complete Check-In &amp; Create Repair Order");
    expect(html).toContain("No repair authorization or estimate approval is implied");
  });

  it("starts with canonical arrival search and no-result creation paths", () => {
    const html = renderToStaticMarkup(<ServiceIntakeWorkspace options={options} />);

    expect(html).toContain("Find Customer, Vehicle, or Appointment");
    expect(html).toContain("Search name, phone, email, VIN, plate, appointment, or RO...");
    expect(html).toContain("Add New Customer");
    expect(html).toContain("Add New Vehicle");
    expect(html).toContain("Select customer");
    expect(html).toContain("Select vehicle");
    expect(html).toContain("Minneapolis");
    expect(html).toContain("Alex Advisor");
  });
});
