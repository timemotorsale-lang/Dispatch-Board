import { describe, expect, it } from "vitest";

import { evaluateWopPartsOrdering, type WopPartsOrderingInput } from "@/features/prototype/wop-parts-ordering-rules";

const baseInput: WopPartsOrderingInput = {
  demandCreated: true,
  etaConfirmed: true,
  fitmentConfirmed: true,
  linkedJobConfirmed: true,
  orderPlaced: true,
  quantityConfirmed: true,
  quantityMatched: true,
  readyForRepairConfirmed: true,
  received: true,
  revisedWorkOrderTotalDollars: 450,
  sourceCommitted: true,
  sourceType: "OEM dealer",
  supplementApproved: false,
  urgentExceptionUsed: false,
  urgency: "Required to start work",
  vendorQuoteCaptured: true,
  visibleDamageClear: true,
};

describe("evaluateWopPartsOrdering", () => {
  it("marks the parts chain ready when demand, sourcing, receipt, and readiness are complete", () => {
    const result = evaluateWopPartsOrdering(baseInput, 450);

    expect(result.recommendation).toBe("Ready for repair");
    expect(result.blockerCount).toBe(0);
    expect(result.readinessComplete).toBe(true);
    expect(result.supplementRequired).toBe(false);
  });

  it("requires supplement approval when the revised total exceeds the approved plan", () => {
    const result = evaluateWopPartsOrdering({
      ...baseInput,
      revisedWorkOrderTotalDollars: 980,
      supplementApproved: false,
    }, 500);

    expect(result.supplementRequired).toBe(true);
    expect(result.approvalComplete).toBe(false);
    expect(result.blockers).toContain("Revised work-order total exceeds the approved plan and needs supplement approval");
  });
});
