import type { AuthenticatedUser } from "@/server/auth/store";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import { UNIFIED_CRM_GOVERNED_AI_ASSISTANCE_CONTRACT_VERSION, UnifiedCrmGovernedAiAssistanceError, type UnifiedCrmGovernedAiAssistanceCheck, type UnifiedCrmGovernedAiAssistanceReadModel } from "@/server/unified-crm/governed-ai-assistance-contract";

type Dependencies = { now?: () => Date };
const CHECKS: UnifiedCrmGovernedAiAssistanceCheck[] = [
  { category: "permissionAwareRetrieval", evidence: "AI retrieval must use the same CRM permission, organization, field, purpose, and source-boundary checks as the user.", holdOwner: null, status: "PASS" },
  { category: "citationsProvenance", evidence: "AI answers must cite source records/projections and identify when source evidence is missing or stale.", holdOwner: "quality", status: "HOLD" },
  { category: "evaluationSet", evidence: "A representative CRM evaluation set is required before any AI assistant is enabled.", holdOwner: "quality", status: "HOLD" },
  { category: "promptInjectionDefense", evidence: "Prompt-injection and untrusted-content tests must prove the assistant ignores record/document instructions that conflict with policy.", holdOwner: "security-privacy", status: "HOLD" },
  { category: "humanApproval", evidence: "Consequential actions require explicit authorized human confirmation; autonomous customer messages, approvals, and mutations are disabled.", holdOwner: null, status: "PASS" },
  { category: "costLatency", evidence: "Cost caps, timeout behavior, deterministic fallback, and latency budgets remain unapproved.", holdOwner: "product-owner", status: "HOLD" },
  { category: "logging", evidence: "AI logs must preserve audit/provenance while masking sensitive fields, prompts, retrieved records, and provider payloads as required.", holdOwner: "security-privacy", status: "HOLD" },
  { category: "optOut", evidence: "Customer communication opt-out and AI-assistance opt-out must be checked before AI drafts or receptionist behavior are used.", holdOwner: "security-privacy", status: "HOLD" },
  { category: "killSwitch", evidence: "AI assistance remains disabled by default and fails closed to deterministic CRM workflows.", holdOwner: null, status: "PASS" }
];

export async function getUnifiedCrmGovernedAiAssistance(actor: AuthenticatedUser | null, dependencies: Dependencies = {}): Promise<UnifiedCrmGovernedAiAssistanceReadModel> {
  if (!actor) throw new UnifiedCrmGovernedAiAssistanceError("AUTHENTICATION_REQUIRED", "Sign in before opening CRM AI assistance readiness.");
  if (resolveUnifiedCrmWorkspace(actor) !== "MANAGEMENT") throw new UnifiedCrmGovernedAiAssistanceError("GOVERNED_AI_ASSISTANCE_NOT_AUTHORIZED", "CRM AI assistance readiness is available to the manager workspace.");
  return {
    activation: { aiReceptionistEnabled: false, autonomousActionsEnabled: false, draftAssistanceEnabled: false, state: "HELD" },
    checks: CHECKS.map((check) => ({ ...check })),
    contractVersion: UNIFIED_CRM_GOVERNED_AI_ASSISTANCE_CONTRACT_VERSION,
    generatedAt: (dependencies.now?.() ?? new Date()).toISOString(),
    rollback: { fallback: "deterministic-crm-workflows-and-manual-review", featureControl: "crm.enterprise.aiAssistance.enabled", posture: "fail-closed" },
    state: "HELD",
    visibility: "management"
  };
}
