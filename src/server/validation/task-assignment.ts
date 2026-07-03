<<<<<<< HEAD
export type NormalizedTaskAssignmentInput = {
  assignedUserId: string;
};

function normalizeRequiredText(value: unknown, message: string) {
  if (typeof value !== "string") {
    throw new Error(message);
=======
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
>>>>>>> main
  }

  const normalizedValue = value.trim();

<<<<<<< HEAD
  if (!normalizedValue) {
    throw new Error(message);
  }

  return normalizedValue;
=======
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
>>>>>>> main
}

export function normalizeTaskAssignmentInput(input: unknown): NormalizedTaskAssignmentInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Task assignment payload must be an object.");
  }

<<<<<<< HEAD
  const candidate = input as Record<string, unknown>;
  const allowedKeys = new Set(["assignedUserId"]);
  const unknownKeys = Object.keys(candidate).filter((key) => !allowedKeys.has(key));

  if (unknownKeys.length > 0) {
    throw new Error(`Task assignment contains unsupported fields: ${unknownKeys.join(", ")}.`);
  }

  return {
    assignedUserId: normalizeRequiredText(
      candidate.assignedUserId,
      "Task reassignment requires an assigned user."
    )
=======
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
>>>>>>> main
  };
}
