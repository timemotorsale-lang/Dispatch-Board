import { describe, expect, it } from "vitest";

import { evaluateShopReconPilotProgress, getShopReconPilotScenario, SHOP_RECON_PILOT_SCENARIOS } from "@/server/shop-recon/pilot";

describe("Shop & Recon operational pilots", () => {
  it("defines one customer and one inventory scenario with lane-correct exits", () => {
    expect(SHOP_RECON_PILOT_SCENARIOS).toHaveLength(2);
    expect(getShopReconPilotScenario("PILOT-CUST-001")).toMatchObject({ workLane: "CUSTOMER_REPAIR", expectedHandoff: "Service advisor / customer" });
    expect(getShopReconPilotScenario("PILOT-INV-001")).toMatchObject({ workLane: "INVENTORY_RECON", expectedHandoff: "Inventory lifecycle" });
    expect(getShopReconPilotScenario("RO-ORDINARY")).toBeNull();
  });

  it("covers the complete 16-stage path without gaps", () => {
    const groups = SHOP_RECON_PILOT_SCENARIOS[0].stageGroups;
    expect(groups[0].fromStage).toBe(1);
    expect(groups.at(-1)?.toStage).toBe(16);
    expect(groups.slice(1).every((group, index) => group.fromStage === groups[index].toStage + 1)).toBe(true);
  });

  it("turns the embedded journey checklist into live progress", () => {
    const scenario = SHOP_RECON_PILOT_SCENARIOS[0];
    expect(evaluateShopReconPilotProgress(scenario, 1, "ACTIVE").map(group => group.status)).toEqual(["IN_PROGRESS", "PENDING", "PENDING", "PENDING", "PENDING"]);
    expect(evaluateShopReconPilotProgress(scenario, 13, "ACTIVE").map(group => group.status)).toEqual(["COMPLETE", "COMPLETE", "COMPLETE", "IN_PROGRESS", "PENDING"]);
    expect(evaluateShopReconPilotProgress(scenario, 16, "CLOSED").every(group => group.status === "COMPLETE")).toBe(true);
  });

  it("includes the governed exception paths needed for the tabletop pilot", () => {
    const drills = SHOP_RECON_PILOT_SCENARIOS.flatMap(scenario => scenario.exceptionDrills.map(drill => drill.id));
    expect(drills).toEqual(expect.arrayContaining(["CUSTOMER_DECLINE", "SCOPE_CHANGE", "QC_REWORK", "KEY_MISMATCH", "PARTS_CONSTRAINT", "WIP_LIMIT", "BAY_REASSIGNMENT", "WRONG_HANDOFF"]));
  });
});
