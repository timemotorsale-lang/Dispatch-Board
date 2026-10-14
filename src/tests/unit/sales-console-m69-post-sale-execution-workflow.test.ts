import { describe, expect, it } from "vitest";

import {
  buildPostSaleExecutionWorkflow,
  postSaleWorkflowCoversEveryRevenueLane,
  salesConsoleSampleCompletedSaleRecord
} from "@/features/sales/sales-console-m69-post-sale-execution-workflow";

describe("Sales Console M69 post-sale execution workflow", () => {
  it("covers every revenue lane with post-sale steps", () => {
    expect(postSaleWorkflowCoversEveryRevenueLane()).toBe(true);
  });

  it("builds common source reconciliation and delivery steps", () => {
    const workflow = buildPostSaleExecutionWorkflow(salesConsoleSampleCompletedSaleRecord);

    expect(workflow.nextBestStep).toBe("Reconcile completed sale against source records");
    expect(workflow.steps.map((step) => step.id)).toEqual(
      expect.arrayContaining(["source-reconciliation", "customer-history", "delivery-readiness", "inventory-status"])
    );
  });

  it("does not create global tasks or mutate source systems", () => {
    const workflow = buildPostSaleExecutionWorkflow(salesConsoleSampleCompletedSaleRecord);

    expect(workflow.salesConsoleCanCreateGlobalTasks).toBe(false);
    expect(workflow.sourceSystemMutationEnabled).toBe(false);
    expect(workflow.steps.every((step) => step.writeBehavior !== "sales-console-internal" || step.owner === "Sales Console")).toBe(true);
  });

  it("routes lane-specific governed handoffs", () => {
    const workflow = buildPostSaleExecutionWorkflow({
      ...salesConsoleSampleCompletedSaleRecord,
      revenueLane: "Inventory BHPH Sale",
      paymentPath: "bhph"
    });

    expect(workflow.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "bhph-finance-package",
          owner: "Finance",
          writeBehavior: "governed"
        })
      ])
    );
  });
});
