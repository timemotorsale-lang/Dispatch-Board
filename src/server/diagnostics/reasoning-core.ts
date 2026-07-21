import { hashEnterpriseCommand } from "@/server/enterprise-command/domain";

export const DIAGNOSTIC_REASONING_ENGINE_VERSION = "DGN-022-023/1.0.0";
export const DIAGNOSTIC_REASONING_POLICY_VERSION = "DGN-023/POLICY/1.0.0";

export type ReasoningEvidenceState = "PRESENT" | "ABSENT" | "UNKNOWN";
export type ReasoningEvidenceQuality = "VALID" | "SUSPECT" | "INVALID";
export type ReasoningEvidenceType = "OBSERVATION" | "MEASUREMENT" | "TEST_EXECUTION" | "MODEL_FACT";
export type ReasoningEvidence = {
  key: string; evidenceId: string | null; evidenceType: ReasoningEvidenceType; factKey: string; state: ReasoningEvidenceState;
  quality: ReasoningEvidenceQuality; qualityReasonCode: string; independenceGroup: string; observedAt: string;
  supportsAssumptions?: string[]; contradictsAssumptions?: string[]; associatedAssumptions?: string[]; validityAssumptionKey?: string;
};
export type ReasoningAssumption = {
  key: string; label: string; abnormalModes: string[]; expectedEffectKeys: string[]; commonCauseFor?: string[]; intermittent?: boolean;
};
export type ReasoningRule = {
  key: string; conditions: Array<{ factKey: string; state: ReasoningEvidenceState }>;
  conflictAssumptions: string[]; reasonCode: string; explanation: string; hardBlocker?: boolean; resolutionTestKeys?: string[];
};
export type DiagnosticReasoningModel = {
  modelVersion: string; ruleSetVersion: string; knowledgeChecksum: string; calculationVersions: string[]; sourceVersions: Array<{ sourceKey: string; version: string; rightsStatus: string }>;
  applicability: { allowedMakes?: string[]; allowedModels?: string[]; minimumYear?: number; maximumYear?: number; excludes?: string[] };
  assumptions: ReasoningAssumption[]; rules: ReasoningRule[];
};
export type ReasoningBounds = { maximumCandidateSize: number; maximumCandidates: number; maximumExpansions: number; maximumDurationMs: number };
export type DiagnosticReasoningInput = {
  diagnosticCaseId: string; concernVersionId: string; vehicle: { id: string; make: string; model: string; year: number; configuration?: Record<string, unknown> };
  model: DiagnosticReasoningModel; evidence: ReasoningEvidence[]; gateDisposition: "READY" | "BLOCKED" | "ABSTAIN" | "NOT_APPLICABLE";
  gateReasonCodes: string[]; bounds?: Partial<ReasoningBounds>; now?: Date;
};

export function normalizeDiagnosticReasoningCommand(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Diagnostic reasoning request must be an object.");
  const raw = value as Record<string, unknown>; const expectedVersion = Number(raw.expectedVersion);
  const idempotencyKey = typeof raw.idempotencyKey === "string" ? raw.idempotencyKey.trim() : ""; const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) throw new Error("Expected diagnostic-case version must be a positive integer.");
  if (!idempotencyKey || idempotencyKey.length > 200) throw new Error("Reasoning idempotency key is required and cannot exceed 200 characters.");
  if (reason.length < 10 || reason.length > 500) throw new Error("Reasoning evaluation requires a reason of 10 through 500 characters.");
  const supersedesId = raw.supersedesId == null || raw.supersedesId === "" ? null : String(raw.supersedesId).trim();
  return { expectedVersion, idempotencyKey, reason, supersedesId, bounds: normalizeBounds(raw.bounds && typeof raw.bounds === "object" && !Array.isArray(raw.bounds) ? raw.bounds as Partial<ReasoningBounds> : {}) };
}

export function diagnosticReasoningId(prefix: "dre" | "dhp" | "dhe", organizationId: string, subjectId: string, keyValue: string) {
  return `${prefix}_${hashEnterpriseCommand({ organizationId, subjectId, key: keyValue }).slice(0, 24)}`;
}

