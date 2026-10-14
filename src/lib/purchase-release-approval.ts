export const PURCHASE_RELEASE_PROOFS = ["staffAcceptance", "permissions", "restoreDrill", "rollbackDrill", "loadTest", "extractionAccuracy", "accessibility", "alertDelivery"] as const;

export function validatePurchaseReleaseApproval(value: unknown, revision: string, now = new Date()) {
  const errors: string[] = [];
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  if (!/^[a-f0-9]{40}$/.test(revision) || raw.revision !== revision) errors.push("Approval must match the exact release revision.");
  if (typeof raw.approvedBy !== "string" || !raw.approvedBy.trim()) errors.push("A named release approver is required.");
  const proofs = raw.proofs && typeof raw.proofs === "object" ? raw.proofs as Record<string, unknown> : {};
  for (const name of PURCHASE_RELEASE_PROOFS) {
    const proof = proofs[name] && typeof proofs[name] === "object" ? proofs[name] as Record<string, unknown> : {};
    const at = typeof proof.checkedAt === "string" ? Date.parse(proof.checkedAt) : NaN;
    if (proof.passed !== true || typeof proof.evidence !== "string" || !proof.evidence.trim() || typeof proof.checkedBy !== "string" || !proof.checkedBy.trim() || !Number.isFinite(at) || at > now.getTime() || at < now.getTime() - 7 * 86400_000) errors.push(`${name}: a passing, named, evidence-backed check within seven days is required.`);
  }
  return { ready: errors.length === 0, errors };
}
