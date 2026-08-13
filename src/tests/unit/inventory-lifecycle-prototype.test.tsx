import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InventoryLifecyclePrototype } from "@/features/prototype/inventory-lifecycle-prototype";
import { PmmPhotosMarketingTool } from "@/features/prototype/pmm-photos-marketing-tool";
import { TlrTitleReadinessTool } from "@/features/prototype/tlr-title-readiness-tool";

describe("InventoryLifecyclePrototype", () => {
  it("renders the integrated official lifecycle workspace shell", () => {
    const markup = renderToStaticMarkup(<InventoryLifecyclePrototype />);

    expect(markup).toContain("Integrated lifecycle workspace");
    expect(markup).toContain("Guided stage operations, evidence, handoffs, and history now live inside the Inventory Console.");
    expect(markup).toContain("2024 Toyota RAV4 XLE");
    expect(markup).toContain("Complete inventory lifecycle");
    expect(markup).toContain("Acquisition");
    expect(markup).toContain("Transportation");
    expect(markup).toContain("Post-Sale");
    expect(markup).toContain("Stage command");
    expect(markup).toContain("Handoff control");
    expect(markup).toContain("TMS Acquisition Intelligence");
    expect(markup).toContain("TAI buyer decision workspace");
    expect(markup).toContain("Do This · Stage 1 of 16");
    expect(markup).toContain("0 of 6 actions complete · Not ready for Transportation");
    expect(markup).toContain("Run TAI evaluation");
    expect(markup).toContain("Submit for approval");
    expect(markup).toContain("Record accepted purchase");
    expect(markup).toContain("Required before Transportation");
    expect(markup).toContain("Vehicle, source, and seller identity");
    expect(markup).toContain("Condition and market appraisal");
    expect(markup).toContain("Manager purchase approval");
    expect(markup).toContain("Continue: Vehicle, source, and seller identity");
    expect(markup).toContain("Refresh Inventory Console");
  });

  it("keeps handoff unavailable until required actions are complete", () => {
    const markup = renderToStaticMarkup(<InventoryLifecyclePrototype />);

    expect(markup).toContain("0 of 6 required actions complete");
    expect(markup).toContain("6 acquisition requirements remain. Next: Vehicle, source, and seller identity.");
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Release to Transportation/);
  });

  it("renders the intake-stage workspace link when the intake tool is shown", () => {
    const markup = renderToStaticMarkup(<InventoryLifecyclePrototype />);

    expect(markup).toContain("Open Vehicle Intake form");
  });

  it("uses transport-neutral assignment language in Transportation", () => {
    const markup = renderToStaticMarkup(<InventoryLifecyclePrototype initialStage={1} />);

    expect(markup).toContain("Transport provider assigned");
    expect(markup).toContain("Transport assignment");
    expect(markup).not.toContain("Driver assignment");
  });

  it("renders return-to-lifecycle controls in the later lifecycle workspaces", () => {
    const pmmMarkup = renderToStaticMarkup(
      <PmmPhotosMarketingTool onProgressChange={() => undefined} onReturnToLifecycle={() => undefined} />,
    );
    const tlrMarkup = renderToStaticMarkup(
      <TlrTitleReadinessTool onProgressChange={() => undefined} onReturnToLifecycle={() => undefined} />,
    );

    expect(pmmMarkup).toContain("PMM merchandising workspace");
    expect(pmmMarkup).toContain("Return to lifecycle");
    expect(tlrMarkup).toContain("TLR legal-readiness workspace");
    expect(tlrMarkup).toContain("Return to lifecycle");
  });
});
