import type { AuthenticatedUser } from "@/server/auth/store";
import { assertAuthenticatedUser, isManager } from "@/server/policies/access";

export type ApprovalRule = {
  action: string;
  limitCents: number;
  approverRoles?: string[];
  separationOfDuties?: boolean;
};

export type ApprovalDecision = {
  allowed: boolean;
  requiresApproval: boolean;
  reason: string;
  limitCents: number | null;
};

/** Evaluate a monetary action before it mutates a financial or inventory aggregate. */
export function evaluateDollarLimit(input: {
  actor: AuthenticatedUser | null;
  amountCents: number;
  rule: ApprovalRule;
  priorActorUserId?: string | null;
}) : ApprovalDecision {
  const actor = assertAuthenticatedUser(input.actor);
  if (!Number.isInteger(input.amountCents) || input.amountCents < 0) {
    return { allowed: false, requiresApproval: false, reason: "Amount must be a non-negative integer number of cents.", limitCents: input.rule.limitCents };
  }
  if (input.rule.separationOfDuties && input.priorActorUserId && input.priorActorUserId === actor.id) {
    return { allowed: false, requiresApproval: true, reason: "Separation of duties requires a different approver.", limitCents: input.rule.limitCents };
  }
  const roles = input.rule.approverRoles ?? [];
  if (roles.length > 0 && !roles.some((role) => actor.roles.includes(role))) {
    return { allowed: false, requiresApproval: true, reason: "Actor lacks an approver role for this action.", limitCents: input.rule.limitCents };
  }
  if (input.amountCents > input.rule.limitCents) {
    return { allowed: false, requiresApproval: true, reason: "Amount exceeds the actor's approval limit.", limitCents: input.rule.limitCents };
  }
  return { allowed: true, requiresApproval: false, reason: "Within policy limits.", limitCents: input.rule.limitCents };
}

export function canExploreAudit(actor: AuthenticatedUser | null) {
  return Boolean(actor && isManager(actor));
}
