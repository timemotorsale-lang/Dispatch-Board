export const READINESS_GATES = [
  { code: "IC-120", name: "Security & privacy", phase: "PRE_PILOT", acceptance: "No critical security or privacy finding remains open." },
  { code: "IC-121", name: "Accessibility", phase: "PRE_PILOT", acceptance: "Approved responsive journeys pass accessibility validation." },
  { code: "IC-122", name: "Performance & scale", phase: "PRE_PILOT", acceptance: "Peak workloads and bounded operations meet approved targets." },
  { code: "IC-123", name: "Reliability & recovery", phase: "PRE_PILOT", acceptance: "Recovery, reconciliation, RPO and RTO evidence meet policy." },
  { code: "IC-124", name: "Observability & support", phase: "PRE_PILOT", acceptance: "SLOs, alerts, runbooks, owners, training and support are ready." },
  { code: "IC-125", name: "Migration & shadow validation", phase: "PRE_PILOT", acceptance: "Lineage, totals, conflicts and manual comparisons pass without synthetic authority." },
  { code: "IC-126", name: "Limited pilot", phase: "PILOT", acceptance: "The authorized scope operates within its frozen thresholds." },
  { code: "IC-127", name: "Pause & rollback", phase: "PILOT", acceptance: "Pause, read continuity, rollback, recovery and resume gates are exercised." },
  { code: "IC-128", name: "Outcome & calibration", phase: "POST_PILOT", acceptance: "Measured outcomes and advisory quality meet approved baselines and targets." },
  { code: "IC-129", name: "Expansion / GA decision", phase: "DECISION", acceptance: "All required functions record an explicit go/no-go decision." }
] as const;

export const SIGNOFF_DIMENSIONS = ["BUSINESS", "DATA", "SECURITY", "RELIABILITY", "EXPERIENCE", "OPERATIONS", "MEASUREMENT", "EXECUTIVE"] as const;
export const PRE_PILOT_GATES = READINESS_GATES.filter((gate) => gate.phase === "PRE_PILOT").map((gate) => gate.code);
export type ReadinessGateCode = typeof READINESS_GATES[number]["code"];

type Evidence = { gateCode: string; status: string; submittedByUserId?: string | null; reviewedByUserId?: string | null; expiresAt?: Date | string | null; waiverAuthority?: string | null; waiverReason?: string | null };
type Signoff = { dimension: string; decision: string };

export function validateGateCode(value: string): ReadinessGateCode {
  const gate = READINESS_GATES.find((candidate) => candidate.code === value.trim().toUpperCase());
  if (!gate) throw new Error("Readiness evidence must use an IC-120 through IC-129 gate code.");
  return gate.code;
}

export function evaluatePrePilotReadiness(evidence: Evidence[], now = new Date()) {
  const byCode = new Map(evidence.map((item) => [item.gateCode, item]));
  const blockers = PRE_PILOT_GATES.flatMap((code) => {
    const item = byCode.get(code);
    if (!item) return [`${code} has no evidence record.`];
    if (!(["PASSED", "WAIVED"].includes(item.status))) return [`${code} is ${item.status.toLowerCase().replaceAll("_", " ")}.`];
    if (item.status === "PASSED" && (!item.submittedByUserId || !item.reviewedByUserId || item.submittedByUserId === item.reviewedByUserId)) return [`${code} lacks independent review.`];
    if (item.status === "WAIVED" && (!item.waiverAuthority?.trim() || !item.waiverReason?.trim())) return [`${code} waiver lacks named authority or reason.`];
    if (item.expiresAt && new Date(item.expiresAt) <= now) return [`${code} evidence has expired.`];
    return [];
  });
  return { ready: blockers.length === 0, passed: PRE_PILOT_GATES.length - blockers.length, required: PRE_PILOT_GATES.length, blockers };
}

export function evaluateExpansionReadiness(evidence: Evidence[], signoffs: Signoff[], now = new Date()) {
  const gateBlockers = READINESS_GATES.flatMap((gate) => {
    const item = evidence.find((candidate) => candidate.gateCode === gate.code);
    if (!item || !["PASSED", "WAIVED"].includes(item.status)) return [`${gate.code} has not passed.`];
    if (item.status === "PASSED" && (!item.submittedByUserId || !item.reviewedByUserId || item.submittedByUserId === item.reviewedByUserId)) return [`${gate.code} lacks independent review.`];
    if (item.status === "WAIVED" && (!item.waiverAuthority?.trim() || !item.waiverReason?.trim())) return [`${gate.code} waiver lacks named authority or reason.`];
    if (item.expiresAt && new Date(item.expiresAt) <= now) return [`${gate.code} evidence has expired.`];
    return [];
  });
  const decision = new Map(signoffs.map((item) => [item.dimension, item.decision]));
  const signoffBlockers = SIGNOFF_DIMENSIONS.flatMap((dimension) => decision.get(dimension) === "APPROVE" ? [] : [`${dimension} sign-off is not approved.`]);
  return { ready: gateBlockers.length + signoffBlockers.length === 0, blockers: [...gateBlockers, ...signoffBlockers] };
}

export function validatePilotScope(value: unknown) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const strings = (key: string) => Array.isArray(input[key]) ? [...new Set((input[key] as unknown[]).map(String).map((item) => item.trim()).filter(Boolean))] : [];
  const scope = { locationIds: strings("locationIds"), roleCodes: strings("roleCodes"), sliceCodes: strings("sliceCodes"), commandCodes: strings("commandCodes"), integrationCodes: strings("integrationCodes") };
  if (!scope.locationIds.length || !scope.roleCodes.length || !scope.sliceCodes.length || !scope.commandCodes.length) throw new Error("Pilot scope requires at least one location, role, slice, and command.");
  return scope;
}

export function assertActivationAuthority(enabled: boolean) {
  if (!enabled) throw new Error("Pilot activation is disabled until named authority and deployment approval are configured.");
}
