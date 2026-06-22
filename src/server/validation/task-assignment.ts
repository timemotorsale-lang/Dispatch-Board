export type TaskAssignmentMode = "accept_recommendation" | "override" | "reassign";

export type NormalizedTaskAssignmentInput = {
  mode: TaskAssignmentMode;
  assignedUserId?: string;
  reason?: string;
};

const allowedKeys = new Set(["mode", "assignedUserId", "reason"]);
const modes = new Set<TaskAssignmentMode>(["accept_recommendation", "override", "reassign"]);

export function normalizeTaskAssignmentInput(value: unknown): NormalizedTaskAssignmentInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Task assignment payload must be an object.");
  }

  const input = value as Record<string, unknown>;
  for (const key of Object.keys(input)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`Task assignment contains an unsupported field: "${key}".`);
    }
  }

  if (typeof input.mode !== "string" || !modes.has(input.mode as TaskAssignmentMode)) {
    throw new Error("Task assignment requires a valid mode.");
  }

  const mode = input.mode as TaskAssignmentMode;
  const assignedUserId = typeof input.assignedUserId === "string" ? input.assignedUserId.trim() : undefined;
  const reason = typeof input.reason === "string" ? input.reason.trim() : undefined;

  if (input.assignedUserId !== undefined && typeof input.assignedUserId !== "string") {
    throw new Error("Task assignment requires assignedUserId to be a string when provided.");
  }
  if (input.reason !== undefined && typeof input.reason !== "string") {
    throw new Error("Task assignment requires reason to be a string when provided.");
  }
  if (mode === "accept_recommendation" && assignedUserId) {
    throw new Error("Accepting a recommendation does not allow assignedUserId.");
  }
  if (mode !== "accept_recommendation" && !assignedUserId) {
    throw new Error(`${mode === "override" ? "Override" : "Reassignment"} requires assignedUserId.`);
  }

  return { mode, ...(assignedUserId ? { assignedUserId } : {}), ...(reason ? { reason } : {}) };
}
