import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { matchesRepairDealOrder, RepairDealHandoff, RepairDealOrderLinks, VerifiedRepairDealOrderLinks, repairDealIntakeHref } from "@/features/crm-next/repair-deal-handoff";

describe("repair deal intake handoff", () => {
  it("carries canonical identities, concern and a saved-draft return path into governed intake", () => {
    const href = repairDealIntakeHref("customer&1", "vehicle/1", "  Brake noise & vibration  ", "draft?1");
    const url = new URL(href!, "http://localhost:3000");
    expect(url.pathname).toBe("/vehicles/repair-orders");
    expect(url.searchParams.get("intakeSource")).toBe("WALK_IN");
    expect(url.searchParams.get("customerId")).toBe("customer&1");
    expect(url.searchParams.get("vehicleId")).toBe("vehicle/1");
    expect(url.searchParams.get("concernSummary")).toBe("Brake noise & vibration");
    expect(url.searchParams.get("returnTo")).toBe("/crm-next/deals/start?draftId=draft%3F1");
    expect(url.searchParams.has("repairOrderId")).toBe(false);
  });

  it("opens the exact order in the guide, workbench and document workspace", () => {
    const html = renderToStaticMarkup(<RepairDealOrderLinks repairOrderId="order/1" draftId="draft?1" />);
    const links = [...html.matchAll(/href="([^"]+)"/g)].map(([, href]) => new URL(href.replaceAll("&amp;", "&"), "http://localhost"));
    expect(links.map(link => link.pathname)).toEqual(["/diagnostics/labor-guide", "/vehicles/repair-workbench", "/vehicles/service-billing", "/service-documents"]);
    for (const link of links) {
      expect(link.searchParams.get("repairOrderId")).toBe("order/1");
      expect(link.searchParams.get("returnTo")).toBe("/crm-next/deals/start?draftId=draft%3F1&repairOrderId=order%2F1");
    }
    expect(html).toContain("Billing &amp; receipts");
    expect(links[3].searchParams.get("workspace")).toBe("1");
  });

  it("requires the exact order, customer and vehicle before showing direct repair links", () => {
    const order = { id: "ro-1", customerId: "customer-1", vehicleId: "vehicle-1" };
    expect(matchesRepairDealOrder(order, "ro-1", "customer-1", "vehicle-1")).toBe(true);
    expect(matchesRepairDealOrder(order, "ro-2", "customer-1", "vehicle-1")).toBe(false);
    expect(matchesRepairDealOrder(order, "ro-1", "customer-2", "vehicle-1")).toBe(false);
    expect(matchesRepairDealOrder(order, "ro-1", "customer-1", "vehicle-2")).toBe(false);
    expect(renderToStaticMarkup(<VerifiedRepairDealOrderLinks repairOrderId="ro-1" draftId="draft-1"
      customerId="customer-1" vehicleId="vehicle-1" />)).not.toContain("/vehicles/service-billing");
  });

  it.each([["", "vehicle", "concern", "draft"], ["customer", "", "concern", "draft"], ["customer", "vehicle", " ", "draft"], ["customer", "vehicle", "concern", ""]])("does not hand off incomplete context", (customer, vehicle, concern, draft) => {
    expect(repairDealIntakeHref(customer, vehicle, concern, draft)).toBeNull();
  });

  it("requires identities and concern but not a price, and prevents duplicate clicks while saving", () => {
    const props = { customerId: "customer", vehicleId: "vehicle", concern: "Inspect brakes", busy: false, onConcernChange: vi.fn(), onMissingIdentity: vi.fn(), onContinue: vi.fn() };
    const html = renderToStaticMarkup(<RepairDealHandoff {...props} />);
    expect(html).toContain("Continue to check-in &amp; Labor Guide");
    expect(html).not.toContain('disabled=""');
    expect(html).not.toContain("Amount / estimate / reserve");
    expect(html).toContain("does not authorize repairs");
    const missingCustomer = renderToStaticMarkup(<RepairDealHandoff {...props} customerId="" />);
    expect(missingCustomer).toContain("Select customer to continue");
    expect(missingCustomer).not.toContain('disabled=""');
    expect(renderToStaticMarkup(<RepairDealHandoff {...props} vehicleId="" />)).toContain("Select or save vehicle to continue");
    expect(renderToStaticMarkup(<RepairDealHandoff {...props} concern="" />)).toContain("Enter repair concern to continue");
    expect(renderToStaticMarkup(<RepairDealHandoff {...props} busy />)).toContain('disabled=""');
  });
});