export type DiagnosticConflict = { key: string; assumptions: string[]; evidenceKeys: string[]; ruleKeys: string[]; reasonCodes: string[]; explanations: string[]; hardBlocker: boolean; minimal: boolean };
export type DiagnosticCandidate = {
  key: string; assumptions: string[]; abnormalModes: Record<string, string[]>; status: "SUPPORTED" | "CONTRADICTED" | "DISCRIMINATION_REQUIRED" | "OUT_OF_MODEL";
  commonCause: boolean; intermittent: boolean; rank: number; causalState: "CAUSAL_SUPPORT" | "ASSOCIATION_ONLY" | "COMPATIBLE" | "CONTRADICTED";
  supportingEvidenceKeys: string[]; contradictingEvidenceKeys: string[]; associatedEvidenceKeys: string[]; expectedEvidenceKeys: string[]; missingExpectedEvidenceKeys: string[]; explanationCodes: string[];
};

const DEFAULT_BOUNDS: ReasoningBounds = { maximumCandidateSize: 3, maximumCandidates: 100, maximumExpansions: 10_000, maximumDurationMs: 2_000 };
const key = (value: string) => value.trim().toUpperCase();
const uniqueSorted = (values: string[]) => [...new Set(values.map(key))].sort((a, b) => a.localeCompare(b));
const isSubset = (left: string[], right: string[]) => left.every((item) => right.includes(item));

function normalizeBounds(input: Partial<ReasoningBounds> = {}): ReasoningBounds {
  const result = { ...DEFAULT_BOUNDS, ...input };
  for (const [name, value] of Object.entries(result)) if (!Number.isInteger(value) || value < 1 || value > 1_000_000) throw new Error(`Reasoning bound ${name} must be a positive bounded integer.`);
  if (result.maximumCandidateSize > 10 || result.maximumCandidates > 10_000 || result.maximumDurationMs > 60_000) throw new Error("Reasoning bounds exceed the approved safety ceiling.");
  return result;
}

function assertModel(model: DiagnosticReasoningModel) {
  if (!/^[0-9a-f]{64}$/.test(model.knowledgeChecksum)) throw new Error("Reasoning model requires a SHA-256 knowledge checksum.");
  if (!model.modelVersion.trim() || !model.ruleSetVersion.trim() || !model.assumptions.length || !model.rules.length || !model.sourceVersions.length || !model.calculationVersions.length) throw new Error("Reasoning model identity, assumptions, rules, sources, and calculation versions are required.");
  if (model.sourceVersions.some((source) => source.rightsStatus !== "AUTHORIZED")) throw new Error("Reasoning may use only authorized source versions.");
  const assumptions = new Set(model.assumptions.map((assumption) => key(assumption.key)));
  if (assumptions.size !== model.assumptions.length) throw new Error("Reasoning assumption keys must be unique.");
  for (const assumption of model.assumptions) {
    if (!assumption.abnormalModes.length) throw new Error(`Assumption ${assumption.key} requires at least one approved abnormal mode.`);
    for (const covered of assumption.commonCauseFor ?? []) if (!assumptions.has(key(covered))) throw new Error(`Common-cause assumption ${assumption.key} covers unknown assumption ${covered}.`);
  }
  for (const rule of model.rules) {
    if (!rule.conditions.length || !rule.conflictAssumptions.length) throw new Error(`Reasoning rule ${rule.key} requires conditions and conflict assumptions.`);
    for (const assumption of rule.conflictAssumptions) if (!assumptions.has(key(assumption))) throw new Error(`Reasoning rule ${rule.key} references unknown assumption ${assumption}.`);
  }
}

