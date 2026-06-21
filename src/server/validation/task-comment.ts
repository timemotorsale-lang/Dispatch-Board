const taskCommentAllowedKeys = new Set(["body"]);
const taskCommentBodyMaxLength = 2000;

export type NormalizedTaskCommentInput = {
  body: string;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertTaskCommentObject(value: unknown) {
  if (!isPlainObject(value)) {
    throw new Error("Task comment payload must be an object.");
  }

  return value;
}

function rejectUnknownKeys(value: Record<string, unknown>) {
  for (const key of Object.keys(value)) {
    if (!taskCommentAllowedKeys.has(key)) {
      throw new Error(`Task comments contain an unsupported field: "${key}".`);
    }
  }
}

function normalizeBody(value: unknown) {
  if (typeof value !== "string") {
    throw new Error("Task comments require body to be a string.");
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error("Task comments require a comment body.");
  }

  if (normalizedValue.length > taskCommentBodyMaxLength) {
    throw new Error(`Task comments must be ${taskCommentBodyMaxLength} characters or fewer.`);
  }

  return normalizedValue;
}

export function normalizeTaskCommentInput(value: unknown): NormalizedTaskCommentInput {
  const input = assertTaskCommentObject(value);

  rejectUnknownKeys(input);

  return {
    body: normalizeBody(input.body)
  };
}
