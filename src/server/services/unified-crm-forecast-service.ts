import type { AuthenticatedUser } from "@/server/auth/store";
import { requireUnifiedCrmCustomerReadPolicy } from "@/server/policies/unified-crm-customer-read";
import { resolveUnifiedCrmWorkspace } from "@/server/policies/unified-crm-access";
import {
  createUnifiedCrmForecastRepository,
  type UnifiedCrmForecastOpportunityRecord,
  type UnifiedCrmForecastRepository
} from "@/server/repositories/unified-crm-forecast-repository";
import {
  normalizeUnifiedCrmForecastSubmission,
  UNIFIED_CRM_FORECAST_CONTRACT_VERSION,
  UnifiedCrmForecastError,
  type UnifiedCrmForecastCategory,
  type UnifiedCrmForecastReadModel,
  type UnifiedCrmForecastSnapshot,
  type UnifiedCrmForecastSubmissionInput
} from "@/server/unified-crm/forecast-contract";

type UnifiedCrmForecastDependencies = {
  now?: () => Date;
  repository?: UnifiedCrmForecastRepository;
};

const STAGE_BASELINE: Record<string, { category: UnifiedCrmForecastCategory; probabilityBasisPts: number }> = {
  APPOINTMENT_SET: { category: "PIPELINE", probabilityBasisPts: 3500 },
  CUSTOMER_DECIDING: { category: "COMMIT", probabilityBasisPts: 8000 },
  LOST: { category: "CLOSED", probabilityBasisPts: 0 },
  NEW_INQUIRY: { category: "WATCH", probabilityBasisPts: 1000 },
  QUALIFIED: { category: "PIPELINE", probabilityBasisPts: 2500 },
  QUOTE_PRESENTED: { category: "BEST_CASE", probabilityBasisPts: 6500 },
  WON: { category: "CLOSED", probabilityBasisPts: 10_000 },
  WORKING_DEAL: { category: "BEST_CASE", probabilityBasisPts: 5000 }
};

async function resolveForecastContext(
  actor: AuthenticatedUser | null,
  opportunityId: string,
  repository: UnifiedCrmForecastRepository,
  now: Date
) {
  const recordScope = requireUnifiedCrmCustomerReadPolicy(actor);
  const organizationIds = await repository.listActiveOrganizationIds(actor!.id, now);
  if (organizationIds.length === 0) {
    throw new UnifiedCrmForecastError("ORGANIZATION_SCOPE_UNAVAILABLE", "Forecast records are not available for this viewer.");
  }
  if (organizationIds.length > 1) {
    throw new UnifiedCrmForecastError("ORGANIZATION_SCOPE_AMBIGUOUS", "Select one authorized organization before opening forecasts.");
  }
  const opportunity = await repository.findOpportunity({
    opportunityId,
    organizationId: organizationIds[0],
    recordScope
  });
  if (!opportunity) {
    throw new UnifiedCrmForecastError("OPPORTUNITY_NOT_AVAILABLE", "Opportunity forecast is not available.");
  }
  return { opportunity, organizationId: organizationIds[0], recordScope };
}

function baselineSnapshot(opportunity: UnifiedCrmForecastOpportunityRecord, now: Date): UnifiedCrmForecastSnapshot {
  const baseline = STAGE_BASELINE[opportunity.stage] ?? STAGE_BASELINE.NEW_INQUIRY;
  const sourceAmount = opportunity.estimatedValueCents ?? 0;
  const amountCents = Math.round(sourceAmount * baseline.probabilityBasisPts / 10_000);
  return {
    amountCents,
    category: baseline.category,
    createdAt: now.toISOString(),
    createdByName: "Deterministic CRM baseline",
    createdByUserId: "system",
    id: `${opportunity.id}:baseline:${opportunity.version}`,
    inputSummary: `${opportunity.stage} stage, ${sourceAmount} cents estimated value, ${baseline.probabilityBasisPts / 100}% baseline probability.`,
    opportunityId: opportunity.id,
    probabilityBasisPts: baseline.probabilityBasisPts,
    reason: "System baseline projection from current opportunity stage and estimated value.",
    source: "BASELINE"
  };
}

function latestBySource(history: UnifiedCrmForecastSnapshot[], source: "SELLER_JUDGMENT" | "MANAGER_JUDGMENT") {
  return history.find((item) => item.source === source) ?? null;
}