function assertEvidence(evidence: ReasoningEvidence[], model: DiagnosticReasoningModel) {
  const evidenceKeys = new Set<string>(); const assumptions = new Set(model.assumptions.map((assumption) => key(assumption.key)));
  for (const item of evidence) {
    const evidenceKey = key(item.key); const factKey = key(item.factKey);
    if (!evidenceKey || !factKey || !item.independenceGroup.trim() || evidenceKeys.has(evidenceKey)) throw new Error("Reasoning evidence requires unique keys, fact keys, and independence groups.");
    evidenceKeys.add(evidenceKey);
    if (!["PRESENT", "ABSENT", "UNKNOWN"].includes(item.state) || !["VALID", "SUSPECT", "INVALID"].includes(item.quality) || !["OBSERVATION", "MEASUREMENT", "TEST_EXECUTION", "MODEL_FACT"].includes(item.evidenceType)) throw new Error(`Reasoning evidence ${evidenceKey} has an invalid state, quality, or type.`);
    if (item.evidenceType !== "MODEL_FACT" && !item.evidenceId?.trim()) throw new Error(`Reasoning evidence ${evidenceKey} requires a canonical evidence ID.`);
    if (item.evidenceType === "MODEL_FACT" && item.evidenceId) throw new Error(`Model fact ${evidenceKey} cannot impersonate canonical case evidence.`);
    if (Number.isNaN(new Date(item.observedAt).getTime())) throw new Error(`Reasoning evidence ${evidenceKey} requires a valid observation time.`);
    for (const assumption of [...(item.supportsAssumptions ?? []), ...(item.contradictsAssumptions ?? []), ...(item.associatedAssumptions ?? []), ...(item.validityAssumptionKey ? [item.validityAssumptionKey] : [])]) if (!assumptions.has(key(assumption))) throw new Error(`Reasoning evidence ${evidenceKey} references unknown assumption ${assumption}.`);
  }
}

function applicabilityReason(input: DiagnosticReasoningInput) {
  const { applicability } = input.model; const make = key(input.vehicle.make); const model = key(input.vehicle.model);
  if (applicability.allowedMakes?.length && !applicability.allowedMakes.map(key).includes(make)) return "SOURCE_WRONG_VEHICLE_MAKE";
  if (applicability.allowedModels?.length && !applicability.allowedModels.map(key).includes(model)) return "SOURCE_WRONG_VEHICLE_MODEL";
  if (applicability.minimumYear != null && input.vehicle.year < applicability.minimumYear) return "SOURCE_VEHICLE_YEAR_TOO_OLD";
  if (applicability.maximumYear != null && input.vehicle.year > applicability.maximumYear) return "SOURCE_VEHICLE_YEAR_TOO_NEW";
  return null;
}

function minimizeConflicts(conflicts: DiagnosticConflict[]) {
  const canonical = conflicts.map((conflict) => ({ ...conflict, assumptions: uniqueSorted(conflict.assumptions), evidenceKeys: uniqueSorted(conflict.evidenceKeys), ruleKeys: uniqueSorted(conflict.ruleKeys), reasonCodes: uniqueSorted(conflict.reasonCodes) }))
    .sort((a, b) => a.assumptions.length - b.assumptions.length || a.assumptions.join("|").localeCompare(b.assumptions.join("|")));
  const result: DiagnosticConflict[] = [];
  for (const conflict of canonical) {
    const duplicate = result.find((entry) => entry.assumptions.join("|") === conflict.assumptions.join("|"));
    if (duplicate) {
      duplicate.evidenceKeys = uniqueSorted([...duplicate.evidenceKeys, ...conflict.evidenceKeys]); duplicate.ruleKeys = uniqueSorted([...duplicate.ruleKeys, ...conflict.ruleKeys]);
      duplicate.reasonCodes = uniqueSorted([...duplicate.reasonCodes, ...conflict.reasonCodes]); duplicate.explanations = [...new Set([...duplicate.explanations, ...conflict.explanations])]; duplicate.hardBlocker ||= conflict.hardBlocker;
    } else if (!result.some((entry) => isSubset(entry.assumptions, conflict.assumptions))) result.push({ ...conflict, minimal: true });
  }
  return result.map((conflict, index) => ({ ...conflict, key: `CONFLICT_${String(index + 1).padStart(3, "0")}` }));
}

