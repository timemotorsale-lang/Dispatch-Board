export type TaskBlockerPlan = {
  unblockAction: string;
  owner: string;
  reviewAt: string;
  escalationAt: string;
};

export type TaskPlanReviewStatus =
  | "DRAFT_GENERATED"
  | "CONFIRMED"
  | "SIMPLIFIED"
  | "BYPASSED";

export type TaskPlanReview = {
  status: TaskPlanReviewStatus;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  reviewedByName: string | null;
  note: string | null;
};

export type TaskExecutionAssurance = {
  startedAt: string | null;
  lastProgressAt: string | null;
  nextCheckpointAt: string | null;
  lastProgressNote: string | null;
  blockerPlan: TaskBlockerPlan | null;
  planReview: TaskPlanReview;
};

export type TaskMomentumState =
  | "NOT_STARTED"
  | "ON_TRACK"
  | "CHECK_IN_DUE"
  | "STALLED"
  | "BLOCKED"
  | "WAITING"
  | "READY_FOR_REVIEW"
  | "COMPLETED";

const emptyAssurance: TaskExecutionAssurance = {
  startedAt: null,
  lastProgressAt: null,
  nextCheckpointAt: null,
  lastProgressNote: null,
  blockerPlan: null,
  planReview: {
    status: "DRAFT_GENERATED",
    reviewedAt: null,
    reviewedByUserId: null,
    reviewedByName: null,
    note: null
  }
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeDate(value: unknown) {
  const text = normalizeText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizePlanReview(value: unknown): TaskPlanReview {
  if (!isObject(value)) return { ...emptyAssurance.planReview };
  const status =
    value.status === "CONFIRMED" ||
    value.status === "SIMPLIFIED" ||
    value.status === "BYPASSED" ||
    value.status === "DRAFT_GENERATED"
      ? value.status
      : "DRAFT_GENERATED";

  return {
    status,
    reviewedAt: normalizeDate(value.reviewedAt),
    reviewedByUserId: normalizeText(value.reviewedByUserId),
    reviewedByName: normalizeText(value.reviewedByName),
    note: normalizeText(value.note)
  };
}

export function normalizeTaskExecutionAssurance(value: unknown): TaskExecutionAssurance {
  if (!isObject(value)) return { ...emptyAssurance };
  const blockerPlan = isObject(value.blockerPlan)
    ? {
        unblockAction: normalizeText(value.blockerPlan.unblockAction) ?? "",
        owner: normalizeText(value.blockerPlan.owner) ?? "",
        reviewAt: normalizeDate(value.blockerPlan.reviewAt) ?? "",
        escalationAt: normalizeDate(value.blockerPlan.escalationAt) ?? ""
      }
    : null;

  return {
    startedAt: normalizeDate(value.startedAt),
    lastProgressAt: normalizeDate(value.lastProgressAt),
    nextCheckpointAt: normalizeDate(value.nextCheckpointAt),
    lastProgressNote: normalizeText(value.lastProgressNote),
    blockerPlan:
      blockerPlan &&
      blockerPlan.unblockAction &&
      blockerPlan.owner &&
      blockerPlan.reviewAt &&
      blockerPlan.escalationAt
        ? blockerPlan
        : null,
    planReview: normalizePlanReview(value.planReview)
  };
}

export function isTaskPlanConfirmed(assuranceValue: unknown) {
  const status = normalizeTaskExecutionAssurance(assuranceValue).planReview.status;
  return status === "CONFIRMED" || status === "SIMPLIFIED";
}

export function getTaskMomentumState(
  status: string,
  assuranceValue: unknown,
  now = new Date()
): TaskMomentumState {
  if (status === "NOT_STARTED") return "NOT_STARTED";
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "READY_FOR_REVIEW") return "READY_FOR_REVIEW";
  if (status === "BLOCKED") return "BLOCKED";
  if (status === "WAITING_ON_PARTS" || status === "WAITING_ON_APPROVAL") return "WAITING";

  const assurance = normalizeTaskExecutionAssurance(assuranceValue);
  if (!assurance.nextCheckpointAt) return "CHECK_IN_DUE";
  const checkpointAt = new Date(assurance.nextCheckpointAt).getTime();
  const timeRemaining = checkpointAt - now.getTime();
  if (timeRemaining <= 0) return "STALLED";
  if (timeRemaining <= 30 * 60 * 1000) return "CHECK_IN_DUE";
  return "ON_TRACK";
}

export function createDefaultCheckpoint(now: Date, dueAt: Date) {
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  return dueAt.getTime() > now.getTime() && dueAt < twoHoursFromNow
    ? dueAt.toISOString()
    : twoHoursFromNow.toISOString();
}
