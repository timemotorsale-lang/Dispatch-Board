import type { AuthenticatedUser } from "@/server/auth/store";
import { requireUnifiedCrmCustomerReadPolicy } from "@/server/policies/unified-crm-customer-read";
import {
  createUnifiedCrmCustomerDuplicateCandidateRepository,
  type UnifiedCrmCustomerDuplicateCandidateRecord,
  type UnifiedCrmCustomerDuplicateCandidateRepository
} from "@/server/repositories/unified-crm-customer-duplicate-candidate-repository";
import {
  createUnifiedCrmCustomerReadRepository,
  type UnifiedCrmCustomerReadRepository
} from "@/server/repositories/unified-crm-customer-read-repository";
import { resolveUnifiedCrmCustomerReadMode } from "@/server/services/unified-crm-customer-read-service";
import {
  UNIFIED_CRM_CUSTOMER_DUPLICATE_CANDIDATE_CONTRACT_VERSION,
  UnifiedCrmCustomerDuplicateCandidateError,
  type UnifiedCrmCustomerDuplicateCandidate,
  type UnifiedCrmCustomerDuplicateCandidateReadModel
} from "@/server/unified-crm/customer-duplicate-candidate-contract";
import { resolveUnifiedCrmShellAccess } from "@/server/unified-crm/shell-access";

type Dependencies = {
  duplicateMode?: unknown;
  now?: () => Date;
  nodeEnv?: string;
  readMode?: unknown;
  repository?: UnifiedCrmCustomerDuplicateCandidateRepository;
  scopeRepository?: Pick<UnifiedCrmCustomerReadRepository, "listActiveOrganizationIds">;
  shellMode?: unknown;
};

function normalizeCustomerId(value: unknown) {
  const result = typeof value === "string" ? value.trim() : "";
  if (!result || result.length > 200) {
    throw new UnifiedCrmCustomerDuplicateCandidateError("INVALID_DUPLICATE_WARNING_QUERY", "Customer identifier is invalid.");
  }
  return result;
}

function resolveDuplicateMode(options: Pick<Dependencies, "duplicateMode" | "nodeEnv"> = {}) {
  const explicit = typeof options.duplicateMode === "string" ? options.duplicateMode.trim().toUpperCase() : "";
  if (explicit === "OFF") return "OFF";
  if (explicit === "REVIEW") return "REVIEW";
  return options.nodeEnv === "production" ? "OFF" : "REVIEW";
}

function maskedPhone(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits ? `••••${digits.slice(-4)}` : "Not recorded";
}

function maskedEmail(value: string | null | undefined) {
  const [local = "", domain = ""] = (value ?? "").trim().split("@", 2);
  if (!domain) return "Not recorded";
  const parts = domain.split(".");
  const suffix = parts.length > 1 ? `.${parts.at(-1)}` : "";
  return `${local.slice(0, 1) || "•"}•••@${domain.slice(0, 1) || "•"}•••${suffix}`;
}

function normalizedPhone(value: unknown) {
  const digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  if (!digits) return null;
  return digits.length === 10 ? `+1${digits}` : `+${digits}`;
}

function normalizedEmail(value: unknown) {
  const result = typeof value === "string" ? value.trim().toLowerCase() : "";
  return result.includes("@") ? result : null;
}

function normalizedName(value: unknown) {
  const result = typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  return result || null;
}

function scoreCandidate(candidate: UnifiedCrmCustomerDuplicateCandidateRecord, input: {
  displayName: string | null;
  email: string | null;
  normalizedPhone: string | null;
}) {
  const explanation: string[] = [];
  const candidateEmail = normalizedEmail(candidate.email) ??
    normalizedEmail(candidate.contactPoints.find((point) => point.type === "EMAIL")?.normalizedValue);
  const candidatePhone = normalizedPhone(candidate.phoneNumber) ??
    normalizedPhone(candidate.contactPoints.find((point) => point.type === "PHONE")?.normalizedValue);
  const candidateName = normalizedName(candidate.displayName);
  if (input.email && candidateEmail === input.email) explanation.push("Email matches after normalization.");
  if (input.normalizedPhone && candidatePhone === input.normalizedPhone) explanation.push("Phone matches after normalization.");
  if (input.displayName && candidateName?.toLowerCase() === input.displayName.toLowerCase()) {
    explanation.push("Display name matches after spacing and case normalization.");
  }
  return {
    explanation,
    score: Math.min(100, explanation.length * 35)
  };
}

