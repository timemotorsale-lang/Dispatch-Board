import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { ServiceDocument } from "@/features/inventory/service-document";
import type { ServiceDocumentContent } from "@/server/repair-order/service-documents";

const content: ServiceDocumentContent = { title: "Official repair estimate", number: "RO-123 / v1", issuedAt: "2026-10-28T18:30:00Z", identity: { customer: "Customer", vehicle: "Actual vehicle", vin: "VIN", vehicleNumber: "VEH-1", concern: "Repair", repairOrderNumber: "RO-123", store: "Time Motor Sales", address: "1101 E. Lake Street, Minneapolis MN 55407", timezone: "America/Chicago" }, lines: [], notes: [] };

describe("branded service document header", () => {
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
