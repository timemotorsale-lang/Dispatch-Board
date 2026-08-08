import type { Prisma } from "@prisma/client";

import type { AuthenticatedUser } from "@/server/auth/store";
import { INITIAL_ORGANIZATION } from "@/server/appointments/location-foundation";
import { createEnterpriseCommandRepository, type EnterpriseCommandRepository } from "@/server/enterprise-command/repository";

export const TIME_ATTENDANCE_CAPABILITIES = [
  "TIME_SELF_SERVICE",
  "TIME_ATTENDANCE_MANAGER",
  "TIME_PAYROLL_ADMIN",
  "TIME_LEAVE_ADMIN",
  "TIME_POLICY_ADMIN",
  "TIME_PERIOD_LOCK_REOPEN",
  "TIME_EXPORT_RECONCILIATION"
] as const;

export type TimeAttendanceCapability = (typeof TIME_ATTENDANCE_CAPABILITIES)[number];

export type TimeAttendanceCapabilityGrant = {
  capability: string;
  constraints: Prisma.JsonValue;
  effect: "ALLOW" | "DENY";
  locationId: string | null;
  validFrom: Date;
  validTo: Date | null;
};

const generalManagerCapabilities = new Set<TimeAttendanceCapability>(TIME_ATTENDANCE_CAPABILITIES);

function roleAllows(actor: AuthenticatedUser, capability: TimeAttendanceCapability) {
  if (capability === "TIME_SELF_SERVICE") return true;
  if (actor.roles.includes("General Manager")) return generalManagerCapabilities.has(capability);
  if (capability === "TIME_ATTENDANCE_MANAGER") {
    return actor.roles.includes("Service Department Manager");
  }
  return false;
}

export function evaluateTimeAttendanceCapability(input: {
  actor: AuthenticatedUser | null;
  capability: TimeAttendanceCapability;
  grants?: TimeAttendanceCapabilityGrant[];
  locationId?: string | null;
  now?: Date;
  priorActorUserId?: string | null;
}) {
  if (!input.actor?.isActive) return { allowed: false, reason: "AUTHENTICATION_REQUIRED" } as const;
  const now = input.now ?? new Date();
  const locationId = input.locationId ?? null;
  const effective = (input.grants ?? []).filter((grant) => {
    if (grant.capability !== input.capability) return false;
    if (grant.locationId && grant.locationId !== locationId) return false;
    if (grant.validFrom > now || (grant.validTo && grant.validTo <= now)) return false;
    return true;
  });
  const independentReviewConflict = effective.some((grant) => {
    const constraints = grant.constraints && typeof grant.constraints === "object" && !Array.isArray(grant.constraints)
      ? grant.constraints as Record<string, unknown>
      : {};
    return constraints.requiresIndependentApproval === true && input.priorActorUserId === input.actor?.id;
  });
  if (independentReviewConflict) return { allowed: false, reason: "INDEPENDENT_REVIEW_REQUIRED" } as const;
  const matches = effective;
  if (matches.some((grant) => grant.effect === "DENY")) {
    return { allowed: false, reason: "EXPLICIT_DENY" } as const;
  }
  if (matches.some((grant) => grant.effect === "ALLOW")) {
    return { allowed: true, reason: "EXPLICIT_GRANT" } as const;
  }
  if (roleAllows(input.actor, input.capability)) {
    return { allowed: true, reason: "ROLE_BASELINE" } as const;
  }
  return { allowed: false, reason: "CAPABILITY_REQUIRED" } as const;
}

export async function getTimeAttendanceCapabilityGrants(input: {
  actor: AuthenticatedUser;
  organizationId?: string;
  repository?: EnterpriseCommandRepository;
}) {
  return (input.repository ?? createEnterpriseCommandRepository()).listCapabilityGrants(
    input.actor.id,
    input.organizationId ?? INITIAL_ORGANIZATION.id
  );
}

export async function requireTimeAttendanceCapability(input: {
  actor: AuthenticatedUser | null;
  capability: TimeAttendanceCapability;
  grants?: TimeAttendanceCapabilityGrant[];
  locationId?: string | null;
  now?: Date;
  organizationId?: string;
  priorActorUserId?: string | null;
  repository?: EnterpriseCommandRepository;
}) {
  if (!input.actor) throw new Error("Authentication required.");
  const grants = input.grants ?? await getTimeAttendanceCapabilityGrants({
    actor: input.actor,
    organizationId: input.organizationId,
    repository: input.repository
  });
  const decision = evaluateTimeAttendanceCapability({ ...input, grants });
  if (!decision.allowed) {
    throw new Error(`Time attendance capability required: ${input.capability} (${decision.reason}).`);
  }
  return { actor: input.actor, decision, grants };
}

export async function getTimeAttendanceCapabilitySet(input: {
  actor: AuthenticatedUser;
  locationId?: string | null;
  organizationId?: string;
  repository?: EnterpriseCommandRepository;
}) {
  const grants = await getTimeAttendanceCapabilityGrants(input);
  return Object.fromEntries(TIME_ATTENDANCE_CAPABILITIES.map((capability) => [
    capability,
    evaluateTimeAttendanceCapability({ actor: input.actor, capability, grants, locationId: input.locationId }).allowed
  ])) as Record<TimeAttendanceCapability, boolean>;
}
