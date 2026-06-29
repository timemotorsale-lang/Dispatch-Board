export type NormalizedTaskAssignmentInput = {
  assignedUserId: string;
};

function normalizeRequiredText(value: unknown, message: string) {
  if (typeof value !== "string") {
    throw new Error(message);
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(message);
  }

  return normalizedValue;
}

export function normalizeTaskAssignmentInput(input: unknown): NormalizedTaskAssignmentInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Task assignment payload must be an object.");
  }

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
  };
}
