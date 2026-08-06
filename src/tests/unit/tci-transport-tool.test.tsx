import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TciTransportTool } from "@/features/prototype/tci-transport-tool";

describe("TciTransportTool", () => {
  it("renders the guided transportation custody workspace and work trail shell", () => {
    const markup = renderToStaticMarkup(<TciTransportTool onProgressChange={() => undefined} />);

    expect(markup).toContain("TMS Transport Custody Intelligence");
    expect(markup).toContain("Transportation Custody Builder");
    expect(markup).toContain("Source location");
    expect(markup).toContain("Release readiness");
    expect(markup).toContain("Driver / carrier coordination");
    expect(markup).toContain("Movement safety");
    expect(markup).toContain("0/8 checklist lines cleared");
    expect(markup).toContain("Operational work trail");
    expect(markup).toContain("No transportation action has been recorded yet.");
  });
});
