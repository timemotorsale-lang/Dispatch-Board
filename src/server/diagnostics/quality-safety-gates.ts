export const DIAGNOSTIC_GATE_POLICY_VERSION = "DGN-019/1.0.0";

export type DiagnosticGateStatus = "PASS" | "FAIL" | "UNKNOWN" | "NOT_APPLICABLE";
export type DiagnosticGateDisposition = "READY" | "BLOCKED" | "ABSTAIN" | "NOT_APPLICABLE";

type RecordValue = Record<string, unknown>;
type Gate = {
  code: string;
  label: string;
  status: DiagnosticGateStatus;
  reasonCodes: string[];
  detail: string;
  hard: boolean;
};

type Vehicle = { id?: string | null; vin?: string | null; year?: number | null; make?: string | null; model?: string | null };
type Observation = { correctedById?: string | null; independenceGroup: string; observedAt: string; qualityReasonCode: string; qualityStatus: string; reliability?: string };
type Measurement = { instrument: unknown; independenceGroup: string; measuredAt: string; normalizedUnit: string; normalizedValue: string; plausibilityStatus: string; qualityReasonCode: string; qualityStatus: string; quantity: string; supersededById?: string | null };
type EvidenceLink = { subjectId?: string; subjectType?: string; evidence: { malwareStatus: string; status: string } };
type Definition = {
  applicability: unknown;
  effectiveAt: string | Date;
  expiresAt: string | Date | null;
  hazards: unknown;
  prerequisites: unknown;
  qualifications: unknown;
  requiredEvidence: unknown;
  riskTier: string;
  sourceVersions: unknown;
  tools: unknown;
  vehicleState: unknown;
};

type EvaluationInput = {
  actualConditions?: RecordValue;
  caseRiskTier: string;
  completedDependencyNodeKeys?: string[];
  definition: Definition;
  dependencyNodeKeys?: string[];
  evidenceLinks?: EvidenceLink[];
  evidenceSummary?: RecordValue;
  measurements?: Measurement[];
  now?: Date;
  observations?: Observation[];
  planApplicability?: unknown;
  phase: "START" | "COMPLETE" | "REASONING";
  prerequisiteSnapshot?: RecordValue;
  requiredEvidenceOverride?: unknown;
  verifiedQualificationCodes?: string[];
  vehicle: Vehicle;
};

function record(value: unknown): RecordValue { return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {}; }
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function strings(value: unknown) { return array(value).map((item) => String(item).trim().toUpperCase()).filter(Boolean); }
function code(value: unknown, prefix: string, index: number) {
  if (typeof value === "string") return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  const item = record(value);
  return String(item.code ?? item.id ?? `${prefix}_${index + 1}`).trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}
function entries(value: unknown, prefix: string) { return array(value).map((item, index) => ({ code: code(item, prefix, index), value: record(item), raw: item })); }
function timestamp(value: unknown) { const result = new Date(String(value)); return Number.isNaN(result.getTime()) ? null : result; }
function upper(value: unknown) { return String(value ?? "").trim().toUpperCase(); }
function gate(code: string, label: string, status: DiagnosticGateStatus, reasonCodes: string[], detail: string, hard = true): Gate { return { code, label, status, reasonCodes, detail, hard }; }

