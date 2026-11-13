import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { currentRepairWorkflowStep, repairReviewHref, scopedRepairOrders } from "@/lib/repair-workflow-review";
import { repairExplorerHandoffHref } from "@/lib/repair-explorer-context";
import { laborGuideHref } from "@/features/diagnostics/labor-guide-view-switch";
import { RepairHandoffTool } from "@/features/prototype/repair-workflow/repair-handoff-tool";
import { RepairExecutionTool } from "@/features/prototype/repair-workflow/repair-execution-tool";
import { ShopPlanningWorkspace } from "@/features/inventory/shop-planning-workspace";
import { canOpenRepairQc, RepairQcDiagnostics } from "@/features/prototype/repair-workflow/repair-qc-diagnostics";

const empty = { stage: "INTAKE", inspectionVersions: [], diagnosisVersions: [], estimateVersions: [], repairJobs: [] };
const approvedOrder = {
  id: "ro-escape",
  estimateVersions: [{ version: 2, lineItems: [{ key: "labor", type: "LABOR" }], authorizations: [{ disposition: "ACCEPTED", authorizedLineKeys: ["labor"] }] }],
  repairJobs: [],
  vendorWorks: [],
};

describe("repair QC prerequisites", () => {
  it("routes approved labor to release when no job exists", () => {
    const html = renderToStaticMarkup(<RepairQcDiagnostics order={approvedOrder} />);
    expect(html).toContain("Approved work awaiting release");
    expect(html).toContain("repairOrderId=ro-escape&amp;step=parts");
    expect(canOpenRepairQc(approvedOrder)).toBe(false);
  });

  it.each([
    ["WAITING_PARTS", "Review parts readiness", false],
    ["READY_FOR_REPAIR", "Open assignment", false],
    ["IN_PROGRESS", "Open repair", false],
    ["READY_FOR_QC", "Completion evidence is recorded", true],
  ])("shows the next action for %s", (status, action, canOpen) => {
    const order = { ...approvedOrder, repairJobs: [{ jobNumber: "J001", status, executionEvidence: ["Technician notes"], partDemands: [] }] };
    expect(renderToStaticMarkup(<RepairQcDiagnostics order={order} />)).toContain(action);
    expect(canOpenRepairQc(order)).toBe(canOpen);
  });

  it("identifies missing completion evidence on a job already marked ready", () => {
    const order = { ...approvedOrder, repairJobs: [{ jobNumber: "J001", status: "READY_FOR_QC", executionEvidence: null, partDemands: [] }] };
    const html = renderToStaticMarkup(<RepairQcDiagnostics order={order} />);
    expect(html).toContain("Completion evidence is missing");
    expect(html).toContain("repairOrderId=ro-escape&amp;step=repair");
  });

  it("routes a fully reserved waiting job to assignment and leaves released parts blocked", () => {
    const order = { ...empty, ...approvedOrder, repairJobs: [{
      jobNumber: "J001", status: "WAITING_PARTS", executionEvidence: null, partsRequired: true, executionBlockerReason: "",
      partDemands: [{ status: "RESERVED", quantityRequired: 2, quantityReserved: 2 }],
    }] };
    expect(currentRepairWorkflowStep(order)).toBe("assignment");
    expect(renderToStaticMarkup(<RepairQcDiagnostics order={order} />)).toContain("Open assignment");
    order.repairJobs[0].executionBlockerReason = "Confirm replacement stock after damage";
    expect(currentRepairWorkflowStep(order)).toBe("parts");
    expect(renderToStaticMarkup(<RepairQcDiagnostics order={order} />)).toContain("Confirm replacement stock after damage");
    order.repairJobs[0].executionBlockerReason = "";
    order.repairJobs[0].partDemands[0].status = "RELEASED";
    expect(currentRepairWorkflowStep(order)).toBe("parts");
    expect(renderToStaticMarkup(<RepairQcDiagnostics order={order} />)).toContain("Review parts readiness");
  });
});
describe("complete repair workflow review", () => {
  it("derives tasks from saved evidence without advancing records", () => {
    expect(currentRepairWorkflowStep(empty)).toBe("inspection");
    expect(currentRepairWorkflowStep({ ...empty, inspectionVersions: [{}] })).toBe("diagnosis");
    expect(currentRepairWorkflowStep({ ...empty, diagnosisVersions: [{}] })).toBe("estimate");
    expect(currentRepairWorkflowStep({ ...empty, estimateVersions: [{ authorizations: [] }] })).toBe("authorization");
    expect(currentRepairWorkflowStep({ ...empty, estimateVersions: [{ authorizations: [{ disposition: "ACCEPTED" }] }] })).toBe("parts");
    expect(currentRepairWorkflowStep({ ...empty, repairJobs: [{ status: "CANCELLED" }] })).toBe("inspection");
    expect(empty.repairJobs).toEqual([]);
  });
  it.each([["READY", "assignment"], ["WAITING_PARTS", "parts"], ["DISPATCHED", "repair"], ["IN_PROGRESS", "repair"], ["PAUSED", "repair"], ["QC_FAILED", "repair"], ["READY_FOR_QC", "qc"], ["QC_PASSED", "qc"]])("routes %s jobs to %s", (status, phase) => {
    expect(currentRepairWorkflowStep({ ...empty, repairJobs: [{ status }] })).toBe(phase);
  });
  it("keeps mixed unfinished jobs out of closeout, and requires explicit QC release", () => {
    expect(currentRepairWorkflowStep({ ...empty, repairJobs: [{ status: "QC_PASSED" }, { status: "WAITING_PARTS" }] })).toBe("parts");
    expect(currentRepairWorkflowStep({ ...empty, releaseAuthorization: { id: "release" } })).toBe("handoff");
    expect(currentRepairWorkflowStep({ ...empty, closedAt: new Date() })).toBe("handoff");
    expect(currentRepairWorkflowStep({ ...empty, stage: "HANDOFF", repairJobs: [{ status: "QC_PASSED" }] })).toBe("handoff");
  });
  it.each([["ESTIMATE_NEEDED", "APPROVED", "estimate"], ["SUPPLEMENT_NEEDED", "PENDING", "estimate"], ["AT_VENDOR", "PENDING", "authorization"], ["AT_VENDOR", "APPROVED", "repair"], ["READY_FOR_PICKUP", "APPROVED", "repair"], ["QC_REQUIRED", "APPROVED", "qc"]])("handles vendor %s / %s", (status, approvalStatus, phase) => {
    expect(currentRepairWorkflowStep({ ...empty, vendorWorks: [{ status, approvalStatus }] })).toBe(phase);
  });
  it("never substitutes another RO while refreshing", () => {
    const model = { repairOrders: [{ id: "other" }, { id: "selected" }], users: [] };
    expect(scopedRepairOrders(model, "selected").repairOrders).toEqual([{ id: "selected" }]);
    expect(scopedRepairOrders(model, "missing").repairOrders).toEqual([]);
    expect(scopedRepairOrders(model)).toBe(model);
  });
  it("preserves opt-in review while routing both guide entry points to the current guide", () => {
    expect(repairReviewHref("RO & 1", "estimate")).toBe("/prototype/repair-workbench?repairOrderId=RO+%26+1&step=estimate");
    expect(repairExplorerHandoffHref("ro", true)).toContain("workflow=review");
    expect(laborGuideHref("new", "ro", true)).toContain("workflow=review");
    expect(laborGuideHref("legacy", "ro")).toBe("/prototype/repair-explorer?repairOrderId=ro");
    expect(laborGuideHref("legacy", "ro", true)).toBe(laborGuideHref("new", "ro", true));
  });
  it("requires actual handoff evidence and never prechecks verification or marks a sale ready", () => {
    const html = renderToStaticMarkup(<RepairHandoffTool repairOrderId="ro" vehicleId="vehicle" internal closed={false} />);
    expect(html).toContain("Handoff evidence");
    expect(html).toContain("Final odometer");
    expect(html).not.toContain("checked=");
    const closed = renderToStaticMarkup(<RepairHandoffTool repairOrderId="ro" vehicleId="vehicle" internal closed />);
    expect(closed).toContain("does not automatically approve frontline release or a sale");
    expect(closed).not.toContain("Close repair &amp; record handoff");
  });
  it("does not offer technician execution before a job exists", () => {
    expect(renderToStaticMarkup(<RepairExecutionTool repairOrderId="ro" jobs={[]} />)).toContain("Create an authorized repair job");
  });
  it.each([
    ["DISPATCHED", [], "Start repair"],
    ["IN_PROGRESS", [{ technicianUserId: "tech", state: "RUNNING", accumulatedMinutes: 10 }], "Complete repair &amp; send to QC"],
    ["PAUSED", [{ technicianUserId: "tech", state: "PAUSED", accumulatedMinutes: 10 }], "Resume repair"],
  ] as const)("offers the correct next repair action for %s", (status, laborClocks, action) => {
    const html = renderToStaticMarkup(<RepairExecutionTool repairOrderId="ro" jobs={[{
      id: "job", jobNumber: "J001", description: "Mount tires", status,
      dispatches: [{ technicianUserId: "tech", status: "ACTIVE" }], laborClocks: [...laborClocks],
    }]} />);
    expect(html).toContain(action);
    if (status !== "DISPATCHED") expect(html).not.toContain("Start repair");
    if (status === "IN_PROGRESS") expect(html).toContain("Record progress update");
  });
  it("offers a new repair start after failed QC and a fresh dispatch", () => {
    const html = renderToStaticMarkup(<RepairExecutionTool repairOrderId="ro" jobs={[{
      id: "job", jobNumber: "J001", description: "Recheck tire balance", status: "DISPATCHED",
      qcFailedAt: "2026-11-12T20:00:00Z", dispatches: [{ technicianUserId: "tech", status: "ACTIVE" }],
      laborClocks: [{ technicianUserId: "tech", state: "FINISHED", accumulatedMinutes: 25, finishedAt: "2026-11-12T19:30:00Z" }],
    }]} />);
    expect(html).toContain("Start repair");
    expect(html).toContain("25 minutes recorded");
  });
  it("links passed customer QC to the invoice for the same order", () => {
    const order = { ...approvedOrder, repairJobs: [{ jobNumber: "J001", status: "QC_PASSED", executionEvidence: ["Work completed"], partDemands: [] }] };
    expect(renderToStaticMarkup(<RepairQcDiagnostics order={order} customerBilling />)).toContain("/vehicles/service-billing?repairOrderId=ro-escape");
    expect(renderToStaticMarkup(<RepairQcDiagnostics order={order} />)).not.toContain("Review and create invoice");
  });
  it("renders only the requested planning form inside the review workbench", () => {
    const order = { id: "ro", repairOrderNumber: "RO-1", version: 1, stage: "INTAKE", updatedAt: "2026-08-01T15:00:00Z", vehicle: { id: "vehicle", vehicleNumber: "VEH-1", vin: null, year: 2024, make: "Toyota", model: "RAV4" }, customer: null, inventoryUnit: null, serviceVisit: { arrivedAt: "2026-08-01T14:00:00Z", concernSummary: "Brake concern" }, advisorUpdates: [], vendorWorks: [], inspectionVersions: [], diagnosisVersions: [], estimateVersions: [], repairJobs: [], partDemands: [] };
    const html = renderToStaticMarkup(<ShopPlanningWorkspace initial={{ repairOrders: [order], users: [] }} focusStep={1} reviewOrderId="ro" />);
    expect(html).toContain('id="repair-planning-step-1"');
    for (const stage of [2, 3, 4, 5]) expect(html).not.toContain(`id="repair-planning-step-${stage}"`);
  });
});
