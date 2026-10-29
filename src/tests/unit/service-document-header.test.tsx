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
});
