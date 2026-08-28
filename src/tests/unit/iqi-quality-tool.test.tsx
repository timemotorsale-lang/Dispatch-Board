import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { IqiQualityTool } from "@/features/prototype/iqi-quality-tool";

describe("IqiQualityTool", () => {
  it("renders the governed Initial QC workspace that inspection should open", () => {
    const markup = renderToStaticMarkup(<IqiQualityTool onProgressChange={() => undefined} />);

    expect(markup).toContain("TMS Initial Quality Control");
    expect(markup).toContain("IQI initial QC workspace");
    expect(markup).toContain("Confirm inspection package received");
    expect(markup).toContain("Release the controlled handoff");
    expect(markup).toContain("Open live QC workspace");
    expect(markup).toContain("/vehicles/quality-control?returnTo=%2Fvehicles%2Finventory");
    expect(markup).toContain("Operational work trail");
  });
});
