import { createHash, randomUUID } from "node:crypto";

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(",")}}`;
}

export function hashEnterpriseCommand(value: unknown) {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

export class EnterpriseCommandConflictError extends Error {
  constructor(message: string, public readonly code: "IDEMPOTENCY_KEY_REUSED" | "VERSION_CONFLICT") {
    super(message);
  }
}

export type EnterpriseCommandInput = {
  actorUserId: string;
  commandType: string;
  domain: string;
  expectedVersion: number;
  idempotencyKey: string;
  locationId: string | null;
  organizationId: string;
  payload: Record<string, unknown>;
  reason: string;
  subjectId: string;
  subjectType: string;
};

export function normalizeEnterpriseCommand(input: EnterpriseCommandInput) {
  const required = [input.organizationId, input.actorUserId, input.domain, input.subjectType, input.subjectId, input.commandType, input.idempotencyKey];
  if (required.some((value) => !value.trim())) throw new Error("Enterprise command identity fields are required.");
  if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) throw new Error("Expected version must be a non-negative integer.");
  if (input.reason.trim().length < 10) throw new Error("Enterprise commands require a reason of at least 10 characters.");
  const normalized = { ...input, commandType: input.commandType.trim().toUpperCase(), domain: input.domain.trim().toUpperCase(), idempotencyKey: input.idempotencyKey.trim(), reason: input.reason.trim(), subjectId: input.subjectId.trim(), subjectType: input.subjectType.trim().toUpperCase() };
  return { ...normalized, correlationId: randomUUID(), requestHash: hashEnterpriseCommand(normalized) };
}
