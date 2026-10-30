import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SharedDealCustomerPicker, SharedDealVehiclePicker } from "@/features/crm-next/shared-deal-identities";
import { dealCustomerDisplayNumber } from "@/lib/deal-continuity";

describe("compact shared deal selectors", () => {
  it("shows recognizable customer numbers, not internal IDs, in results and selections", () => {
    const customer = { id: "a50607d5-3f6b-471a-93b6-db46fd717961", name: "James", customerNumber: "CUS-001234", phone: "••••3232", email: "" };
    const html = renderToStaticMarkup(<SharedDealCustomerPicker onSelect={() => {}} initialItems={[customer]} />);
    expect(html).toContain("Customer # CUS-001234");
    expect(html).toContain("••••3232");
    expect(html).not.toContain(customer.id);
    expect(renderToStaticMarkup(<SharedDealCustomerPicker onSelect={() => {}} selected={customer} />)).toContain("Customer # CUS-001234");
  });

  it("does not invent customer numbers or expose opaque legacy references", () => {
    const customer = { id: "a50607d5-3f6b-471a-93b6-db46fd717961", name: "James", customerNumber: "a50607d5-3f6b-471a-93b6-db46fd717961", phone: "••••3232", email: "" };
    const html = renderToStaticMarkup(<SharedDealCustomerPicker onSelect={() => {}} initialItems={[customer]} />);
    expect(html).toContain("Customer record");
    expect(html).not.toContain(customer.id);
    expect(dealCustomerDisplayNumber({ id: "internal", customerNumber: "C-1001" })).toBe("C-1001");
    expect(dealCustomerDisplayNumber({ id: "internal" })).toBe("");
    expect(dealCustomerDisplayNumber({ id: "internal", customerNumber: "cmvg5nnuh07s1qw0lgynyzci0" })).toBe("");
  });
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