export function generateMinimalHittingSets(conflicts: string[][], boundsInput: Partial<ReasoningBounds> = {}, clock: () => number = () => Date.now()) {
  const bounds = normalizeBounds(boundsInput); const started = clock(); let expansions = 0; let complete = true; let timedOut = false;
  let candidates: string[][] = [[]];
  for (const conflict of conflicts.map(uniqueSorted)) {
    const next: string[][] = [];
    for (const candidate of candidates) {
      if (candidate.some((item) => conflict.includes(item))) next.push(candidate);
      else for (const item of conflict) {
        expansions += 1;
        if (expansions > bounds.maximumExpansions || clock() - started > bounds.maximumDurationMs) { complete = false; timedOut = clock() - started > bounds.maximumDurationMs; break; }
        const expanded = uniqueSorted([...candidate, item]);
        if (expanded.length <= bounds.maximumCandidateSize) next.push(expanded); else complete = false;
      }
      if (!complete && (expansions > bounds.maximumExpansions || timedOut)) break;
    }
    candidates = next.sort((a, b) => a.length - b.length || a.join("|").localeCompare(b.join("|"))).filter((candidate, index, all) => !all.some((other, otherIndex) => otherIndex < index && isSubset(other, candidate))).slice(0, bounds.maximumCandidates);
    if (next.length > bounds.maximumCandidates) complete = false;
    if (!complete && (expansions > bounds.maximumExpansions || timedOut)) break;
  }
  return { candidates, complete, timedOut, expansions, bounds };
}

function evidenceStateMap(evidence: ReasoningEvidence[]) {
  const map = new Map<string, Set<ReasoningEvidenceState>>();
  for (const item of evidence) { const states = map.get(key(item.factKey)) ?? new Set(); states.add(item.state); map.set(key(item.factKey), states); }
  return map;
}

