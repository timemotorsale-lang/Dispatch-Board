import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TaiAcquisitionTool } from "@/features/prototype/tai-acquisition-tool";

describe("TaiAcquisitionTool", () => {
  it("renders the acquisition workspace with VIN capture support", () => {
    const markup = renderToStaticMarkup(<TaiAcquisitionTool onProgressChange={() => undefined} />);

    expect(markup).toContain("TMS Acquisition Intelligence");
    expect(markup).toContain("TAI buyer decision workspace");
    expect(markup).toContain("Opportunity Builder");
    expect(markup).toContain("Decode + Value");
    expect(markup).toContain("Pre-acquisition tool");
    expect(markup).toContain("Duplicate check");
    expect(markup).toContain("Asking price status");
    expect(markup).toContain("Seller refused");
    expect(markup).toContain("MMR / market value");
    expect(markup).toContain("Market value source");
    expect(markup).toContain("Expected retail");
    expect(markup).toContain("Local market");
    expect(markup).toContain("National baseline");
    expect(markup).toContain("Buyer intelligence");
    expect(markup).toContain("Decoded vehicle intelligence");
    expect(markup).toContain("Known issue watch");
    expect(markup).toContain("Inspection focus");
    expect(markup).toContain("reliability risk");
    expect(markup).toContain("Acquisition identity capture");
    expect(markup).toContain("Paste VIN barcode text or Manheim / ADESA windshield details here");
    expect(markup).toContain("Open Vehicle Intake form");
    expect(markup).toContain("/vehicles/workflows/add-vehicle?returnTo=%2Fvehicles%2Finventory");
    expect(markup).toContain("Submit for approval");
    expect(markup).toContain("Record purchase");
  });

  it("uses the selected lifecycle vehicle instead of the sample opportunity", () => {
    const markup = renderToStaticMarkup(<TaiAcquisitionTool onProgressChange={() => undefined} selectedVehicle={{ label: "2017 Acura MDX", vin: "5J8YD4H39HL001234" }} />);

    expect(markup).toContain("2017 Acura MDX");
    expect(markup).toContain("5J8YD4H39HL001234");
    expect(markup).toContain("Run Decode + Value for the selected vehicle");
    expect(markup).toContain("Recommended fast path");
    expect(markup).toContain("Complete Acquisition &amp; Open Transportation");
    expect(markup).toContain("Advanced acquisition tools (optional)");
    expect(markup).toContain("That is all you need for the fast path.");
    expect(markup).not.toContain("2024 Toyota RAV4");
    expect(markup).not.toContain("2T3W1RFVXRW333586");
  });
});
