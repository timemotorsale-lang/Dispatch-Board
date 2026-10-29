import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { currentRepairWorkflowStep, repairReviewHref, scopedRepairOrders } from "@/lib/repair-workflow-review";
import { repairExplorerHandoffHref } from "@/lib/repair-explorer-context";
import { laborGuideHref } from "@/features/diagnostics/labor-guide-view-switch";
import { RepairHandoffTool } from "@/features/prototype/repair-workflow/repair-handoff-tool";
import { RepairExecutionTool } from "@/features/prototype/repair-workflow/repair-execution-tool";
import { ShopPlanningWorkspace } from "@/features/inventory/shop-planning-workspace";

const empty = { stage: "INTAKE", inspectionVersions: [], diagnosisVersions: [], estimateVersions: [], repairJobs: [] };
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
  it("renders only the requested planning form inside the review workbench", () => {
    const order = { id: "ro", repairOrderNumber: "RO-1", version: 1, stage: "INTAKE", updatedAt: "2026-08-01T15:00:00Z", vehicle: { id: "vehicle", vehicleNumber: "VEH-1", vin: null, year: 2024, make: "Toyota", model: "RAV4" }, customer: null, inventoryUnit: null, serviceVisit: { arrivedAt: "2026-08-01T14:00:00Z", concernSummary: "Brake concern" }, advisorUpdates: [], vendorWorks: [], inspectionVersions: [], diagnosisVersions: [], estimateVersions: [], repairJobs: [], partDemands: [] };
    const html = renderToStaticMarkup(<ShopPlanningWorkspace initial={{ repairOrders: [order], users: [] }} focusStep={1} reviewOrderId="ro" />);
    expect(html).toContain('id="repair-planning-step-1"');
    for (const stage of [2, 3, 4, 5]) expect(html).not.toContain(`id="repair-planning-step-${stage}"`);
  });
});
