import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TaiAcquisitionTool } from "@/features/prototype/tai-acquisition-tool";

describe("TaiAcquisitionTool", () => {
  it("renders the acquisition workspace with VIN capture support", () => {
    const markup = renderToStaticMarkup(<TaiAcquisitionTool onProgressChange={() => undefined} />);

    expect(markup).toContain("TMS Acquisition Intelligence");
    expect(markup).toContain("TAI buyer decision workspace");
    expect(markup).toContain("Acquisition identity capture");
    expect(markup).toContain("Paste VIN barcode text or Manheim / ADESA windshield details here");
    expect(markup).toContain("Open Vehicle Intake form");
    expect(markup).toContain("/vehicles/workflows/add-vehicle?returnTo=%2Fvehicles%2Finventory%2Fprototype");
    expect(markup).toContain("Submit for approval");
    expect(markup).toContain("Record purchase");
  });
});
