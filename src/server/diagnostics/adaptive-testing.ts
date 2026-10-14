import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const DIAGNOSTIC_ADAPTIVE_TESTING_ENGINE_VERSION = "DGN-024-025/1.0.0";
export const DIAGNOSTIC_TEST_ELIGIBILITY_POLICY_VERSION = "DGN-024/POLICY/1.0.0";
export const DIAGNOSTIC_TEST_OPTIMIZATION_POLICY_VERSION = "DGN-025/POLICY/1.0.0";

export type DiagnosticTestGateCode = "APPLICABILITY" | "PREREQUISITES" | "SAFETY" | "AUTHORITY" | "QUALIFICATION" | "TOOLS" | "RESOURCES" | "VEHICLE_STATE" | "AUTHORIZATION" | "SOURCE_VALIDITY" | "DEFINITION_VALIDITY";
export type DiagnosticTestGateResult = { code: DiagnosticTestGateCode; passed: boolean; reasonCodes: string[] };
export type DiagnosticTestSource = { sourceKey: string; version: string; rightsStatus: "AUTHORIZED" | "PENDING" | "PROHIBITED"; effectiveAt: string; expiresAt?: string | null; withdrawnAt?: string | null };
export type DiagnosticTestCandidateDefinition = {
  definitionVersionId: string; testKey: string; name: string;
  distinguishesHypothesisKeys: string[]; resolvesConflictKeys?: string[];
  outcomePartitions: Array<{ outcomeKey: string; hypothesisKeys: string[] }>;
  applicability: { makes?: string[]; models?: string[]; minimumYear?: number; maximumYear?: number; requiredConfiguration?: Record<string, unknown> };
  prerequisites: string[]; hazards: string[]; requiredCapabilities: string[]; qualifications: string[]; tools: string[]; requiredResources?: string[]; requiredVehicleStates: string[]; requiredAuthorizations: string[];
  sourceVersions: DiagnosticTestSource[]; effectiveAt: string; expiresAt?: string | null; superseded?: boolean;
  estimatedMinutes: number; estimatedCostCents: number; invasiveness: number; vehicleRisk: number; setupDelay: number; resourceReadiness: number; reliability: number; riskReduction: number; downstreamUnblocking: number;
};
export type DiagnosticAdaptiveTestingContext = {
  diagnosticCaseId: string; reasoningEvaluationId: string; reasoningResultChecksum: string; now: string;
  vehicle: { make: string; model: string; year: number; configuration?: Record<string, unknown>; state: string };
  viableHypothesisKeys: string[]; unresolvedConflictKeys: string[]; hypothesisProbabilities?: Record<string, number>;
  satisfiedPrerequisites: string[]; controlledHazards: string[]; capabilities: string[]; qualifications: string[]; availableTools: string[]; availableResources: string[]; authorizations: string[];
};
export type DiagnosticTestWeights = {
  informationGain: number; riskReduction: number; downstreamUnblocking: number; reliability: number;
  technicianTime: number; cost: number; invasivenessAndVehicleRisk: number; setupAndResourceDelay: number; lookAhead: number;
};
export const DEFAULT_DIAGNOSTIC_TEST_WEIGHTS: Readonly<DiagnosticTestWeights> = Object.freeze({ informationGain: 0.26, riskReduction: 0.15, downstreamUnblocking: 0.12, reliability: 0.12, technicianTime: 0.1, cost: 0.07, invasivenessAndVehicleRisk: 0.09, setupAndResourceDelay: 0.06, lookAhead: 0.03 });
export type DiagnosticTestFactorBreakdown = Record<keyof DiagnosticTestWeights, { normalizedValue: number; weight: number; contribution: number }>;

const canonical = (value: string) => value.trim().toUpperCase();
const canonicalSet = (values: string[]) => new Set(values.map(canonical));
const unique = (values: string[]) => [...new Set(values.map(canonical))].sort((a, b) => a.localeCompare(b));
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const date = (value: string, label: string) => { const parsed = new Date(value); if (Number.isNaN(parsed.getTime())) throw new Error(`${label} requires a valid timestamp.`); return parsed; };
const rounded = (value: number) => Number(value.toFixed(8));

function validateUnit(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error(`${label} must be between zero and one.`);
}