function toReadModel(input: {
  generatedAt: string;
  history: UnifiedCrmForecastSnapshot[];
  opportunity: UnifiedCrmForecastOpportunityRecord;
  baseline: UnifiedCrmForecastSnapshot;
  visibility: "organization" | "owned";
}): UnifiedCrmForecastReadModel {
  return {
    baseline: input.baseline,
    contractVersion: UNIFIED_CRM_FORECAST_CONTRACT_VERSION,
    generatedAt: input.generatedAt,
    history: [input.baseline, ...input.history],
    latestManagerJudgment: latestBySource(input.history, "MANAGER_JUDGMENT"),
    latestSellerJudgment: latestBySource(input.history, "SELLER_JUDGMENT"),
    opportunity: {
      estimatedValueCents: input.opportunity.estimatedValueCents ?? 0,
      id: input.opportunity.id,
      opportunityNumber: input.opportunity.opportunityNumber,
      ownerName: input.opportunity.ownerName ?? "Unassigned",
      stage: input.opportunity.stage,
      title: input.opportunity.title,
      updatedAt: input.opportunity.updatedAt.toISOString()
    },
    state: "READY",
    visibility: input.visibility
  };
}

export async function getUnifiedCrmForecast(
  actor: AuthenticatedUser | null,
  opportunityId: string,
  dependencies: UnifiedCrmForecastDependencies = {}
): Promise<UnifiedCrmForecastReadModel> {
  const now = dependencies.now?.() ?? new Date();
  const repository = dependencies.repository ?? createUnifiedCrmForecastRepository();
  try {
    const context = await resolveForecastContext(actor, opportunityId, repository, now);
    const history = await repository.listSnapshots({
      opportunityId: context.opportunity.id,
      organizationId: context.organizationId
    });
    const baseline = baselineSnapshot(context.opportunity, now);
    return toReadModel({
      baseline,
      generatedAt: now.toISOString(),
      history,
      opportunity: context.opportunity,
      visibility: context.recordScope.kind === "ORGANIZATION" ? "organization" : "owned"
    });
  } catch (error) {
    if (error instanceof UnifiedCrmForecastError) throw error;
    throw new UnifiedCrmForecastError("FORECAST_SOURCE_UNAVAILABLE", "Forecast records are temporarily unavailable.", { cause: error });
  }
}

export async function submitUnifiedCrmForecastJudgment(
  actor: AuthenticatedUser | null,
  opportunityId: string,
  input: UnifiedCrmForecastSubmissionInput,
  dependencies: UnifiedCrmForecastDependencies = {}
) {
  const now = dependencies.now?.() ?? new Date();
  const repository = dependencies.repository ?? createUnifiedCrmForecastRepository();
  const command = normalizeUnifiedCrmForecastSubmission(input);
  if (!actor) {
    throw new UnifiedCrmForecastError("AUTHENTICATION_REQUIRED", "Sign in before submitting a forecast judgment.");
  }
  const workspace = resolveUnifiedCrmWorkspace(actor);
  if (command.source === "MANAGER_JUDGMENT" && workspace !== "MANAGEMENT") {
    throw new UnifiedCrmForecastError("FORECAST_NOT_AUTHORIZED", "Manager forecast judgment is not available for this workspace.");
  }
  try {
    const context = await resolveForecastContext(actor, opportunityId, repository, now);
    if (command.source === "SELLER_JUDGMENT" && workspace !== "SALES" && workspace !== "MANAGEMENT") {
      throw new UnifiedCrmForecastError("FORECAST_NOT_AUTHORIZED", "Seller forecast judgment is not available for this workspace.");
    }
    const baseline = baselineSnapshot(context.opportunity, now);
    const result = await repository.appendSnapshot({
      actorUserId: actor.id,
      baselineSnapshot: baseline,
      command,
      opportunity: context.opportunity
    });
    return {
      contractVersion: UNIFIED_CRM_FORECAST_CONTRACT_VERSION,
      duplicate: result.duplicate,
      snapshot: result.snapshot
    };
  } catch (error) {
    if (error instanceof UnifiedCrmForecastError) throw error;
    throw new UnifiedCrmForecastError("FORECAST_SOURCE_UNAVAILABLE", "Forecast judgment could not be saved right now.", { cause: error });
  }
}
