import { describe, expect, it } from "vitest";
import { autobodyGenerationBlocker } from "@/features/autobody-estimating/workspace-controls";

const ready = {
  recovering: false, recoveryPending: false, repairOrderId: "order-1", closed: false, locationId: "shop-1", ready: true,
};

describe("AutoBody estimate controls", () => {
  it("allows generation only after check-in, an open order, a location and complete review", () => {
    expect(autobodyGenerationBlocker(ready)).toBeNull();
    expect(autobodyGenerationBlocker({ ...ready, repairOrderId: null })).toMatch(/Check in/);
    expect(autobodyGenerationBlocker({ ...ready, closed: true })).toMatch(/Reopen/);
    expect(autobodyGenerationBlocker({ ...ready, locationId: "" })).toMatch(/location/);
    expect(autobodyGenerationBlocker({ ...ready, ready: false })).toMatch(/scope and amount/);
  });

  it("allows recovery of an already-saved request on a closed order and respects browser recovery", () => {
    expect(autobodyGenerationBlocker({ ...ready, recovering: true, closed: true, ready: false })).toBeNull();
    expect(autobodyGenerationBlocker({ ...ready, recovering: true, recoveryPending: true })).toMatch(/Restore or discard/);
  });
});
