import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { IiiIntakeTool } from "@/features/prototype/iii-intake-tool";

describe("IiiIntakeTool", () => {
  it("renders the guided intake workspace and work trail shell", () => {
    const markup = renderToStaticMarkup(<IiiIntakeTool onProgressChange={() => undefined} />);

    expect(markup).toContain("TMS Inventory Intake Intelligence");
    expect(markup).toContain("III intake workspace");
    expect(markup).toContain("Confirm canonical vehicle linkage");
    expect(markup).toContain("Validate decoded vehicle facts");
    expect(markup).toContain("Run the intake readiness gate");
    expect(markup).toContain("Open Vehicle Intake form");
    expect(markup).toContain("/vehicles/workflows/add-vehicle?returnTo=%2Fvehicles%2Finventory");
    expect(markup).toContain("Operational work trail");
    expect(markup).toContain("No intake action has been recorded yet.");
  });
});