function applicabilityGate(input: EvaluationInput, now: Date): Gate {
  const applicability = { ...record(input.definition.applicability), ...record(input.planApplicability) };
  const failures: string[] = [];
  const unknowns: string[] = [];
  const effectiveAt = timestamp(input.definition.effectiveAt);
  const expiresAt = input.definition.expiresAt ? timestamp(input.definition.expiresAt) : null;
  if (!effectiveAt || effectiveAt > now) failures.push("SOURCE_NOT_EFFECTIVE");
  if (expiresAt && expiresAt <= now) failures.push("SOURCE_EXPIRED");
  if (upper(input.definition.riskTier) === "R4" || upper(input.caseRiskTier) === "R4") failures.push("SAFETY_R4_PROHIBITED");
  const allowedRiskTiers = strings(applicability.allowedRiskTiers);
  if (allowedRiskTiers.length && !allowedRiskTiers.includes(upper(input.caseRiskTier))) failures.push("SAFETY_RISK_TIER_NOT_APPLICABLE");
  const checks: Array<[unknown, unknown, string]> = [
    [applicability.allowedMakes, input.vehicle.make, "SOURCE_WRONG_VEHICLE_MAKE"],
    [applicability.allowedModels, input.vehicle.model, "SOURCE_WRONG_VEHICLE_MODEL"],
    [applicability.allowedVehicleIds, input.vehicle.id, "SOURCE_WRONG_VEHICLE_CONFIGURATION"]
  ];
  for (const [allowed, actual, reason] of checks) {
    const values = strings(allowed);
    if (!values.length) continue;
    if (!actual) unknowns.push("SOURCE_APPLICABILITY_UNKNOWN");
    else if (!values.includes(upper(actual))) failures.push(reason);
  }
  const minimumYear = Number(applicability.minimumYear);
  const maximumYear = Number(applicability.maximumYear);
  if (Number.isFinite(minimumYear)) {
    if (input.vehicle.year == null) unknowns.push("SOURCE_APPLICABILITY_UNKNOWN");
    else if (input.vehicle.year < minimumYear) failures.push("SOURCE_WRONG_VEHICLE_YEAR");
  }
  if (Number.isFinite(maximumYear)) {
    if (input.vehicle.year == null) unknowns.push("SOURCE_APPLICABILITY_UNKNOWN");
    else if (input.vehicle.year > maximumYear) failures.push("SOURCE_WRONG_VEHICLE_YEAR");
  }
  if (failures.length) return gate("APPLICABILITY", "Vehicle and case applicability", "FAIL", [...new Set(failures)], "The test definition is not applicable to the current case or vehicle.");
  if (unknowns.length) return gate("APPLICABILITY", "Vehicle and case applicability", "UNKNOWN", [...new Set(unknowns)], "Required vehicle applicability facts are unavailable.");
  return gate("APPLICABILITY", "Vehicle and case applicability", "PASS", [], "Definition timing, risk, and vehicle applicability match.");
}

function sourceGate(input: EvaluationInput, now: Date): Gate {
  const sources = entries(input.definition.sourceVersions, "SOURCE");
  if (!sources.length) return gate("SOURCES", "Source authority and freshness", "FAIL", ["SOURCE_UNAVAILABLE"], "No governed source version supports this test.");
  const failures: string[] = [];
  const unknowns: string[] = [];
  for (const source of sources) {
    const rights = upper(source.value.rightsStatus);
    if (["HOLD", "WITHDRAWN", "PROHIBITED"].includes(rights)) failures.push(rights === "WITHDRAWN" ? "SOURCE_WITHDRAWN" : "SOURCE_RIGHTS_HOLD");
    else if (rights !== "AUTHORIZED") unknowns.push("SOURCE_RIGHTS_UNKNOWN");
    const validUntil = source.value.validUntil ? timestamp(source.value.validUntil) : null;
    if (source.value.validUntil && !validUntil) unknowns.push("SOURCE_FRESHNESS_UNKNOWN");
    else if (validUntil && validUntil <= now) failures.push("SOURCE_EXPIRED");
  }
  if (failures.length) return gate("SOURCES", "Source authority and freshness", "FAIL", [...new Set(failures)], "A required source is expired, withdrawn, or not authorized.");
  if (unknowns.length) return gate("SOURCES", "Source authority and freshness", "UNKNOWN", [...new Set(unknowns)], "Source authority or freshness cannot be established.");
  return gate("SOURCES", "Source authority and freshness", "PASS", [], "All required sources are authorized and current.");
}

