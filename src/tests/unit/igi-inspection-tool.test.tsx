import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { IgiInspectionTool } from "@/features/prototype/igi-inspection-tool";

describe("IgiInspectionTool", () => {
  it("renders the governed inspection workspace and Initial QC link", () => {
    const markup = renderToStaticMarkup(<IgiInspectionTool onProgressChange={() => undefined} />);

    expect(markup).toContain("TMS Governed Inspection");
    expect(markup).toContain("IGI inspection workspace");
    expect(markup).toContain("Perform identity and safety pre-check");
    expect(markup).toContain("Complete mechanical and bodywork inspection");
    expect(markup).toContain("Inspect cosmetic, bodywork, and equipment condition");
    expect(markup).toContain("Publish structured findings");
    expect(markup).toContain("Open Initial QC form");
    expect(markup).not.toContain("/vehicles/quality-control?returnTo=%2Fvehicles%2Finventory%2Fprototype");
    expect(markup).toContain("Operational work trail");
  });
});