function validateDefinition(definition: DiagnosticTestCandidateDefinition) {
  if (!definition.definitionVersionId.trim() || !definition.testKey.trim() || !definition.name.trim()) throw new Error("Adaptive test definitions require version ID, key, and name.");
  if (!definition.sourceVersions.length) throw new Error(`Adaptive test ${definition.testKey} requires at least one governed source version.`);
  if (!definition.outcomePartitions.length) throw new Error(`Adaptive test ${definition.testKey} requires outcome partitions.`);
  if (!Number.isFinite(definition.estimatedMinutes) || definition.estimatedMinutes < 0 || !Number.isInteger(definition.estimatedCostCents) || definition.estimatedCostCents < 0) throw new Error(`Adaptive test ${definition.testKey} has invalid time or cost.`);
  for (const [label, value] of Object.entries({ invasiveness: definition.invasiveness, vehicleRisk: definition.vehicleRisk, setupDelay: definition.setupDelay, resourceReadiness: definition.resourceReadiness, reliability: definition.reliability, riskReduction: definition.riskReduction, downstreamUnblocking: definition.downstreamUnblocking })) validateUnit(value, `${definition.testKey} ${label}`);
  for (const source of definition.sourceVersions) { date(source.effectiveAt, "Source effectiveAt"); if (source.expiresAt) date(source.expiresAt, "Source expiresAt"); if (source.withdrawnAt) date(source.withdrawnAt, "Source withdrawnAt"); }
  date(definition.effectiveAt, "Definition effectiveAt"); if (definition.expiresAt) date(definition.expiresAt, "Definition expiresAt");
}

function missing(required: string[], present: string[]) {
  const available = canonicalSet(present); return unique(required.filter((item) => !available.has(canonical(item))));
}

function configurationMatches(required: Record<string, unknown> = {}, actual: Record<string, unknown> = {}) {
  return Object.entries(required).every(([key, value]) => JSON.stringify(actual[key]) === JSON.stringify(value));
}

function eligibility(definition: DiagnosticTestCandidateDefinition, context: DiagnosticAdaptiveTestingContext): DiagnosticTestGateResult[] {
  const now = date(context.now, "Adaptive-testing now"); const applicabilityReasons: string[] = [];
  if (definition.applicability.makes?.length && !canonicalSet(definition.applicability.makes).has(canonical(context.vehicle.make))) applicabilityReasons.push("TEST_WRONG_VEHICLE_MAKE");
  if (definition.applicability.models?.length && !canonicalSet(definition.applicability.models).has(canonical(context.vehicle.model))) applicabilityReasons.push("TEST_WRONG_VEHICLE_MODEL");
  if (definition.applicability.minimumYear != null && context.vehicle.year < definition.applicability.minimumYear) applicabilityReasons.push("TEST_VEHICLE_YEAR_TOO_OLD");
  if (definition.applicability.maximumYear != null && context.vehicle.year > definition.applicability.maximumYear) applicabilityReasons.push("TEST_VEHICLE_YEAR_TOO_NEW");
  if (!configurationMatches(definition.applicability.requiredConfiguration, context.vehicle.configuration)) applicabilityReasons.push("TEST_CONFIGURATION_MISMATCH");
  const sourceReasons = definition.sourceVersions.flatMap((source) => [
    ...(source.rightsStatus !== "AUTHORIZED" ? ["TEST_SOURCE_NOT_AUTHORIZED"] : []),
    ...(source.withdrawnAt && date(source.withdrawnAt, "Source withdrawnAt") <= now ? ["TEST_SOURCE_WITHDRAWN"] : []),
    ...(date(source.effectiveAt, "Source effectiveAt") > now ? ["TEST_SOURCE_NOT_EFFECTIVE"] : []),
    ...(source.expiresAt && date(source.expiresAt, "Source expiresAt") <= now ? ["TEST_SOURCE_EXPIRED"] : [])
  ]);
  const definitionReasons = definition.superseded ? ["TEST_DEFINITION_SUPERSEDED"] : date(definition.effectiveAt, "Definition effectiveAt") > now ? ["TEST_DEFINITION_NOT_EFFECTIVE"] : definition.expiresAt && date(definition.expiresAt, "Definition expiresAt") <= now ? ["TEST_DEFINITION_EXPIRED"] : [];
  const gate = (code: DiagnosticTestGateCode, reasons: string[]): DiagnosticTestGateResult => ({ code, passed: reasons.length === 0, reasonCodes: unique(reasons) });
  return [
    gate("APPLICABILITY", applicabilityReasons),
    gate("PREREQUISITES", missing(definition.prerequisites, context.satisfiedPrerequisites).map((item) => `TEST_PREREQUISITE_MISSING:${item}`)),
    gate("SAFETY", missing(definition.hazards, context.controlledHazards).map((item) => `TEST_HAZARD_UNCONTROLLED:${item}`)),
    gate("AUTHORITY", missing(definition.requiredCapabilities, context.capabilities).map((item) => `TEST_CAPABILITY_REQUIRED:${item}`)),
    gate("QUALIFICATION", missing(definition.qualifications, context.qualifications).map((item) => `TEST_QUALIFICATION_REQUIRED:${item}`)),
    gate("TOOLS", missing(definition.tools, context.availableTools).map((item) => `TEST_TOOL_UNAVAILABLE:${item}`)),
    gate("RESOURCES", missing(definition.requiredResources ?? [], context.availableResources).map((item) => `TEST_RESOURCE_UNAVAILABLE:${item}`)),
    gate("VEHICLE_STATE", definition.requiredVehicleStates.length && !canonicalSet(definition.requiredVehicleStates).has(canonical(context.vehicle.state)) ? ["TEST_VEHICLE_STATE_MISMATCH"] : []),
    gate("AUTHORIZATION", missing(definition.requiredAuthorizations, context.authorizations).map((item) => `TEST_AUTHORIZATION_REQUIRED:${item}`)),
    gate("SOURCE_VALIDITY", sourceReasons), gate("DEFINITION_VALIDITY", definitionReasons)
  ];
}

