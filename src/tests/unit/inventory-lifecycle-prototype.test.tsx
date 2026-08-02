import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InventoryLifecyclePrototype } from "@/features/prototype/inventory-lifecycle-prototype";

describe("InventoryLifecyclePrototype", () => {
  it("renders the isolated official lifecycle prototype shell", () => {
    const markup = renderToStaticMarkup(<InventoryLifecyclePrototype />);

    expect(markup).toContain("Official prototype workspace");
    expect(markup).toContain("No production lifecycle");
    expect(markup).toContain("2024 Toyota RAV4 XLE");
    expect(markup).toContain("Complete inventory lifecycle");
    expect(markup).toContain("Acquisition");
    expect(markup).toContain("Transportation");
    expect(markup).toContain("Post-Sale");
    expect(markup).toContain("Stage command");
    expect(markup).toContain("Handoff control");
    expect(markup).toContain("TMS Acquisition Intelligence");
    expect(markup).toContain("TAI buyer decision workspace");
    expect(markup).toContain("Run TAI evaluation");
    expect(markup).toContain("Submit for approval");
    expect(markup).toContain("Record accepted purchase");
    expect(markup).toContain("Return to real Inventory Lifecycle");
  });

  it("keeps handoff unavailable until required prototype actions are complete", () => {
    const markup = renderToStaticMarkup(<InventoryLifecyclePrototype />);

    expect(markup).toContain("0 of 6 required actions complete");
    expect(markup).toContain("Complete every required action before handoff becomes available.");
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Simulate acquisition handoff/);
  });

  it("renders the intake-stage workspace link when the intake tool is shown", () => {
    const markup = renderToStaticMarkup(<InventoryLifecyclePrototype />);

    expect(markup).toContain("Open Vehicle Intake form");
  });
});
