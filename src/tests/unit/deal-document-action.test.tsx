import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { SalesDocumentsWorkspace } from "@/features/sales-documents/sales-documents-workspace";
import { closingChecklist } from "@/server/sales-documents/domain";
import { closingReviewSummary } from "@/lib/deal-closing";
import type { SalesDocumentJacketView } from "@/server/sales-documents/service";
const requirements = [{ id: "lease-agreement", label: "Signed lease agreement", phase: "CLOSING" as const, signed: true, required: true }];
const packet: SalesDocumentJacketView = { id: "packet", packetId: "library-packet", dealNumber: "D-1", pathway: "lease-to-own", pathwayLabel: "Lease-to-Own", customerId: null, customerName: "Sample buyer", vehicleReference: "Sample vehicle", vin: null, stockNumber: null, state: "WORKING", revision: 1, phase: "CLOSING", requirements, checklist: closingChecklist(requirements, [], "CLOSING"), closingReview: null, closingReadiness: closingReviewSummary(null, 1), documents: [], updatedAt: "2026-11-01T18:00:00Z", versions: [], history: [] };
const render = (requirementId: string, state = "WORKING") => renderToStaticMarkup(<SalesDocumentsWorkspace initialJackets={[packet]} initialSelected={{ ...packet, state }} initialError="" canWaive={false} initialRequirementId={requirementId} />);
describe("dashboard document correction links", () => {
  it("selects the exact required upload type and opens the checklist without inventing signatures", () => {
    const html = render("lease-agreement");
    expect(html).toContain('id="deal-document-action"');
    expect(html).toContain('value="lease-agreement" selected=""');
    expect(html).toContain("Selected step:");
    expect(html.match(/<input[^>]*name="signed"[^>]*>/)?.[0]).not.toContain("checked");
  });
  it("ignores unknown requirements and retains read-only finalized packets", () => {
    expect(render("unknown-field")).toContain('value="supplemental" selected=""');
    const closed = render("lease-agreement", "CLOSED");
    expect(closed).not.toContain('id="deal-document-action"');
    expect(closed).toContain("A manager can reopen this packet for corrections.");
  });
});
