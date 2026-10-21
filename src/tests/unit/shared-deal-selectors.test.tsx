import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SharedDealCustomerPicker, SharedDealVehiclePicker } from "@/features/crm-next/shared-deal-identities";

describe("compact shared deal selectors", () => {
  it("places manual customer creation above search and a long list", () => {
    const markup = renderToStaticMarkup(<SharedDealCustomerPicker onSelect={() => {}} initialItems={Array.from({ length: 100 }, (_, index) => ({ id: `customer-${index}`, name: `Existing customer ${index}`, customerNumber: `C-${index}`, phone: "", email: "" }))} />);
    expect(markup.indexOf("Add new customer")).toBeLessThan(markup.indexOf("Find customer"));
    expect(markup.indexOf("Add new customer")).toBeLessThan(markup.indexOf("Existing customer 99"));
    expect(markup).not.toContain("Enter customer manually");
  });
  it("reuses the canonical vehicle when inventory must still be established", () => {
    const markup = renderToStaticMarkup(<SharedDealVehiclePicker onSelect={() => {}} selected={{ id: "existing-vehicle", label: "Test vehicle", vin: "1HGCM82633A004352", stockNumber: "004352", inventoryUnitId: null, year: "2003", make: "Honda", model: "Accord", color: "", licensePlate: "", locationId: null, availability: "Not frontline-ready", eligibleForUse: false }} />);
    expect(markup).toContain("Establish inventory using this existing vehicle");
    expect(markup).toContain("vehicleId=existing-vehicle");
    expect(markup).toContain("Not frontline-ready");
  });
});
