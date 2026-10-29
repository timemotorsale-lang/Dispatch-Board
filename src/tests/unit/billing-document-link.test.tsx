import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { BillingDocumentLink } from "@/features/inventory/billing-document-link";

describe("issued billing document links", () => {
  it("opens the exact invoice without issuing another financial command", () => {
    const html = renderToStaticMarkup(<BillingDocumentLink repairOrderId="ro/1" sourceId="invoice/2" />);
    expect(html).toContain('href="/service-documents?repairOrderId=ro%2F1&amp;sourceId=invoice%2F2"');
    expect(html).toContain("Open / Print Final Invoice");
  });

  it("opens each payment receipt by entry ID, separately from its invoice", () => {
    const html = renderToStaticMarkup(<BillingDocumentLink repairOrderId="ro/1" sourceId="payment/3" receipt />);
    expect(html).toContain('href="/service-documents?repairOrderId=ro%2F1&amp;sourceId=payment%2F3"');
    expect(html).toContain("Open / Print Receipt");
    expect(html).not.toContain("Open / Print Final Invoice");
  });
});
