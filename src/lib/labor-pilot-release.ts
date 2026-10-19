export const LABOR_RELEASE_GATES = ["production-build", "full-tests", "browser-workflow", "authorization-and-qc", "permissions", "rate-policy", "parts-and-tax-policy", "staging-upgrade", "backup-restore", "rollback", "monitoring-alerts", "operator-training"] as const;
export type LaborReleaseGate = typeof LABOR_RELEASE_GATES[number];
export type LaborReleaseEvidence = { revision: string; stagingOrigin: string; productionOrigin: string; recordedAt: string; signoff: { owner: string; reviewer: string }; gates: Partial<Record<LaborReleaseGate, { status: "PASS" | "FAIL" | "PENDING"; artifact: string; sha256: string; reviewer: string }>> };

export function evaluateLaborPilotRelease(evidence: LaborReleaseEvidence, revision: string, now = new Date()) {
  const blockers: string[] = [];
  if (!/^[0-9a-f]{40}$/i.test(revision) || evidence.revision !== revision) blockers.push("EVIDENCE_REVISION_MISMATCH");
  const age = now.getTime() - Date.parse(evidence.recordedAt);
  if (!Number.isFinite(age) || age < 0 || age > 7 * 86400000) blockers.push("EVIDENCE_STALE_OR_INVALID");
  try {
    const staging = new URL(evidence.stagingOrigin), production = new URL(evidence.productionOrigin);
    if (staging.origin === production.origin || staging.hostname === production.hostname || !["http:", "https:"].includes(staging.protocol) || production.protocol !== "https:") blockers.push("STAGING_NOT_ISOLATED");
  } catch { blockers.push("DEPLOYMENT_ORIGINS_MISSING"); }
  if (!evidence.signoff?.owner?.trim() || !evidence.signoff?.reviewer?.trim() || evidence.signoff.owner.trim().toLowerCase() === evidence.signoff.reviewer.trim().toLowerCase()) blockers.push("INDEPENDENT_SIGNOFF_REQUIRED");
  for (const key of LABOR_RELEASE_GATES) {
    const gate = evidence.gates?.[key];
    if (gate?.status !== "PASS" || !gate.artifact?.trim() || !/^[a-f0-9]{64}$/i.test(gate.sha256 ?? "") || !gate.reviewer?.trim()) blockers.push(`GATE_${key.toUpperCase().replaceAll("-", "_")}`);
  }
  return { status: blockers.length ? "HOLD" as const : "ELIGIBLE_FOR_MANUAL_PROMOTION" as const, revision, blockers, deploysAutomatically: false };
}
