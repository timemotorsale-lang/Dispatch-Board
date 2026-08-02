import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TciTransportTool } from "@/features/prototype/tci-transport-tool";

describe("TciTransportTool", () => {
  it("renders the guided transportation custody workspace and work trail shell", () => {
    const markup = renderToStaticMarkup(<TciTransportTool onProgressChange={() => undefined} />);

    expect(markup).toContain("TMS Transport Custody Intelligence");
    expect(markup).toContain("TCI transportation custody workspace");
    expect(markup).toContain("Establish where the vehicle is currently");
    expect(markup).toContain("Confirm gate pass and auction release");
    expect(markup).toContain("Coordinate driver movement to the auction");
    expect(markup).toContain("Decide whether to drive or tow and complete pre-trip checks");
    expect(markup).toContain("Operational work trail");
    expect(markup).toContain("No transportation action has been recorded yet.");
  });
});
