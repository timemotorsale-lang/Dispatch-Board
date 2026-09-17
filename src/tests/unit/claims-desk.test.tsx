import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ClaimsDesk } from "@/features/inventory/claims-desk";

describe("claims desk", () => {
  it("renders the v1 claim desk landing flow before opening the workspace", () => {
    const html = renderToStaticMarkup(<ClaimsDesk />);

    expect(html).toContain("Desk an insurance claim");
    expect(html).toContain("Find before creating");
    expect(html).toContain("Choose how this claim starts");
    expect(html).toContain("Existing claim or RO");
    expect(html).toContain("Known customer / vehicle");
    expect(html).toContain("Unknown or walk-in claim");
    expect(html).toContain("Active claim candidates");
    expect(html).toContain("Start claim intake");
    expect(html).toContain("Start claim workspace");
    expect(html).toContain("Customer name");
    expect(html).toContain("Desk signals");
    expect(html).toContain("Handoff lanes");
    expect(html).toContain("Desk guardrails");
    expect(html).toContain("/vehicles/claims-workspace");
  });
});
