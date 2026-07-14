/**
 * M8 enterprise hardening gates (VEH-115 through VEH-118).
 *
 * These functions deliberately have no database or provider dependencies. They
 * turn evidence collected by deployment/operations tooling into a repeatable
 * decision that can be persisted by a command handler later.
 */

export type GateDisposition = "READY" | "BLOCKED";

export interface GateResult {
  disposition: GateDisposition;
  blockers: string[];
  checks: Record<string, boolean>;
}

const result = (checks: Record<string, boolean>, blockers: string[]): GateResult => ({
  disposition: blockers.length ? "BLOCKED" : "READY",
  blockers,
  checks,
});

export interface RecoveryEvidence {
  backupCompletedAt: string;
  restoreCompletedAt: string;
  observedRpoMinutes: number;
  observedRtoMinutes: number;
  approvedRpoMinutes: number;
  approvedRtoMinutes: number;
  sourceTotals: Record<string, number>;
  restoredTotals: Record<string, number>;
}

/** VEH-115: restored aggregates must reconcile and remain within RPO/RTO. */
export function evaluateDisasterRecoveryGate(input: RecoveryEvidence): GateResult {
  const checks = {
    backupTimestampValid: !Number.isNaN(Date.parse(input.backupCompletedAt)),
    restoreTimestampValid: !Number.isNaN(Date.parse(input.restoreCompletedAt)),
    rpoWithinTarget: input.observedRpoMinutes >= 0 && input.observedRpoMinutes <= input.approvedRpoMinutes,
    rtoWithinTarget: input.observedRtoMinutes >= 0 && input.observedRtoMinutes <= input.approvedRtoMinutes,
    totalsReconciled: Object.keys(input.sourceTotals).every((key) => input.sourceTotals[key] === input.restoredTotals[key]),
  };
  const blockers = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => `DR_${name.toUpperCase()}`);
  return result(checks, blockers);
}

export interface SecurityValidationEvidence {
  threatModelPassed: boolean;
  dependencyScanPassed: boolean;
  secretScanPassed: boolean;
  authorizationMatrixPassed: boolean;
  tenantIsolationPassed: boolean;
  uploadAbuseCasesPassed: boolean;
  unresolvedCriticalFindings?: number;
}

/** VEH-116: every security control must have affirmative evidence. */
export function evaluateSecurityValidationGate(input: SecurityValidationEvidence): GateResult {
  const checks = {
    threatModel: input.threatModelPassed,
    dependencies: input.dependencyScanPassed,
    secrets: input.secretScanPassed,
    authorization: input.authorizationMatrixPassed,
    tenantIsolation: input.tenantIsolationPassed,
    uploadAbuse: input.uploadAbuseCasesPassed,
    noCriticalFindings: (input.unresolvedCriticalFindings ?? 0) === 0,
  };
  return result(checks, Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => `SECURITY_${name.toUpperCase()}`));
}

export interface ExperiencePerformanceEvidence {
  wcagAaPassed: boolean;
  responsiveJourneysPassed: boolean;
  initialLoadP95Ms: number;
  mutationP95Ms: number;
  maxConcurrentUsers: number;
  requiredConcurrentUsers: number;
  maxPaginationPageSize: number;
  approvedMaxPaginationPageSize: number;
  approvedInitialLoadP95Ms: number;
  approvedMutationP95Ms: number;
}

/** VEH-117: accessibility and performance are release gates, not observations. */
export function evaluateExperiencePerformanceGate(input: ExperiencePerformanceEvidence): GateResult {
  const checks = {
    wcagAa: input.wcagAaPassed,
    responsiveJourneys: input.responsiveJourneysPassed,
    initialLoadP95: input.initialLoadP95Ms <= input.approvedInitialLoadP95Ms,
    mutationP95: input.mutationP95Ms <= input.approvedMutationP95Ms,
    concurrency: input.maxConcurrentUsers >= input.requiredConcurrentUsers,
    paginationBounded: input.maxPaginationPageSize <= input.approvedMaxPaginationPageSize,
  };
  return result(checks, Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => `UX_${name.toUpperCase()}`));
}

export type PilotState = "PLANNED" | "ENABLED" | "PAUSED" | "ROLLED_BACK" | "RESUMED";
export type PilotAction = "ENABLE" | "PAUSE" | "ROLLBACK" | "RESUME";

/** VEH-118: explicit, auditable pilot state machine. */
export function transitionPilotState(state: PilotState, action: PilotAction, gate: GateDisposition = "READY"): PilotState {
  if (action === "ENABLE") {
    if (state !== "PLANNED" || gate !== "READY") throw new Error("Pilot can only be enabled from a planned, ready release.");
    return "ENABLED";
  }
  if (action === "PAUSE") {
    if (state !== "ENABLED" && state !== "RESUMED") throw new Error("Only an active pilot can be paused.");
    return "PAUSED";
  }
  if (action === "ROLLBACK") {
    if (state !== "ENABLED" && state !== "RESUMED" && state !== "PAUSED") throw new Error("Only an enabled pilot can be rolled back.");
    return "ROLLED_BACK";
  }
  if (state !== "PAUSED") throw new Error("A pilot can only resume from paused state.");
  if (gate !== "READY") throw new Error("Pilot cannot resume while release gates are blocked.");
  return "RESUMED";
}
