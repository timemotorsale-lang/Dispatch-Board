import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { describe, expect, it } from "vitest";
import { GuidedEstimate } from "@/features/diagnostics/guided-estimate";
import { emptyManualLaborReview } from "@/lib/estimate-review";
import { invoiceHoldLabel, nextBillingTask } from "@/lib/service-billing-workflow";
import { DiagnosticWorkspace } from "@/features/diagnostics/diagnostic-workspace";

describe("compact enterprise execution", () => {
  const props = { vehicle: "Actual vehicle", vin: "ACTUAL-VIN", hasRO: true, lines: [{ id: "work", title: "Approved repair", kind: "Labor" as const, quantity: 2, price: 125, pending: false, editable: true }], review: emptyManualLaborReview, scope: "exact-work", total: "$250.00", busy: false, onReview() {}, onEdit() {}, onSave() {}, onPresent() {}, onReviewChecks() {} };
  it("renders one worksheet and one issue action, with optional reviews collapsed", () => {
    const html = renderToStaticMarkup(<GuidedEstimate {...props} summary={[{ label: "Labor", value: "$250.00" }]} />);
    expect(html).toContain("Estimate worksheet");
    expect(html.match(/>Generate \/ Print Estimate</g)).toHaveLength(1);
    expect(html).toContain("Estimate total");
    expect(html).not.toContain("<details open");
    expect(html).not.toContain("Check readiness");
    expect(html).not.toContain("1. Vehicle");
    expect(html).toContain('data-ready="false"');
  });
  it("lets prototype staff generate the estimate without labor-source explanations or review confirmations", () => {
    const html = renderToStaticMarkup(<GuidedEstimate {...props} simplified checksReady />);
    expect(html).toContain('data-ready="true"');
    expect(html).not.toContain("Labor basis");
    expect(html).not.toContain("Mark manually reviewed");
    expect(html).not.toContain("Review pricing, fitment");
    expect(html).toContain("Generate / Print Estimate");
  });
  it("shows a generation error next to the worksheet action", () => {
    const html = renderToStaticMarkup(<GuidedEstimate {...props} simplified checksReady feedback="Unable to generate the estimate. Try again." />);
    expect(html).toContain('<p role="alert">Unable to generate the estimate. Try again.</p>');
    expect(html).toContain("Generate / Print Estimate");
  });
  it("does not call an estimate ready merely because its labor basis was checked", () => {
    const reviewed = { engine: "Actual engine", configuration: "Actual configuration", source: "Reviewed source", limitations: "", scope: props.scope };
    expect(renderToStaticMarkup(<GuidedEstimate {...props} review={reviewed} checksReady={false} />)).toContain('data-ready="false"');
    expect(renderToStaticMarkup(<GuidedEstimate {...props} review={reviewed} checksReady />)).toContain('data-ready="true"');
    expect(renderToStaticMarkup(<GuidedEstimate {...props} review={{ ...reviewed, scope: "older-work" }} checksReady />)).toContain('data-ready="false"');
  });
  it("keeps part details editable beside a pending amount, with no forced catalog detour", () => {
    const html = renderToStaticMarkup(<GuidedEstimate {...props} lines={[{ ...props.lines[0], kind: "Part", title: "Unitemized allowance", number: "", pending: true, removable: true }]} onPartChange={() => {}} onRemove={() => {}} />);
    expect(html).toContain('aria-label="Unitemized allowance description"');
    expect(html).toContain('aria-label="Unitemized allowance part number"');
    expect(html).toContain('aria-label="Remove Unitemized allowance"');
    expect(html).toContain("Complete the highlighted part details and prices");
  });
  it("keeps actual-RO selection visible even when a preliminary vehicle description exists", () => {
    const html = renderToStaticMarkup(<DiagnosticWorkspace initialSection="Estimate" vehicle="Unlinked description" customer="Draft customer" vin="Draft VIN" concern="Draft concern" tools={<input aria-label="Actual RO lookup" />} onSave={async () => true} onFindDrafts={async () => []} saveStatus="Not saved"><p>Worksheet</p></DiagnosticWorkspace>);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-label="Actual RO lookup"');
  });
});

describe("next billing action", () => {
  const ready = { id: "current", billingMode: "NATIVE", mismatchCodes: [], preview: { lines: [{ key: "approved-work" }], totalCents: 10000 } };
  it("selects the current eligible package, not a manual internal ID", () => {
    expect(nextBillingTask({ packages: [ready], invoices: [] })).toEqual({ action: "POST_INVOICE", subjectId: "current" });
  });
  it("does not offer posting from a stale ready package when current QC is missing", () => {
    expect(nextBillingTask({ packages: [ready], invoices: [], readiness: { mismatchCodes: ["INVOICE_JOB_QC_INCOMPLETE"] } })).toEqual({ action: "PREPARE_INVOICE", subjectId: "" });
  });
  it("never substitutes an older ready package for a newer held package", () => {
    expect(nextBillingTask({ packages: [{ ...ready, id: "held", mismatchCodes: ["INVOICE_JOB_QC_INCOMPLETE"] }, ready], invoices: [] })).toEqual({ action: "PREPARE_INVOICE", subjectId: "" });
    expect(invoiceHoldLabel("INVOICE_JOB_QC_INCOMPLETE")).toBe("Record completed repair work and a passed quality check.");
  });
  it("holds internal and empty packages instead of assuming a customer invoice", () => {
    expect(nextBillingTask({ packages: [{ ...ready, billingMode: "INTERNAL_COST" }], invoices: [] }).action).toBe("PREPARE_INVOICE");
    expect(nextBillingTask({ packages: [], invoices: [] }).action).toBe("PREPARE_INVOICE");
    expect(nextBillingTask({ packages: [{ ...ready, preview: null }], invoices: [] }).action).toBe("PREPARE_INVOICE");
  });
  it("continues an issued invoice to payment and requires a new package after void", () => {
    expect(nextBillingTask({ packages: [ready], invoices: [{ id: "issued", status: "POSTED" }] })).toEqual({ action: "PAYMENT", subjectId: "issued" });
    expect(nextBillingTask({ packages: [ready], invoices: [{ id: "current", status: "VOIDED" }] }).action).toBe("PREPARE_INVOICE");
  });
});
