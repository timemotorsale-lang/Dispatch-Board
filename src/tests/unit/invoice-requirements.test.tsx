import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { InvoiceRequirements } from "@/features/inventory/invoice-requirements";

describe("invoice prerequisites", () => {
  it("clearly identifies a missing passed QC document and links to this RO's QC step", () => {
    const html = renderToStaticMarkup(<InvoiceRequirements repairOrderId="ro/1" codes={["INVOICE_JOB_QC_INCOMPLETE", "INVOICE_PART_IDENTITY_MISSING"]} />);
    expect(html).toContain('role="alert"');
    expect(html).toContain("Passed QC record missing");
    expect(html).toContain("A passed QC document is missing.");
    expect(html).toContain('href="/prototype/repair-workbench?repairOrderId=ro%2F1&amp;step=qc"');
    expect(html).toContain(">Open QC</a>");
    expect(html).toContain("Update estimate");
  });
  it("does not claim QC is missing for a different requirement", () => {
    const html = renderToStaticMarkup(<InvoiceRequirements repairOrderId="ro-1" codes={["INVOICE_AUTHORIZATION_REQUIRED"]} />);
    expect(html).not.toContain("QC record missing");
    expect(html).toContain("Open approval");
  });
  it("shows no blocker once requirements are satisfied", () => {
    expect(renderToStaticMarkup(<InvoiceRequirements repairOrderId="ro-1" codes={[]} billingMode="NATIVE" />)).toBe("");
  });
});
