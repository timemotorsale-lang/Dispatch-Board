import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("approved Inventory Console visual conformance", () => {
  it("keeps every approved image in source control", () => {
    for (const asset of [
      "inventory-console-home-landing-page-source-of-truth.png",
      "inventory-lifecycle-landing-page-control-tower-navigation-v2.png",
      "shop-recon-landing-page-source-of-truth.png",
      "parts-operations-workspace-source-of-truth.png",
      "disposition-wholesale-workspace-source-of-truth.png",
      "inventory-lifecycle-control-tower-source.png",
    ]) expect(existsSync(`docs/inventory/assets/${asset}`), asset).toBe(true);
  });

  it("preserves the approved Home, Lifecycle, Shop, Parts, Wholesale, and Control Tower panel contracts", () => {
    const sources = {
      home: read("src/features/inventory/inventory-console-home.tsx"),
      lifecycle: read("src/features/inventory/inventory-lifecycle-landing.tsx"),
      tower: read("src/features/inventory/inventory-control-tower.tsx"),
      shop: read("src/features/inventory/shop-recon-landing.tsx"),
      parts: read("src/features/inventory/parts-operations-workspace.tsx"),
      wholesale: read("src/features/inventory/disposition-wholesale-workspace.tsx"),
    };
    for (const label of ["Inventory Manager Workspace", "What needs attention", "Daily flow brief", "Operational inbox", "Inventory lifecycle", "More inventory tools", "Role protection stays active"]) expect(sources.home).toContain(label);
    for (const label of ["Lifecycle Pipeline", "Priority Work categories", "My Work", "Team", "Exceptions", "VIN (Last 6)", "Current Stage", "Blocker / Issue", "Next Action", "Review and Approval categories", "Reviews", "Approvals", "Lifecycle Velocity", "Stage Bottlenecks", "Inventory Aging"]) expect(sources.lifecycle).toContain(label);
    for (const label of ["Retail Inventory", "Source", "Appraise", "Recon Handoff", "Shop / Recon", "Repair Parts", "Selected inventory unit", "Flow Exceptions", "Value at Risk", "Shop Capacity Board", "Productive Touch Time", "Capital &amp; Aging Portfolio", "Lifecycle summary card", "Operating state"]) expect(sources.tower).toContain(label);
    for (const label of ["Capacity &amp; Assignment", "Technician", "Assigned / Capacity", "Blocker Center", "Blocker categories", "All Blockers", "Parts", "Approvals", "Vendors", "Shop decision categories", "Reviews", "Amount", "Daily Throughput", "Parts Operations", "At-Risk Completion", "High risk", "Medium risk", "Low risk"]) expect(sources.shop).toContain(label);
    for (const label of ["Parts Milestones", "Parts Work Queue", "Parts work categories", "My Work", "Team", "Exceptions", "Part # / Description", "Repair Order / Job", "Vehicle", "Required By", "Availability", "Vendor / ETA", "Reservation", "Owner", "Blocker", "Reviews &amp; Approvals", "Review and approval categories", "Reviews", "Approvals", "Item", "Age", "Amount", "Supply &amp; Availability", "Purchase Orders &amp; Receiving", "Transfers &amp; Custody", "Returns &amp; Recovery", "Recommendation Explanation", "Vendor comparison / ETA"]) expect(sources.parts).toContain(label);
    for (const label of ["Disposition Milestones", "Recommendation Workbench", "Recommendation work categories", "My Work", "Team", "Exceptions", "Vehicle", "Stock #", "Exposure", "Evidence Freshness", "Recommended Channel", "Confidence", "Rationale Summary", "Owner", "Due State", "Reviews &amp; Approvals", "Disposition review and approval categories", "Reviews", "Approvals", "Item", "Age", "Amount", "Channel Performance", "Offers &amp; Bids", "Settlement &amp; Reconciliation", "Decision Explanation"]) expect(sources.wholesale).toContain(label);
  });

  it("retains responsive enterprise-density styling", () => {
    const css = read("src/app/globals.css");
    for (const selector of [".visual-console-page", ".vcp-kpis", ".vcp-flow-row", ".shop-board", ".ict-exact", ".ict-flow-lane", ".dwh-insight-grid", ".dwh-overview-primary", ".dwh-table-scroll", ".parts-operations-detail-grid"]) expect(css).toContain(selector);
    expect(css).toContain("@media(max-width:560px)");
  });
});
