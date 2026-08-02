import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { WopPartsOrderingTool } from "@/features/prototype/wop-parts-ordering-tool";

describe("WopPartsOrderingTool", () => {
  it("renders the governed parts ordering chain inside work order", () => {
    const markup = renderToStaticMarkup(<WopPartsOrderingTool approvedBudgetDollars={500} onProgressChange={() => undefined} />);

    expect(markup).toContain("Governed parts ordering chain");
    expect(markup).toContain("Create parts demand");
    expect(markup).toContain("Source or reserve the part");
    expect(markup).toContain("Resolve supplement and approval");
    expect(markup).toContain("Receive and match before repair");
    expect(markup).toContain("Mechanical labor guide");
    expect(markup).toContain("Autobody labor guide");
    expect(markup).toContain("Open parts workspace");
    expect(markup).toContain("Parts work trail");
  });
});
