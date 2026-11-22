import { repairReviewHref, type RepairWorkflowStep } from "./repair-workflow-review";

const actions: Record<RepairWorkflowStep, string> = {
  inspection: "Open inspection checklist",
  diagnosis: "Resume diagnosis",
  estimate: "Build estimate in Labor Guide",
  authorization: "Review authorization",
  parts: "Review parts readiness",
  assignment: "Open assignment",
  repair: "Resume repair",
  qc: "Open quality check",
  handoff: "Open closeout",
};

export type RepairResume = {
  id: string;
  number: string;
  stage: RepairWorkflowStep;
  owner: string;
  action: string;
  blockedReason?: string;
  canAct: boolean;
};

export function repairLaborGuideHref(repairOrderId: string, returnTo?: string, draftId?: string) {
  const query = new URLSearchParams({ repairOrderId, workflow: "review" });
  if (returnTo) {
    query.set("returnTo", returnTo);
    query.set("returnLabel", "Return to repair order");
  }
  if (draftId) query.set("draftId", draftId);
  return `/diagnostics/labor-guide?${query}`;
}

export type VehicleWorkActions = {
  orders: RepairResume[];
  canCheckIn: boolean;
  canPrepareSale: boolean;
  canStartAsIsSale: boolean;
};

export function repairResumeLabel(input: {
  stage: RepairWorkflowStep;
  canAct: boolean;
  vendor: boolean;
  hasDraft: boolean;
}) {
  if (!input.canAct) return "View repair order";
  if (input.vendor && ["estimate", "authorization", "repair"].includes(input.stage)) return "Open vendor handoff";
  if (input.stage === "estimate" && input.hasDraft) return "Resume estimate draft";
  return actions[input.stage];
}

export function repairResumeHref(order: RepairResume, returnTo?: string, returnLabel?: string) {
  const href = repairReviewHref(order.id, undefined, { returnTo, returnLabel });
  return order.canAct ? `${href}&resume=1` : href;
}