function qualityGates(input: EvaluationInput, now: Date): Gate[] {
  const observations = (input.observations ?? []).filter((item) => !item.correctedById);
  const measurements = (input.measurements ?? []).filter((item) => !item.supersededById);
  const invalid = [...observations, ...measurements].filter((item) => item.qualityStatus === "INVALID");
  const suspect = [...observations, ...measurements].filter((item) => item.qualityStatus === "SUSPECT");
  const unitFailures = measurements.filter((item) => !item.normalizedUnit.trim() || !Number.isFinite(Number(item.normalizedValue)));
  const implausible = measurements.filter((item) => item.plausibilityStatus !== "PLAUSIBLE");
  const instrumentInvalid = measurements.filter((item) => upper(record(item.instrument).calibrationStatus) === "EXPIRED");
  const instrumentUnknown = measurements.filter((item) => !["CURRENT", "NOT_APPLICABLE", "EXPIRED"].includes(upper(record(item.instrument).calibrationStatus)));
  const staleLimit = Number(record(input.definition.applicability).evidenceMaxAgeMinutes);
  const stale = Number.isFinite(staleLimit) && staleLimit >= 0 ? [...observations.map((item) => item.observedAt), ...measurements.map((item) => item.measuredAt)].filter((value) => { const at = timestamp(value); return !at || now.getTime() - at.getTime() > staleLimit * 60_000; }) : [];
  return [
    invalid.length ? gate("DATA_QUALITY", "Evidence validity", "FAIL", ["DATA_INVALID"], `${invalid.length} current evidence item(s) are invalid.`) : suspect.length ? gate("DATA_QUALITY", "Evidence validity", "UNKNOWN", ["DATA_QUALITY_UNRESOLVED"], `${suspect.length} current evidence item(s) require review.`) : gate("DATA_QUALITY", "Evidence validity", "PASS", [], "Current evidence contains no unresolved invalid or suspect item."),
    unitFailures.length ? gate("UNITS", "Engineering units", "FAIL", ["DATA_UNIT_INVALID"], `${unitFailures.length} measurement(s) lack a finite normalized value and compatible unit.`) : gate("UNITS", "Engineering units", measurements.length ? "PASS" : "NOT_APPLICABLE", [], measurements.length ? "Measurement units and normalized values are valid." : "No current measurement requires unit evaluation."),
    implausible.length ? gate("PLAUSIBILITY", "Engineering plausibility", "FAIL", ["DATA_IMPLAUSIBLE"], `${implausible.length} measurement(s) are outside governed engineering bounds.`) : gate("PLAUSIBILITY", "Engineering plausibility", measurements.length ? "PASS" : "NOT_APPLICABLE", [], measurements.length ? "Current measurements are within governed engineering bounds." : "No current measurement requires plausibility evaluation."),
    instrumentInvalid.length ? gate("INSTRUMENT", "Instrument quality", "FAIL", ["DATA_INSTRUMENT_CALIBRATION_EXPIRED"], `${instrumentInvalid.length} measurement(s) use expired instrument calibration.`) : instrumentUnknown.length ? gate("INSTRUMENT", "Instrument quality", "UNKNOWN", ["DATA_INSTRUMENT_CALIBRATION_UNVERIFIED"], `${instrumentUnknown.length} measurement(s) have unverified instrument quality.`) : gate("INSTRUMENT", "Instrument quality", measurements.length ? "PASS" : "NOT_APPLICABLE", [], measurements.length ? "Instrument calibration is current or not applicable." : "No instrument evidence is present."),
    stale.length ? gate("FRESHNESS", "Evidence freshness", "FAIL", ["DATA_STALE"], `${stale.length} evidence item(s) exceed the definition freshness window.`) : gate("FRESHNESS", "Evidence freshness", Number.isFinite(staleLimit) ? "PASS" : "NOT_APPLICABLE", [], Number.isFinite(staleLimit) ? "Evidence is within the required freshness window." : "The definition does not impose a case-wide freshness window.")
  ];
}

function confirmationGate(input: EvaluationInput, field: "prerequisites" | "hazards" | "tools", label: string, failureCode: string): Gate {
  const required = entries(input.definition[field], field.toUpperCase());
  if (!required.length) return gate(field.toUpperCase(), label, "NOT_APPLICABLE", [], `No ${field} are declared.`);
  const snapshot = input.prerequisiteSnapshot ?? {};
  const listField = field === "prerequisites" ? "satisfiedPrerequisiteCodes" : field === "hazards" ? "controlledHazardCodes" : "availableToolCodes";
  const confirmed = new Set(strings(snapshot[listField]));
  const missing = required.filter((item) => !confirmed.has(item.code));
  if (missing.length) return gate(field.toUpperCase(), label, "FAIL", [failureCode], `Missing confirmation: ${missing.map((item) => item.code).join(", ")}.`);
  return gate(field.toUpperCase(), label, "PASS", [], `All ${field} are explicitly confirmed.`);
}

function qualificationGate(input: EvaluationInput): Gate {
  const required = entries(input.definition.qualifications, "QUALIFICATION");
  if (!required.length) return gate("QUALIFICATIONS", "Technician qualifications", "NOT_APPLICABLE", [], "No additional qualification is declared.");
  const verified = new Set((input.verifiedQualificationCodes ?? []).map(upper));
  const missing = required.filter((item) => !verified.has(item.code));
  return missing.length ? gate("QUALIFICATIONS", "Technician qualifications", "FAIL", ["AUTH_QUALIFICATION_MISSING"], `Missing active qualification: ${missing.map((item) => item.code).join(", ")}.`) : gate("QUALIFICATIONS", "Technician qualifications", "PASS", [], "All required qualifications were verified by the server.");
}

