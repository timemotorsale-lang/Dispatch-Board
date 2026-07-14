/** M10 enterprise scale controls (VEH-137–139).
 * Pure, provider-independent evaluators used by command handlers and tests.
 */
import type { GateResult } from "./enterprise-hardening-gates";

const gate = (checks: Record<string, boolean>): GateResult => {
  const blockers = Object.entries(checks).filter(([, ok]) => !ok).map(([key]) => `SCALE_${key.toUpperCase()}`);
  return { disposition: blockers.length ? "BLOCKED" : "READY", blockers, checks };
};

export interface TransferEvidence {
  tenantId: string; sourceTenantId?: string; destinationTenantId?: string;
  sourceQuantity: number; requestedQuantity: number; receivedQuantity: number;
  unitCostCents: number; expectedCostCents?: number;
  authorityApproved: boolean; promiseAt?: string; receivedAt?: string;
  sourceVersion: number; appliedSourceVersion: number;
  sourceLedgerTotal: number; destinationLedgerTotal: number;
  transferLedgerTotal: number;
}

/** VEH-137: cross-location custody, cost, promise, receipt and optimistic concurrency. */
export function evaluateMultiLocationTransfer(input: TransferEvidence): GateResult {
  const checks = {
    tenantScoped: Boolean(input.tenantId) && (!input.sourceTenantId || input.sourceTenantId === input.tenantId) && (!input.destinationTenantId || input.destinationTenantId === input.tenantId),
    quantityAvailable: Number.isFinite(input.requestedQuantity) && input.requestedQuantity > 0 && input.requestedQuantity <= input.sourceQuantity,
    receiptValid: Number.isFinite(input.receivedQuantity) && input.receivedQuantity >= 0 && input.receivedQuantity <= input.requestedQuantity,
    authority: input.authorityApproved,
    costBalanced: input.unitCostCents >= 0 && (input.expectedCostCents == null || input.expectedCostCents === input.unitCostCents * input.requestedQuantity),
    promiseValid: (!input.promiseAt || !Number.isNaN(Date.parse(input.promiseAt))) && (!input.receivedAt || !Number.isNaN(Date.parse(input.receivedAt))),
    concurrency: input.sourceVersion === input.appliedSourceVersion,
    ledgerReconciled: input.sourceLedgerTotal + input.destinationLedgerTotal === input.transferLedgerTotal,
  };
  return gate(checks);
}

export interface PolicyRecord { tenantId: string; scopeId: string; key: string; value: unknown; effectiveFrom: string; effectiveTo?: string; approved: boolean; }
/** VEH-138: resolve the newest approved policy in a scope hierarchy, with tenant isolation. */
export function resolveInheritedPolicy(records: PolicyRecord[], tenantId: string, scopeChain: string[], key: string, at = new Date()): PolicyRecord | undefined {
  const when = at.getTime();
  return records.filter((r) => r.tenantId === tenantId && r.key === key && r.approved && scopeChain.includes(r.scopeId) && Date.parse(r.effectiveFrom) <= when && (!r.effectiveTo || Date.parse(r.effectiveTo) > when))
    .sort((a, b) => scopeChain.indexOf(b.scopeId) - scopeChain.indexOf(a.scopeId) || Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom))[0];
}

export interface ScaleRecoveryEvidence { peakRequestsPerSecond: number; requiredRequestsPerSecond: number; archivalVerified: boolean; longRunningJobsCompleted: boolean; outageReplayVerified: boolean; regionFailureVerified: boolean; restoreVerified: boolean; replayIdempotent: boolean; }
/** VEH-139: release only when performance, durability and replay evidence meet targets. */
export function evaluateEnterpriseScaleRecovery(input: ScaleRecoveryEvidence): GateResult {
  return gate({ peakCapacity: input.peakRequestsPerSecond >= input.requiredRequestsPerSecond, archival: input.archivalVerified, longRunningJobs: input.longRunningJobsCompleted, integrationOutageReplay: input.outageReplayVerified, regionFailure: input.regionFailureVerified, restore: input.restoreVerified, replayIdempotency: input.replayIdempotent });
}