export function evaluateDiagnosticReasoning(input: DiagnosticReasoningInput, clock: () => number = () => Date.now()) {
  assertModel(input.model); assertEvidence(input.evidence, input.model); const started = clock(); const bounds = normalizeBounds(input.bounds); const applicability = applicabilityReason(input);
  const includedEvidence = input.evidence.filter((item) => item.quality === "VALID").sort((a, b) => key(a.key).localeCompare(key(b.key)));
  const excludedEvidence = input.evidence.filter((item) => item.quality !== "VALID").map((item) => ({ evidenceKey: key(item.key), reasonCode: item.quality === "INVALID" ? "DATA_INVALID" : "DATA_SUSPECT" }));
  const states = evidenceStateMap(includedEvidence); const hardBlockers = uniqueSorted([...input.gateReasonCodes, ...(applicability ? [applicability] : [])]);
  const rawConflicts: DiagnosticConflict[] = [];
  for (const rule of [...input.model.rules].sort((a, b) => key(a.key).localeCompare(key(b.key)))) {
    const matched = rule.conditions.every((condition) => states.get(key(condition.factKey))?.has(condition.state));
    if (!matched) continue;
    const evidenceKeys = includedEvidence.filter((item) => rule.conditions.some((condition) => key(condition.factKey) === key(item.factKey) && condition.state === item.state)).map((item) => item.key);
    rawConflicts.push({ key: "", assumptions: rule.conflictAssumptions, evidenceKeys, ruleKeys: [rule.key], reasonCodes: [rule.reasonCode], explanations: [rule.explanation], hardBlocker: Boolean(rule.hardBlocker), minimal: true });
    if (rule.hardBlocker) hardBlockers.push(key(rule.reasonCode));
  }
  for (const [factKey, factStates] of states) if (factStates.has("PRESENT") && factStates.has("ABSENT")) {
    const involved = includedEvidence.filter((item) => key(item.factKey) === factKey);
    const validityAssumptions = uniqueSorted(involved.map((item) => item.validityAssumptionKey ?? "").filter(Boolean));
    if (validityAssumptions.length) rawConflicts.push({ key: "", assumptions: validityAssumptions, evidenceKeys: involved.map((item) => item.key), ruleKeys: ["EVIDENCE_STATE_CONFLICT"], reasonCodes: ["DATA_CONFLICTING"], explanations: [`Qualified evidence for ${factKey} has incompatible states.`], hardBlocker: true, minimal: true });
    else hardBlockers.push("DATA_CONFLICTING_WITHOUT_VALIDITY_MODEL");
  }
  const conflicts = minimizeConflicts(rawConflicts);
  hardBlockers.push(...conflicts.filter((conflict) => conflict.hardBlocker).flatMap((conflict) => conflict.reasonCodes));
  const generated = generateMinimalHittingSets(conflicts.map((conflict) => conflict.assumptions), bounds, clock);
  const assumptionMap = new Map(input.model.assumptions.map((assumption) => [key(assumption.key), assumption]));
  const commonCauseCandidates = input.model.assumptions.filter((assumption) => assumption.commonCauseFor?.length && conflicts.length > 1 && conflicts.every((conflict) => conflict.assumptions.some((item) => assumption.commonCauseFor!.map(key).includes(item))))
    .map((assumption) => [key(assumption.key)]);
  const candidateSets = (conflicts.length ? [...generated.candidates, ...commonCauseCandidates] : []).sort((a, b) => a.length - b.length || a.join("|").localeCompare(b.join("|"))).filter((candidate, index, all) => !all.some((other, otherIndex) => otherIndex < index && other.join("|") === candidate.join("|")));
  const candidates: DiagnosticCandidate[] = candidateSets.map((candidate, index) => {
    const support = includedEvidence.filter((item) => item.supportsAssumptions?.map(key).some((item) => candidate.includes(item))).map((item) => key(item.key));
    const contradiction = includedEvidence.filter((item) => item.contradictsAssumptions?.map(key).some((item) => candidate.includes(item))).map((item) => key(item.key));
    const association = includedEvidence.filter((item) => item.associatedAssumptions?.map(key).some((item) => candidate.includes(item))).map((item) => key(item.key));
    const expected = uniqueSorted(candidate.flatMap((item) => assumptionMap.get(item)?.expectedEffectKeys ?? []));
    const presentFacts = new Set(includedEvidence.filter((item) => item.state === "PRESENT").map((item) => key(item.factKey)));
    const absentFacts = new Set(includedEvidence.filter((item) => item.state === "ABSENT").map((item) => key(item.factKey)));
    const missing = expected.filter((fact) => absentFacts.has(fact)); const predictedPresent = expected.filter((fact) => presentFacts.has(fact));
    const supportByAssumption = candidate.map((assumption) => includedEvidence.filter((item) => item.supportsAssumptions?.map(key).includes(assumption)));
    const hasIndependentSupportForEveryAssumption = supportByAssumption.every((items) => items.length > 0) && new Set(supportByAssumption.flat().map((item) => item.independenceGroup)).size >= candidate.length;
    const status = contradiction.length ? "CONTRADICTED" : hasIndependentSupportForEveryAssumption ? "SUPPORTED" : "DISCRIMINATION_REQUIRED";
    const causalState = contradiction.length ? "CONTRADICTED" : predictedPresent.length && !missing.length ? "CAUSAL_SUPPORT" : association.length ? "ASSOCIATION_ONLY" : "COMPATIBLE";
    return { key: `HYP_${candidate.join("__")}`, assumptions: candidate, abnormalModes: Object.fromEntries(candidate.map((item) => [item, assumptionMap.get(item)?.abnormalModes ?? ["UNMODELED"]])), status, commonCause: candidate.some((item) => Boolean(assumptionMap.get(item)?.commonCauseFor?.length)), intermittent: candidate.some((item) => Boolean(assumptionMap.get(item)?.intermittent)), rank: index + 1, causalState, supportingEvidenceKeys: uniqueSorted(support), contradictingEvidenceKeys: uniqueSorted(contradiction), associatedEvidenceKeys: uniqueSorted(association), expectedEvidenceKeys: expected, missingExpectedEvidenceKeys: missing, explanationCodes: uniqueSorted([status === "CONTRADICTED" ? "REASONING_CANDIDATE_CONTRADICTED" : support.length ? "REASONING_AFFIRMATIVE_SUPPORT" : "REASONING_DISCRIMINATION_REQUIRED", ...(missing.length ? ["REASONING_EXPECTED_EFFECT_MISSING"] : []), ...(association.length && !support.length ? ["REASONING_ASSOCIATION_ONLY"] : [])]) };
  });
  const outOfModel = conflicts.length > 0 && candidates.length === 0;
  if (outOfModel) candidates.push({ key: "HYP_OUT_OF_MODEL", assumptions: [], abnormalModes: {}, status: "OUT_OF_MODEL", commonCause: false, intermittent: false, rank: 1, causalState: "COMPATIBLE", supportingEvidenceKeys: [], contradictingEvidenceKeys: [], associatedEvidenceKeys: [], expectedEvidenceKeys: [], missingExpectedEvidenceKeys: [], explanationCodes: ["REASONING_OUT_OF_MODEL"] });
  const insufficientEvidence = conflicts.length === 0; const noConsistentDiagnosis = conflicts.length > 0 && !candidates.some((candidate) => candidate.status !== "CONTRADICTED" && candidate.status !== "OUT_OF_MODEL");
  const generationComplete = generated.complete && !outOfModel;
  const abstentionRequired = input.gateDisposition !== "READY" || hardBlockers.length > 0 || !generationComplete || insufficientEvidence || noConsistentDiagnosis;
  const reasonCodes = uniqueSorted([...conflicts.flatMap((conflict) => conflict.reasonCodes), ...hardBlockers, ...(excludedEvidence.length ? ["DATA_EVIDENCE_EXCLUDED"] : []), ...(insufficientEvidence ? ["REASONING_INSUFFICIENT_EVIDENCE"] : []), ...(noConsistentDiagnosis ? ["REASONING_NO_CONSISTENT_DIAGNOSIS"] : []), ...(!generationComplete ? ["REASONING_BOUNDED_SEARCH_INCOMPLETE"] : []), ...(abstentionRequired ? ["REASONING_ABSTENTION_REQUIRED"] : [])]);
  const recommendedTests = uniqueSorted(input.model.rules.filter((rule) => conflicts.some((conflict) => conflict.ruleKeys.map(key).includes(key(rule.key)))).flatMap((rule) => rule.resolutionTestKeys ?? []));
  const deterministicInput = { ...input, now: undefined, bounds, evidence: [...input.evidence].sort((a, b) => key(a.key).localeCompare(key(b.key))) };
  const deterministicResult = { conflicts, candidates, includedEvidence: includedEvidence.map((item) => key(item.key)), excludedEvidence, hardBlockers: uniqueSorted(hardBlockers), reasonCodes, recommendedTests, generationComplete, abstentionRequired, timedOut: generated.timedOut, degraded: !generationComplete, bounds, expansions: generated.expansions };
  return { engineVersion: DIAGNOSTIC_REASONING_ENGINE_VERSION, policyVersion: DIAGNOSTIC_REASONING_POLICY_VERSION, modelVersion: input.model.modelVersion, ruleSetVersion: input.model.ruleSetVersion, knowledgeChecksum: input.model.knowledgeChecksum, calculationVersions: input.model.calculationVersions, sourceVersions: input.model.sourceVersions, vehicleContext: input.vehicle, assumptions: input.model.assumptions, abnormalModes: Object.fromEntries(input.model.assumptions.map((assumption) => [key(assumption.key), assumption.abnormalModes])), ...deterministicResult, causalPredictions: candidates.map((candidate) => ({ hypothesisKey: candidate.key, expectedEvidenceKeys: candidate.expectedEvidenceKeys, causalState: candidate.causalState })), missingExpectedEffects: candidates.flatMap((candidate) => candidate.missingExpectedEvidenceKeys.map((evidenceKey) => ({ hypothesisKey: candidate.key, evidenceKey }))), inputChecksum: hashEnterpriseCommand(deterministicInput), resultChecksum: hashEnterpriseCommand(deterministicResult), computationDurationMs: Math.max(0, clock() - started) };
}

export function reviseDiagnosticTruth(prior: ReturnType<typeof evaluateDiagnosticReasoning>, current: ReturnType<typeof evaluateDiagnosticReasoning>) {
  const previous = new Map(prior.candidates.map((candidate) => [candidate.key, candidate])); const next = new Map(current.candidates.map((candidate) => [candidate.key, candidate]));
  return {
    retractedHypothesisKeys: [...previous.keys()].filter((candidate) => !next.has(candidate) || next.get(candidate)?.status === "CONTRADICTED").sort(),
    retainedHypothesisKeys: [...previous.keys()].filter((candidate) => next.has(candidate) && next.get(candidate)?.status !== "CONTRADICTED").sort(),
    introducedHypothesisKeys: [...next.keys()].filter((candidate) => !previous.has(candidate)).sort(),
    changedEvidenceKeys: uniqueSorted([...prior.includedEvidence, ...current.includedEvidence].filter((item) => prior.includedEvidence.includes(item) !== current.includedEvidence.includes(item))),
    priorResultChecksum: prior.resultChecksum, currentResultChecksum: current.resultChecksum
  };
}