function vehicleStateGate(input: EvaluationInput): Gate {
  const required = record(input.definition.vehicleState);
  if (!Object.keys(required).length) return gate("VEHICLE_STATE", "Required vehicle state", "NOT_APPLICABLE", [], "No specific vehicle state is declared.");
  const actual = input.actualConditions ?? {};
  const mismatch = Object.entries(required).filter(([key, value]) => actual[key] !== value);
  if (mismatch.length) return gate("VEHICLE_STATE", "Required vehicle state", "FAIL", ["TEST_VEHICLE_STATE_UNVERIFIED"], `Vehicle state is unverified or mismatched for: ${mismatch.map(([key]) => key).join(", ")}.`);
  return gate("VEHICLE_STATE", "Required vehicle state", "PASS", [], "The required vehicle state is explicitly confirmed.");
}

function dependencyGate(input: EvaluationInput): Gate {
  const required = new Set((input.dependencyNodeKeys ?? []).map(upper));
  if (!required.size) return gate("DEPENDENCIES", "Plan dependencies", "NOT_APPLICABLE", [], "This plan node has no dependencies.");
  const complete = new Set((input.completedDependencyNodeKeys ?? []).map(upper));
  const missing = [...required].filter((item) => !complete.has(item));
  return missing.length ? gate("DEPENDENCIES", "Plan dependencies", "FAIL", ["TEST_DEPENDENCY_INCOMPLETE"], `Incomplete dependency: ${missing.join(", ")}.`) : gate("DEPENDENCIES", "Plan dependencies", "PASS", [], "All plan dependencies have valid completed executions.");
}

function evidenceGate(input: EvaluationInput, now: Date): Gate {
  if (input.phase === "START") return gate("EVIDENCE_COMPLETENESS", "Required evidence", "NOT_APPLICABLE", [], "Completion evidence is evaluated when the test is completed.");
  const requirements = entries(input.requiredEvidenceOverride ?? input.definition.requiredEvidence, "EVIDENCE");
  if (!requirements.length) return gate("EVIDENCE_COMPLETENESS", "Required evidence", "NOT_APPLICABLE", [], "No evidence requirement is declared.");
  const summary = input.evidenceSummary ?? {};
  const declared = new Set(strings(summary.satisfiedRequirementCodes));
  const measurements = (input.measurements ?? []).filter((item) => !item.supersededById && item.qualityStatus === "VALID" && item.plausibilityStatus === "PLAUSIBLE");
  const observations = (input.observations ?? []).filter((item) => !item.correctedById && item.qualityStatus === "VALID");
  const evidenceLinks = (input.evidenceLinks ?? []).filter((item) => item.evidence.status === "AVAILABLE" && item.evidence.malwareStatus === "CLEAN");
  const missing: string[] = [];
  const correlated: string[] = [];
  const stale: string[] = [];
  for (const requirement of requirements) {
    const kind = upper(requirement.value.type ?? requirement.value.kind);
    let candidates: Array<{ at: string; group: string }> = [];
    if (kind === "MEASUREMENT") candidates = measurements.filter((item) => !requirement.value.quantity || upper(item.quantity) === upper(requirement.value.quantity)).filter((item) => !requirement.value.normalizedUnit || item.normalizedUnit === requirement.value.normalizedUnit).map((item) => ({ at: item.measuredAt, group: item.independenceGroup }));
    else if (kind === "OBSERVATION") candidates = observations.map((item) => ({ at: item.observedAt, group: item.independenceGroup }));
    else if (kind === "ATTACHMENT") candidates = evidenceLinks.map((item) => ({ at: now.toISOString(), group: `ATTACHMENT:${item.subjectType ?? "CASE"}` }));
    else if (declared.has(requirement.code)) candidates = [{ at: now.toISOString(), group: `DECLARED:${requirement.code}` }];
    const minimumCount = Math.max(1, Number(requirement.value.minimumCount) || 1);
    const minimumIndependentGroups = Math.max(1, Number(requirement.value.minimumIndependentGroups) || 1);
    if (candidates.length < minimumCount) { missing.push(requirement.code); continue; }
    if (new Set(candidates.map((item) => item.group)).size < minimumIndependentGroups) correlated.push(requirement.code);
    const maxAgeMinutes = Number(requirement.value.maxAgeMinutes);
    if (Number.isFinite(maxAgeMinutes) && candidates.some((item) => { const at = timestamp(item.at); return !at || now.getTime() - at.getTime() > maxAgeMinutes * 60_000; })) stale.push(requirement.code);
  }
  if (missing.length) return gate("EVIDENCE_COMPLETENESS", "Required evidence", "FAIL", ["DATA_EVIDENCE_INCOMPLETE"], `Missing required evidence: ${missing.join(", ")}.`);
  if (stale.length) return gate("EVIDENCE_COMPLETENESS", "Required evidence", "FAIL", ["DATA_STALE"], `Stale required evidence: ${stale.join(", ")}.`);
  if (correlated.length) return gate("EVIDENCE_COMPLETENESS", "Required evidence", "FAIL", ["DATA_EVIDENCE_NOT_INDEPENDENT"], `Insufficient independent evidence for: ${correlated.join(", ")}.`);
  return gate("EVIDENCE_COMPLETENESS", "Required evidence", "PASS", [], "Required evidence is complete, current, valid, and sufficiently independent.");
}