export async function getUnifiedCrmCustomerDuplicateCandidates(
  actor: AuthenticatedUser | null,
  customerId: string,
  query: { displayName?: unknown; email?: unknown; phoneNumber?: unknown } = {},
  dependencies: Dependencies = {}
): Promise<UnifiedCrmCustomerDuplicateCandidateReadModel> {
  const recordScope = requireUnifiedCrmCustomerReadPolicy(actor);
  const shellAccess = resolveUnifiedCrmShellAccess(actor, {
    nodeEnv: dependencies.nodeEnv,
    shellMode: dependencies.shellMode
  });
  if (!shellAccess.allowed || shellAccess.mode !== "REVIEW" || resolveUnifiedCrmCustomerReadMode(dependencies) !== "REVIEW") {
    throw new UnifiedCrmCustomerDuplicateCandidateError(
      "CUSTOMER_DUPLICATE_WARNING_OFF",
      "Customer duplicate warning is temporarily unavailable."
    );
  }
  if (resolveDuplicateMode(dependencies) !== "REVIEW") {
    throw new UnifiedCrmCustomerDuplicateCandidateError(
      "CUSTOMER_DUPLICATE_WARNING_OFF",
      "Customer duplicate warning is temporarily unavailable."
    );
  }

  const normalizedCustomerId = normalizeCustomerId(customerId);
  const now = dependencies.now?.() ?? new Date();
  const scopeRepository = dependencies.scopeRepository ?? createUnifiedCrmCustomerReadRepository();
  const repository = dependencies.repository ?? createUnifiedCrmCustomerDuplicateCandidateRepository();
  const input = {
    displayName: normalizedName(query.displayName),
    email: normalizedEmail(query.email),
    normalizedPhone: normalizedPhone(query.phoneNumber)
  };

  try {
    const organizationIds = await scopeRepository.listActiveOrganizationIds(actor!.id, now);
    if (organizationIds.length === 0) {
      throw new UnifiedCrmCustomerDuplicateCandidateError(
        "CUSTOMER_DUPLICATE_WARNING_NOT_AUTHORIZED",
        "Customer duplicate warning is not available for this viewer."
      );
    }
    if (organizationIds.length > 1) {
      throw new UnifiedCrmCustomerDuplicateCandidateError(
        "CUSTOMER_SOURCE_UNAVAILABLE",
        "Customer duplicate warning requires one active organization scope."
      );
    }
    const records = await repository.findDuplicateCandidates({
      customerId: normalizedCustomerId,
      displayName: input.displayName,
      email: input.email,
      normalizedPhone: input.normalizedPhone,
      organizationId: organizationIds[0],
      recordScope
    });
    const candidates = records
      .map((record): UnifiedCrmCustomerDuplicateCandidate => {
        const scored = scoreCandidate(record, input);
        return {
          candidateCustomerId: record.id,
          explanation: scored.explanation,
          maskedEmail: maskedEmail(record.email ?? record.contactPoints.find((point) => point.type === "EMAIL")?.value),
          maskedPhone: maskedPhone(record.phoneNumber ?? record.contactPoints.find((point) => point.type === "PHONE")?.value),
          score: scored.score,
          sourceHref: `/crm/customers/${encodeURIComponent(record.id)}`
        };
      })
      .filter((candidate) => candidate.explanation.length > 0)
      .sort((left, right) => right.score - left.score || left.candidateCustomerId.localeCompare(right.candidateCustomerId));

    return {
      candidates,
      contractVersion: UNIFIED_CRM_CUSTOMER_DUPLICATE_CANDIDATE_CONTRACT_VERSION,
      customerId: normalizedCustomerId,
      generatedAt: now.toISOString(),
      state: candidates.length ? "WARNING" : "NO_CANDIDATES",
      warningOnly: true
    };
  } catch (error) {
    if (error instanceof UnifiedCrmCustomerDuplicateCandidateError) throw error;
    if (error instanceof Error && error.message === "Customer not available.") {
      throw new UnifiedCrmCustomerDuplicateCandidateError("CUSTOMER_NOT_AVAILABLE", "Customer details are not available.");
    }
    throw new UnifiedCrmCustomerDuplicateCandidateError(
      "CUSTOMER_SOURCE_UNAVAILABLE",
      "Customer duplicate warning could not be loaded safely.",
      { cause: error }
    );
  }
}
