import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { CompactInventoryIntake } from "@/features/prototype/inventory-intake/compact-inventory-intake";

describe("functional compact inventory intake", () => {
  const options = { locations: [{ id: "location-1", name: "Main receiving" }], users: [{ id: "staff-1", name: "Actual staff" }] };
  it("opens one page with real save actions without replacing current intake", () => {
    const html = renderToStaticMarkup(<CompactInventoryIntake options={options} />);
    for (const label of ["Inventory intake", "New form · Review before adoption", "Save writes real records", "Save Inventory", "Save &amp; Start Repair Order", "VIN last six · assigned on save", "Prepare for Sale", "Dealership Repair / Recon", "Customer Repair"]) expect(html).toContain(label);
    expect(html.match(/<form\b/g)).toHaveLength(1);
    expect(html.match(/type="submit"/g)).toHaveLength(2);
    expect(html).not.toContain("SAMPLE-001");
    expect(html).not.toContain("Simulated actions");
    expect(html).not.toContain("REVIEW ONLY");
    expect(html).toContain('name="vin"');
    expect(html).toContain('value="location-1" selected=""');
    expect(html).toContain("Main receiving");
  });

  it("prefills authorized context and preserves recorded facts", () => {
    const html = renderToStaticMarkup(<CompactInventoryIntake options={options} context={{ vehicleId: "vehicle-1", vehicleNumber: "VEH-1", vin: "3FA6P0K91HR406095", year: 2017, make: "Ford", model: "Fusion", inventoryNumber: "INV-1", intakeVersion: 3, unitVersion: 6, canPrice: true, details: { seller: "Actual seller", purchaseCents: 123400, proposedPriceCents: 150000, priceStatus: "INCURRED", odometer: 0 } }} />);
    for (const value of ["VEH-1", "INV-1", "3FA6P0K91HR406095", "Actual seller", "1234.00", "1500.00"]) expect(html).toContain(value);
    expect(html).toMatch(/name="odometer"[^>]*value="0"/);
    expect(html).toMatch(/<input(?=[^>]*name="make")(?=[^>]*readOnly="")[^>]*>/i);
    expect(html).not.toContain("I confirm dealership ownership");
  });

  it("keeps required follow-up visible and additional controls expandable", () => {
    const html = renderToStaticMarkup(<CompactInventoryIntake options={options} />);
    const controls = [...html.matchAll(/<(?:input|textarea|select)\b[^>]*id="([^"]+)"[^>]*>/g)];
    for (const control of controls) expect(html).toContain(`for="${control[1]}"`);
    expect(html).toContain("Pending details / follow-up");
    const extra = html.match(/<details\b[\s\S]*?<\/details>/)?.[0] ?? "";
    expect(extra).toContain("Additional details");
    expect(extra).not.toMatch(/\srequired(?:=|\s|>)/);
    expect(extra).not.toContain("Proposed asking price");
    expect(html).toContain("I confirm dealership ownership or consignment authority.");
    expect(html).not.toContain("Dashboard");
  });
});
