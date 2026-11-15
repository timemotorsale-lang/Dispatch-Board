import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/repair-history/repair-history-search", async importOriginal => {
  const actual = await importOriginal<typeof import("@/features/repair-history/repair-history-search")>();
  return { ...actual, RepairHistorySearch: vi.fn(actual.RepairHistorySearch) };
});

import { RepairHistorySearch } from "@/features/repair-history/repair-history-search";
import { DealOperationsDrawer } from "@/features/crm-next/deal-operations-drawer";
import { DealRepairHistory } from "@/features/crm-next/deal-repair-history";
import { SavedDealsLibrary } from "@/features/crm-next/saved-deals-library";

beforeEach(() => { vi.clearAllMocks(); });
describe("Deals repair history integration", () => {
  it("offers exactly one repair-search disclosure before the deal category tabs", () => {
    const html = renderToStaticMarkup(<SavedDealsLibrary title="Deals" onOpen={() => undefined} disabled={false} refreshKey="test" />);
    expect(html.match(/<summary>Find saved repair work<\/summary>/g)).toHaveLength(1);
    expect(html.indexOf("Find saved repair work")).toBeLessThan(html.indexOf('aria-label="Deal sections"'));
    expect(html).toContain("Deal filters and counts are separate.");
  });
  it("does not add global search to embedded saved-deal pickers", () => {
    expect(renderToStaticMarkup(<SavedDealsLibrary onOpen={() => undefined} disabled={false} refreshKey="test" />)).not.toContain("Find saved repair work");
    expect(RepairHistorySearch).not.toHaveBeenCalled();
  });
  it("lets the shared component own the only disclosure without forwarding deal filters", () => {
    const html = renderToStaticMarkup(<DealRepairHistory />);
    expect(html.match(/<details\b/g)).toHaveLength(1);
    expect(vi.mocked(RepairHistorySearch).mock.calls[0][0]).toEqual({ initialCustomerId: undefined });
  });
  it("requires a linked customer before exposing search inside a repair deal", () => {
    const html = renderToStaticMarkup(<DealRepairHistory requireCustomer />);
    expect(html).toContain("Select a shared customer");
    expect(RepairHistorySearch).not.toHaveBeenCalled();
  });

  it("keeps the drawer's customer repair search available while deal details load", () => {
    const html = renderToStaticMarkup(<DealOperationsDrawer deal={{
      draftId: "draft-1", pathway: "repairs", customerName: "Customer A", customerId: "customer-1",
    }} onClose={() => {}} onChanged={() => {}} />);
    expect(html).toContain("Loading this deal");
    expect(html).toContain("Find saved repair work");
    expect(html).not.toContain("Prepare the paperwork checklist");
    expect(vi.mocked(RepairHistorySearch).mock.calls[0][0]).toEqual({ initialCustomerId: "customer-1" });
  });

  it("scopes detail search using the canonical customer ID with one disclosure", () => {
    const html = renderToStaticMarkup(<DealRepairHistory customerId="customer-123" />);
    expect(html.match(/<details\b/g)).toHaveLength(1);
    expect(vi.mocked(RepairHistorySearch).mock.calls[0][0]).toEqual({ initialCustomerId: "customer-123" });
    expect(html).toContain("including closed repairs and records without a deal");
  });
});