function entropy(probabilities: number[]) {
  return probabilities.reduce((total, probability) => probability > 0 ? total - probability * Math.log2(probability) : total, 0);
}

export function calculateExpectedInformationGain(definition: DiagnosticTestCandidateDefinition, context: DiagnosticAdaptiveTestingContext) {
  const viable = unique(context.viableHypothesisKeys); if (viable.length < 2) return 0;
  const supplied = context.hypothesisProbabilities ?? {}; const raw = viable.map((key) => Math.max(0, supplied[key] ?? supplied[canonical(key)] ?? 1)); const total = raw.reduce((sum, item) => sum + item, 0);
  if (total <= 0) throw new Error("Hypothesis probabilities must contain positive mass.");
  const probabilities = new Map(viable.map((key, index) => [key, raw[index] / total])); const before = entropy([...probabilities.values()]);
  const assigned = new Set<string>(); let after = 0;
  for (const partition of definition.outcomePartitions) {
    const members = unique(partition.hypothesisKeys).filter((item) => probabilities.has(item) && !assigned.has(item)); members.forEach((item) => assigned.add(item));
    const mass = members.reduce((sum, item) => sum + (probabilities.get(item) ?? 0), 0); if (mass > 0) after += mass * entropy(members.map((item) => (probabilities.get(item) ?? 0) / mass));
  }
  const unassigned = viable.filter((item) => !assigned.has(item)); const unassignedMass = unassigned.reduce((sum, item) => sum + (probabilities.get(item) ?? 0), 0);
  if (unassignedMass > 0) after += unassignedMass * entropy(unassigned.map((item) => (probabilities.get(item) ?? 0) / unassignedMass));
  return rounded(before === 0 ? 0 : clamp((before - after) / before));
}

function validateWeights(weights: DiagnosticTestWeights) {
  for (const [name, value] of Object.entries(weights)) validateUnit(value, `Optimization weight ${name}`);
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0); if (Math.abs(total - 1) > 0.000001) throw new Error("Optimization weights must sum to one.");
}

