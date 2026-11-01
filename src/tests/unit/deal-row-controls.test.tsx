import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { DealRowActions, DealRowStatus, type DealLibraryRow } from "@/features/crm-next/deal-row-controls";
const deal: DealLibraryRow = { id: "deal-one", draftId: "draft-one", draftRevision: 2, jacketId: "packet-one", customerName: "Sample Buyer", vehicleReference: "Toyota", pathway: "lease-to-own", status: "SOLD", stage: "Sold · paperwork pending", packetState: "WORKING", updatedAt: "2026-11-01T18:00:00Z", nextAction: "Signed lease agreement", documentChecklist: [{ id: "lease-agreement", phase: "CLOSING", label: "Signed lease agreement", status: "Signed copy needed" }] };
const noop = () => {};
const actions = (row = deal, canManage = false) => renderToStaticMarkup(<DealRowActions deal={row} canManage={canManage} disabled={false} archiveBusy={false} onOpen={noop} onDetails={noop} onArchive={noop} onLifecycle={noop} />);
describe("compact deal row controls", () => {
  it("keeps completion as a deliberate action and shows progress without an editable status selector", () => {
    const html = renderToStaticMarkup(<DealRowStatus deal={deal} onDetails={noop} />);
    expect(html).toContain('aria-haspopup="dialog"'); expect(html).not.toContain("<select");
    expect(html).toContain("Signed copy needed"); expect(html).toContain("Funding"); expect(html).toContain("Delivery");
    expect(html).toContain("requirementId=lease-agreement#deal-document-action");
    const markup = actions();
    expect(markup).toContain('data-completion="pending"'); expect(markup).toContain("Complete paperwork");
    expect(markup).toContain('role="menu"'); expect(markup).not.toContain("Mark sold");
  });
  it("keeps Continue primary for working deals and offers Mark sold within the action menu", () => {
    const html = actions({ ...deal, status: "IN_PROGRESS", stage: "Working" });
    const menu = html.indexOf('role="menu"');
    expect(html.indexOf(">Continue</button>")).toBeLessThan(menu);
    expect(html.indexOf(">Mark sold</button>")).toBeGreaterThan(menu);
    expect(html).toContain("Archive duplicate");
  });
  it("only offers manager correction and unwind actions to permitted viewers", () => {
    const finished = { ...deal, packetState: "CLOSED", stage: "Completed" };
    expect(actions(finished)).not.toContain("Reopen for corrections");
    const html = actions(finished, true);
    expect(html).toContain("Reopen for corrections"); expect(html).toContain("Request unwind review");
    expect(html).toContain('role="separator"'); expect(html).not.toContain("Complete paperwork");
    expect(html).not.toContain("Continue deal");
  });
  it("keeps inactive deals available for review without edit, sold, reminder or loaner actions", () => {
    const html = actions({ ...deal, status: "ARCHIVED", stage: "Archived" }, true);
    expect(html).toContain("Open packet");
    for (const label of [">Continue", "Complete paperwork", "Mark sold", "Set deal reminder", "Issue loaner", "Archive duplicate", "Reopen for corrections"]) expect(html).not.toContain(label);
  });
  it("does not offer an inaccessible private draft as Continue", () => {
    const row = { ...deal, indicators: { canEdit: false } } as DealLibraryRow;
    const html = actions(row);
    expect(html).not.toContain("Continue deal"); expect(html).not.toContain("Complete paperwork");
    expect(html).toContain("Open packet");
  });
  it("keeps unwind reviews available for inspection without editing, selling or archiving them", () => {
    const html = actions({ ...deal, status: "PENDING", stage: "Unwind review pending", packetState: "UNWIND_PENDING" }, true);
    for (const label of ["Continue deal", "Complete paperwork", "Mark sold", "Archive duplicate"]) expect(html).not.toContain(label);
    expect(html).toContain("Open packet"); expect(html).toContain("Set deal reminder");
  });
});
