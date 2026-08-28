import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { WopWorkOrderTool } from "@/features/prototype/wop-work-order-tool";

describe("WopWorkOrderTool", () => {
  it("renders the governed work-order planning workspace", () => {
    const markup = renderToStaticMarkup(<WopWorkOrderTool onProgressChange={() => undefined} />);

    expect(markup).toContain("TMS Work Order Planning");
    expect(markup).toContain("WOP work-order workspace");
    expect(markup).toContain("Create jobs from accepted findings");
    expect(markup).toContain("Estimate labor and parts");
    expect(markup).toContain("Sequence dependencies");
    expect(markup).toContain("Authorize the exact plan version");
    expect(markup).toContain("Diagnostic Planning");
    expect(markup).toContain("Labor Guide");
    expect(markup).toContain("Autobody Labor Guide");
    expect(markup).toContain("Assign Repair Jobs");
    expect(markup).toContain("Parts Ordering");
    expect(markup).toContain("Budget Approval");
    expect(markup).toContain("Within $500 shop approval limit");
    expect(markup).toContain("Governed parts ordering chain");
    expect(markup).toContain("Create parts demand");
    expect(markup).toContain("Receive and match before repair");
    expect(markup).toContain("/vehicles/shop-planning?returnTo=%2Fvehicles%2Finventory");
    expect(markup).toContain("/diagnostics/labor-guide?returnTo=%2Fvehicles%2Finventory");
    expect(markup).toContain("/diagnostics/autobody-estimate?returnTo=%2Fvehicles%2Finventory");
    expect(markup).toContain("/vehicles/repair-workbench?view=all&amp;returnTo=%2Fvehicles%2Finventory");
    expect(markup).toContain("/vehicles/parts-operations?returnTo=%2Fvehicles%2Finventory");
    expect(markup).toContain("Operational work trail");
  });
});