export function evaluateAdaptiveDiagnosticTests(input: { context: DiagnosticAdaptiveTestingContext; definitions: DiagnosticTestCandidateDefinition[]; weights?: DiagnosticTestWeights; maximumLookAheadTests?: number }) {
  const weights = { ...DEFAULT_DIAGNOSTIC_TEST_WEIGHTS, ...(input.weights ?? {}) }; validateWeights(weights);
  if (!/^[0-9a-f]{64}$/.test(input.context.reasoningResultChecksum)) throw new Error("Adaptive testing requires the immutable reasoning result checksum.");
  const maximumLookAheadTests = input.maximumLookAheadTests ?? 3; if (!Number.isInteger(maximumLookAheadTests) || maximumLookAheadTests < 0 || maximumLookAheadTests > 10) throw new Error("Adaptive-testing look-ahead bound must be between zero and ten tests.");
  const viable = canonicalSet(input.context.viableHypothesisKeys); const conflicts = canonicalSet(input.context.unresolvedConflictKeys); const seen = new Set<string>();
  const generated = input.definitions.map((definition) => {
    validateDefinition(definition); const testKey = canonical(definition.testKey); if (seen.has(testKey)) throw new Error(`Adaptive test key ${testKey} is duplicated.`); seen.add(testKey);
    const distinguished = unique(definition.distinguishesHypothesisKeys).filter((item) => viable.has(item)); const resolved = unique(definition.resolvesConflictKeys ?? []).filter((item) => conflicts.has(item));
    const generationReasonCodes = [...(distinguished.length >= 2 ? [] : ["TEST_DOES_NOT_DISCRIMINATE_VIABLE_HYPOTHESES"]), ...(!resolved.length && distinguished.length < 2 ? ["TEST_DOES_NOT_RESOLVE_UNCERTAINTY"] : [])];
    const gates = eligibility(definition, input.context); const exclusionReasonCodes = unique([...generationReasonCodes, ...gates.flatMap((gate) => gate.reasonCodes)]);
    return { definition, testKey, distinguishedHypothesisKeys: distinguished, resolvedConflictKeys: resolved, gates, eligible: exclusionReasonCodes.length === 0, exclusionReasonCodes };
  }).sort((a, b) => a.testKey.localeCompare(b.testKey));
  const eligible = generated.filter((item) => item.eligible); const gains = new Map(eligible.map((item) => [item.testKey, calculateExpectedInformationGain(item.definition, input.context)]));
  const bestOtherGains = [...gains.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, maximumLookAheadTests);
  const rankings = eligible.map((item) => {
    const definition = item.definition; const informationGain = gains.get(item.testKey) ?? 0;
    const future = bestOtherGains.filter(([testKey]) => testKey !== item.testKey).slice(0, Math.max(0, maximumLookAheadTests - 1));
    const lookAhead = future.length ? rounded(future.reduce((sum, [, value], index) => sum + value / (index + 2), 0) / future.length) : 0;
    const values: Record<keyof DiagnosticTestWeights, number> = { informationGain, riskReduction: definition.riskReduction, downstreamUnblocking: definition.downstreamUnblocking, reliability: definition.reliability, technicianTime: clamp(definition.estimatedMinutes / 180), cost: clamp(definition.estimatedCostCents / 100_000), invasivenessAndVehicleRisk: rounded((definition.invasiveness + definition.vehicleRisk) / 2), setupAndResourceDelay: rounded((definition.setupDelay + (1 - definition.resourceReadiness)) / 2), lookAhead };
    const negative = new Set<keyof DiagnosticTestWeights>(["technicianTime", "cost", "invasivenessAndVehicleRisk", "setupAndResourceDelay"]);
    const factors = Object.fromEntries((Object.keys(weights) as Array<keyof DiagnosticTestWeights>).map((factor) => { const contribution = values[factor] * weights[factor] * (negative.has(factor) ? -1 : 1); return [factor, { normalizedValue: rounded(values[factor]), weight: weights[factor], contribution: rounded(contribution) }]; })) as DiagnosticTestFactorBreakdown;
    const score = rounded(Object.values(factors).reduce((sum, factor) => sum + factor.contribution, 0));
    return { testKey: item.testKey, definitionVersionId: definition.definitionVersionId, name: definition.name, score, factors, gates: item.gates, explanationCodes: unique(["TEST_ELIGIBLE", informationGain > 0 ? "TEST_INFORMATION_GAIN" : "TEST_NO_INFORMATION_GAIN", lookAhead > 0 ? "TEST_BOUNDED_LOOK_AHEAD" : "TEST_TERMINAL_LOOK_AHEAD"]), estimatedMinutes: definition.estimatedMinutes, estimatedCostCents: definition.estimatedCostCents, vehicleRisk: definition.vehicleRisk };
  }).sort((a, b) => b.score - a.score || a.vehicleRisk - b.vehicleRisk || a.estimatedMinutes - b.estimatedMinutes || a.estimatedCostCents - b.estimatedCostCents || a.testKey.localeCompare(b.testKey)).map((item, index) => ({ ...item, rank: index + 1 }));
  const exclusions = generated.filter((item) => !item.eligible).map((item) => ({ testKey: item.testKey, definitionVersionId: item.definition.definitionVersionId, name: item.definition.name, gates: item.gates, reasonCodes: item.exclusionReasonCodes }));
  const deterministicInput = { context: input.context, definitions: [...input.definitions].sort((a, b) => canonical(a.testKey).localeCompare(canonical(b.testKey))), weights, maximumLookAheadTests };
  const deterministicResult = { eligibleTests: rankings, excludedTests: exclusions, recommendedTestKey: rankings[0]?.testKey ?? null, alternatives: rankings.slice(1).map((item) => item.testKey), abstentionRequired: rankings.length === 0, reasonCodes: rankings.length ? ["TEST_RECOMMENDATION_AVAILABLE"] : ["TEST_NO_ELIGIBLE_NEXT_TEST", "TEST_ABSTENTION_REQUIRED"] };
  return { engineVersion: DIAGNOSTIC_ADAPTIVE_TESTING_ENGINE_VERSION, eligibilityPolicyVersion: DIAGNOSTIC_TEST_ELIGIBILITY_POLICY_VERSION, optimizationPolicyVersion: DIAGNOSTIC_TEST_OPTIMIZATION_POLICY_VERSION, reasoningEvaluationId: input.context.reasoningEvaluationId, reasoningResultChecksum: input.context.reasoningResultChecksum, weights, weightsChecksum: hashEnterpriseCommand(weights), lookAhead: { maximumTests: maximumLookAheadTests, evaluatedAlternatives: eligible.length, bounded: true }, ...deterministicResult, inputChecksum: hashEnterpriseCommand(deterministicInput), resultChecksum: hashEnterpriseCommand(deterministicResult) };
}

