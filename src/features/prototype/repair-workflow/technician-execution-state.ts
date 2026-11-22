import { waitingJobPartsReady } from "@/lib/repair-job-parts-readiness";

export type TechnicianExecutionJob = Parameters<typeof waitingJobPartsReady>[0] & {
  id: string;
  jobNumber: string;
  description: string;
  procedureVersion?: { requiredEvidence?: unknown } | null;
  plannedCorrection?: string | null;
  status: string;
  qcFailedAt?: string | null;
  dispatches: { technicianUserId: string; status: string }[];
  laborClocks: { technicianUserId: string; state: string; accumulatedMinutes: number; finishedAt?: string | null }[];
};

export const laborActionLabels = {
  START: "Start repair",
  PAUSE: "Pause / record blocker",
  RESUME: "Resume repair",
  FINISH: "Complete repair & send to QC",
};

export type LaborAction = keyof typeof laborActionLabels;

export function technicianExecutionState(job: TechnicianExecutionJob) {
  const active = job.dispatches.find(dispatch => dispatch.status === "ACTIVE");
  const staged = job.dispatches.find(dispatch => dispatch.status === "STAGED");
  const clock = job.laborClocks.find(item => item.technicianUserId === active?.technicianUserId);
  const waitingForParts = job.status === "WAITING_PARTS" && !waitingJobPartsReady(job);
  const complete = ["READY_FOR_QC", "QC_PASSED", "COMPLETED"].includes(job.status);
  const executable = ["DISPATCHED", "IN_PROGRESS", "PAUSED"].includes(job.status);
  const restart = clock?.state === "FINISHED" && job.status === "DISPATCHED" &&
    job.qcFailedAt && clock.finishedAt && Date.parse(clock.finishedAt) <= Date.parse(job.qcFailedAt);

  let actions: LaborAction[] = [];
  if (active && executable && !waitingForParts) {
    if (clock?.state === "RUNNING") actions = ["FINISH", "PAUSE"];
    else if (clock?.state === "PAUSED") actions = ["RESUME", "FINISH"];
    else if (job.status === "DISPATCHED" && (!clock || clock.state === "NOT_STARTED" || restart)) actions = ["START"];
  }
  return { active, staged, waitingForParts, complete, executable, actions };
}

export function savedTechnicianText(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}
