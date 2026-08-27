import { describe, expect, it, vi } from "vitest";

const actor = { id: "manager-1", name: "Manager One", email: "manager@example.test", isActive: true, roles: ["General Manager"], duties: { all: [], direct: [], roleDefaults: [] } };
const mocks = vi.hoisted(() => ({ getUnifiedCrmWorkflowApprovalDesigner: vi.fn() }));
vi.mock("@/server/auth/current-user", () => ({ getCurrentUser: vi.fn(async () => actor) }));
vi.mock("@/server/services/unified-crm-workflow-approval-designer-service", () => mocks);
import { GET } from "@/app/api/crm/v1/enterprise/workflow-designer/route";

describe("Unified CRM workflow approval designer route", () => {
  it("returns the workflow designer readiness model", async () => {
    mocks.getUnifiedCrmWorkflowApprovalDesigner.mockResolvedValueOnce({ contractVersion: "ucrm.workflow-approval-designer/v1", state: "HELD" });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ contractVersion: "ucrm.workflow-approval-designer/v1", state: "HELD" });
  });

  it("maps typed authorization errors safely", async () => {
    mocks.getUnifiedCrmWorkflowApprovalDesigner.mockRejectedValueOnce(Object.assign(new Error("CRM workflow designer readiness is available to the manager workspace."), { code: "WORKFLOW_APPROVAL_DESIGNER_NOT_AUTHORIZED" }));
    const response = await GET();
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "WORKFLOW_APPROVAL_DESIGNER_NOT_AUTHORIZED", contractVersion: "ucrm.workflow-approval-designer-error/v1" });
  });
});
