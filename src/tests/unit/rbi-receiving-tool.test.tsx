import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RbiReceivingTool } from "@/features/prototype/rbi-receiving-tool";

describe("RbiReceivingTool", () => {
  it("renders the guided receiving baseline workspace and work trail shell", () => {
    const markup = renderToStaticMarkup(<RbiReceivingTool onProgressChange={() => undefined} />);

    expect(markup).toContain("TMS Receiving Baseline Intelligence");
    expect(markup).toContain("RBI receiving baseline workspace");
    expect(markup).toContain("Scan and match the VIN");
    expect(markup).toContain("Record arrival facts");
    expect(markup).toContain("Capture the receiving baseline photo set");
    expect(markup).toContain("Operational work trail");
    expect(markup).toContain("No receiving action has been recorded yet.");
  });
});
