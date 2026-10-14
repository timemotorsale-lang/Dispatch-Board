import { createHash } from "crypto";

import type { GrowthRole } from "./approval-gates";

export type GrowthCommandScope =
  | "campaign_plan"
  | "audience_snapshot"
  | "message_draft"
  | "approval_request"
  | "approval_decision"
  | "launch_lock"
  | "provider_dry_run"
  | "crm_writeback_preview";

export type GrowthMutationBoundary =
  | "GrowthOnly"
  | "ExternalProvider"
  | "Crm"
  | "Inventory"
  | "Sales"
  | "Service"
  | "Appointments"
  | "Accounting";

export type GrowthCommandEnvelope<TPayload extends Record<string, unknown> = Record<string, unknown>> = {
  actorId: string;
  actorRole: GrowthRole;
  idempotencyKey: string;
  payload: TPayload;
  reason: string;
  requestedAt: string;
  scope: GrowthCommandScope;
};

export type GrowthCommandValidation = {
  allowed: boolean;
  boundary: GrowthMutationBoundary;
  commandHash: string;
  failures: string[];
  nextAction: string;
};

const externalMutationScopes: Partial<Record<GrowthCommandScope, GrowthMutationBoundary>> = {
  crm_writeback_preview: "Crm",
  provider_dry_run: "ExternalProvider"
};

const rolesByScope: Record<GrowthCommandScope, GrowthRole[]> = {
  approval_decision: ["GM/Admin", "Marketing Manager", "Sales Manager", "Inventory Manager", "Service Manager"],
  approval_request: ["GM/Admin", "Marketing Manager", "Sales Manager", "Inventory Manager", "Service Manager"],
  audience_snapshot: ["GM/Admin", "Marketing Manager", "Sales Manager", "Inventory Manager", "Service Manager"],
  campaign_plan: ["GM/Admin", "Marketing Manager", "Sales Manager", "Inventory Manager", "Service Manager"],
  crm_writeback_preview: ["GM/Admin", "Marketing Manager", "Sales Manager"],
  launch_lock: ["GM/Admin", "Marketing Manager"],
  message_draft: ["GM/Admin", "Marketing Manager", "Sales Manager", "Inventory Manager", "Service Manager"],
  provider_dry_run: ["GM/Admin", "Marketing Manager"]
};

export function validateGrowthCommandBoundary<TPayload extends Record<string, unknown>>(
  envelope: GrowthCommandEnvelope<TPayload>,
  options: { allowExternalMutation?: boolean } = {}
): GrowthCommandValidation {
  const failures: string[] = [];
  const boundary = externalMutationScopes[envelope.scope] ?? "GrowthOnly";

  if (!envelope.actorId.trim()) failures.push("Actor is required.");
  if (!envelope.idempotencyKey.trim()) failures.push("Idempotency key is required.");
  if (envelope.reason.trim().length < 10) failures.push("Reason must explain the business purpose.");
  if (!rolesByScope[envelope.scope].includes(envelope.actorRole)) failures.push(`${envelope.actorRole} cannot run ${envelope.scope}.`);
  if (boundary !== "GrowthOnly" && !options.allowExternalMutation) {
    failures.push(`${boundary} mutation is locked. This command may only prepare a preview or dry run.`);
  }

  return {
    allowed: failures.length === 0,
    boundary,
    commandHash: hashCommandEnvelope(envelope),
    failures,
    nextAction: failures[0] ?? "Run governed Growth command"
  };
}

export function hashCommandEnvelope(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
