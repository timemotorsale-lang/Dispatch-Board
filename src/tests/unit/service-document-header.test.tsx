import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { ServiceDocument } from "@/features/inventory/service-document";
import type { ServiceDocumentContent } from "@/server/repair-order/service-documents";

const content: ServiceDocumentContent = { title: "Official repair estimate", number: "RO-123 / v1", issuedAt: "2026-10-28T18:30:00Z", identity: { customer: "Customer", vehicle: "Actual vehicle", vin: "VIN", vehicleNumber: "VEH-1", concern: "Repair", repairOrderNumber: "RO-123", store: "Time Motor Sales", address: "1101 E. Lake Street, Minneapolis MN 55407", timezone: "America/Chicago" }, lines: [], notes: [] };

describe("branded service document header", () => {
  it("prints approved customer wording and readable expiry without exposing internal invoice notes or changing saved records", () => {
    const saved = { ...content, notes: ["Valid until 2026-11-05T13:51:11.398Z.", "Labor hours are provisional planning allowances, not validated vehicle-specific standards.", "Only separately recorded exact-version customer authorization permits repair execution.", "Native posted invoice. Internal detail", "Authorized planning time 120 minutes", "Source estimate internal-id; authorization hidden."] };
    const original = JSON.stringify(saved);
    const html = renderToStaticMarkup(<ServiceDocument content={saved} sha256="proof" templateVersion="v3" />);
    expect(html).toContain("Work begins after your approval.");
    expect(html).toContain("Estimate valid through November 5, 2026.");
    for (const hidden of ["provisional planning", "exact-version", "Native posted", "Authorized planning time", "internal-id", "Implied planning rate"]) expect(html).not.toContain(hidden);
    expect(JSON.stringify(saved)).toBe(original);
  });
  it("prints payment and remaining balance clearly and keeps the item table compact", () => {
    const receipt = { ...content, title: "Service payment receipt", receipt: { invoiceNumber: "INV-123", kind: "PAYMENT", amountCents: 20000, method: "CREDIT_CARD", reference: "Verified reference", balanceCents: 7813 } };
    const html = renderToStaticMarkup(<ServiceDocument content={receipt} sha256="proof" templateVersion="v3" />);
    for (const text of ["Amount paid", "$200.00", "Credit Card", "INV-123", "Remaining balance", "$78.13"]) expect(html).toContain(text);
    expect(html).not.toContain("<table");
    const legacy = { ...content, title: "Service payment receipt", lines: [{ key: "old", description: "PAYMENT: CASH; reference Till receipt 123", quantity: 1, unitPriceCents: 20000, totalCents: 20000 }], notes: ["Original invoice INV-123; remaining balance 7813 cents.", "Recorded by Staff. Internal reason", "This is a record of verified financial activity, not a card-processing instruction."] };
    const legacyHtml = renderToStaticMarkup(<ServiceDocument content={legacy} sha256="proof" templateVersion="v1" />);
    expect(legacyHtml).toContain("Amount paid");
    expect(legacyHtml).toContain("$78.13");
    expect(legacyHtml).not.toContain("Internal reason");
    const estimate = renderToStaticMarkup(<ServiceDocument content={{ ...content, lines: [{ key: "p", type: "PART", description: "Brake pads ()", quantity: 1, unitPriceCents: 5000, totalCents: 5000 }] }} sha256="proof" templateVersion="v3" />);
    expect(estimate).toContain("Brake pads");
    expect(estimate).not.toContain("Brake pads ()");
    expect(estimate).not.toContain("Planning hours");
  });

  it("prints customer contact/address details, itemized charges and a separate discount", () => {
    const html = renderToStaticMarkup(<ServiceDocument content={{ ...content, identity: { ...content.identity, customerContact: { phone: "612-555-0100", email: "customer@example.test", address: "123 Example St" } }, lines: [{ key: "fee-shop-supplies", type: "FEE", description: "Shop supplies", quantity: 1, unitPriceCents: 1250, totalCents: 1250 }, { key: "fee-towing", type: "FEE", description: "Towing", quantity: 1, unitPriceCents: 10000, totalCents: 10000 }], totals: { subtotalCents: 11250, discountCents: 1000, taxCents: 0, totalCents: 10250 } }} sha256="proof" templateVersion="service-document-v3" />);
    for (const text of ["612-555-0100", "customer@example.test", "123 Example St", "Other charges", "Shop supplies", "Towing", "$10.00", "$102.50"]) expect(html).toContain(text);
    expect(html.match(/>Shop supplies</g)).toHaveLength(1);
  });
  it.each(["Official repair estimate", "Final service invoice", "Service payment receipt"])("brands %s with readable contact and document details", title => {
    const html = renderToStaticMarkup(<ServiceDocument content={{ ...content, title }} sha256="internal-checksum-must-not-be-displayed" templateVersion="service-document-v1" />);
    expect(html).toContain('alt="Time Motor Sales"');
    expect(html).toContain('href="mailto:timemotorsale@gmail.com"');
    expect(html).toContain('href="https://timemotors.net"');
    expect(html).toContain("Document reference: RO-123 / v1");
    expect(html).toContain("Oct 28, 2026");
    expect(html).toContain("1:30 PM");
    expect(html).not.toContain("America/Chicago");
    expect(html).not.toContain("SHA-256");
    expect(html).not.toContain("internal-checksum-must-not-be-displayed");
  });
  it.each(["Official repair estimate", "Final service invoice", "Service payment receipt"])("includes saved vehicle details on %s", title => {
    const identity = { ...content.identity, color: "Blue", stockNumber: "TMS-204", licensePlate: "ABC 123", licensePlateState: "MN", odometer: { reading: 125430, unit: "MILES" as const, observedAt: "2026-10-28T15:00:00Z" } };
    const html = renderToStaticMarkup(<ServiceDocument content={{ ...content, title, identity }} sha256="proof" templateVersion="service-document-v2" />);
    for (const detail of ["125,430 mi", "ABC 123 · MN", "Blue", "TMS-204", "VIN"]) expect(html).toContain(detail);
  });
  it.each([[0, "MILES", "0 mi"], [87200, "KILOMETERS", "87,200 km"]] as const)("preserves a %s %s odometer reading", (reading, unit, expected) => {
    const identity = { ...content.identity, odometer: { reading, unit, observedAt: content.issuedAt } };
    expect(renderToStaticMarkup(<ServiceDocument content={{ ...content, identity }} sha256="proof" templateVersion="service-document-v2" />)).toContain(expected);
  });
  it("keeps legacy documents readable without inventing missing vehicle details", () => {
    const original = JSON.stringify(content);
    const html = renderToStaticMarkup(<ServiceDocument content={content} sha256="proof" templateVersion="service-document-v1" />);
    expect(html).toContain("Not recorded");
    expect(html).not.toContain("0 mi");
    expect(JSON.stringify(content)).toBe(original);
  });
});
