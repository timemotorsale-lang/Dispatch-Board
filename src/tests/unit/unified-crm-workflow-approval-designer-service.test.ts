import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/server/auth/store";
import { getUnifiedCrmWorkflowApprovalDesigner } from "@/server/services/unified-crm-workflow-approval-designer-service";

const manager: AuthenticatedUser = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const seller: AuthenticatedUser = { ...manager, id: "seller-1", roles: ["Salesperson"] };

describe("Unified CRM workflow approval designer readiness", () => {
  it("allows simulation readiness while holding publish and live execution", async () => {
    const result = await getUnifiedCrmWorkflowApprovalDesigner(manager, { now: () => new Date("2026-08-27T21:30:00.000Z") });
    expect(result.contractVersion).toBe("ucrm.workflow-approval-designer/v1");
    expect(result.state).toBe("HELD");
    expect(result.activation).toEqual({ liveWorkflowExecutionEnabled: false, publishEnabled: false, simulationEnabled: true, state: "HELD" });
    expect(result.checks.find((check) => check.category === "simulation")).toMatchObject({ status: "PASS" });
    expect(result.checks.find((check) => check.category === "loopProtection")).toMatchObject({ status: "HOLD" });
    expect(result.simulationPreview).toMatchObject({ state: "READY_REVIEW", liveExecutionEnabled: false, publishEnabled: false });
    expect(result.simulationPreview.previews).toHaveLength(3);
    expect(result.simulationPreview.previews.map((preview) => preview.liveExecutionEnabled)).toEqual([false, false, false]);
    expect(result.simulationPreview.previews[0]?.blockedActions).toContain("No customer communication");
  });

  it("denies non-manager workspaces", async () => {
    await expect(getUnifiedCrmWorkflowApprovalDesigner(seller)).rejects.toMatchObject({ code: "WORKFLOW_APPROVAL_DESIGNER_NOT_AUTHORIZED" });
  });
});