export function normalizeAdaptiveTestingCommand(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Adaptive-testing request must be an object."); const raw = value as Record<string, unknown>;
  const expectedVersion = Number(raw.expectedVersion); const idempotencyKey = typeof raw.idempotencyKey === "string" ? raw.idempotencyKey.trim() : ""; const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error("Expected diagnostic-case version must be a positive integer.");
  if (!idempotencyKey || idempotencyKey.length > 200) throw new Error("Adaptive-testing idempotency key is required and cannot exceed 200 characters.");
  if (reason.length < 10 || reason.length > 500) throw new Error("Adaptive-testing evaluation requires a reason of 10 through 500 characters.");
  return { expectedVersion, idempotencyKey, reason, maximumLookAheadTests: raw.maximumLookAheadTests == null ? undefined : Number(raw.maximumLookAheadTests) };
}

export function normalizeAdaptiveTestOverrideCommand(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Adaptive-test override request must be an object."); const raw = value as Record<string, unknown>;
  const expectedVersion = Number(raw.expectedVersion); const idempotencyKey = typeof raw.idempotencyKey === "string" ? raw.idempotencyKey.trim() : ""; const reason = typeof raw.reason === "string" ? raw.reason.trim() : ""; const selectedTestKey = typeof raw.selectedTestKey === "string" ? canonical(raw.selectedTestKey) : "";
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error("Expected diagnostic-case version must be a positive integer.");
  if (!idempotencyKey || idempotencyKey.length > 200) throw new Error("Adaptive-test override idempotency key is required and cannot exceed 200 characters.");
  if (!selectedTestKey) throw new Error("Adaptive-test override requires a selected test key.");
  return { expectedVersion, idempotencyKey, reason, selectedTestKey };
}

export function diagnosticAdaptiveTestingId(prefix: "dat" | "dto", organizationId: string, subjectId: string, keyValue: string) {
  return `${prefix}_${hashEnterpriseCommand({ organizationId, subjectId, key: keyValue }).slice(0, 24)}`;
}

export function createDiagnosticTestOverride(input: { evaluationId: string; recommendedTestKey: string; selectedTestKey: string; eligibleTestKeys: string[]; actorUserId: string; reason: string; authorized: boolean; priorOverrideId?: string | null }) {
  const recommendedTestKey = canonical(input.recommendedTestKey); const selectedTestKey = canonical(input.selectedTestKey); const reason = input.reason.trim();
  if (!input.authorized) throw new Error("Adaptive-test override requires explicit technician authority.");
  if (reason.length < 10 || reason.length > 500) throw new Error("Adaptive-test override reason must contain 10 through 500 characters.");
  if (!canonicalSet(input.eligibleTestKeys).has(selectedTestKey)) throw new Error("An excluded test cannot be selected through an override.");
  if (recommendedTestKey === selectedTestKey) throw new Error("Selecting the recommended test is not an override.");
  const lineage = { evaluationId: input.evaluationId, recommendedTestKey, selectedTestKey, actorUserId: input.actorUserId, reason, priorOverrideId: input.priorOverrideId ?? null };
  return { ...lineage, policyVersion: DIAGNOSTIC_TEST_OPTIMIZATION_POLICY_VERSION, lineageChecksum: hashEnterpriseCommand(lineage), reasonCode: "TEST_RECOMMENDATION_OVERRIDDEN" };
}
