import type { RepairWorkflowStep } from "./repair-workflow-review";

type Evidence = {
  stage: string;
  closedAt?: unknown;
  releaseAuthorization?: unknown;
  inspectionVersions: unknown[];
  diagnosisVersions: unknown[];
  estimateVersions: { version: number; authorizations: { disposition: string }[] }[];
  repairJobs: { status: string; partsRequired: boolean }[];
  partDemands: { quantityRequired: number; quantityReserved: number }[];
};

export const readableRepairStatus = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/^./, letter => letter.toUpperCase());

export function repairWorkflowEvidence(order: Evidence): Record<RepairWorkflowStep, string> {
  const estimate = [...order.estimateVersions].sort((left, right) => right.version - left.version)[0];
  const decision = estimate?.authorizations[0]?.disposition;
  const jobs = order.repairJobs.filter(job => !["CANCELLED", "CANCELED"].includes(job.status));
  const qcPassed = jobs.filter(job => job.status === "QC_PASSED").length;
  const finished = jobs.filter(job => ["READY_FOR_QC", "QC_PASSED"].includes(job.status)).length;
  const started = jobs.filter(job => ["IN_PROGRESS", "PAUSED", "READY_FOR_QC", "QC_PASSED"].includes(job.status)).length;
  const booked = jobs.filter(job => ["DISPATCHED", "IN_PROGRESS", "PAUSED", "READY_FOR_QC", "QC_PASSED"].includes(job.status)).length;
  const reserved = order.partDemands.filter(demand => demand.quantityReserved >= demand.quantityRequired).length;
  const approval = decision ? ({ ACCEPTED: "Approved", PARTIAL: "Partially approved", DECLINED: "Declined", REVOKED: "Revoked", PENDING: "Pending" } as Record<string, string>)[decision] ?? readableRepairStatus(decision) : "Pending";
  return {
    inspection: order.inspectionVersions.length ? "Recorded" : "Not recorded",
    diagnosis: order.diagnosisVersions.length ? "Recorded" : "Not recorded",
    estimate: estimate ? `Saved · v${estimate.version}` : "Not recorded",
    authorization: estimate ? `${approval} · v${estimate.version}` : "No estimate",
    parts: order.partDemands.length ? `${reserved}/${order.partDemands.length} demands reserved` : jobs.length && jobs.every(job => !job.partsRequired) ? "No parts required by jobs" : "No demands recorded",
    assignment: jobs.length ? `${booked}/${jobs.length} jobs booked / worked` : "No jobs",
    repair: jobs.length ? `${finished}/${jobs.length} work finished${started > finished ? " · in progress" : ""}` : "No jobs",
    qc: jobs.length ? `${qcPassed}/${jobs.length} jobs passed` : "No job QC recorded",
    handoff: order.closedAt || order.stage === "CLOSED" ? "Closed" : order.releaseAuthorization ? "Release recorded · closeout pending" : "Not released",
  };
}
