export const INTAKE_RELEASE_CHECKS = [
  { code: "BUILD", title: "Immutable candidate build", targetCopy: false, maxAgeHours: 168 },
  { code: "RESTORE", title: "Target database and document restoration", targetCopy: true, maxAgeHours: 24 },
  { code: "MIGRATION", title: "Migration timing and legacy reconciliation", targetCopy: true, maxAgeHours: 168 },
  { code: "OLD_APP", title: "Previous application against upgraded data", targetCopy: true, maxAgeHours: 168 },
  { code: "DAILY_WORK", title: "Critical daily-use journeys", targetCopy: true, maxAgeHours: 168 },
  { code: "STAFF_ACCEPTANCE", title: "Named staff intake acceptance", targetCopy: true, maxAgeHours: 168 },
  { code: "ISOLATION", title: "Intake-only cohort and location enforcement", targetCopy: false, maxAgeHours: 168 },
  { code: "SHUTDOWN", title: "Mutation shutdown with read continuity", targetCopy: true, maxAgeHours: 168 },
] as const;

type CheckCode = typeof INTAKE_RELEASE_CHECKS[number]["code"];
type Evidence = {
  code: CheckCode;
  status: "PASSED" | "FAILED" | "PENDING";
  candidateCommit: string;
  targetId: string;
  dataset: "SYNTHETIC" | "ROLLOUT_TARGET_COPY";
  isolated: boolean;
  completedAt: string;
  performedBy: string;
  reviewedBy: string;
  reference: string;
  artifactSha256: string;
};

type Pilot = {
  feature: "INVENTORY_INTAKE";
  userIds: string[];
  locationIds: string[];
  operator: string;
  approvedBy: string;
  approvalReference: string;
  windowStart: string;
  windowEnd: string;
  recoveryPointMinutes: number;
  recoveryTimeMinutes: number;
  stopAfterErrors: number;
  maximumP95Milliseconds: number;
};

export type IntakeReleasePacket = {
  candidateCommit: string;
  targetId: string;
  evidence: Evidence[];
  pilot: Pilot;
  releaseApproval: { candidateCommit: string; targetId: string; approvedBy: string; reference: string };
};

const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const hash = (value: unknown, length: number) => typeof value === "string" && new RegExp(`^[a-f0-9]{${length}}$`, "i").test(value);
const timestamp = (value: unknown) => typeof value === "string" && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
const names = (value: unknown) => Array.isArray(value) && value.length > 0 && value.every((item) => text(item) && item === item.trim() && !["*", "ALL"].includes(item.toUpperCase())) && new Set(value).size === value.length;
const positive = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0;

// This is an offline evidence check, not deployment authority or proof that an attestation is truthful.
export function assessIntakePilotRelease(value: unknown, now = new Date()) {
  const packet = object(value);
  const blockers: string[] = [];
  if (!hash(packet.candidateCommit, 40)) blockers.push("Candidate must be an exact 40-character commit SHA.");
  if (!text(packet.targetId)) blockers.push("The intended rollout target is not identified.");
  if (!Number.isFinite(now.getTime())) blockers.push("Assessment time is invalid.");
  const evidence = Array.isArray(packet.evidence) ? packet.evidence.map(object) : [];
  if (evidence.some((item) => !INTAKE_RELEASE_CHECKS.some((check) => check.code === item.code))) blockers.push("Unknown evidence check code.");
  const checks = INTAKE_RELEASE_CHECKS.map((check) => {
    const issues: string[] = [];
    const matches = evidence.filter((item) => item.code === check.code);
    if (matches.length !== 1) issues.push(matches.length ? "Conflicting duplicate evidence." : "No evidence supplied.");
    const item = matches[0] ?? {};
    if (matches.length === 1) {
      if (item.status !== "PASSED") issues.push("Check has not passed.");
      if (item.candidateCommit !== packet.candidateCommit) issues.push("Evidence belongs to another candidate.");
      if (item.targetId !== packet.targetId) issues.push("Evidence belongs to another rollout target.");
      if (item.isolated !== true) issues.push("Rehearsal isolation is not confirmed.");
      if (!["SYNTHETIC", "ROLLOUT_TARGET_COPY"].includes(String(item.dataset))) issues.push("Dataset provenance is invalid.");
      if (check.targetCopy && item.dataset !== "ROLLOUT_TARGET_COPY") issues.push("Synthetic data cannot clear this target-specific check.");
      if (!text(item.performedBy) || !text(item.reviewedBy) || String(item.performedBy).trim().toLowerCase() === String(item.reviewedBy).trim().toLowerCase()) issues.push("Independent named review is missing.");
      if (!text(item.reference) || !hash(item.artifactSha256, 64)) issues.push("Evidence reference and SHA-256 are required.");
      const completed = timestamp(item.completedAt);
      if (!Number.isFinite(completed) || completed > now.getTime() || now.getTime() - completed > check.maxAgeHours * 3_600_000) issues.push("Evidence timestamp is invalid, future-dated or stale.");
    }
    blockers.push(...issues.map((issue) => `${check.code}: ${issue}`));
    return { code: check.code, title: check.title, passed: issues.length === 0, issues };
  });
  const pilot = object(packet.pilot);
  if (pilot.feature !== "INVENTORY_INTAKE") blockers.push("Pilot must use the dedicated INVENTORY_INTAKE feature.");
  if (!names(pilot.userIds) || !names(pilot.locationIds)) blockers.push("Pilot requires explicit unique users and locations.");
  if (!text(pilot.operator) || !text(pilot.approvedBy) || !text(pilot.approvalReference)) blockers.push("Pilot operator and business scope approval are missing.");
  const start = timestamp(pilot.windowStart), end = timestamp(pilot.windowEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end <= now.getTime()) blockers.push("Pilot needs an unexpired, ordered release window with explicit timezone.");
  if (![pilot.recoveryPointMinutes, pilot.recoveryTimeMinutes, pilot.stopAfterErrors, pilot.maximumP95Milliseconds].every(positive) || !Number.isInteger(pilot.stopAfterErrors)) blockers.push("Approved numeric recovery and monitoring thresholds are missing.");
  const approval = object(packet.releaseApproval);
  if (!text(approval.approvedBy) || !text(approval.reference) || approval.candidateCommit !== packet.candidateCommit || approval.targetId !== packet.targetId) blockers.push("Explicit release approval for this candidate and target is missing.");
  return { disposition: blockers.length ? "NOT_CLEARED" : "EVIDENCE_COMPLETE", checks, blockers, productionChanged: false, deploymentAuthorizedByTool: false };
}
