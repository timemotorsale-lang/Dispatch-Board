import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { ServiceDocumentWorkflow, type WorkflowDocument } from "@/features/inventory/service-document-workflow";

const estimate: WorkflowDocument = { id: "doc-1", sourceId: "estimate-1", kind: "ESTIMATE", sha256: "proof", templateVersion: "v1", content: { title: "Official repair estimate", number: "RO-1 / v1", issuedAt: "2026-10-28T12:00:00Z", identity: { customer: "Customer", store: "Time Motor Sales", address: "Store address", timezone: "America/Chicago", vehicle: "Actual vehicle", vin: "VIN", vehicleNumber: "VEH-1", concern: "Door glass", repairOrderNumber: "RO-1" }, lines: [], notes: [] } };

describe("single document workflow", () => {
  it("opens the branded estimate with print and one next action", () => {
    const html = renderToStaticMarkup(<ServiceDocumentWorkflow repairOrderId="ro/1" documents={[estimate]} selectedId={estimate.id} />);
    expect(html).toContain("Repair Estimate");
    expect(html).toContain("Time Motor Sales");
    expect(html).toContain(">Print</button>");
    expect(html).toContain(">Save PDF</a>");
    expect(html).not.toContain("Print / Save PDF");
    expect(html).toContain("Record customer approval");
    expect(html).toContain('href="/api/repair-orders/ro%2F1/documents/doc-1/pdf"');
    expect(html).toContain('href="/prototype/repair-workbench?repairOrderId=ro%2F1&amp;step=qc"');
    expect(html).toContain(">Open QC</a>");
    expect(html).not.toContain("Continue recon / shop workflow");
    expect(html).not.toContain("/vehicles/shop-planning");
  });
  it("identifies customer revisions with staff name and actual save time", () => {
    const revision = { ...estimate, createdAt: "2026-10-29T15:30:00Z", createdByName: "Service Advisor", content: { ...estimate.content, revisionLabel: "Customer details updated" } };
    const html = renderToStaticMarkup(<ServiceDocumentWorkflow repairOrderId="ro-1" documents={[revision]} selectedId={revision.id} />);
    expect(html).toContain("Customer details updated");
    expect(html).toContain("Service Advisor");
    expect(html).toContain("Oct 29, 2026");
  });
  it("offers invoice conversion only after a matching accepted approval", () => {
    const approval: WorkflowDocument = { ...estimate, id: "decision-1", sourceId: "approval-1", kind: "AUTHORIZATION", content: { ...estimate.content, decision: { disposition: "ACCEPTED", actor: "Customer", channel: "IN_PERSON", approvedLineKeys: [], declinedLineKeys: [], undecidedLineKeys: [] }, notes: ["Source estimate estimate-1, version 1;"] } };
    const html = renderToStaticMarkup(<ServiceDocumentWorkflow repairOrderId="ro/1" documents={[approval, estimate]} selectedId={estimate.id} />);
    expect(html).toContain("Convert to invoice");
    const unrelated = { ...approval, content: { ...approval.content, notes: ["Source estimate old-estimate, version 1;"] } };
    expect(renderToStaticMarkup(<ServiceDocumentWorkflow repairOrderId="ro/1" documents={[unrelated, estimate]} selectedId={estimate.id} />)).toContain("Record customer approval");
    const revoked = { ...approval, id: "revoked", content: { ...approval.content, decision: { ...approval.content.decision!, disposition: "REVOKED" } } };
    expect(renderToStaticMarkup(<ServiceDocumentWorkflow repairOrderId="ro/1" documents={[revoked, approval, estimate]} selectedId={estimate.id} />)).toContain("Record customer approval");
  });
  it("continues an invoice to payment and shows saved receipts without another payment action", () => {
    const invoice = { ...estimate, kind: "INVOICE" };
    expect(renderToStaticMarkup(<ServiceDocumentWorkflow repairOrderId="ro/1" documents={[invoice]} selectedId={invoice.id} />)).toContain("Record payment");
    const receipt = { ...estimate, kind: "PAYMENT" };
    const html = renderToStaticMarkup(<ServiceDocumentWorkflow repairOrderId="ro/1" documents={[receipt]} selectedId={receipt.id} />);
    expect(html).not.toContain(">Record payment<");
    expect(html).toContain(">Print</button>");
    expect(html).toContain(">Save PDF</a>");
    expect(html).not.toContain("Print / Save PDF");
  });
});
