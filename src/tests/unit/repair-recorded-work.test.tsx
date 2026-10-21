import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "@/tests/helpers/render-with-app-router";
import { repairWorkflowEvidence } from "@/lib/repair-workflow-evidence";
import { RepairRecordedWork } from "@/features/prototype/repair-workflow/repair-recorded-work";
import { RepairWorkflowFrame } from "@/features/prototype/repair-workflow/repair-workflow-frame";

const timestamp = new Date("2026-10-18T12:00:00Z");
function fixture() {
  return {
    id: "selected-ro", stage: "INTAKE", closedAt: null, ownerUser: { name: "Advisor Morgan" }, nextAction: "Source approved brake parts", stateReason: "Waiting for supplier confirmation",
    serviceVisit: { arrivedAt: timestamp, concernSummary: "Brake grinding" },
    inspectionVersions: [{ id: "inspection", version: 1, completedAt: timestamp, summary: "Walkaround evidence recorded" }],
    diagnosisVersions: [{ id: "diagnosis", version: 1, diagnosedAt: timestamp, cause: "Worn pads", proposedCorrection: "Replace pads", technicianUser: { name: "Technician" } }],
    estimateVersions: [{ id: "latest", version: 2, status: "PRESENTED", totalCents: 43000, presentedAt: timestamp, expiresAt: timestamp, authorUser: { name: "Advisor Morgan" }, authorizations: [] as { id: string; disposition: string; decisionActorName: string; decidedAt: Date; reason: string }[] }, { id: "old", version: 1, status: "SUPERSEDED", totalCents: 30000, presentedAt: timestamp, expiresAt: timestamp, authorUser: { name: "Advisor Morgan" }, authorizations: [{ id: "old-approval", disposition: "ACCEPTED", decisionActorName: "Customer", decidedAt: timestamp, reason: "Historical decision" }] }],
    repairJobs: [{ id: "done", jobNumber: "J1", description: "Completed earlier repair", status: "QC_PASSED", partsRequired: true, readinessReasonCodes: [] }, { id: "waiting", jobNumber: "J2", description: "Replace pads", status: "WAITING_PARTS", partsRequired: true, readinessReasonCodes: ["PARTS_NOT_RESERVED"] }, { id: "cancelled", jobNumber: "J3", description: "Cancelled work", status: "CANCELLED", partsRequired: false, readinessReasonCodes: [] }],
    partDemands: [{ quantityRequired: 2, quantityReserved: 1 }], advisorUpdates: [], stateEvents: [], vendorWorks: [],
  };
}
const renderRecorded = (order: ReturnType<typeof fixture>) => renderToStaticMarkup(<RepairRecordedWork order={order as unknown as ComponentProps<typeof RepairRecordedWork>["order"]} />);

describe("recorded work visibility", () => {
  it("shows saved estimates and completed work on every step with exact-RO print access", () => {
    const html = renderRecorded(fixture());
    expect(html).toContain("Already recorded");
    expect(html).toContain("v2 · $430.00");
    expect(html).toContain("Pending · v2");
    expect(html).toContain("1/2 jobs QC passed");
    expect(html).toContain("Source approved brake parts");
    expect(html).toContain("Waiting for supplier confirmation");
    expect(html).toContain("RO owner: Advisor Morgan");
    expect(html).toContain("repairOrderId=selected-ro&amp;estimateId=latest&amp;workflow=review");
    expect(html).toContain("Completed earlier repair");
    expect(html).toContain("Earlier revision");
    expect(html).toContain("Historical decision");
    expect(html).not.toContain("<details open");
  });
  it("does not transfer approval from older versions or count cancelled work as completed", () => {
    const status = repairWorkflowEvidence(fixture());
    expect(status.estimate).toBe("Saved · v2");
    expect(status.authorization).toBe("Pending · v2");
    expect(status.repair).toBe("1/2 work finished");
    expect(status.parts).toBe("0/1 demands reserved");
    expect(status.qc).toBe("1/2 jobs passed");
    expect(status.handoff).toBe("Not released");
    expect(repairWorkflowEvidence({ ...fixture(), stage: "HANDOFF" }).handoff).toBe("Not released");
    expect(repairWorkflowEvidence({ ...fixture(), releaseAuthorization: { id: "release" } }).handoff).toBe("Release recorded · closeout pending");
  });
  it.each(["PARTIAL", "DECLINED", "REVOKED"])("shows the actual latest %s decision", disposition => {
    const order = fixture(); order.estimateVersions[0].authorizations = [{ id: "current", disposition, decisionActorName: "Current customer", decidedAt: timestamp, reason: "Actual latest decision" }];
    expect(repairWorkflowEvidence(order).authorization).toMatch(new RegExp(disposition === "PARTIAL" ? "Partially approved" : disposition === "DECLINED" ? "Declined" : "Revoked"));
  });
  it("distinguishes not recorded from no parts required and does not infer completed earlier steps", () => {
    const order = { ...fixture(), inspectionVersions: [], diagnosisVersions: [], estimateVersions: [], partDemands: [], repairJobs: [{ ...fixture().repairJobs[0], partsRequired: false }], stage: "HANDOFF" };
    expect(repairWorkflowEvidence(order)).toMatchObject({ inspection: "Not recorded", diagnosis: "Not recorded", estimate: "Not recorded", authorization: "No estimate", parts: "No parts required by jobs", handoff: "Not released" });
    expect(renderRecorded({ ...fixture(), estimateVersions: [], repairJobs: [] })).toContain("No saved estimate");
  });
  it("selects the latest version numerically without mutating saved history", () => {
    const order = fixture(); order.estimateVersions.reverse();
    expect(repairWorkflowEvidence(order).authorization).toBe("Pending · v2");
    expect(renderRecorded(order)).toContain("v2 · $430.00");
    expect(order.estimateVersions[0].version).toBe(1);
  });
  it("keeps saved context visible while looking at parts without implying navigation is completion", () => {
    const html = renderToStaticMarkup(<RepairWorkflowFrame repairOrderId="selected-ro" number="RO-1" vehicle="Ford" stock="406095" location="Shop" current="parts" selected="parts" closed={false} stepStatus={repairWorkflowEvidence(fixture())} recordedWork={<p>Saved estimate v2</p>}><p>Parts form</p></RepairWorkflowFrame>);
    expect(html).toContain("Saved estimate v2");
    expect(html).toContain("Saved · v2");
    expect(html).toContain("Pending · v2");
    expect(html).toContain("Not released");
  });
});