function disposition(gates: Gate[]): DiagnosticGateDisposition {
  const failed = gates.filter((item) => item.status === "FAIL");
  if (failed.some((item) => item.code === "APPLICABILITY")) return "NOT_APPLICABLE";
  if (failed.length) return "BLOCKED";
  if (gates.some((item) => item.status === "UNKNOWN")) return "ABSTAIN";
  return "READY";
}

export function evaluateDiagnosticQualitySafetyGates(input: EvaluationInput) {
  const now = input.now ?? new Date();
  const gates = [
    applicabilityGate(input, now), sourceGate(input, now), ...qualityGates(input, now), dependencyGate(input),
    confirmationGate(input, "prerequisites", "Test prerequisites", "SAFETY_PREREQUISITE_MISSING"),
    confirmationGate(input, "hazards", "Hazard controls", "SAFETY_HAZARD_UNCONTROLLED"),
    confirmationGate(input, "tools", "Tool readiness", "TEST_TOOL_UNAVAILABLE"),
    qualificationGate(input), vehicleStateGate(input), evidenceGate(input, now)
  ];
  const result = disposition(gates);
  return {
    policyVersion: DIAGNOSTIC_GATE_POLICY_VERSION,
    evaluatedAt: now.toISOString(),
    phase: input.phase,
    disposition: result,
    ready: result === "READY",
    abstentionRequired: result === "ABSTAIN" || result === "NOT_APPLICABLE",
    reasonCodes: [...new Set(gates.flatMap((item) => item.reasonCodes))].sort(),
    gates
  };
}

export function buildDiagnosticCaseQualitySummary(input: { measurements: Measurement[]; observations: Observation[]; now?: Date }) {
  const now = input.now ?? new Date();
  const currentObservations = input.observations.filter((item) => !item.correctedById);
  const currentMeasurements = input.measurements.filter((item) => !item.supersededById);
  const invalid = [...currentObservations, ...currentMeasurements].filter((item) => item.qualityStatus === "INVALID");
  const suspect = [...currentObservations, ...currentMeasurements].filter((item) => item.qualityStatus === "SUSPECT");
  const groups = new Set([...currentObservations, ...currentMeasurements].filter((item) => item.qualityStatus === "VALID").map((item) => item.independenceGroup));
  const disposition: DiagnosticGateDisposition = invalid.length ? "BLOCKED" : suspect.length || (!currentObservations.length && !currentMeasurements.length) ? "ABSTAIN" : "READY";
  return {
    policyVersion: DIAGNOSTIC_GATE_POLICY_VERSION,
    evaluatedAt: now.toISOString(),
    disposition,
    readyForReasoning: disposition === "READY",
    abstentionRequired: disposition !== "READY",
    reasonCodes: invalid.length ? ["DATA_INVALID"] : suspect.length ? ["DATA_QUALITY_UNRESOLVED"] : !currentObservations.length && !currentMeasurements.length ? ["REASONING_INSUFFICIENT_EVIDENCE"] : [],
    counts: { currentObservations: currentObservations.length, currentMeasurements: currentMeasurements.length, invalid: invalid.length, suspect: suspect.length, independentGroups: groups.size }
  };
}

export function assertDiagnosticGateReady(evaluation: ReturnType<typeof evaluateDiagnosticQualitySafetyGates>) {
  if (evaluation.ready) return;
  throw new Error(`Diagnostic quality and safety gates require ${evaluation.disposition.toLowerCase()}: ${evaluation.reasonCodes.join(", ") || "REASONING_ABSTENTION_REQUIRED"}.`);
}
