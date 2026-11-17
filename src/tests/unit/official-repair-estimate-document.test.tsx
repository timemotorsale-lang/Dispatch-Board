import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { OfficialRepairEstimateDocument } from "@/features/diagnostics/official-repair-estimate-document";

describe("official repair estimate document", () => {
  it("keeps an unlinked quote's saved identity when selecting its repair order", () => {
    const markup = renderToStaticMarkup(<OfficialRepairEstimateDocument
      concern="Brakes" createdAt="Pending estimate date" customer="Saved customer"
      estimateNumber="EST-DRAFT" lines={[]} repairOrderNumber="RO-DRAFT"
      returnTo="/prototype/repair-explorer?draftId=saved-quote&workflow=review"
      summary={[]} vehicle="2014 Honda Civic"
    />);
    expect(markup).toContain("Select repair order");
    expect(markup).not.toContain("Continue in Repair Workbench");
    expect(markup).toContain('/prototype/repair-explorer?draftId=saved-quote&amp;workflow=review&amp;attachRepairOrder=1');
    expect(markup).toContain('href="/prototype/repair-explorer?draftId=saved-quote&amp;workflow=review"');
  });

  it("does not send staff to an external return destination", () => {
    const markup = renderToStaticMarkup(<OfficialRepairEstimateDocument
      concern="Brakes" createdAt="Pending" customer="Customer" estimateNumber="EST-DRAFT"
      lines={[]} repairOrderNumber="RO-DRAFT" returnTo="/\\outside.example"
      summary={[]} vehicle="Honda Civic"
    />);
    expect(markup).not.toContain("outside.example");
    expect(markup).toContain('/prototype/repair-explorer?attachRepairOrder=1');
  });
  it("renders a branded print-safe estimate document with workbench routing", () => {
    const markup = renderToStaticMarkup(<OfficialRepairEstimateDocument
      isDraft={false}
      concern="Grinding noise from front brakes"
      createdAt="2026-08-02T18:53:00.000Z"
      customer="Leo James"
      estimateNumber="EST-3411"
      lines={[
        { amountLabel: "$554.79", detail: "Replace pads, rotors, and road-test verification", kind: "Labor", quantityLabel: "4.3 hrs", title: "Replace front brake pads and rotors" },
        { amountLabel: "$128.99", detail: "B4SA-33-28Z · Auto from parts catalog", kind: "Part", quantityLabel: "Qty 1", title: "Front brake pad set" },
      ]}
      repairOrderId="ro-id-3411"
      repairOrderNumber="RO-3411"
      returnTo="/diagnostics/labor-guide?repairOrderId=ro-id-3411"
      summary={[
        { label: "Labor", value: "4.3 hrs · $554.79" },
        { label: "Parts", value: "$368.35" },
        { label: "Tax", value: "$26.50" },
        { label: "Total", value: "$949.64" },
      ]}
      vehicle="2010 Mazda 3"
    />);

    expect(markup).toContain("Official Repair Estimate");
    expect(markup).toContain("Time Motor Sales");
    expect(markup).toContain("1101 E. Lake Street, Minneapolis MN 55407");
    expect(markup).toContain("Print official estimate");
    expect(markup).toContain("Continue in Repair Workbench");
    expect(markup).toContain("Customer / authorized representative signature");
    expect(markup).not.toContain("Return to labor guide");
    expect(markup).toContain("/vehicles/repair-workbench?repairOrderId=ro-id-3411&amp;returnTo=%2Fdiagnostics%2Flabor-guide%3FrepairOrderId%3Dro-id-3411");
    expect(markup).toContain("Recorded estimate lines");
    expect(markup).toContain("not proof of customer authorization");
    expect(markup).toContain("Replace front brake pads and rotors");
    expect(markup).toContain("Front brake pad set");
    expect(markup).toContain("Estimate summary");
    expect(markup).toContain("Operational release notes");
  });
});
