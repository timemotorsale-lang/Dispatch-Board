export const repairWorkflowSteps = ["inspection", "diagnosis", "estimate", "authorization", "parts", "assignment", "repair", "qc", "handoff"] as const;
export type RepairWorkflowStep = typeof repairWorkflowSteps[number];
export const repairWorkflowLabels: Record<RepairWorkflowStep, string> = { inspection: "Inspect", diagnosis: "Diagnose / scope", estimate: "Estimate", authorization: "Authorize", parts: "Parts & release", assignment: "Assign", repair: "Repair", qc: "Quality check", handoff: "Closeout / handoff" };
export function repairReviewHref(repairOrderId: string, step?: RepairWorkflowStep) {
  return `/prototype/repair-workbench?${new URLSearchParams({ repairOrderId, ...(step ? { step } : {}) })}`;
}
export function currentRepairWorkflowStep(order: {
  closedAt?: unknown; stage: string; releaseAuthorization?: unknown;
  inspectionVersions: unknown[]; diagnosisVersions: unknown[];
  estimateVersions: { authorizations: { disposition: string }[] }[];
  repairJobs: { status: string }[];
  vendorWorks?: { status: string; approvalStatus: string }[];
}): RepairWorkflowStep {
  const jobs = order.repairJobs.filter(job => !["CANCELLED", "CANCELED"].includes(job.status));
  if (order.closedAt || ["CLOSED", "HANDOFF"].includes(order.stage) || order.releaseAuthorization) return "handoff";
  if (jobs.some(job => ["QC_FAILED", "REWORK_REQUIRED", "PAUSED"].includes(job.status))) return "repair";
  if (jobs.length && jobs.every(job => ["READY_FOR_QC", "QC_PASSED", "COMPLETED"].includes(job.status))) return "qc";
  if (jobs.some(job => job.status === "WAITING_PARTS")) return "parts";
  if (jobs.some(job => ["DISPATCHED", "IN_PROGRESS"].includes(job.status))) return "repair";
  if (jobs.length) return "assignment";
  const vendor = order.vendorWorks?.find(work => !["CANCELLED", "COMPLETED"].includes(work.status));
  if (vendor) {
    if (["RETURNED", "QC_REQUIRED"].includes(vendor.status)) return "qc";
    if (["ESTIMATE_NEEDED", "SUPPLEMENT_NEEDED"].includes(vendor.status)) return "estimate";
    if (!["APPROVED", "NOT_REQUIRED"].includes(vendor.approvalStatus)) return "authorization";
    return "repair";
  }
  if (["ACCEPTED", "PARTIAL"].includes(order.estimateVersions[0]?.authorizations[0]?.disposition)) return "parts";
  if (order.estimateVersions.length) return "authorization";
  if (order.diagnosisVersions.length) return "estimate";
  return order.inspectionVersions.length ? "diagnosis" : "inspection";
}

export function scopedRepairOrders<Model extends { repairOrders: { id: string }[] }>(model: Model, repairOrderId?: string): Model {
  return repairOrderId ? { ...model, repairOrders: model.repairOrders.filter(order => order.id === repairOrderId) } : model;
}

export function notifyRepairReviewSaved(repairOrderId: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("repair-workflow-saved", { detail: { repairOrderId } }));
}
