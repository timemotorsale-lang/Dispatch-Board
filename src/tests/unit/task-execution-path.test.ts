import { WorkflowArea } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { normalizeWorkflowArea } from "@/server/services/task-execution-path";

describe("task execution path", () => {
  it("accepts user-facing workflow labels when initiating a path", () => {
    expect(normalizeWorkflowArea({ workflowArea: "Shop & Recon" })).toBe(WorkflowArea.SHOP);
    expect(normalizeWorkflowArea({ workflowArea: "Service Advisor" })).toBe(WorkflowArea.SERVICE_ADVISOR);
    expect(normalizeWorkflowArea({ workflowArea: "ServiceAdvisor" })).toBe(WorkflowArea.SERVICE_ADVISOR);
    expect(normalizeWorkflowArea({ workflowArea: "Inventory / Parts" })).toBe(WorkflowArea.INVENTORY);
  });

  it("still accepts stored workflow enum keys", () => {
    expect(normalizeWorkflowArea({ workflowArea: "SHOP" })).toBe(WorkflowArea.SHOP);
    expect(normalizeWorkflowArea({ workflowArea: "SERVICE_ADVISOR" })).toBe(WorkflowArea.SERVICE_ADVISOR);
  });
});
