export type TaskAssignmentMode = "accept_recommendation" | "override" | "reassign";

export type NormalizedTaskAssignmentInput = {
  assignedUserId: string | null;
  mode: TaskAssignmentMode;
  reason: string | null;
};

const taskAssignmentModes = new Set<TaskAssignmentMode>([
  "accept_recommendation",
  "override",
  "reassign"
]);

function normalizeOptionalText(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Task assignment reason must be text.");
  }

  const normalizedValue = value.trim();

  return normalizedValue ? normalizedValue : null;
}

function normalizeOptionalUserId(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Task assignment user id must be text.");
  }

  const normalizedValue = value.trim();

  return normalizedValue ? normalizedValue : null;
}

export function normalizeTaskAssignmentInput(input: unknown): NormalizedTaskAssignmentInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Task assignment payload must be an object.");
  }

  const payload = input as Record<string, unknown>;

  if (typeof payload.mode !== "string" || !taskAssignmentModes.has(payload.mode as TaskAssignmentMode)) {
    throw new Error(
      "Task assignment mode must be accept_recommendation, override, or reassign."
    );
  }

  return {
    assignedUserId: normalizeOptionalUserId(payload.assignedUserId),
    mode: payload.mode as TaskAssignmentMode,
    reason: normalizeOptionalText(payload.reason)
  };
}
