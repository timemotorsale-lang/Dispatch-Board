import { describe, expect, it } from "vitest";

import {
  determineShopHandoff,
  evaluateShopTransition,
  routeVehicleWorkflow,
  scoreShopWorkPriority
} from "@/server/inventory/shop-operations";

describe("inventory and shop workflow separation", () => {
  it("never routes a customer-owned vehicle into retail inventory", () => {
    expect(routeVehicleWorkflow({ dealershipOwned: false, intendedForRetailSale: false, repairOrDiagnosticWorkRequired: true }).route).toBe("SHOP_CUSTOMER_REPAIR");
  });

  it("creates an inventory-recon route for dealership stock needing repair", () => {
    expect(routeVehicleWorkflow({ dealershipOwned: true, intendedForRetailSale: true, repairOrDiagnosticWorkRequired: true }).route).toBe("SHOP_INVENTORY_RECON");
  });

  it("requires approval and parts before repairs can begin", () => {
    const result = evaluateShopTransition({
      approvalAccepted: false,
      currentStage: "READY_FOR_REPAIR",
      diagnosticEvidenceComplete: true,
      nextStage: "REPAIRS",
      partsReady: false,
      qcPassed: false
    });
    expect(result.allowed).toBe(false);
    expect(result.reasonCodes).toContain("SHOP_APPROVAL_REQUIRED");
    expect(result.reasonCodes).toContain("SHOP_PARTS_NOT_READY");
  });

  it("returns completed recon to inventory and customer work to delivery", () => {
    expect(determineShopHandoff("INVENTORY_RECON", true).destination).toBe("INVENTORY_TITLE_OR_MERCHANDISING");
    expect(determineShopHandoff("CUSTOMER_REPAIR", true).destination).toBe("CUSTOMER_DELIVERY");
    expect(determineShopHandoff("CUSTOMER_REPAIR", false).allowed).toBe(false);
  });

  it("uses inventory age pressure for recon without diluting customer and safety priority", () => {
    const decision = scoreShopWorkPriority({
      customerCommitment: 0.4,
      estimatedWorkRemainingHours: 6,
      evaluatedAt: new Date("2026-07-13T12:00:00.000Z"),
      inventoryLifecycleAgePressure: 1,
      origin: "INVENTORY_RECON",
      partsReadiness: 1,
      requiredCompletionAt: new Date("2026-07-13T16:00:00.000Z"),
      revenueRelease: 0.9,
      safetyImpact: 0.8,
      workOrderId: "work-1"
    });
    expect(decision.result.origin).toBe("INVENTORY_RECON");
    expect(decision.score).toBeGreaterThanOrEqual(65);
    expect(decision.reasonCodes).toContain("SHOP_SCHEDULE_AT_RISK");
  });
});

